import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Users,
  GraduationCap,
  BookOpen,
  Layers,
  Plus,
  Trash2,
  Power,
  PowerOff,
  Loader2,
  UserPlus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { createSchoolUser, setUserActive } from "@/lib/auth.functions";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Dashboard Sekolah — Equora" }] }),
  component: AdminDashboard,
});

type Role = "admin" | "guru" | "siswa";

interface UserRow {
  id: string;
  full_name: string;
  nomor_induk: string;
  disability: string;
  is_active: boolean;
  role: Role | null;
}

function useSchoolUsers(schoolId?: string) {
  return useQuery({
    queryKey: ["school-users", schoolId],
    enabled: !!schoolId,
    queryFn: async (): Promise<UserRow[]> => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, nomor_induk, disability, is_active").eq("school_id", schoolId!),
        supabase.from("user_roles").select("user_id, role").eq("school_id", schoolId!),
      ]);
      const roleMap = new Map((roles ?? []).map((r) => [r.user_id, r.role as Role]));
      return (profiles ?? []).map((p) => ({ ...p, is_active: p.is_active ?? true, role: roleMap.get(p.id) ?? null }));
    },
  });
}

function AdminDashboard() {
  return (
    <DashboardShell allow="admin" title="Dashboard Sekolah" subtitle="Kelola guru, siswa, kelas, dan langganan sekolah Anda.">
      <AdminContent />
    </DashboardShell>
  );
}

function AdminContent() {
  const { school } = useAuth();
  const users = useSchoolUsers(school?.id);

  const counts = useMemo(() => {
    const list = users.data ?? [];
    return {
      guru: list.filter((u) => u.role === "guru").length,
      siswa: list.filter((u) => u.role === "siswa").length,
    };
  }, [users.data]);

  return (
    <Tabs defaultValue="ringkasan" className="space-y-6">
      <TabsList className="flex-wrap">
        <TabsTrigger value="ringkasan">Ringkasan</TabsTrigger>
        <TabsTrigger value="pengguna">Pengguna</TabsTrigger>
        <TabsTrigger value="kelas">Kelas</TabsTrigger>
        <TabsTrigger value="mapel">Mata Pelajaran</TabsTrigger>
        <TabsTrigger value="langganan">Langganan</TabsTrigger>
      </TabsList>

      <TabsContent value="ringkasan">
        <RingkasanTab guru={counts.guru} siswa={counts.siswa} />
      </TabsContent>
      <TabsContent value="pengguna">
        <PenggunaTab />
      </TabsContent>
      <TabsContent value="kelas">
        <KelasTab />
      </TabsContent>
      <TabsContent value="mapel">
        <MapelTab />
      </TabsContent>
      <TabsContent value="langganan">
        <LanggananTab />
      </TabsContent>
    </Tabs>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-6 w-6" aria-hidden />
        </span>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function RingkasanTab({ guru, siswa }: { guru: number; siswa: number }) {
  const { school } = useAuth();
  const { data: classCount } = useQuery({
    queryKey: ["count-classes", school?.id],
    enabled: !!school?.id,
    queryFn: async () => {
      const { count } = await supabase.from("classes").select("*", { count: "exact", head: true }).eq("school_id", school!.id);
      return count ?? 0;
    },
  });
  const { data: subjectCount } = useQuery({
    queryKey: ["count-subjects", school?.id],
    enabled: !!school?.id,
    queryFn: async () => {
      const { count } = await supabase.from("subjects").select("*", { count: "exact", head: true }).eq("school_id", school!.id);
      return count ?? 0;
    },
  });

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard icon={GraduationCap} label="Guru" value={guru} />
      <StatCard icon={Users} label="Siswa" value={siswa} />
      <StatCard icon={Layers} label="Kelas" value={classCount ?? 0} />
      <StatCard icon={BookOpen} label="Mata Pelajaran" value={subjectCount ?? 0} />
    </div>
  );
}

const disabilityOptions = [
  { value: "none", label: "Tidak ada" },
  { value: "tunarungu", label: "Tunarungu" },
  { value: "tunawicara", label: "Tunawicara" },
  { value: "tunanetra", label: "Tunanetra" },
  { value: "buta_warna", label: "Buta Warna" },
];

function PenggunaTab() {
  const { school } = useAuth();
  const qc = useQueryClient();
  const users = useSchoolUsers(school?.id);
  const createFn = useServerFn(createSchoolUser);
  const deleteFn = useServerFn(deleteSchoolUser);
  const resetFn = useServerFn(resetUserPassword);

  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Role>("siswa");
  const [fullName, setFullName] = useState("");
  const [nomorInduk, setNomorInduk] = useState("");
  const [password, setPassword] = useState("");
  const [disability, setDisability] = useState("none");
  const [filter, setFilter] = useState<"all" | Role>("all");

  const createMut = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          role,
          fullName: fullName.trim(),
          nomorInduk: nomorInduk.trim(),
          password,
          disability: disability as never,
        },
      }),
    onSuccess: () => {
      toast.success("Akun berhasil dibuat.");
      setOpen(false);
      setFullName("");
      setNomorInduk("");
      setPassword("");
      setDisability("none");
      qc.invalidateQueries({ queryKey: ["school-users", school?.id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal membuat akun."),
  });

  const deleteMut = useMutation({
    mutationFn: (userId: string) => deleteFn({ data: { userId } }),
    onSuccess: () => {
      toast.success("Akun dihapus.");
      qc.invalidateQueries({ queryKey: ["school-users", school?.id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal menghapus akun."),
  });

  async function handleReset(userId: string) {
    const pw = window.prompt("Kata sandi baru (min. 6 karakter):");
    if (!pw) return;
    try {
      await resetFn({ data: { userId, password: pw } });
      toast.success("Kata sandi diperbarui.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal.");
    }
  }

  const rows = (users.data ?? []).filter((u) => (filter === "all" ? true : u.role === filter));
  const idPrefix = role === "admin" ? "NIA" : role === "guru" ? "NIG" : "NIS";

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
        <div>
          <CardTitle>Manajemen Pengguna</CardTitle>
          <CardDescription>Buat dan kelola akun admin, guru, dan siswa.</CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" aria-hidden /> Tambah Akun
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Buat Akun Baru</DialogTitle>
              <DialogDescription>
                Nomor Induk digunakan untuk masuk. {idPrefix} untuk peran {role}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Peran</Label>
                <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="siswa">Siswa</SelectItem>
                    <SelectItem value="guru">Guru</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fn">Nama Lengkap</Label>
                <Input id="fn" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ni">Nomor Induk ({idPrefix})</Label>
                <Input id="ni" value={nomorInduk} onChange={(e) => setNomorInduk(e.target.value)} placeholder={`Mis. ${idPrefix}2025001`} />
              </div>
              {role === "siswa" && (
                <div className="space-y-2">
                  <Label>Jenis Disabilitas</Label>
                  <Select value={disability} onValueChange={setDisability}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {disabilityOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="pw">Kata sandi awal</Label>
                <Input id="pw" type="text" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => createMut.mutate()}
                disabled={createMut.isPending || !fullName || !nomorInduk || password.length < 6}
              >
                {createMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                Simpan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap gap-2">
          {(["all", "admin", "guru", "siswa"] as const).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
              {f === "all" ? "Semua" : f[0].toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Nomor Induk</TableHead>
                <TableHead>Peran</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.isLoading && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Memuat…</TableCell></TableRow>
              )}
              {!users.isLoading && rows.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Belum ada pengguna.</TableCell></TableRow>
              )}
              {rows.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.full_name}</TableCell>
                  <TableCell>{u.nomor_induk}</TableCell>
                  <TableCell><Badge variant="secondary">{u.role ?? "-"}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleReset(u.id)} aria-label="Reset kata sandi">
                      <KeyRound className="h-4 w-4" aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (window.confirm(`Hapus akun ${u.full_name}?`)) deleteMut.mutate(u.id);
                      }}
                      aria-label="Hapus akun"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" aria-hidden />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function MapelTab() {
  const { school } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const { data } = useQuery({
    queryKey: ["subjects", school?.id],
    enabled: !!school?.id,
    queryFn: async () => {
      const { data } = await supabase.from("subjects").select("*").eq("school_id", school!.id).order("name");
      return data ?? [];
    },
  });

  const addMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("subjects").insert({ school_id: school!.id, name: name.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mata pelajaran ditambahkan.");
      setName("");
      qc.invalidateQueries({ queryKey: ["subjects", school?.id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal."),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subjects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subjects", school?.id] }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mata Pelajaran</CardTitle>
        <CardDescription>Kelola daftar mata pelajaran sekolah.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input placeholder="Nama mata pelajaran" value={name} onChange={(e) => setName(e.target.value)} />
          <Button onClick={() => addMut.mutate()} disabled={!name.trim() || addMut.isPending}>
            <Plus className="mr-2 h-4 w-4" aria-hidden /> Tambah
          </Button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(data ?? []).map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-md border px-3 py-2">
              <span className="text-sm">{s.name}</span>
              <Button variant="ghost" size="icon" onClick={() => delMut.mutate(s.id)} aria-label="Hapus">
                <Trash2 className="h-4 w-4 text-destructive" aria-hidden />
              </Button>
            </div>
          ))}
          {(data ?? []).length === 0 && <p className="text-sm text-muted-foreground">Belum ada mata pelajaran.</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function KelasTab() {
  const { school } = useAuth();
  const qc = useQueryClient();
  const users = useSchoolUsers(school?.id);
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [homeroom, setHomeroom] = useState<string>("none");

  const classes = useQuery({
    queryKey: ["classes", school?.id],
    enabled: !!school?.id,
    queryFn: async () => {
      const { data } = await supabase.from("classes").select("*").eq("school_id", school!.id).order("name");
      return data ?? [];
    },
  });

  const teachers = (users.data ?? []).filter((u) => u.role === "guru");
  const students = (users.data ?? []).filter((u) => u.role === "siswa");

  const addMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("classes").insert({
        school_id: school!.id,
        name: name.trim(),
        grade_level: grade ? Number(grade) : null,
        homeroom_teacher_id: homeroom === "none" ? null : homeroom,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Kelas dibuat.");
      setName("");
      setGrade("");
      setHomeroom("none");
      qc.invalidateQueries({ queryKey: ["classes", school?.id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal."),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Buat Kelas</CardTitle>
          <CardDescription>Tetapkan nama, tingkat, dan wali kelas.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          <Input placeholder="Nama kelas (mis. 7A)" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Tingkat (mis. 7)" type="number" value={grade} onChange={(e) => setGrade(e.target.value)} />
          <Select value={homeroom} onValueChange={setHomeroom}>
            <SelectTrigger><SelectValue placeholder="Wali kelas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Tanpa wali kelas</SelectItem>
              {teachers.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => addMut.mutate()} disabled={!name.trim() || addMut.isPending}>
            <Plus className="mr-2 h-4 w-4" aria-hidden /> Buat
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {(classes.data ?? []).map((c) => (
          <ClassManageCard key={c.id} classId={c.id} name={c.name} students={students} teachers={teachers} />
        ))}
        {(classes.data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">Belum ada kelas.</p>
        )}
      </div>
    </div>
  );
}

function ClassManageCard({
  classId,
  name,
  students,
  teachers,
}: {
  classId: string;
  name: string;
  students: UserRow[];
  teachers: UserRow[];
}) {
  const qc = useQueryClient();
  const [studentId, setStudentId] = useState("none");
  const [teacherId, setTeacherId] = useState("none");

  const enrollments = useQuery({
    queryKey: ["enrollments", classId],
    queryFn: async () => {
      const { data } = await supabase.from("class_enrollments").select("id, student_id").eq("class_id", classId);
      return data ?? [];
    },
  });
  const classTeachers = useQuery({
    queryKey: ["class-teachers", classId],
    queryFn: async () => {
      const { data } = await supabase.from("class_teachers").select("id, teacher_id").eq("class_id", classId);
      return data ?? [];
    },
  });

  const enrollMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("class_enrollments").insert({ class_id: classId, student_id: studentId });
      if (error) throw error;
    },
    onSuccess: () => {
      setStudentId("none");
      qc.invalidateQueries({ queryKey: ["enrollments", classId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Sudah terdaftar / gagal."),
  });

  const assignMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("class_teachers").insert({ class_id: classId, teacher_id: teacherId });
      if (error) throw error;
    },
    onSuccess: () => {
      setTeacherId("none");
      qc.invalidateQueries({ queryKey: ["class-teachers", classId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Sudah ditugaskan / gagal."),
  });

  const nameOf = (id: string, list: UserRow[]) => list.find((u) => u.id === id)?.full_name ?? id;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{name}</CardTitle>
        <CardDescription>
          {enrollments.data?.length ?? 0} siswa · {classTeachers.data?.length ?? 0} guru
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div>
          <p className="mb-1 font-medium">Tambah siswa</p>
          <div className="flex gap-2">
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger><SelectValue placeholder="Pilih siswa" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none" disabled>Pilih siswa</SelectItem>
                {students.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => enrollMut.mutate()} disabled={studentId === "none"}>Tambah</Button>
          </div>
          <ul className="mt-2 list-inside list-disc text-muted-foreground">
            {(enrollments.data ?? []).map((e) => <li key={e.id}>{nameOf(e.student_id, students)}</li>)}
          </ul>
        </div>
        <div>
          <p className="mb-1 font-medium">Tugaskan guru</p>
          <div className="flex gap-2">
            <Select value={teacherId} onValueChange={setTeacherId}>
              <SelectTrigger><SelectValue placeholder="Pilih guru" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none" disabled>Pilih guru</SelectItem>
                {teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => assignMut.mutate()} disabled={teacherId === "none"}>Tugaskan</Button>
          </div>
          <ul className="mt-2 list-inside list-disc text-muted-foreground">
            {(classTeachers.data ?? []).map((t) => <li key={t.id}>{nameOf(t.teacher_id, teachers)}</li>)}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

function LanggananTab() {
  const { school } = useAuth();
  const qc = useQueryClient();
  const [pkg, setPkg] = useState(school?.subscription ?? "basic");

  const saveMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("schools").update({ subscription: pkg }).eq("id", school!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Paket langganan diperbarui.");
      qc.invalidateQueries();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal."),
  });

  const packages = [
    { value: "basic", label: "Basic", desc: "Fitur inti LMS untuk memulai." },
    { value: "pro", label: "Pro", desc: "AI materi & soal, analitik lanjutan." },
    { value: "enterprise", label: "Enterprise", desc: "Face recognition, meeting, dukungan penuh." },
  ] as const;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Paket Langganan</CardTitle>
        <CardDescription>Kelola paket berlangganan sekolah.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {packages.map((p) => (
            <button
              key={p.value}
              onClick={() => setPkg(p.value)}
              className={`rounded-lg border p-4 text-left transition-colors ${
                pkg === p.value ? "border-primary bg-primary/5" : "hover:bg-accent"
              }`}
            >
              <p className="font-semibold">{p.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
            </button>
          ))}
        </div>
        <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>Simpan Perubahan</Button>
      </CardContent>
    </Card>
  );
}
