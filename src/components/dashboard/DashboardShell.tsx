import { useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { GraduationCap, LogOut } from "lucide-react";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const roleLabel: Record<AppRole, string> = {
  admin: "Sekolah (Admin)",
  guru: "Guru",
  siswa: "Siswa",
};

export function DashboardShell({
  allow,
  title,
  subtitle,
  children,
}: {
  allow: AppRole;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const { profile, role, school, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!role) return;
    if (role !== allow) {
      navigate({ to: role === "admin" ? "/admin" : role === "guru" ? "/guru" : "/siswa" });
    }
  }, [loading, role, allow, navigate]);

  if (loading || !profile || role !== allow) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 text-muted-foreground">
        Memuat dashboard…
      </div>
    );
  }

  const initials = profile.full_name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/masuk", replace: true });
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2 text-foreground">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-5 w-5" aria-hidden />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-bold tracking-tight">Equora</p>
              <p className="text-xs text-muted-foreground">{school?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">{profile.full_name}</p>
              <p className="text-xs text-muted-foreground">{profile.nomor_induk}</p>
            </div>
            <Avatar>
              <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Keluar">
              <LogOut className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          <Badge variant="secondary">{roleLabel[allow]}</Badge>
        </div>
        {children}
      </main>
    </div>
  );
}
