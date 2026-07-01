import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { GraduationCap, Loader2, ShieldCheck } from "lucide-react";
import { bootstrapSchool, needsBootstrap } from "@/lib/auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/setup")({
  head: () => ({
    meta: [{ title: "Inisialisasi Sistem — Equora" }],
  }),
  component: SetupPage,
});

function SetupPage() {
  const navigate = useNavigate();
  const check = useServerFn(needsBootstrap);
  const bootstrap = useServerFn(bootstrapSchool);
  const { data, isLoading } = useQuery({
    queryKey: ["needs-bootstrap"],
    queryFn: () => check(),
  });

  const [schoolName, setSchoolName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [nia, setNia] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (data && !data.needsBootstrap) {
      navigate({ to: "/masuk" });
    }
  }, [data, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await bootstrap({
        data: {
          schoolName: schoolName.trim(),
          adminName: adminName.trim(),
          nia: nia.trim(),
          password,
        },
      });
      toast.success("Sekolah & akun admin berhasil dibuat. Silakan masuk.");
      navigate({ to: "/masuk" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menginisialisasi sistem.");
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/40">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
      </main>
    );
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
            <div className="mb-1 flex items-center gap-2 text-sm font-medium text-primary">
              <ShieldCheck className="h-4 w-4" aria-hidden /> Penyiapan pertama
            </div>
            <CardTitle>Inisialisasi Sekolah &amp; Admin</CardTitle>
            <CardDescription>
              Buat sekolah pertama dan akun Admin (Sekolah). Setelah ini, seluruh akun guru dan
              siswa dibuat dari Dashboard Admin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="schoolName">Nama Sekolah</Label>
                <Input id="schoolName" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminName">Nama Admin</Label>
                <Input id="adminName" value={adminName} onChange={(e) => setAdminName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nia">Nomor Induk Admin (NIA)</Label>
                <Input id="nia" value={nia} onChange={(e) => setNia(e.target.value)} placeholder="Mis. NIA001" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Kata sandi (min. 6 karakter)</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                Buat Sekolah &amp; Admin
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
