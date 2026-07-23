import { createFileRoute } from "@tanstack/react-router";

type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        let payload: { messages?: ChatMsg[] };
        try {
          payload = (await request.json()) as { messages?: ChatMsg[] };
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const messages = payload.messages;
        if (!Array.isArray(messages) || messages.length === 0) {
          return new Response("messages required", { status: 400 });
        }

        const systemPrompt: ChatMsg = {
          role: "system",
          content:
            "Kamu adalah asisten AI belajar bernama Equora untuk siswa dan guru di Indonesia. " +
            "Jawab dalam Bahasa Indonesia yang ramah, jelas, dan mudah dipahami. Gunakan markdown " +
            "(judul, daftar, kode) bila membantu. Bila menjelaskan materi sekolah, sertakan contoh " +
            "sederhana. Bila diminta membuat soal, sertakan kunci jawaban di bagian akhir.",
        };

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3.6-flash",
            stream: true,
            messages: [systemPrompt, ...messages].slice(-40),
          }),
        });

        if (!upstream.ok) {
          const text = await upstream.text().catch(() => "");
          return new Response(text || `Gateway error ${upstream.status}`, {
            status: upstream.status,
          });
        }

        return new Response(upstream.body, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
          },
        });
      },
    },
  },
});
