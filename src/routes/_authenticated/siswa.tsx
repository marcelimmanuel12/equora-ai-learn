import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  FileText,
  Video,
  ClipboardList,
  Gamepad2,
  FileCheck2,
  Bot,
  Trophy,
  UserRound,
  CalendarCheck,
  ScanFace,
  Loader2,
  CheckCircle2,
  Clock,
  MapPin,
  Sparkles,
  Star,
  Award,
  Hand,
  Presentation,
  MessagesSquare,
  Paperclip,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SidebarShell, type MenuItem } from "@/components/dashboard/SidebarShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { ChatBotView } from "@/components/chat/ChatBotView";

export const Route = createFileRoute("/_authenticated/siswa")({
  head: () => ({ meta: [{ title: "Dashboard Siswa — Equora" }] }),
  component: SiswaDashboard,
});

const MENU: MenuItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "jadwal", label: "Jadwal", icon: CalendarDays },
  { id: "kelas", label: "Kelas", icon: BookOpen },
  { id: "materi", label: "Materi", icon: FileText },
  { id: "meeting", label: "Meeting", icon: Video },
  { id: "quiz", label: "Quiz", icon: ClipboardList },
  { id: "game", label: "Game Edukasi", icon: Gamepad2 },
  { id: "ujian", label: "Ujian", icon: FileCheck2 },
  { id: "chatbot", label: "AI Chatbot", icon: Bot },
  { id: "prestasi", label: "Prestasi", icon: Trophy },
  { id: "profil", label: "Profil", icon: UserRound },
];

const DAYS = ["", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

function SiswaDashboard() {
  const [active, setActive] = useState("dashboard");
  return (
    <SidebarShell allow="siswa" menu={MENU} active={active} onSelect={setActive}>
      {active === "dashboard" && <DashboardTab onNavigate={setActive} />}
      {active === "jadwal" && <JadwalTab />}
      {active === "kelas" && <KelasTab />}
      {active === "materi" && <MateriTab />}
      {active === "meeting" && <MeetingTab />}
      {active === "quiz" && <AssessmentTab types={["kuis", "tugas"]} emptyText="Belum ada kuis atau latihan soal." />}
      {active === "game" && <GameTab />}
      {active === "ujian" && <AssessmentTab types={["ujian"]} emptyText="Belum ada ujian yang dijadwalkan." isExam />}
      {active === "chatbot" && <ChatbotTab />}
      {active === "prestasi" && <PrestasiTab />}
      {active === "profil" && <ProfilTab />}
    </SidebarShell>
  );
}

/* ------------------------------------------------------------------ */
/* Shared data hooks                                                   */
/* ------------------------------------------------------------------ */
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

function useMySubmissions() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["my-subs", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("submissions")
        .select("assessment_id, score, submitted_at")
        .eq("student_id", profile!.id);
      return data ?? [];
    },
  });
}

/* ------------------------------------------------------------------ */
/* Dashboard (beranda)                                                 */
/* ------------------------------------------------------------------ */
function DashboardTab({ onNavigate }: { onNavigate: (id: string) => void }) {
  const { profile } = useAuth();
  const ids = useMyClassIds();
  const subs = useMySubmissions();

  const assessments = useQuery({
    queryKey: ["assessments-count", ids.data],
    enabled: !!ids.data && ids.data.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("assessments").select("id, type").in("class_id", ids.data!);
      return data ?? [];
    },
  });

  const todaySchedule = useQuery({
    queryKey: ["schedule-today", ids.data],
    enabled: !!ids.data && ids.data.length > 0,
    queryFn: async () => {
      const dow = ((new Date().getDay() + 6) % 7) + 1; // JS Sun=0 → 7, Mon=1
      const { data } = await supabase
        .from("schedules")
        .select("id, title, start_time, end_time, location, class_id, subjects:subject_id(name)")
        .in("class_id", ids.data!)
        .eq("day_of_week", dow)
        .order("start_time");
      return data ?? [];
    },
  });

  const scores = (subs.data ?? []).map((s) => Number(s.score ?? 0));
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const points = scores.reduce((a, b) => a + b, 0);
  const doneCount = subs.data?.length ?? 0;
  const totalAssessments = assessments.data?.length ?? 0;
  const pending = Math.max(totalAssessments - doneCount, 0);

  const stats = [
    { label: "Kelas Diikuti", value: ids.data?.length ?? 0, icon: BookOpen },
    { label: "Tugas Belum Selesai", value: pending, icon: ClipboardList },
    { label: "Rata-rata Nilai", value: avg, icon: CheckCircle2 },
    { label: "Total Poin", value: points, icon: Star },
  ];

  return (
    <div className="space-y-6">
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="p-6">
          <p className="text-sm opacity-90">Selamat datang kembali,</p>
          <p className="text-2xl font-bold">{profile?.full_name}</p>
          <p className="mt-1 text-sm opacity-90">Semangat belajar hari ini! 🎯</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 p-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <s.icon className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="text-2xl font-bold leading-none">{s.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-5 w-5 text-primary" aria-hidden /> Jadwal Hari Ini
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(todaySchedule.data ?? []).map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">{(s.subjects as { name: string } | null)?.name ?? s.title ?? "Pelajaran"}</p>
                  {s.location && <p className="text-xs text-muted-foreground">{s.location}</p>}
                </div>
                <Badge variant="secondary">
                  {s.start_time?.slice(0, 5)}–{s.end_time?.slice(0, 5)}
                </Badge>
              </div>
            ))}
            {(todaySchedule.data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Tidak ada jadwal hari ini.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-5 w-5 text-primary" aria-hidden /> Akses Cepat
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {["materi", "quiz", "meeting", "chatbot"].map((id) => {
              const item = MENU.find((m) => m.id === id)!;
              return (
                <Button key={id} variant="outline" className="justify-start" onClick={() => onNavigate(id)}>
                  <item.icon className="mr-2 h-4 w-4" aria-hidden /> {item.label}
                </Button>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Jadwal                                                              */
/* ------------------------------------------------------------------ */
function JadwalTab() {
  const ids = useMyClassIds();
  const schedule = useQuery({
    queryKey: ["schedule-all", ids.data],
    enabled: !!ids.data && ids.data.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("schedules")
        .select("id, title, day_of_week, start_time, end_time, location, subjects:subject_id(name), classes:class_id(name)")
        .in("class_id", ids.data!)
        .order("start_time");
      return data ?? [];
    },
  });

  const todayDow = ((new Date().getDay() + 6) % 7) + 1;
  const byDay = useMemo(() => {
    const map = new Map<number, typeof schedule.data>();
    (schedule.data ?? []).forEach((s) => {
      const arr = map.get(s.day_of_week) ?? [];
      arr.push(s);
      map.set(s.day_of_week, arr as never);
    });
    return map;
  }, [schedule.data]);

  if (ids.data?.length === 0) {
    return <EmptyNote>Anda belum terdaftar di kelas manapun.</EmptyNote>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((d) => (
        <Card key={d} className={d === todayDow ? "border-primary ring-1 ring-primary/30" : undefined}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              {DAYS[d]}
              {d === todayDow && <Badge>Hari ini</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(byDay.get(d) ?? []).map((s) => (
              <div key={s.id} className="rounded-md border p-2.5 text-sm">
                <p className="font-medium">
                  {(s.subjects as { name: string } | null)?.name ?? s.title ?? "Pelajaran"}
                </p>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" aria-hidden /> {s.start_time?.slice(0, 5)}–{s.end_time?.slice(0, 5)}
                  </span>
                  {s.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" aria-hidden /> {s.location}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {(byDay.get(d) ?? []).length === 0 && (
              <p className="text-xs text-muted-foreground">Tidak ada pelajaran.</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Kelas + Absensi                                                     */
/* ------------------------------------------------------------------ */
function KelasTab() {
  const { profile } = useAuth();
  const ids = useMyClassIds();
  const qc = useQueryClient();
  const [classId, setClassId] = useState("");

  const classes = useQuery({
    queryKey: ["classes-of", ids.data],
    enabled: !!ids.data && ids.data.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("classes").select("id, name, grade_level").in("id", ids.data!);
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
        .select("id, date, status, method")
        .eq("student_id", profile!.id)
        .order("date", { ascending: false })
        .limit(10);
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

  if (ids.data?.length === 0) {
    return <EmptyNote>Anda belum terdaftar di kelas manapun. Hubungi admin sekolah.</EmptyNote>;
  }

  return (
    <div className="space-y-6">
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
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ScanFace className="h-5 w-5 text-primary" aria-hidden /> Absensi ({today})
            </CardTitle>
            <CardDescription>Tandai kehadiran sebelum masuk kelas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              aria-label="Pilih kelas untuk absensi"
            >
              <option value="">Pilih kelas</option>
              {(classes.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => markMut.mutate("manual")} disabled={!classId || markMut.isPending}>
                <CalendarCheck className="mr-2 h-4 w-4" aria-hidden /> Absen Manual
              </Button>
              <Button
                variant="outline"
                onClick={() => markMut.mutate("face_recognition")}
                disabled={!classId || markMut.isPending}
              >
                <ScanFace className="mr-2 h-4 w-4" aria-hidden /> Face Recognition
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Absensi Face Recognition dengan kamera akan aktif pada paket Enterprise.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Riwayat Kehadiran</CardTitle></CardHeader>
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
            {(history.data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Belum ada riwayat.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Materi                                                              */
/* ------------------------------------------------------------------ */
function MateriTab() {
  const ids = useMyClassIds();
  const materials = useQuery({
    queryKey: ["materials-student", ids.data],
    enabled: !!ids.data && ids.data.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("materials")
        .select("id, title, description, content, file_url, created_at")
        .in("class_id", ids.data!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  if ((materials.data ?? []).length === 0) {
    return <EmptyNote>Belum ada materi. Materi dari guru akan muncul di sini.</EmptyNote>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {(materials.data ?? []).map((m) => (
        <Card key={m.id}>
          <CardHeader>
            <CardTitle className="text-base">{m.title}</CardTitle>
            {m.description && <CardDescription>{m.description}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-3">
            {m.content && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{m.content}</p>}
            {m.file_url && (
              <a
                href={m.file_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                <Paperclip className="h-4 w-4" aria-hidden /> Buka lampiran
              </a>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Quiz / Ujian runner                                                 */
/* ------------------------------------------------------------------ */
interface Question {
  question: string;
  options: string[];
  correct: number;
}

function AssessmentTab({
  types,
  emptyText,
  isExam,
}: {
  types: Array<"kuis" | "tugas" | "ujian" | "game">;
  emptyText: string;
  isExam?: boolean;
}) {
  const { profile } = useAuth();
  const ids = useMyClassIds();
  const qc = useQueryClient();
  const [activeAsmt, setActiveAsmt] = useState<{ id: string; title: string; questions: Question[] } | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});

  const assessments = useQuery({
    queryKey: ["assessments-student", ids.data, types.join(",")],
    enabled: !!ids.data && ids.data.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("assessments")
        .select("id, title, type, questions")
        .in("class_id", ids.data!)
        .in("type", types)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const mySubs = useMySubmissions();
  const doneMap = useMemo(
    () => new Map((mySubs.data ?? []).map((s) => [s.assessment_id, s.score])),
    [mySubs.data],
  );

  const submitMut = useMutation({
    mutationFn: async () => {
      if (!activeAsmt) return 0;
      const total = activeAsmt.questions.length;
      let correct = 0;
      activeAsmt.questions.forEach((q, i) => {
        if (answers[i] === q.correct) correct += 1;
      });
      const score = total > 0 ? Math.round((correct / total) * 100) : 0;
      const { error } = await supabase.from("submissions").insert({
        assessment_id: activeAsmt.id,
        student_id: profile!.id,
        answers: activeAsmt.questions.map((_, i) => answers[i] ?? -1),
        score,
      });
      if (error) throw error;
      return score;
    },
    onSuccess: (score) => {
      toast.success(`Jawaban terkirim! Nilai Anda: ${score}`);
      setActiveAsmt(null);
      setAnswers({});
      qc.invalidateQueries({ queryKey: ["my-subs", profile?.id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal mengirim."),
  });

  if (ids.data?.length === 0) return <EmptyNote>Anda belum terdaftar di kelas manapun.</EmptyNote>;
  if ((assessments.data ?? []).length === 0) return <EmptyNote>{emptyText}</EmptyNote>;

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {(assessments.data ?? []).map((a) => {
          const done = doneMap.has(a.id);
          return (
            <Card key={a.id}>
              <CardContent className="flex items-center justify-between p-6">
                <div className="flex items-center gap-3">
                  {isExam ? (
                    <FileCheck2 className="h-6 w-6 text-primary" aria-hidden />
                  ) : (
                    <ClipboardList className="h-6 w-6 text-primary" aria-hidden />
                  )}
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
                      setActiveAsmt({
                        id: a.id,
                        title: a.title,
                        questions: (a.questions as unknown as Question[]) ?? [],
                      });
                      setAnswers({});
                    }}
                  >
                    {isExam ? "Mulai Ujian" : "Kerjakan"}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!activeAsmt} onOpenChange={(o) => !o && setActiveAsmt(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{activeAsmt?.title}</DialogTitle>
            <DialogDescription>Pilih jawaban yang benar untuk setiap soal.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            {activeAsmt?.questions.map((q, qi) => (
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

/* ------------------------------------------------------------------ */
/* Prestasi                                                            */
/* ------------------------------------------------------------------ */
function PrestasiTab() {
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
  const xp = scores.reduce((a, b) => a + b, 0);
  const level = Math.floor(xp / 500) + 1;
  const xpInLevel = xp % 500;
  const badges = Math.floor(xp / 300);

  const achievements = [
    { name: "Langkah Pertama", desc: "Selesaikan 1 aktivitas", unlocked: scores.length >= 1 },
    { name: "Rajin Belajar", desc: "Selesaikan 5 aktivitas", unlocked: scores.length >= 5 },
    { name: "Nilai Sempurna", desc: "Raih nilai 100", unlocked: scores.some((s) => s === 100) },
    { name: "Konsisten", desc: "Rata-rata di atas 80", unlocked: avg >= 80 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Star} value={xp} label="Total XP" />
        <StatCard icon={Trophy} value={`Level ${level}`} label={`${xpInLevel}/500 XP`} />
        <StatCard icon={Award} value={badges} label="Badge" />
        <StatCard icon={CheckCircle2} value={avg} label="Rata-rata Nilai" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Progress Menuju Level {level + 1}</CardTitle></CardHeader>
        <CardContent>
          <div className="mb-1 flex justify-between text-sm">
            <span>XP</span><span>{xpInLevel} / 500</span>
          </div>
          <Progress value={(xpInLevel / 500) * 100} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Badge &amp; Achievement</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {achievements.map((a) => (
            <div
              key={a.name}
              className={`flex items-center gap-3 rounded-md border p-3 ${a.unlocked ? "" : "opacity-50"}`}
            >
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  a.unlocked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                }`}
              >
                <Award className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-medium">{a.name}</p>
                <p className="text-xs text-muted-foreground">{a.desc}</p>
              </div>
              {a.unlocked && <Badge className="ml-auto">Terbuka</Badge>}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Riwayat Nilai</CardTitle></CardHeader>
        <CardContent className="space-y-2">
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
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Profil                                                              */
/* ------------------------------------------------------------------ */
const DISABILITY_LABEL: Record<string, string> = {
  none: "Tidak ada",
  tunarungu: "Tunarungu",
  tunawicara: "Tunawicara",
  tunanetra: "Tunanetra",
  buta_warna: "Buta Warna",
};

function ProfilTab() {
  const { profile, school, role } = useAuth();
  if (!profile) return null;
  const rows = [
    { label: "Nama Lengkap", value: profile.full_name },
    { label: "Nomor Induk Siswa (NIS)", value: profile.nomor_induk },
    { label: "Sekolah", value: school?.name ?? "-" },
    { label: "Peran", value: role === "siswa" ? "Siswa" : role ?? "-" },
    { label: "Kebutuhan Khusus", value: DISABILITY_LABEL[profile.disability] ?? profile.disability },
    { label: "Status Akun", value: profile.is_active ? "Aktif" : "Nonaktif" },
  ];
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="text-base">Data Diri</CardTitle>
        <CardDescription>
          Untuk mengubah data, hubungi admin sekolah Anda.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="divide-y">
          {rows.map((r) => (
            <div key={r.label} className="flex flex-wrap justify-between gap-2 py-3">
              <dt className="text-sm text-muted-foreground">{r.label}</dt>
              <dd className="text-sm font-medium">{r.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Coming-soon placeholders                                            */
/* ------------------------------------------------------------------ */
function MeetingTab() {
  return (
    <ComingSoon
      icon={Video}
      title="Kelas Daring (Meeting)"
      desc="Ikuti kelas daring langsung dari Equora tanpa aplikasi tambahan."
      features={[
        { icon: Video, text: "Video & Voice Call" },
        { icon: MessagesSquare, text: "Chat & Raise Hand" },
        { icon: Presentation, text: "Screen Sharing & Whiteboard" },
        { icon: Hand, text: "Live Caption & Penerjemah BISINDO" },
      ]}
    />
  );
}

function GameTab() {
  return (
    <ComingSoon
      icon={Gamepad2}
      title="Game Edukasi"
      desc="Belajar sambil bermain dan kumpulkan XP, badge, serta naik level."
      features={[
        { icon: Gamepad2, text: "Drag & Drop, Matching Card, Puzzle" },
        { icon: Star, text: "Tebak Gambar, Memory Game, Word Search" },
        { icon: Trophy, text: "Quiz Challenge & Leaderboard" },
        { icon: Award, text: "XP, Badge, Level, Achievement" },
      ]}
    />
  );
}

function ChatbotTab() {
  return <ChatBotView audience="siswa" />;
}

/* ------------------------------------------------------------------ */
/* Small shared UI                                                     */
/* ------------------------------------------------------------------ */
function StatCard({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Star;
  value: string | number;
  label: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <Icon className="mb-2 h-6 w-6 text-primary" aria-hidden />
        <p className="text-2xl font-bold leading-none">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-8 text-center text-sm text-muted-foreground">{children}</CardContent>
    </Card>
  );
}

function ComingSoon({
  icon: Icon,
  title,
  desc,
  features,
}: {
  icon: typeof Video;
  title: string;
  desc: string;
  features: { icon: typeof Video; text: string }[];
}) {
  return (
    <Card>
      <CardContent className="p-8">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="h-8 w-8" aria-hidden />
          </span>
          <h2 className="mt-4 text-xl font-bold">{title}</h2>
          <Badge variant="outline" className="mt-2">Segera hadir</Badge>
          <p className="mt-3 max-w-md text-sm text-muted-foreground">{desc}</p>
        </div>
        <div className="mx-auto mt-6 grid max-w-lg gap-3 sm:grid-cols-2">
          {features.map((f) => (
            <div key={f.text} className="flex items-center gap-2.5 rounded-md border p-3 text-sm">
              <f.icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span>{f.text}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
