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
  alert_min: z.number().nullable(),
  alert_max: z.number().nullable(),
  offline_minutes: z.number().int().min(5, "Mínimo 5 min").max(10080, "Máximo 7 dias"),
}).refine((v) => v.alert_min == null || v.alert_max == null || v.alert_min <= v.alert_max, { message: "Mínimo maior que o máximo", path: ["alert_min"] });

export type SensorAlert = { sensor: Sensor; kind: "offline" | "low" | "high"; message: string };
/** Alerts for sensors that stopped reporting or whose latest reading is outside configured limits. */
export function sensorAlerts(sensors: Sensor[], readings: Reading[], now = Date.now()): SensorAlert[] {
  const out: SensorAlert[] = [];
  for (const s of sensors) {
    const m = metrics[s.metric];
    const ref = s.last_seen_at ?? s.created_at;
    const mins = (now - new Date(ref).getTime()) / 60000;
    if (mins > s.offline_minutes) out.push({ sensor: s, kind: "offline", message: s.last_seen_at ? `Sem leituras há ${mins >= 120 ? `${Math.floor(mins / 60)} h` : `${Math.floor(mins)} min`}` : "Ainda não enviou nenhuma leitura" });
    const last = readings.find((r) => r.sensor_id === s.id);
    if (!last) continue;
    if (s.alert_min != null && last.value < s.alert_min) out.push({ sensor: s, kind: "low", message: `${m.label} em ${last.value} ${m.unit}, abaixo do mínimo de ${s.alert_min} ${m.unit}` });
    if (s.alert_max != null && last.value > s.alert_max) out.push({ sensor: s, kind: "high", message: `${m.label} em ${last.value} ${m.unit}, acima do máximo de ${s.alert_max} ${m.unit}` });
  }
  return out;
}

export function readingSchema(metric: Metric) {
  const m = metrics[metric];
  return z.object({
    value: z.number({ message: "Informe um número" }).min(m.min).max(m.max, `Entre ${m.min} e ${m.max} ${m.unit}`),
    recorded_at: z.date().max(new Date(Date.now() + 600_000), "Data no futuro"),
  });
}

export type Sensor = { id: string; owner_id: string; plot_id: string; name: string; model: string; metric: Metric; last_seen_at: string | null; created_at: string; alert_min: number | null; alert_max: number | null; offline_minutes: number };
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
        .select("id, owner_id, plot_id, name, model, metric, last_seen_at, created_at, alert_min, alert_max, offline_minutes").order("created_at");
      if (error) throw error;
      return (data ?? []).map((s) => ({ ...s, alert_min: s.alert_min == null ? null : Number(s.alert_min), alert_max: s.alert_max == null ? null : Number(s.alert_max) })) as Sensor[];
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
    async setLimits(id: string, limits: { alert_min: number | null; alert_max: number | null; offline_minutes: number }) {
      const { error } = await supabase.from("sensors").update(limits).eq("id", id);
      if (error) throw error;
      await refresh();
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
