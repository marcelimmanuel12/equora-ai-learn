import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import {
  Bot,
  Send,
  Plus,
  Trash2,
  Loader2,
  Volume2,
  Square,
  Mic,
  MicOff,
  Sparkles,
  FileText,
  Lightbulb,
  ClipboardList,
  BookOpen,
  MessageSquare,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTextToSpeech, useSpeechToText } from "@/hooks/use-speech";
import { cn } from "@/lib/utils";

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}
interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

const PRESETS: { icon: typeof Sparkles; label: string; prompt: string }[] = [
  { icon: BookOpen, label: "Jelaskan materi", prompt: "Tolong jelaskan materi tentang " },
  { icon: FileText, label: "Buat ringkasan", prompt: "Buatkan ringkasan singkat tentang " },
  { icon: ClipboardList, label: "Contoh soal", prompt: "Berikan 5 contoh soal beserta pembahasan tentang " },
  { icon: Lightbulb, label: "Latihan", prompt: "Buatkan latihan bertahap dari mudah ke sulit untuk topik " },
];

export function ChatBotView({ audience }: { audience: "siswa" | "guru" }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState("");
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const convQ = useQuery({
    queryKey: ["chat-conversations", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_conversations")
        .select("id, title, updated_at")
        .order("updated_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as Conversation[];
    },
  });

  const msgQ = useQuery({
    queryKey: ["chat-messages", activeId],
    enabled: !!activeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id, role, content, created_at")
        .eq("conversation_id", activeId!)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as Message[];
    },
  });

  // auto-select first conversation
  useEffect(() => {
    if (!activeId && convQ.data && convQ.data.length > 0) setActiveId(convQ.data[0].id);
  }, [convQ.data, activeId]);

  // auto scroll on new content
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgQ.data, streaming]);

  const newChat = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Tidak ada sesi");
      const { data, error } = await supabase
        .from("chat_conversations")
        .insert({ user_id: user.id, title: "Percakapan baru" })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["chat-conversations", user?.id] });
      setActiveId(id);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal buat percakapan"),
  });

  const delChat = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("chat_conversations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["chat-conversations", user?.id] });
      if (activeId === id) setActiveId(null);
    },
  });

  const send = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean || busy || !user) return;

      let convId = activeId;
      if (!convId) {
        const { data, error } = await supabase
          .from("chat_conversations")
          .insert({ user_id: user.id, title: clean.slice(0, 60) })
          .select("id")
          .single();
        if (error) {
          toast.error(error.message);
          return;
        }
        convId = data.id as string;
        setActiveId(convId);
        qc.invalidateQueries({ queryKey: ["chat-conversations", user?.id] });
      }

      // insert user message
      const { data: userMsg, error: uErr } = await supabase
        .from("chat_messages")
        .insert({ conversation_id: convId, role: "user", content: clean })
        .select("id, role, content, created_at")
        .single();
      if (uErr) {
        toast.error(uErr.message);
        return;
      }

      // update title from first message
      const currentMsgs = msgQ.data ?? [];
      if (currentMsgs.length === 0) {
        await supabase
          .from("chat_conversations")
          .update({ title: clean.slice(0, 60) })
          .eq("id", convId);
        qc.invalidateQueries({ queryKey: ["chat-conversations", user?.id] });
      }

      qc.setQueryData<Message[]>(["chat-messages", convId], [...currentMsgs, userMsg as Message]);
      setInput("");
      setBusy(true);
      setStreaming("");

      const history = [...currentMsgs, userMsg as Message].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history }),
          signal: controller.signal,
        });

        if (!res.ok) {
          if (res.status === 429) toast.error("Terlalu banyak permintaan. Coba lagi sebentar.");
          else if (res.status === 402) toast.error("Kredit AI habis. Hubungi admin sekolah.");
          else toast.error(`Gagal (${res.status})`);
          setBusy(false);
          return;
        }
        if (!res.body) {
          toast.error("Respons kosong");
          setBusy(false);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let assembled = "";
        let done = false;

        while (!done) {
          const { value, done: d } = await reader.read();
          done = d;
          if (value) buffer += decoder.decode(value, { stream: true });
          let idx: number;
          while ((idx = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, idx).trim();
            buffer = buffer.slice(idx + 1);
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (data === "[DONE]") {
              done = true;
              break;
            }
            try {
              const j = JSON.parse(data) as {
                choices?: { delta?: { content?: string } }[];
              };
              const delta = j.choices?.[0]?.delta?.content;
              if (delta) {
                assembled += delta;
                setStreaming(assembled);
              }
            } catch {
              /* ignore */
            }
          }
        }

        if (assembled) {
          const { data: aMsg } = await supabase
            .from("chat_messages")
            .insert({ conversation_id: convId, role: "assistant", content: assembled })
            .select("id, role, content, created_at")
            .single();
          const prev = qc.getQueryData<Message[]>(["chat-messages", convId]) ?? [];
          if (aMsg) qc.setQueryData<Message[]>(["chat-messages", convId], [...prev, aMsg as Message]);
          await supabase
            .from("chat_conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", convId);
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          toast.error(e instanceof Error ? e.message : "Gagal mengirim");
        }
      } finally {
        setStreaming("");
        setBusy(false);
        abortRef.current = null;
      }
    },
    [activeId, busy, msgQ.data, qc, user],
  );

  const stop = () => abortRef.current?.abort();

  const messages = msgQ.data ?? [];

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      {/* Conversation list */}
      <Card className="lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)]">
        <CardContent className="flex h-full flex-col gap-3 p-3">
          <Button onClick={() => newChat.mutate()} className="w-full justify-start gap-2" variant="default">
            <Plus className="h-4 w-4" aria-hidden /> Percakapan baru
          </Button>
          <ScrollArea className="flex-1">
            <div className="space-y-1 pr-2">
              {(convQ.data ?? []).map((c) => (
                <div
                  key={c.id}
                  className={cn(
                    "group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                    activeId === c.id ? "bg-primary/10 text-primary" : "hover:bg-muted",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setActiveId(c.id)}
                    className="flex flex-1 items-center gap-2 truncate text-left"
                  >
                    <MessageSquare className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="truncate">{c.title}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Hapus percakapan ini?")) delChat.mutate(c.id);
                    }}
                    className="opacity-0 group-hover:opacity-100"
                    aria-label="Hapus"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ))}
              {convQ.data && convQ.data.length === 0 && (
                <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                  Belum ada percakapan.
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat pane */}
      <Card className="flex h-[calc(100vh-8rem)] flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6">
          {messages.length === 0 && !streaming ? (
            <EmptyChat audience={audience} onPreset={(p) => setInput(p)} />
          ) : (
            <div className="mx-auto flex max-w-3xl flex-col gap-4">
              {messages.map((m) => (
                <MessageBubble key={m.id} role={m.role} content={m.content} />
              ))}
              {streaming && <MessageBubble role="assistant" content={streaming} streaming />}
            </div>
          )}
        </div>

        <Composer
          value={input}
          onChange={setInput}
          onSend={() => send(input)}
          onStop={stop}
          busy={busy}
        />
      </Card>
    </div>
  );
}

function EmptyChat({
  audience,
  onPreset,
}: {
  audience: "siswa" | "guru";
  onPreset: (prompt: string) => void;
}) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center py-10 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Bot className="h-7 w-7" aria-hidden />
      </div>
      <h2 className="text-xl font-bold">Halo! Saya Equora AI</h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        {audience === "siswa"
          ? "Tanyakan materi apa saja — saya bantu jelaskan, buatkan ringkasan, atau latihan soal."
          : "Bantu buat materi ajar, ringkasan, soal latihan, dan rekomendasi pembelajaran."}
      </p>
      <div className="mt-6 grid w-full gap-2 sm:grid-cols-2">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => onPreset(p.prompt)}
            className="flex items-start gap-3 rounded-lg border bg-background p-3 text-left text-sm transition-colors hover:border-primary hover:bg-primary/5"
          >
            <p.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span>
              <span className="font-medium">{p.label}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {p.prompt.trim()}…
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({
  role,
  content,
  streaming,
}: {
  role: "user" | "assistant" | "system";
  content: string;
  streaming?: boolean;
}) {
  const tts = useTextToSpeech();
  const isUser = role === "user";
  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
        )}
      >
        {isUser ? <span className="text-xs font-bold">A</span> : <Bot className="h-4 w-4" aria-hidden />}
      </div>
      <div className={cn("min-w-0 max-w-[85%]", isUser && "text-right")}>
        <div
          className={cn(
            "inline-block rounded-2xl px-4 py-2.5 text-sm",
            isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none break-words prose-p:my-2 prose-headings:my-3 prose-pre:my-2 prose-ul:my-2 prose-ol:my-2">
              <ReactMarkdown>{content || "…"}</ReactMarkdown>
            </div>
          )}
        </div>
        {!isUser && !streaming && tts.supported && content && (
          <div className="mt-1">
            <button
              type="button"
              onClick={() => (tts.speaking ? tts.cancel() : tts.speak(content))}
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={tts.speaking ? "Hentikan pembacaan" : "Bacakan jawaban"}
            >
              {tts.speaking ? <Square className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
              {tts.speaking ? "Berhenti" : "Bacakan"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Composer({
  value,
  onChange,
  onSend,
  onStop,
  busy,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  busy: boolean;
}) {
  const stt = useSpeechToText((t) => onChange(value ? `${value} ${t}` : t));
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canSend = useMemo(() => value.trim().length > 0 && !busy, [value, busy]);

  return (
    <div className="border-t p-3 sm:p-4">
      <div className="mx-auto flex max-w-3xl items-end gap-2">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (canSend) onSend();
            }
          }}
          placeholder="Tanyakan sesuatu…  (Enter untuk kirim, Shift+Enter baris baru)"
          className="min-h-[52px] resize-none"
          rows={2}
        />
        {stt.supported && (
          <Button
            type="button"
            variant={stt.listening ? "destructive" : "outline"}
            size="icon"
            onClick={() => {
              if (stt.listening) stt.stop();
              else {
                textareaRef.current?.focus();
                stt.start();
              }
            }}
            aria-label={stt.listening ? "Stop dikte" : "Dikte suara"}
            title={stt.listening ? "Stop dikte" : "Dikte suara"}
          >
            {stt.listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
        )}
        {busy ? (
          <Button type="button" variant="secondary" size="icon" onClick={onStop} aria-label="Berhenti">
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" size="icon" onClick={onSend} disabled={!canSend} aria-label="Kirim">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        )}
      </div>
    </div>
  );
}
