import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const roleEnum = z.enum(["admin", "guru", "siswa"]);
const disabilityEnum = z.enum([
  "none",
  "tunarungu",
  "tunawicara",
  "tunanetra",
  "buta_warna",
]);

/** Nomor Induk -> synthetic email used by the auth backend. */
export function emailFromNomorInduk(ni: string) {
  return `${ni.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "")}@equora.local`;
}

/**
 * One-time bootstrap: creates the first School and its Admin (Sekolah) account.
 * Public endpoint, but refuses once any school already exists.
 */
export const bootstrapSchool = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        schoolName: z.string().trim().min(2).max(120),
        adminName: z.string().trim().min(2).max(120),
        nia: z.string().trim().min(3).max(40),
        password: z.string().min(6).max(72),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count, error: countError } = await supabaseAdmin
      .from("schools")
      .select("*", { count: "exact", head: true });
    if (countError) throw new Error(countError.message);
    if ((count ?? 0) > 0) {
      throw new Error(
        "Sistem sudah diinisialisasi. Silakan minta akun kepada admin sekolah Anda.",
      );
    }

    const { data: school, error: schoolError } = await supabaseAdmin
      .from("schools")
      .insert({ name: data.schoolName })
      .select()
      .single();
    if (schoolError) throw new Error(schoolError.message);

    const { data: created, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: emailFromNomorInduk(data.nia),
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.adminName },
    });
    if (authError || !created.user) {
      throw new Error(authError?.message ?? "Gagal membuat akun admin.");
    }
    const uid = created.user.id;

    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: uid,
      school_id: school.id,
      nomor_induk: data.nia.trim(),
      full_name: data.adminName,
    });
    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(uid);
      throw new Error(profileError.message);
    }

    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
      user_id: uid,
      role: "admin",
      school_id: school.id,
    });
    if (roleError) {
      await supabaseAdmin.auth.admin.deleteUser(uid);
      throw new Error(roleError.message);
    }

    return { ok: true, nia: data.nia.trim() };
  });

/** Whether the system still needs its first school (used by the setup screen). */
export const needsBootstrap = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await supabaseAdmin
    .from("schools")
    .select("*", { count: "exact", head: true });
  return { needsBootstrap: (count ?? 0) === 0 };
});

/** Admin-only: create a Guru / Siswa / Admin account in the admin's school. */
export const createSchoolUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        role: roleEnum,
        fullName: z.string().trim().min(2).max(120),
        nomorInduk: z.string().trim().min(3).max(40),
        password: z.string().min(6).max(72),
        disability: disabilityEnum.default("none"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Hanya admin sekolah yang dapat membuat akun.");

    const { data: me, error: meError } = await supabase
      .from("profiles")
      .select("school_id")
      .eq("id", userId)
      .single();
    if (meError || !me) throw new Error("Profil admin tidak ditemukan.");
    const schoolId = me.school_id;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: emailFromNomorInduk(data.nomorInduk),
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (authError || !created.user) {
      throw new Error(authError?.message ?? "Gagal membuat akun. Nomor induk mungkin sudah dipakai.");
    }
    const uid = created.user.id;

    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: uid,
      school_id: schoolId,
      nomor_induk: data.nomorInduk.trim(),
      full_name: data.fullName,
      disability: data.disability,
    });
    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(uid);
      throw new Error(
        profileError.message.includes("duplicate")
          ? "Nomor induk sudah digunakan."
          : profileError.message,
      );
    }

    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
      user_id: uid,
      role: data.role,
      school_id: schoolId,
    });
    if (roleError) {
      await supabaseAdmin.auth.admin.deleteUser(uid);
      throw new Error(roleError.message);
    }

    return { ok: true };
  });

/** Admin-only: delete a user (and their auth account) within the admin's school. */
export const deleteSchoolUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.userId === userId) throw new Error("Anda tidak dapat menghapus akun sendiri.");

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Hanya admin sekolah yang dapat menghapus akun.");

    const { data: me } = await supabase
      .from("profiles")
      .select("school_id")
      .eq("id", userId)
      .single();
    const { data: target } = await supabase
      .from("profiles")
      .select("school_id")
      .eq("id", data.userId)
      .single();
    if (!me || !target || me.school_id !== target.school_id) {
      throw new Error("Pengguna tidak ditemukan di sekolah Anda.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin-only: reset a user's password. */
export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ userId: z.string().uuid(), password: z.string().min(6).max(72) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Hanya admin yang dapat mengganti kata sandi.");

    const { data: me } = await supabase.from("profiles").select("school_id").eq("id", userId).single();
    const { data: target } = await supabase
      .from("profiles")
      .select("school_id")
      .eq("id", data.userId)
      .single();
    if (!me || !target || me.school_id !== target.school_id) {
      throw new Error("Pengguna tidak ditemukan di sekolah Anda.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
