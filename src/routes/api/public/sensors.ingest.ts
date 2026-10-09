import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const body = z.union([
  z.object({ value: z.number().finite(), recorded_at: z.string().datetime().optional() }).transform((r) => [r]),
  z.object({ readings: z.array(z.object({ value: z.number().finite(), recorded_at: z.string().datetime().optional() })).min(1).max(50) }).transform((r) => r.readings),
]);

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const json = (data: unknown, status = 200) => Response.json(data, { status });

export const Route = createFileRoute("/api/public/sensors/ingest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = request.headers.get("x-sensor-key") ?? "";
        if (!/^ca_[A-Za-z0-9_-]{40,64}$/.test(key)) return json({ error: "unauthorized" }, 401);
        let parsed;
        try { parsed = body.safeParse(await request.json()); } catch { return json({ error: "invalid json" }, 400); }
        if (!parsed.success) return json({ error: "invalid body" }, 400);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: sensor } = await supabaseAdmin.from("sensors").select("id, owner_id").eq("key_hash", await sha256(key)).maybeSingle();
        if (!sensor) return json({ error: "unauthorized" }, 401);

        const rows = parsed.data.map((r) => ({
          sensor_id: sensor.id, owner_id: sensor.owner_id, value: r.value, source: "device",
          recorded_at: r.recorded_at ?? new Date().toISOString(),
        }));
        const { error } = await supabaseAdmin.from("sensor_readings").insert(rows);
        if (error) return json({ error: "reading rejected" }, 422);
        return json({ ok: true, stored: rows.length });
      },
    },
  },
});
