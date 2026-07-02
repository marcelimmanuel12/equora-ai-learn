import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/keytest")({
  server: {
    handlers: {
      GET: async () => {
        const URL = process.env.SUPABASE_URL!;
        const K = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const P = process.env.SUPABASE_PUBLISHABLE_KEY!;
        const out: Record<string, unknown> = {};
        async function j(name: string, res: Response) {
          out[name] = { status: res.status, body: (await res.text()).slice(0, 250) };
        }
        // GoTrue settings with publishable key
        try {
          await j(
            "gotrue_settings_pub",
            await fetch(URL + "/auth/v1/settings", { headers: { apikey: P } }),
          );
        } catch (e) { out.gotrue_settings_pub = { error: String(e) }; }
        // GoTrue admin with apikey only (no bearer)
        try {
          await j(
            "gotrue_admin_apikey_only",
            await fetch(URL + "/auth/v1/admin/users", {
              method: "POST",
              headers: { apikey: K, "Content-Type": "application/json" },
              body: JSON.stringify({ email: "__p" + Date.now() + "@equora.local", password: "probe123456", email_confirm: true }),
            }),
          );
        } catch (e) { out.gotrue_admin_apikey_only = { error: String(e) }; }
        return new Response(JSON.stringify(out, null, 2), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
