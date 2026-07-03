import { useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { GraduationCap, LogOut, type LucideIcon } from "lucide-react";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

export function SidebarShell({
  allow,
  menu,
  active,
  onSelect,
  children,
}: {
  allow: AppRole;
  menu: MenuItem[];
  active: string;
  onSelect: (id: string) => void;
  children: ReactNode;
}) {
  const { profile, role, school, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !role) return;
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

  const activeItem = menu.find((m) => m.id === active);

  const NavList = ({ className }: { className?: string }) => (
    <nav className={className} aria-label="Menu dashboard">
      {menu.map((item) => {
        const Icon = item.icon;
        const isActive = item.id === active;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors min-h-11",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-5 w-5 shrink-0" aria-hidden />
            <span className="whitespace-nowrap">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-[100rem] items-center justify-between gap-4 px-4 py-3">
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

      <div className="mx-auto max-w-[100rem] px-4 py-6">
        {/* Mobile nav — horizontal scroll */}
        <div className="lg:hidden">
          <NavList className="mb-4 flex gap-1 overflow-x-auto pb-2" />
        </div>

        <div className="flex gap-6">
          {/* Sidebar — desktop */}
          <aside className="hidden w-56 shrink-0 lg:block">
            <NavList className="sticky top-20 flex flex-col gap-1" />
          </aside>

          <main id="main-content" className="min-w-0 flex-1">
            <div className="mb-6 flex items-center gap-3">
              {activeItem && <activeItem.icon className="h-6 w-6 text-primary" aria-hidden />}
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {activeItem?.label ?? "Dashboard"}
              </h1>
            </div>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

