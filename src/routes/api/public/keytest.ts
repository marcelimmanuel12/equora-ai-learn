import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/keytest")({
  server: {
    handlers: {
      GET: async () => {
        const URL = process.env.SUPABASE_URL!;
        const P = process.env.SUPABASE_PUBLISHABLE_KEY!;
        const r = await fetch(URL + "/auth/v1/settings", { headers: { apikey: P } });
        return new Response(await r.text(), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
