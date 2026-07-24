import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  ScreenShare,
  ScreenShareOff,
  Hand,
  MessageSquare,
  Captions,
  CaptionsOff,
  Circle,
  StopCircle,
  Pencil,
  Eraser,
  PhoneOff,
  Send,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useSpeechToText } from "@/hooks/use-speech";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

/* --------------------------------------------------------- */
/* Types & signaling contract                                 */
/* --------------------------------------------------------- */
type SignalOffer = { type: "offer"; from: string; to: string; sdp: RTCSessionDescriptionInit };
type SignalAnswer = { type: "answer"; from: string; to: string; sdp: RTCSessionDescriptionInit };
type SignalIce = { type: "ice"; from: string; to: string; candidate: RTCIceCandidateInit };
type ChatMsg = { id: string; from: string; name: string; text: string; at: number };
type HandEvent = { from: string; name: string; up: boolean };
type CaptionEvent = { from: string; name: string; text: string; at: number };
type StrokeEvent = {
  from: string;
  color: string;
  size: number;
  points: Array<{ x: number; y: number }>;
  clear?: boolean;
};

interface PeerState {
  id: string;
  name: string;
  stream: MediaStream | null;
  audioOn: boolean;
  videoOn: boolean;
  handUp: boolean;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }],
};

/* --------------------------------------------------------- */
/* MeetingRoom                                                */
/* --------------------------------------------------------- */
export function MeetingRoom({
  meetingCode,
  meetingTitle,
  onLeave,
}: {
  meetingCode: string;
  meetingTitle: string;
  onLeave: () => void;
}) {
  const { profile } = useAuth();
  const meId = profile?.id ?? "anon";
  const meName = profile?.full_name ?? "Peserta";

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<Record<string, PeerState>>({});
  const [audioOn, setAudioOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [handUp, setHandUp] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [recording, setRecording] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatDraft, setChatDraft] = useState("");
  const [captions, setCaptions] = useState<CaptionEvent[]>([]);
  const [boardOpen, setBoardOpen] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  /* ---- init local media + realtime channel ---- */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch (err) {
        console.error(err);
        toast.error("Tidak dapat mengakses kamera/mikrofon. Cek izin browser.");
        onLeave();
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      localStreamRef.current = stream;
      cameraTrackRef.current = stream.getVideoTracks()[0] ?? null;
      setLocalStream(stream);

      const channel = supabase.channel(`meeting:${meetingCode}`, {
        config: { presence: { key: meId }, broadcast: { self: false, ack: false } },
      });
      channelRef.current = channel;

      channel
        .on("presence", { event: "sync" }, () => {
          const state = channel.presenceState<{ name: string }>();
          const active = new Set(Object.keys(state));
          // Remove stale peers
          setPeers((prev) => {
            const next: Record<string, PeerState> = {};
            for (const [id, p] of Object.entries(prev)) if (active.has(id)) next[id] = p;
            return next;
          });
          for (const id of active) {
            if (id === meId || pcsRef.current.has(id)) continue;
            // Deterministic offerer: smaller id initiates.
            if (meId < id) void createOffer(id, state[id]?.[0]?.name ?? "Peserta");
            else
              setPeers((prev) =>
                prev[id]
                  ? prev
                  : {
                      ...prev,
                      [id]: { id, name: state[id]?.[0]?.name ?? "Peserta", stream: null, audioOn: true, videoOn: true, handUp: false },
                    },
              );
          }
        })
        .on("broadcast", { event: "signal" }, ({ payload }) => {
          const msg = payload as SignalOffer | SignalAnswer | SignalIce;
          if (msg.to !== meId) return;
          if (msg.type === "offer") void handleOffer(msg);
          else if (msg.type === "answer") void handleAnswer(msg);
          else if (msg.type === "ice") void handleIce(msg);
        })
        .on("broadcast", { event: "chat" }, ({ payload }) => {
          setChat((p) => [...p, payload as ChatMsg]);
        })
        .on("broadcast", { event: "hand" }, ({ payload }) => {
          const h = payload as HandEvent;
          setPeers((prev) => (prev[h.from] ? { ...prev, [h.from]: { ...prev[h.from], handUp: h.up } } : prev));
          if (h.up) toast.info(`${h.name} mengangkat tangan`);
        })
        .on("broadcast", { event: "caption" }, ({ payload }) => {
          setCaptions((p) => [...p.slice(-20), payload as CaptionEvent]);
        })
        .on("broadcast", { event: "stroke" }, ({ payload }) => {
          drawStroke(payload as StrokeEvent);
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") await channel.track({ name: meName });
        });
    })();

    return () => {
      cancelled = true;
      pcsRef.current.forEach((pc) => pc.close());
      pcsRef.current.clear();
      recorderRef.current?.stop();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenTrackRef.current?.stop();
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingCode]);

  /* ---- attach local stream to <video> ---- */
  useEffect(() => {
    if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  /* ---- PeerConnection helpers ---- */
  const buildPc = useCallback(
    (peerId: string, peerName: string) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);
      localStreamRef.current?.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!));

      pc.ontrack = (ev) => {
        const [stream] = ev.streams;
        setPeers((prev) => ({
          ...prev,
          [peerId]: {
            id: peerId,
            name: peerName,
            stream,
            audioOn: true,
            videoOn: true,
            handUp: prev[peerId]?.handUp ?? false,
          },
        }));
      };

      pc.onicecandidate = (ev) => {
        if (ev.candidate && channelRef.current) {
          void channelRef.current.send({
            type: "broadcast",
            event: "signal",
            payload: { type: "ice", from: meId, to: peerId, candidate: ev.candidate.toJSON() },
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
          pcsRef.current.delete(peerId);
        }
      };

      pcsRef.current.set(peerId, pc);
      return pc;
    },
    [meId],
  );

  const createOffer = useCallback(
    async (peerId: string, peerName: string) => {
      const pc = buildPc(peerId, peerName);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await channelRef.current?.send({
        type: "broadcast",
        event: "signal",
        payload: { type: "offer", from: meId, to: peerId, sdp: offer },
      });
    },
    [buildPc, meId],
  );

  const handleOffer = useCallback(
    async (msg: SignalOffer) => {
      const pc = buildPc(msg.from, "Peserta");
      await pc.setRemoteDescription(msg.sdp);
      const ans = await pc.createAnswer();
      await pc.setLocalDescription(ans);
      await channelRef.current?.send({
        type: "broadcast",
        event: "signal",
        payload: { type: "answer", from: meId, to: msg.from, sdp: ans },
      });
    },
    [buildPc, meId],
  );

  const handleAnswer = useCallback(async (msg: SignalAnswer) => {
    const pc = pcsRef.current.get(msg.from);
    if (pc && !pc.currentRemoteDescription) await pc.setRemoteDescription(msg.sdp);
  }, []);

  const handleIce = useCallback(async (msg: SignalIce) => {
    const pc = pcsRef.current.get(msg.from);
    if (pc) {
      try {
        await pc.addIceCandidate(msg.candidate);
      } catch {
        /* ignore */
      }
    }
  }, []);

  /* ---- toggles ---- */
  function toggleAudio() {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setAudioOn(track.enabled);
  }

  function toggleVideo() {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setVideoOn(track.enabled);
  }

  async function toggleShare() {
    if (sharing) {
      screenTrackRef.current?.stop();
      screenTrackRef.current = null;
      const cam = cameraTrackRef.current;
      if (cam) replaceOutgoingVideo(cam);
      setSharing(false);
      return;
    }
    try {
      const ds = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const track = ds.getVideoTracks()[0];
      screenTrackRef.current = track;
      track.onended = () => {
        screenTrackRef.current = null;
        if (cameraTrackRef.current) replaceOutgoingVideo(cameraTrackRef.current);
        setSharing(false);
      };
      replaceOutgoingVideo(track);
      setSharing(true);
    } catch {
      /* user cancelled */
    }
  }

  function replaceOutgoingVideo(track: MediaStreamTrack) {
    pcsRef.current.forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      void sender?.replaceTrack(track);
    });
    if (localVideoRef.current && localStreamRef.current) {
      const s = new MediaStream([track, ...localStreamRef.current.getAudioTracks()]);
      localVideoRef.current.srcObject = s;
    }
  }

  function toggleHand() {
    const up = !handUp;
    setHandUp(up);
    void channelRef.current?.send({
      type: "broadcast",
      event: "hand",
      payload: { from: meId, name: meName, up } satisfies HandEvent,
    });
  }

  /* ---- chat ---- */
  function sendChat() {
    const text = chatDraft.trim();
    if (!text) return;
    const msg: ChatMsg = { id: crypto.randomUUID(), from: meId, name: meName, text, at: Date.now() };
    setChat((p) => [...p, msg]);
    setChatDraft("");
    void channelRef.current?.send({ type: "broadcast", event: "chat", payload: msg });
  }

  /* ---- live caption via Web Speech STT ---- */
  const stt = useSpeechToText((text) => {
    const ev: CaptionEvent = { from: meId, name: meName, text, at: Date.now() };
    setCaptions((p) => [...p.slice(-20), ev]);
    void channelRef.current?.send({ type: "broadcast", event: "caption", payload: ev });
  });
  function toggleCaptions() {
    if (captionsOn) {
      stt.stop();
      setCaptionsOn(false);
    } else {
      if (!stt.supported) {
        toast.error("Browser Anda tidak mendukung Live Caption.");
        return;
      }
      stt.start();
      setCaptionsOn(true);
    }
  }

  /* ---- recording ---- */
  function toggleRecord() {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    const stream = localStreamRef.current;
    if (!stream) return;
    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : "video/webm";
    const rec = new MediaRecorder(stream, { mimeType: mime });
    recordChunksRef.current = [];
    rec.ondataavailable = (e) => e.data.size && recordChunksRef.current.push(e.data);
    rec.onstop = () => {
      const blob = new Blob(recordChunksRef.current, { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `equora-meeting-${meetingCode}-${Date.now()}.webm`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setRecording(false);
      toast.success("Rekaman siap diunduh.");
    };
    rec.start(1000);
    recorderRef.current = rec;
    setRecording(true);
    toast.info("Merekam sesi (lokal)…");
  }

  /* ---- whiteboard ---- */
  const boardCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const boardCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const drawingRef = useRef(false);
  const currentStrokeRef = useRef<StrokeEvent | null>(null);
  const [penColor, setPenColor] = useState("#2563EB");

  const drawStroke = useCallback((s: StrokeEvent) => {
    const ctx = boardCtxRef.current;
    const canvas = boardCanvasRef.current;
    if (!ctx || !canvas) return;
    if (s.clear) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    s.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x * canvas.width, p.y * canvas.height) : ctx.lineTo(p.x * canvas.width, p.y * canvas.height)));
    ctx.stroke();
  }, []);

  function initBoard(c: HTMLCanvasElement | null) {
    boardCanvasRef.current = c;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    c.width = rect.width;
    c.height = rect.height;
    boardCtxRef.current = c.getContext("2d");
  }

  function pointerPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = boardCanvasRef.current!;
    const rect = c.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
  }

  function boardDown(e: React.PointerEvent<HTMLCanvasElement>) {
    drawingRef.current = true;
    currentStrokeRef.current = { from: meId, color: penColor, size: 3, points: [pointerPos(e)] };
  }
  function boardMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || !currentStrokeRef.current) return;
    currentStrokeRef.current.points.push(pointerPos(e));
    drawStroke(currentStrokeRef.current);
  }
  function boardUp() {
    if (currentStrokeRef.current) {
      void channelRef.current?.send({ type: "broadcast", event: "stroke", payload: currentStrokeRef.current });
    }
    drawingRef.current = false;
    currentStrokeRef.current = null;
  }
  function boardClear() {
    const ev: StrokeEvent = { from: meId, color: "#000", size: 0, points: [], clear: true };
    drawStroke(ev);
    void channelRef.current?.send({ type: "broadcast", event: "stroke", payload: ev });
  }

  /* ---- render ---- */
  const peerList = useMemo(() => Object.values(peers), [peers]);
  const gridCols = peerList.length === 0 ? 1 : peerList.length <= 1 ? 2 : peerList.length <= 3 ? 2 : 3;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{meetingTitle}</p>
          <p className="text-xs text-muted-foreground">
            Kode: <span className="font-mono">{meetingCode}</span> · {peerList.length + 1} peserta
          </p>
        </div>
        <div className="flex items-center gap-2">
          {recording && <Badge variant="destructive" className="gap-1"><Circle className="h-3 w-3 animate-pulse fill-current" /> REC</Badge>}
          <Button variant="destructive" size="sm" onClick={onLeave}><PhoneOff className="mr-1 h-4 w-4" aria-hidden /> Keluar</Button>
        </div>
      </header>

      {/* Body */}
      <div className="flex min-h-0 flex-1">
        {/* Video grid / whiteboard */}
        <main className="relative flex-1 overflow-auto bg-muted/40 p-3">
          {boardOpen ? (
            <div className="flex h-full flex-col gap-2">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={penColor}
                  onChange={(e) => setPenColor(e.target.value)}
                  aria-label="Warna pena"
                  className="h-8 w-10 cursor-pointer rounded border border-border"
                />
                <Button size="sm" variant="outline" onClick={boardClear}><Eraser className="mr-1 h-4 w-4" aria-hidden /> Bersihkan</Button>
                <Button size="sm" variant="outline" onClick={() => setBoardOpen(false)}>Tutup Papan</Button>
              </div>
              <canvas
                ref={initBoard}
                onPointerDown={boardDown}
                onPointerMove={boardMove}
                onPointerUp={boardUp}
                onPointerLeave={boardUp}
                className="flex-1 rounded-lg border border-border bg-background touch-none"
              />
            </div>
          ) : (
            <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}>
              <VideoTile name={`${meName} (Anda)`} stream={localStream} muted videoOn={videoOn} audioOn={audioOn} handUp={handUp} videoRef={localVideoRef} />
              {peerList.map((p) => (
                <VideoTile key={p.id} name={p.name} stream={p.stream} videoOn audioOn handUp={p.handUp} />
              ))}
            </div>
          )}

          {/* Captions overlay */}
          {captions.length > 0 && (
            <div className="pointer-events-none absolute bottom-3 left-1/2 max-w-2xl -translate-x-1/2 rounded-lg bg-background/90 px-4 py-2 text-center text-sm shadow-md backdrop-blur">
              <span className="font-medium">{captions[captions.length - 1].name}:</span>{" "}
              {captions[captions.length - 1].text}
            </div>
          )}
        </main>

        {/* Chat sidebar */}
        {chatOpen && (
          <aside className="flex w-80 flex-col border-l border-border bg-card">
            <header className="border-b border-border px-4 py-2 text-sm font-semibold">Chat</header>
            <ScrollArea className="flex-1 px-3 py-2">
              <ul className="space-y-2 text-sm">
                {chat.map((m) => (
                  <li key={m.id}>
                    <p className="text-xs font-semibold text-primary">{m.from === meId ? "Anda" : m.name}</p>
                    <p className="whitespace-pre-wrap break-words">{m.text}</p>
                  </li>
                ))}
                {chat.length === 0 && <li className="text-muted-foreground">Belum ada pesan.</li>}
              </ul>
            </ScrollArea>
            <form
              className="flex gap-2 border-t border-border p-2"
              onSubmit={(e) => {
                e.preventDefault();
                sendChat();
              }}
            >
              <Input value={chatDraft} onChange={(e) => setChatDraft(e.target.value)} placeholder="Ketik pesan…" aria-label="Pesan" />
              <Button type="submit" size="icon" aria-label="Kirim"><Send className="h-4 w-4" aria-hidden /></Button>
            </form>
          </aside>
        )}
      </div>

      {/* Controls */}
      <footer className="flex flex-wrap items-center justify-center gap-2 border-t border-border bg-card px-4 py-3">
        <ControlBtn onClick={toggleAudio} active={audioOn} label={audioOn ? "Matikan mic" : "Nyalakan mic"} icon={audioOn ? Mic : MicOff} danger={!audioOn} />
        <ControlBtn onClick={toggleVideo} active={videoOn} label={videoOn ? "Matikan kamera" : "Nyalakan kamera"} icon={videoOn ? VideoIcon : VideoOff} danger={!videoOn} />
        <ControlBtn onClick={toggleShare} active={sharing} label={sharing ? "Stop berbagi layar" : "Bagikan layar"} icon={sharing ? ScreenShareOff : ScreenShare} />
        <ControlBtn onClick={toggleHand} active={handUp} label={handUp ? "Turunkan tangan" : "Angkat tangan"} icon={Hand} />
        <ControlBtn onClick={() => setChatOpen((v) => !v)} active={chatOpen} label="Chat" icon={MessageSquare} />
        <ControlBtn onClick={toggleCaptions} active={captionsOn} label={captionsOn ? "Matikan caption" : "Nyalakan Live Caption"} icon={captionsOn ? Captions : CaptionsOff} />
        <ControlBtn onClick={() => setBoardOpen((v) => !v)} active={boardOpen} label={boardOpen ? "Tutup papan" : "Papan tulis"} icon={Pencil} />
        <ControlBtn onClick={toggleRecord} active={recording} label={recording ? "Stop rekam" : "Rekam sesi"} icon={recording ? StopCircle : Download} danger={recording} />
      </footer>
    </div>
  );
}

/* --------------------------------------------------------- */
/* Small pieces                                              */
/* --------------------------------------------------------- */
function ControlBtn({
  onClick,
  active,
  label,
  icon: Icon,
  danger,
}: {
  onClick: () => void;
  active: boolean;
  label: string;
  icon: typeof Mic;
  danger?: boolean;
}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      variant={danger ? "destructive" : active ? "default" : "outline"}
      size="sm"
      className="min-h-11 gap-1.5"
    >
      <Icon className="h-4 w-4" aria-hidden />
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}

function VideoTile({
  name,
  stream,
  muted,
  videoOn,
  audioOn,
  handUp,
  videoRef,
}: {
  name: string;
  stream: MediaStream | null;
  muted?: boolean;
  videoOn: boolean;
  audioOn: boolean;
  handUp: boolean;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
}) {
  const localRef = useRef<HTMLVideoElement | null>(null);
  const ref = videoRef ?? localRef;
  useEffect(() => {
    if (ref.current && stream) ref.current.srcObject = stream;
  }, [stream, ref]);
  return (
    <div className="relative aspect-video overflow-hidden rounded-lg border border-border bg-black">
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={muted}
        className={`h-full w-full object-cover ${videoOn ? "" : "opacity-0"}`}
      />
      {!videoOn && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground">
          <VideoOff className="h-8 w-8" aria-hidden />
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/60 px-2 py-1 text-xs text-white">
        <span className="truncate">{name}</span>
        <span className="flex items-center gap-1">
          {handUp && <Hand className="h-3.5 w-3.5 text-amber-300" aria-label="Angkat tangan" />}
          {!audioOn && <MicOff className="h-3.5 w-3.5" aria-hidden />}
        </span>
      </div>
    </div>
  );
}
