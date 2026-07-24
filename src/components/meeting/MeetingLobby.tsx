import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Video, Plus, LogIn, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MeetingRoom } from "./MeetingRoom";

interface MeetingRow {
  id: string;
  code: string;
  title: string;
  class_id: string;
  is_active: boolean;
  started_at: string;
  ended_at: string | null;
  classes?: { name: string } | null;
}

function randomCode() {
  return Math.random().toString(36).slice(2, 5) + "-" + Math.random().toString(36).slice(2, 6);
}

/* -------- Guru lobby -------- */
export function MeetingLobbyGuru() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [active, setActive] = useState<MeetingRow | null>(null);
  const [title, setTitle] = useState("");
  const [classId, setClassId] = useState<string>("");

  const classes = useQuery({
    queryKey: ["my-classes-meeting", profile?.id],
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
      const { data } = await supabase.from("classes").select("id, name").in("id", Array.from(ids));
      return data ?? [];
    },
  });

  const meetings = useQuery({
    queryKey: ["meetings-guru", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meetings")
        .select("id, code, title, class_id, is_active, started_at, ended_at, classes(name)")
        .order("started_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as MeetingRow[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !classId) throw new Error("Isi judul dan pilih kelas.");
      if (!profile) throw new Error("Sesi tidak valid.");
      const code = randomCode();
      const { data, error } = await supabase
        .from("meetings")
        .insert({
          school_id: profile.school_id,
          class_id: classId,
          teacher_id: profile.id,
          code,
          title: title.trim(),
        })
        .select("id, code, title, class_id, is_active, started_at, ended_at")
        .single();
      if (error) throw error;
      return data as MeetingRow;
    },
    onSuccess: (m) => {
      setTitle("");
      qc.invalidateQueries({ queryKey: ["meetings-guru"] });
      setActive(m);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const end = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("meetings")
        .update({ is_active: false, ended_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meetings-guru"] }),
  });

  if (active) {
    return (
      <MeetingRoom
        meetingCode={active.code}
        meetingTitle={active.title}
        onLeave={() => setActive(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Buat Meeting Baru</CardTitle>
          <CardDescription>Kelas daring langsung tanpa aplikasi tambahan.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <div>
            <Label htmlFor="mt-title">Judul</Label>
            <Input id="mt-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="mis. Diskusi Matematika Bab 3" />
          </div>
          <div>
            <Label htmlFor="mt-class">Kelas</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger id="mt-class"><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
              <SelectContent>
                {(classes.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={() => create.mutate()} disabled={create.isPending} className="w-full">
              <Plus className="mr-1 h-4 w-4" aria-hidden /> Mulai
            </Button>
          </div>
        </CardContent>
      </Card>

      <MeetingList
        rows={meetings.data ?? []}
        loading={meetings.isLoading}
        onJoin={(m) => setActive(m)}
        onEnd={(m) => end.mutate(m.id)}
        canEnd
      />
    </div>
  );
}

/* -------- Siswa lobby -------- */
export function MeetingLobbySiswa() {
  const { profile } = useAuth();
  const [active, setActive] = useState<MeetingRow | null>(null);
  const [joinCode, setJoinCode] = useState("");

  const meetings = useQuery({
    queryKey: ["meetings-siswa", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meetings")
        .select("id, code, title, class_id, is_active, started_at, ended_at, classes(name)")
        .eq("is_active", true)
        .order("started_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MeetingRow[];
    },
  });

  async function joinByCode() {
    const code = joinCode.trim();
    if (!code) return;
    const { data, error } = await supabase
      .from("meetings")
      .select("id, code, title, class_id, is_active, started_at, ended_at")
      .eq("code", code)
      .eq("is_active", true)
      .maybeSingle();
    if (error || !data) {
      toast.error("Kode meeting tidak ditemukan atau sudah berakhir.");
      return;
    }
    setActive(data as MeetingRow);
  }

  if (active) {
    return (
      <MeetingRoom
        meetingCode={active.code}
        meetingTitle={active.title}
        onLeave={() => setActive(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gabung dengan Kode</CardTitle>
          <CardDescription>Masukkan kode yang diberikan guru Anda.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="join-code">Kode Meeting</Label>
            <Input id="join-code" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="xxx-xxxx" className="font-mono" />
          </div>
          <Button onClick={joinByCode}><LogIn className="mr-1 h-4 w-4" aria-hidden /> Gabung</Button>
        </CardContent>
      </Card>

      <MeetingList rows={meetings.data ?? []} loading={meetings.isLoading} onJoin={(m) => setActive(m)} />
    </div>
  );
}

/* -------- shared list -------- */
function MeetingList({
  rows,
  loading,
  onJoin,
  onEnd,
  canEnd,
}: {
  rows: MeetingRow[];
  loading: boolean;
  onJoin: (m: MeetingRow) => void;
  onEnd?: (m: MeetingRow) => void;
  canEnd?: boolean;
}) {
  const active = useMemo(() => rows.filter((r) => r.is_active), [rows]);
  const past = useMemo(() => rows.filter((r) => !r.is_active), [rows]);
  return (
    <div className="space-y-4">
      <section>
        <h3 className="mb-2 text-sm font-semibold">Sedang berlangsung</h3>
        {loading && <p className="text-sm text-muted-foreground">Memuat…</p>}
        {!loading && active.length === 0 && (
          <p className="text-sm text-muted-foreground">Belum ada meeting aktif.</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {active.map((m) => (
            <Card key={m.id}>
              <CardContent className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-semibold">
                    <Video className="h-4 w-4 text-primary" aria-hidden /> {m.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Kode: <span className="font-mono">{m.code}</span>
                    {m.classes?.name ? ` · ${m.classes.name}` : ""}
                  </p>
                  <Badge variant="outline" className="mt-2 gap-1"><Radio className="h-3 w-3 animate-pulse" /> Aktif</Badge>
                </div>
                <div className="flex flex-col gap-1">
                  <Button size="sm" onClick={() => onJoin(m)}>Gabung</Button>
                  {canEnd && onEnd && (
                    <Button size="sm" variant="outline" onClick={() => onEnd(m)}>Akhiri</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {canEnd && past.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Riwayat</h3>
          <ul className="divide-y divide-border rounded-lg border border-border bg-card">
            {past.slice(0, 10).map((m) => (
              <li key={m.id} className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="truncate">{m.title}</span>
                <span className="text-xs text-muted-foreground">{new Date(m.started_at).toLocaleString("id-ID")}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
