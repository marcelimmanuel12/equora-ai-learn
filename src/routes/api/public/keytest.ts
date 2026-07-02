import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/keytest")({
  server: {
    handlers: {
      GET: async () => {
        const URL = process.env.SUPABASE_URL!;
        const K = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const out: Record<string, unknown> = {};
        async function probe(name: string, headers: Record<string, string>) {
          try {
            const r = await fetch(URL + "/rest/v1/schools", {
              method: "POST",
              headers: {
                ...headers,
                "Content-Type": "application/json",
                Prefer: "return=representation",
              },
              body: JSON.stringify({ name: "__probe_" + name }),
            });
            const body = await r.text();
            out[name] = { status: r.status, body: body.slice(0, 200) };
          } catch (e) {
            out[name] = { error: e instanceof Error ? e.message : String(e) };
          }
        }
        await probe("apikey_only", { apikey: K });
        await probe("apikey_bearer", { apikey: K, Authorization: "Bearer " + K });
        return new Response(JSON.stringify(out, null, 2), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
