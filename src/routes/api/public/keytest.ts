import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/keytest")({
  server: {
    handlers: {
      GET: async () => {
        const URL = process.env.SUPABASE_URL!;
        const K = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const out: Record<string, unknown> = {};
        // Test GoTrue admin createUser
        try {
          const r = await fetch(URL + "/auth/v1/admin/users", {
            method: "POST",
            headers: {
              apikey: K,
              Authorization: "Bearer " + K,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: "__probe_" + Date.now() + "@equora.local",
              password: "probe123456",
              email_confirm: true,
            }),
          });
          const body = await r.text();
          out.gotrue_admin = { status: r.status, body: body.slice(0, 300) };
        } catch (e) {
          out.gotrue_admin = { error: e instanceof Error ? e.message : String(e) };
        }
        return new Response(JSON.stringify(out, null, 2), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
