import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { GraduationCap, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, roleHome } from "@/hooks/use-auth";
import { emailFromNomorInduk } from "@/lib/auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/masuk")({
  head: () => ({
    meta: [
      { title: "Masuk — Equora" },
      { name: "description", content: "Masuk ke Equora dengan Nomor Induk dan kata sandi Anda." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const [nomorInduk, setNomorInduk] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user && role) {
      navigate({ to: roleHome[role] });
    }
  }, [loading, user, role, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nomorInduk.trim() || !password) {
      toast.error("Lengkapi Nomor Induk dan kata sandi.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: emailFromNomorInduk(nomorInduk),
      password,
    });
    if (error) {
      toast.error("Nomor Induk atau kata sandi salah.");
      setSubmitting(false);
      return;
    }
    toast.success("Berhasil masuk. Mengarahkan ke dashboard…");
    navigate({ to: "/dashboard" });
  }

  return (
    <main
      id="main-content"
      className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12"
    >
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2 text-foreground">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="h-6 w-6" aria-hidden />
          </span>
          <span className="text-2xl font-bold tracking-tight">Equora</span>
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Masuk ke akun Anda</CardTitle>
            <CardDescription>
              Gunakan Nomor Induk (NIA / NIG / NIS) dan kata sandi yang diberikan sekolah.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nomorInduk">Nomor Induk</Label>
                <Input
                  id="nomorInduk"
                  autoComplete="username"
                  placeholder="Mis. NIS2025001"
                  value={nomorInduk}
                  onChange={(e) => setNomorInduk(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Kata sandi</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                Masuk
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Akun dibuat oleh sekolah. Belum ada sekolah terdaftar?{" "}
              <Link to="/setup" className="font-medium text-primary hover:underline">
                Inisialisasi sistem
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
