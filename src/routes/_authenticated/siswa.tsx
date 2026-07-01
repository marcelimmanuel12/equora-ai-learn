import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BookOpen,
  ClipboardList,
  Trophy,
  CalendarCheck,
  ScanFace,
  Bot,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/siswa")({
  head: () => ({ meta: [{ title: "Dashboard Siswa — Equora" }] }),
  component: SiswaDashboard,
});

function SiswaDashboard() {
  return (
    <DashboardShell allow="siswa" title="Dashboard Siswa" subtitle="Belajar, kerjakan kuis, dan pantau progres Anda.">
      <SiswaContent />
    </DashboardShell>
  );
}

function useMyClassIds() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["my-enrollments", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase.from("class_enrollments").select("class_id").eq("student_id", profile!.id);
      return (data ?? []).map((e) => e.class_id);
    },
  });
}

function SiswaContent() {
  return (
    <Tabs defaultValue="beranda" className="space-y-6">
      <TabsList className="flex-wrap">
        <TabsTrigger value="beranda">Beranda</TabsTrigger>
        <TabsTrigger value="materi">Materi</TabsTrigger>
        <TabsTrigger value="kuis">Kuis &amp; Ujian</TabsTrigger>
        <TabsTrigger value="nilai">Nilai &amp; Progress</TabsTrigger>
        <TabsTrigger value="absensi">Absensi</TabsTrigger>
      </TabsList>
      <TabsContent value="beranda"><BerandaTab /></TabsContent>
      <TabsContent value="materi"><MateriTab /></TabsContent>
      <TabsContent value="kuis"><KuisTab /></TabsContent>
      <TabsContent value="nilai"><NilaiTab /></TabsContent>
      <TabsContent value="absensi"><AbsensiTab /></TabsContent>
    </Tabs>
  );
}

function BerandaTab() {
  const ids = useMyClassIds();
  const classes = useQuery({
    queryKey: ["classes-of", ids.data],
    enabled: !!ids.data && ids.data.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("classes").select("id, name, grade_level").in("id", ids.data!);
      return data ?? [];
    },
  });
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-6">
            <Bot className="h-8 w-8 text-primary" aria-hidden />
            <div>
              <p className="font-semibold">AI Chatbot Belajar</p>
              <Badge variant="outline" className="mt-1">Segera hadir</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
      <div>
        <h2 className="mb-3 text-lg font-semibold">Kelas yang Diikuti</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(classes.data ?? []).map((c) => (
            <Card key={c.id}>
              <CardContent className="p-6">
                <BookOpen className="mb-2 h-6 w-6 text-primary" aria-hidden />
                <p className="text-lg font-semibold">{c.name}</p>
                <p className="text-sm text-muted-foreground">Tingkat {c.grade_level ?? "-"}</p>
              </CardContent>
            </Card>
          ))}
          {ids.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">Anda belum terdaftar di kelas manapun.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function MateriTab() {
  const ids = useMyClassIds();
  const materials = useQuery({
    queryKey: ["materials-student", ids.data],
    enabled: !!ids.data && ids.data.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("materials")
        .select("id, title, description, content, created_at")
        .in("class_id", ids.data!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {(materials.data ?? []).map((m) => (
        <Card key={m.id}>
          <CardHeader>
            <CardTitle className="text-base">{m.title}</CardTitle>
            {m.description && <CardDescription>{m.description}</CardDescription>}
          </CardHeader>
          {m.content && (
            <CardContent className="whitespace-pre-wrap text-sm text-muted-foreground">{m.content}</CardContent>
          )}
        </Card>
      ))}
      {(materials.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">Belum ada materi.</p>}
    </div>
  );
}

interface Question {
  question: string;
  options: string[];
  correct: number;
}

function KuisTab() {
  const { profile } = useAuth();
  const ids = useMyClassIds();
  const qc = useQueryClient();
  const [active, setActive] = useState<{ id: string; title: string; questions: Question[] } | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});

  const assessments = useQuery({
    queryKey: ["assessments-student", ids.data],
    enabled: !!ids.data && ids.data.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("assessments")
        .select("id, title, type, questions")
        .in("class_id", ids.data!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const mySubs = useQuery({
    queryKey: ["my-subs", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase.from("submissions").select("assessment_id, score").eq("student_id", profile!.id);
      return data ?? [];
    },
  });
  const doneMap = useMemo(
    () => new Map((mySubs.data ?? []).map((s) => [s.assessment_id, s.score])),
    [mySubs.data],
  );

  const submitMut = useMutation({
    mutationFn: async () => {
      if (!active) return;
      const total = active.questions.length;
      let correct = 0;
      active.questions.forEach((q, i) => {
        if (answers[i] === q.correct) correct += 1;
      });
      const score = total > 0 ? Math.round((correct / total) * 100) : 0;
      const { error } = await supabase.from("submissions").insert({
        assessment_id: active.id,
        student_id: profile!.id,
        answers: active.questions.map((_, i) => answers[i] ?? -1),
        score,
      });
      if (error) throw error;
      return score;
    },
    onSuccess: (score) => {
      toast.success(`Jawaban terkirim! Nilai Anda: ${score}`);
      setActive(null);
      setAnswers({});
      qc.invalidateQueries({ queryKey: ["my-subs", profile?.id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal mengirim."),
  });

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {(assessments.data ?? []).map((a) => {
          const done = doneMap.has(a.id);
          return (
            <Card key={a.id}>
              <CardContent className="flex items-center justify-between p-6">
                <div className="flex items-center gap-3">
                  <ClipboardList className="h-6 w-6 text-primary" aria-hidden />
                  <div>
                    <p className="font-semibold">{a.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.type} · {(a.questions as unknown[])?.length ?? 0} soal
                    </p>
                  </div>
                </div>
                {done ? (
                  <Badge variant="secondary">Nilai: {doneMap.get(a.id) ?? "-"}</Badge>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => {
                      setActive({ id: a.id, title: a.title, questions: (a.questions as Question[]) ?? [] });
                      setAnswers({});
                    }}
                  >
                    Kerjakan
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
        {(assessments.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">Belum ada kuis.</p>}
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{active?.title}</DialogTitle>
            <DialogDescription>Pilih jawaban yang benar untuk setiap soal.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            {active?.questions.map((q, qi) => (
              <fieldset key={qi} className="space-y-2">
                <legend className="font-medium">{qi + 1}. {q.question}</legend>
                {q.options.map((o, oi) => (
                  <label key={oi} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                    <input
                      type="radio"
                      name={`q-${qi}`}
                      checked={answers[qi] === oi}
                      onChange={() => setAnswers((p) => ({ ...p, [qi]: oi }))}
                    />
                    {o}
                  </label>
                ))}
              </fieldset>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => submitMut.mutate()} disabled={submitMut.isPending}>
              {submitMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
              Kirim Jawaban
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function NilaiTab() {
  const { profile } = useAuth();
  const subs = useQuery({
    queryKey: ["my-subs-detail", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("submissions")
        .select("id, score, submitted_at, assessments:assessment_id(title, type)")
        .eq("student_id", profile!.id)
        .order("submitted_at", { ascending: false });
      return data ?? [];
    },
  });

  const scores = (subs.data ?? []).map((s) => Number(s.score ?? 0));
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const points = scores.reduce((a, b) => a + b, 0);
  const badges = Math.floor(points / 300);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-6"><Trophy className="mb-2 h-6 w-6 text-primary" aria-hidden /><p className="text-2xl font-bold">{points}</p><p className="text-sm text-muted-foreground">Total Poin</p></CardContent></Card>
        <Card><CardContent className="p-6"><CheckCircle2 className="mb-2 h-6 w-6 text-primary" aria-hidden /><p className="text-2xl font-bold">{avg}</p><p className="text-sm text-muted-foreground">Rata-rata Nilai</p></CardContent></Card>
        <Card><CardContent className="p-6"><Badge className="mb-2">{badges}</Badge><p className="text-2xl font-bold">{badges} Badge</p><p className="text-sm text-muted-foreground">Pencapaian</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Progress Belajar</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="mb-1 flex justify-between text-sm"><span>Rata-rata</span><span>{avg}%</span></div>
            <Progress value={avg} />
          </div>
          <div className="space-y-2">
            {(subs.data ?? []).map((s) => {
              const a = s.assessments as unknown as { title: string; type: string } | null;
              return (
                <div key={s.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>{a?.title ?? "Penilaian"} <span className="text-muted-foreground">({a?.type})</span></span>
                  <Badge variant="secondary">{s.score ?? "-"}</Badge>
                </div>
              );
            })}
            {(subs.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">Belum ada nilai.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AbsensiTab() {
  const { profile } = useAuth();
  const ids = useMyClassIds();
  const qc = useQueryClient();
  const [classId, setClassId] = useState("");

  const classes = useQuery({
    queryKey: ["classes-of", ids.data],
    enabled: !!ids.data && ids.data.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("classes").select("id, name").in("id", ids.data!);
      return data ?? [];
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  const history = useQuery({
    queryKey: ["attendance", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance")
        .select("id, date, status, method, class_id")
        .eq("student_id", profile!.id)
        .order("date", { ascending: false });
      return data ?? [];
    },
  });

  const markMut = useMutation({
    mutationFn: async (method: string) => {
      if (!classId) throw new Error("Pilih kelas dulu.");
      const { error } = await supabase.from("attendance").insert({
        class_id: classId,
        student_id: profile!.id,
        date: today,
        status: "hadir",
        method,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Kehadiran tercatat.");
      qc.invalidateQueries({ queryKey: ["attendance", profile?.id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Sudah absen hari ini / gagal."),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Absensi Hari Ini</CardTitle>
          <CardDescription>Tandai kehadiran Anda ({today}).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <select
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
          >
            <option value="">Pilih kelas</option>
            {(classes.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => markMut.mutate("manual")} disabled={!classId || markMut.isPending}>
              <CalendarCheck className="mr-2 h-4 w-4" aria-hidden /> Absen Manual
            </Button>
            <Button variant="outline" onClick={() => markMut.mutate("face_recognition")} disabled={!classId || markMut.isPending}>
              <ScanFace className="mr-2 h-4 w-4" aria-hidden /> Face Recognition
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Absensi Face Recognition penuh (kamera) akan aktif pada paket Enterprise.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Riwayat Kehadiran</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(history.data ?? []).map((h) => (
            <div key={h.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <span>{h.date}</span>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{h.status}</Badge>
                <span className="text-xs text-muted-foreground">{h.method}</span>
              </div>
            </div>
          ))}
          {(history.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">Belum ada riwayat.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
