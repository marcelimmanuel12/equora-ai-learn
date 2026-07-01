import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth, roleHome } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardDispatcher,
});

function DashboardDispatcher() {
  const { role, loading, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (role) {
      navigate({ to: roleHome[role], replace: true });
    } else if (user) {
      // Signed in but no role/profile yet — bounce to login.
      navigate({ to: "/masuk", replace: true });
    }
  }, [role, loading, user, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 text-muted-foreground">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
      Menyiapkan dashboard Anda…
    </div>
  );
}
