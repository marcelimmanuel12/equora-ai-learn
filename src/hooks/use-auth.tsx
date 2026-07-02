import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "guru" | "siswa";

export interface Profile {
  id: string;
  school_id: string;
  nomor_induk: string;
  full_name: string;
  disability: "none" | "tunarungu" | "tunawicara" | "tunanetra" | "buta_warna";
  avatar_url: string | null;
  is_active: boolean;
}

export interface School {
  id: string;
  name: string;
  address: string | null;
  subscription: "basic" | "pro" | "enterprise";
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  role: AppRole | null;
  school: School | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);

  const loadContext = useCallback(async (uid: string) => {
    const [{ data: prof }, { data: roleRow }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid).maybeSingle(),
    ]);
    setProfile((prof as Profile) ?? null);
    setRole(((roleRow?.role as AppRole) ?? null));
    if (prof?.school_id) {
      const { data: sch } = await supabase
        .from("schools")
        .select("*")
        .eq("id", prof.school_id)
        .maybeSingle();
      setSchool((sch as School) ?? null);
    } else {
      setSchool(null);
    }
  }, []);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      setUser(data.user);
      await loadContext(data.user.id);
    }
  }, [loadContext]);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      const sessionUser = data.session?.user ?? null;
      setUser(sessionUser);
      if (sessionUser) await loadContext(sessionUser.id);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      if (event === "SIGNED_OUT" || !sessionUser) {
        setProfile(null);
        setRole(null);
        setSchool(null);
        return;
      }
      // Defer supabase calls out of the callback to avoid deadlocks.
      setTimeout(() => {
        void loadContext(sessionUser.id);
      }, 0);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadContext]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setRole(null);
    setSchool(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ user, profile, role, school, loading, refresh, signOut }),
    [user, profile, role, school, loading, refresh, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export const roleHome: Record<AppRole, string> = {
  admin: "/admin",
  guru: "/guru",
  siswa: "/siswa",
};
