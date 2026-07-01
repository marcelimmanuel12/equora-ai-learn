import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, FileText, ClipboardList, Sparkles, Video, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/guru")({
  head: () => ({ meta: [{ title: "Dashboard Guru — Equora" }] }),
  component: GuruDashboard,
});

function GuruDashboard() {
  return (
    <DashboardShell allow="guru" title="Dashboard Guru" subtitle="Kelola materi, penilaian, dan pantau perkembangan siswa.">
      <GuruContent />
    </DashboardShell>
  );
}

function useMyClasses() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["my-classes", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const [{ data: taught }, { data: homeroom }] = await Promise.all([
        supabase.from("class_teachers").select("class_id").eq("teacher_id", profile!.id),
        supabase.from("classes").select("id").eq("homeroom_teacher_id", profile!.id),
      ]);
      const ids = new Set<string>();
      (taught ?? []).forEach((t) => ids.add(t.class_id));
      (homeroom ?? []).forEach((h) => ids.add(h.id));
      if (ids.size === 0) return [];
      const { data } = await supabase.from("classes").select("id, name, grade_level").in("id", Array.from(ids));
      return data ?? [];
    },
  });
}

function GuruContent() {
  return (
    <Tabs defaultValue="kelas" className="space-y-6">
      <TabsList className="flex-wrap">
        <TabsTrigger value="kelas">Kelas Saya</TabsTrigger>
        <TabsTrigger value="materi">Materi</TabsTrigger>
        <TabsTrigger value="penilaian">Penilaian</TabsTrigger>
        <TabsTrigger value="nilai">Nilai Siswa</TabsTrigger>
        <TabsTrigger value="alat">AI &amp; Meeting</TabsTrigger>
      </TabsList>
      <TabsContent value="kelas"><KelasSayaTab /></TabsContent>
      <TabsContent value="materi"><MateriTab /></TabsContent>
      <TabsContent value="penilaian"><PenilaianTab /></TabsContent>
      <TabsContent value="nilai"><NilaiTab /></TabsContent>
      <TabsContent value="alat"><AlatTab /></TabsContent>
    </Tabs>
  );
}

function KelasSayaTab() {
  const classes = useMyClasses();
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {classes.isLoading && <p className="text-sm text-muted-foreground">Memuat…</p>}
      {(classes.data ?? []).map((c) => (
        <Card key={c.id}>
          <CardContent className="p-6">
            <p className="text-lg font-semibold">{c.name}</p>
            <p className="text-sm text-muted-foreground">Tingkat {c.grade_level ?? "-"}</p>
          </CardContent>
        </Card>
      ))}
      {!classes.isLoading && (classes.data ?? []).length === 0 && (
        <p className="text-sm text-muted-foreground">
          Anda belum ditugaskan ke kelas manapun. Hubungi admin sekolah.
        </p>
      )}
    </div>
  );
}

function useSubjects() {
  const { school } = useAuth();
  return useQuery({
    queryKey: ["subjects", school?.id],
    enabled: !!school?.id,
    queryFn: async () => {
      const { data } = await supabase.from("subjects").select("id, name").eq("school_id", school!.id).order("name");
      return data ?? [];
    },
  });
}

function MateriTab() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const classes = useMyClasses();
  const subjects = useSubjects();
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("none");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");

  const materials = useQuery({
    queryKey: ["materials-teacher", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("materials")
        .select("id, title, class_id, created_at")
        .eq("teacher_id", profile!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const addMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("materials").insert({
        class_id: classId,
        subject_id: subjectId === "none" ? null : subjectId,
        teacher_id: profile!.id,
        title: title.trim(),
        description: description.trim() || null,
        content: content.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Materi diunggah dan langsung tampil di siswa kelas ini.");
      setTitle(""); setDescription(""); setContent("");
      qc.invalidateQueries({ queryKey: ["materials-teacher", profile?.id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal."),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("materials").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["materials-teacher", profile?.id] }),
  });

  const classNameOf = (id: string) => classes.data?.find((c) => c.id === id)?.name ?? "";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Unggah Materi</CardTitle>
          <CardDescription>Materi otomatis muncul di dashboard siswa kelas terkait.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Kelas</Label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
                <SelectContent>
                  {(classes.data ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mata Pelajaran</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger><SelectValue placeholder="Opsional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Umum</SelectItem>
                  {(subjects.data ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Judul</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Deskripsi</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Isi Materi</Label>
            <Textarea rows={5} value={content} onChange={(e) => setContent(e.target.value)} />
          </div>
          <Button onClick={() => addMut.mutate()} disabled={!classId || !title.trim() || addMut.isPending}>
            <Plus className="mr-2 h-4 w-4" aria-hidden /> Unggah
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Materi Saya</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(materials.data ?? []).map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-md border px-3 py-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" aria-hidden />
                <div>
                  <p className="text-sm font-medium">{m.title}</p>
                  <p className="text-xs text-muted-foreground">{classNameOf(m.class_id)}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => delMut.mutate(m.id)} aria-label="Hapus">
                <Trash2 className="h-4 w-4 text-destructive" aria-hidden />
              </Button>
            </div>
          ))}
          {(materials.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">Belum ada materi.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

interface QuestionDraft {
  question: string;
  options: string[];
  correct: number;
}

function PenilaianTab() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const classes = useMyClasses();
  const subjects = useSubjects();
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("none");
  const [type, setType] = useState("kuis");
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<QuestionDraft[]>([
    { question: "", options: ["", "", "", ""], correct: 0 },
  ]);

  const assessments = useQuery({
    queryKey: ["assessments-teacher", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("assessments")
        .select("id, title, type, class_id, questions")
        .eq("teacher_id", profile!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const addMut = useMutation({
    mutationFn: async () => {
      const clean = questions
        .filter((q) => q.question.trim())
        .map((q) => ({ question: q.question.trim(), options: q.options.map((o) => o.trim()), correct: q.correct }));
      if (clean.length === 0) throw new Error("Tambahkan minimal satu soal.");
      const { error } = await supabase.from("assessments").insert({
        class_id: classId,
        subject_id: subjectId === "none" ? null : subjectId,
        teacher_id: profile!.id,
        title: title.trim(),
        type: type as never,
        questions: clean,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Penilaian dibuat dan tersedia untuk siswa.");
      setTitle("");
      setQuestions([{ question: "", options: ["", "", "", ""], correct: 0 }]);
      qc.invalidateQueries({ queryKey: ["assessments-teacher", profile?.id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal."),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("assessments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assessments-teacher", profile?.id] }),
  });

  function updateQuestion(i: number, patch: Partial<QuestionDraft>) {
    setQuestions((prev) => prev.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  }
  function updateOption(qi: number, oi: number, val: string) {
    setQuestions((prev) =>
      prev.map((q, idx) => (idx === qi ? { ...q, options: q.options.map((o, j) => (j === oi ? val : o)) } : q)),
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Buat Kuis / Tugas / Ujian</CardTitle>
          <CardDescription>Soal pilihan ganda dinilai otomatis saat siswa mengerjakan.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger><SelectValue placeholder="Kelas" /></SelectTrigger>
              <SelectContent>
                {(classes.data ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger><SelectValue placeholder="Mapel" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Umum</SelectItem>
                {(subjects.data ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="kuis">Kuis</SelectItem>
                <SelectItem value="tugas">Tugas</SelectItem>
                <SelectItem value="ujian">Ujian</SelectItem>
                <SelectItem value="game">Game</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Input placeholder="Judul penilaian" value={title} onChange={(e) => setTitle(e.target.value)} />

          {questions.map((q, qi) => (
            <div key={qi} className="space-y-2 rounded-md border p-3">
              <Input
                placeholder={`Soal ${qi + 1}`}
                value={q.question}
                onChange={(e) => updateQuestion(qi, { question: e.target.value })}
              />
              {q.options.map((o, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correct-${qi}`}
                    checked={q.correct === oi}
                    onChange={() => updateQuestion(qi, { correct: oi })}
                    aria-label={`Tandai opsi ${oi + 1} sebagai benar`}
                  />
                  <Input placeholder={`Opsi ${oi + 1}`} value={o} onChange={(e) => updateOption(qi, oi, e.target.value)} />
                </div>
              ))}
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQuestions((p) => [...p, { question: "", options: ["", "", "", ""], correct: 0 }])}
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden /> Tambah Soal
          </Button>
          <div>
            <Button onClick={() => addMut.mutate()} disabled={!classId || !title.trim() || addMut.isPending}>
              {addMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
              Simpan Penilaian
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Penilaian Saya</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(assessments.data ?? []).map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-md border px-3 py-2">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" aria-hidden />
                <div>
                  <p className="text-sm font-medium">{a.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {(a.questions as unknown[])?.length ?? 0} soal
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{a.type}</Badge>
                <Button variant="ghost" size="icon" onClick={() => delMut.mutate(a.id)} aria-label="Hapus">
                  <Trash2 className="h-4 w-4 text-destructive" aria-hidden />
                </Button>
              </div>
            </div>
          ))}
          {(assessments.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">Belum ada penilaian.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

function NilaiTab() {
  const { profile } = useAuth();
  const assessments = useQuery({
    queryKey: ["assessments-teacher", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("assessments")
        .select("id, title")
        .eq("teacher_id", profile!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  const [assessmentId, setAssessmentId] = useState("");

  const submissions = useQuery({
    queryKey: ["submissions", assessmentId],
    enabled: !!assessmentId,
    queryFn: async () => {
      const { data } = await supabase
        .from("submissions")
        .select("id, score, submitted_at, student_id, profiles:student_id(full_name, nomor_induk)")
        .eq("assessment_id", assessmentId);
      return data ?? [];
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nilai Siswa</CardTitle>
        <CardDescription>Hasil pengerjaan siswa masuk otomatis di sini.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={assessmentId} onValueChange={setAssessmentId}>
          <SelectTrigger className="max-w-sm"><SelectValue placeholder="Pilih penilaian" /></SelectTrigger>
          <SelectContent>
            {(assessments.data ?? []).map((a) => <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>)}
          </SelectContent>
        </Select>
        {assessmentId && (
          <div className="space-y-2">
            {(submissions.data ?? []).map((s) => {
              const prof = s.profiles as unknown as { full_name: string; nomor_induk: string } | null;
              return (
                <div key={s.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>{prof?.full_name ?? s.student_id} <span className="text-muted-foreground">({prof?.nomor_induk})</span></span>
                  <Badge>{s.score ?? "-"}</Badge>
                </div>
              );
            })}
            {(submissions.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">Belum ada pengerjaan.</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AlatTab() {
  const tools = [
    { icon: Sparkles, title: "AI Pembuat Materi & Soal", desc: "Bantu membuat materi, soal, dan presentasi otomatis." },
    { icon: Video, title: "Meeting Kelas Online", desc: "Adakan kelas langsung dengan siswa." },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {tools.map((t) => (
        <Card key={t.title}>
          <CardContent className="p-6">
            <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <t.icon className="h-5 w-5" aria-hidden />
            </span>
            <p className="font-semibold">{t.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t.desc}</p>
            <Badge variant="outline" className="mt-3">Segera hadir</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
