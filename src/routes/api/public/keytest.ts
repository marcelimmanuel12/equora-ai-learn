import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/keytest")({
  server: {
    handlers: {
      GET: async () => {
        const out: Record<string, unknown> = {};
        const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
        out.hasServiceKey = !!k;
        out.servicePrefix = k ? k.slice(0, 10) : null;
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          // Try a privileged read that RLS would block for anon
          const probeEmail = "__probe" + Date.now() + "@equora.local";
          const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email: probeEmail,
            password: "probe-" + Date.now(),
            email_confirm: true,
          });
          out.adminCreateUser = error
            ? { ok: false, error: error.message, status: (error as { status?: number }).status }
            : { ok: true, id: data.user?.id };
          if (data.user?.id) {
            await supabaseAdmin.auth.admin.deleteUser(data.user.id);
          }
        } catch (e) {
          out.adminCreateUser = { threw: String(e) };
        }
        return new Response(JSON.stringify(out, null, 2), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
