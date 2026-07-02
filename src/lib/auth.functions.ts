import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
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
 * Server-side publishable client (no session persistence). Used to create auth
 * users via the standard sign-up flow — no service-role key required.
 */
function serverPublicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

/** Create an auth user with Nomor Induk + password. Returns the new user id. */
async function signUpUser(nomorInduk: string, password: string, fullName: string) {
  const client = serverPublicClient();
  const { data, error } = await client.auth.signUp({
    email: emailFromNomorInduk(nomorInduk),
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) {
    const msg = /registered|already/i.test(error.message)
      ? "Nomor Induk sudah digunakan."
      : error.message;
    throw new Error(msg);
  }
  if (!data.user) throw new Error("Gagal membuat akun. Coba lagi.");
  return data.user.id;
}

/**
 * One-time bootstrap: creates the first School and its Admin (Sekolah) account.
 * Public endpoint, but the database function refuses once any school exists.
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
    const client = serverPublicClient();

    const { data: count, error: countError } = await client.rpc("school_count");
    if (countError) throw new Error(countError.message);
    if ((count ?? 0) > 0) {
      throw new Error(
        "Sistem sudah diinisialisasi. Silakan minta akun kepada admin sekolah Anda.",
      );
    }

    const uid = await signUpUser(data.nia, data.password, data.adminName);

    const { error: rpcError } = await client.rpc("bootstrap_school", {
      p_user_id: uid,
      p_school_name: data.schoolName,
      p_admin_name: data.adminName,
      p_nomor_induk: data.nia.trim(),
    });
    if (rpcError) throw new Error(rpcError.message);

    return { ok: true, nia: data.nia.trim() };
  });

/** Whether the system still needs its first school (used by the setup screen). */
export const needsBootstrap = createServerFn({ method: "GET" }).handler(async () => {
  const client = serverPublicClient();
  const { data: count } = await client.rpc("school_count");
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

    // Create the auth account via standard sign-up (no service-role key needed).
    const uid = await signUpUser(data.nomorInduk, data.password, data.fullName);

    // Provision profile + role in the admin's school via a SECURITY DEFINER RPC,
    // executed as the signed-in admin.
    const { error: rpcError } = await supabase.rpc("admin_create_user", {
      p_user_id: uid,
      p_full_name: data.fullName,
      p_nomor_induk: data.nomorInduk.trim(),
      p_role: data.role,
      p_disability: data.disability,
    });
    if (rpcError) {
      throw new Error(
        /duplicate|unique/i.test(rpcError.message)
          ? "Nomor Induk sudah digunakan."
          : rpcError.message,
      );
    }

    return { ok: true };
  });

/**
 * Admin-only: activate/deactivate a user in the admin's school.
 * Deactivation is used instead of deletion (removing an auth account requires
 * privileged access that is not available here).
 */
export const setUserActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ userId: z.string().uuid(), active: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.rpc("admin_set_user_active", {
      p_user_id: data.userId,
      p_active: data.active,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
