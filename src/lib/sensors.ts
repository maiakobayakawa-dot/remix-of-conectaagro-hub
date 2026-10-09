import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";

export const metrics = {
  soil_moisture: { label: "Umidade do solo", unit: "%", min: 0, max: 100 },
  temperature: { label: "Temperatura", unit: "°C", min: -40, max: 70 },
  air_humidity: { label: "Umidade do ar", unit: "%", min: 0, max: 100 },
  radiation: { label: "Radiação", unit: "W/m²", min: 0, max: 2000 },
  rain: { label: "Chuva", unit: "mm", min: 0, max: 500 },
} as const;
export type Metric = keyof typeof metrics;

export const sensorSchema = z.object({
  name: z.string().trim().min(1, "Informe um nome").max(80),
  model: z.string().trim().max(80),
  metric: z.enum(Object.keys(metrics) as [Metric, ...Metric[]]),
  plot_id: z.string().uuid("Selecione um talhão"),
});

export function readingSchema(metric: Metric) {
  const m = metrics[metric];
  return z.object({
    value: z.number({ message: "Informe um número" }).min(m.min).max(m.max, `Entre ${m.min} e ${m.max} ${m.unit}`),
    recorded_at: z.date().max(new Date(Date.now() + 600_000), "Data no futuro"),
  });
}

export type Sensor = { id: string; owner_id: string; plot_id: string; name: string; model: string; metric: Metric; last_seen_at: string | null; created_at: string };
export type Reading = { id: string; sensor_id: string; value: number; source: string; recorded_at: string };

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function newKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return "ca_" + btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function useSensors() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["sensors", user?.id ?? "anon"],
    enabled: !!user,
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase.from("sensors")
        .select("id, owner_id, plot_id, name, model, metric, last_seen_at, created_at").order("created_at");
      if (error) throw error;
      return (data ?? []) as Sensor[];
    },
  });
}

export function useReadings(days = 8) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["sensor_readings", user?.id ?? "anon", days],
    enabled: !!user,
    refetchInterval: 15000,
    queryFn: async () => {
      const since = new Date(Date.now() - days * 86400_000).toISOString();
      const { data, error } = await supabase.from("sensor_readings")
        .select("id, sensor_id, value, source, recorded_at").gte("recorded_at", since)
        .order("recorded_at", { ascending: false }).limit(2000);
      if (error) throw error;
      return (data ?? []).map((r) => ({ ...r, value: Number(r.value) })) as Reading[];
    },
  });
}

export function useSensorMutations() {
  const qc = useQueryClient();
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ["sensors"] }), qc.invalidateQueries({ queryKey: ["sensor_readings"] })]);
  return {
    /** Returns the device key once; only its hash is stored. */
    async add(input: z.infer<typeof sensorSchema>) {
      const key = newKey();
      const { error } = await supabase.from("sensors").insert({ ...input, key_hash: await sha256(key) });
      if (error) throw error;
      await refresh();
      return key;
    },
    async rotateKey(id: string) {
      const key = newKey();
      const { error } = await supabase.from("sensors").update({ key_hash: await sha256(key) }).eq("id", id);
      if (error) throw error;
      return key;
    },
    async remove(id: string) {
      const { error } = await supabase.from("sensors").delete().eq("id", id);
      if (error) throw error;
      await refresh();
    },
    async addReading(sensor_id: string, value: number, recorded_at: Date) {
      const { error } = await supabase.from("sensor_readings").insert({ sensor_id, value, recorded_at: recorded_at.toISOString(), source: "manual" });
      if (error) throw error;
      await refresh();
    },
  };
}

/** Daily stats (local date) of readings for one metric. */
export function dailyStats(readings: Reading[]) {
  const by = new Map<string, number[]>();
  for (const r of readings) {
    const d = new Date(r.recorded_at); const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    by.set(k, [...(by.get(k) ?? []), r.value]);
  }
  return new Map([...by].map(([k, v]) => [k, { max: Math.max(...v), min: Math.min(...v), avg: v.reduce((a, b) => a + b, 0) / v.length, sum: v.reduce((a, b) => a + b, 0), n: v.length }]));
}
