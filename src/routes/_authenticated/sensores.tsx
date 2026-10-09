import { createFileRoute } from "@tanstack/react-router";
import { Copy, KeyRound, Plus, Radio, Save, Scale, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { usePlotsQuery } from "@/lib/plots-store";
import { dailyStats, metrics, readingSchema, sensorSchema, useReadings, useSensorMutations, useSensors, type Metric, type Sensor } from "@/lib/sensors";
import { useBaseForecast } from "@/lib/weather";

export const Route = createFileRoute("/_authenticated/sensores")({
  head: () => ({
    meta: [
      { title: "Cadastro de sensores — ConectaAgro" },
      { name: "description", content: "Cadastre sensores de campo por talhão, receba leituras automáticas e compare com a previsão do tempo." },
      { property: "og:title", content: "Cadastro de sensores — ConectaAgro" },
      { property: "og:description", content: "Sensores conectados por talhão e comparação entre previsão e medição real." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Sensores,
});

const input = "w-full rounded-lg border bg-background px-3 py-2 text-sm";
const localNow = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

function KeyNotice({ name, sensorKey, onClose }: { name: string; sensorKey: string; onClose: () => void }) {
  const endpoint = typeof window !== "undefined" ? `${window.location.origin}/api/public/sensors/ingest` : "";
  return (
    <div role="alert" className="mb-5 rounded-2xl border-2 border-primary bg-primary/5 p-4">
      <p className="flex items-center gap-2 font-semibold"><KeyRound className="h-5 w-5 text-primary" />Chave do sensor “{name}”</p>
      <p className="mt-1 text-sm text-muted-foreground">Copie agora e configure no aparelho. Por segurança ela não será mostrada de novo.</p>
      <code className="mt-3 block break-all rounded-lg bg-muted p-3 text-xs">{sensorKey}</code>
      <p className="mt-3 text-xs text-muted-foreground">O sensor deve enviar <b>POST</b> para <span className="break-all">{endpoint}</span> com o cabeçalho <b>x-sensor-key</b> e corpo {"{"} "value": 27.4 {"}"}.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={() => navigator.clipboard.writeText(sensorKey).then(() => toast.success("Chave copiada"))}><Copy className="h-4 w-4" />Copiar chave</Button>
        <Button variant="outline" onClick={onClose}>Continuar</Button>
      </div>
    </div>
  );
}

function Sensores() {
  const { plots } = usePlotsQuery();
  const myPlots = plots.filter((p) => p.mine && p.uuid);
  const sensorsQ = useSensors();
  const readingsQ = useReadings();
  const mut = useSensorMutations();
  const sensors = sensorsQ.data ?? [];
  const readings = readingsQ.data ?? [];

  const [form, setForm] = useState({ name: "", model: "", metric: "temperature" as Metric, plot_id: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [shownKey, setShownKey] = useState<{ name: string; key: string } | null>(null);

  const save = async () => {
    const r = sensorSchema.safeParse({ ...form, plot_id: form.plot_id || myPlots[0]?.uuid || "" });
    if (!r.success) { setErrors(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message]))); return; }
    setErrors({}); setSaving(true);
    try {
      const key = await mut.add(r.data);
      setShownKey({ name: r.data.name, key });
      setForm((f) => ({ ...f, name: "", model: "" }));
      toast.success("Sensor cadastrado");
    } catch { toast.error("Não foi possível salvar o sensor"); } finally { setSaving(false); }
  };

  return (
    <>
      <PageHeader title="Sensores" subtitle="Cadastre os sensores de cada talhão. As leituras chegam automaticamente ou podem ser lançadas à mão." />
      {shownKey && <KeyNotice name={shownKey.name} sensorKey={shownKey.key} onClose={() => setShownKey(null)} />}

      <div className="grid gap-5 xl:grid-cols-3">
        <Panel title="Novo sensor" icon={<Plus className="h-5 w-5 text-primary" />}>
          {myPlots.length === 0 ? <p className="text-sm text-muted-foreground">Cadastre um talhão primeiro na tela Talhões.</p> : (
            <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); void save(); }}>
              <label className="grid gap-1 text-sm">Nome<input className={input} value={form.name} maxLength={80} placeholder="Ex.: Estação T1 norte" onChange={(e) => setForm({ ...form, name: e.target.value })} />{errors.name && <span className="text-xs text-destructive">{errors.name}</span>}</label>
              <label className="grid gap-1 text-sm">O que mede<select className={input} value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value as Metric })}>
                {Object.entries(metrics).map(([k, m]) => <option key={k} value={k}>{m.label} ({m.unit})</option>)}</select></label>
              <label className="grid gap-1 text-sm">Talhão<select className={input} value={form.plot_id || myPlots[0]?.uuid} onChange={(e) => setForm({ ...form, plot_id: e.target.value })}>
                {myPlots.map((p) => <option key={p.uuid} value={p.uuid}>{p.id} · {p.name}</option>)}</select>{errors.plot_id && <span className="text-xs text-destructive">{errors.plot_id}</span>}</label>
              <label className="grid gap-1 text-sm">Modelo / fabricante (opcional)<input className={input} value={form.model} maxLength={80} onChange={(e) => setForm({ ...form, model: e.target.value })} /></label>
              <Button type="submit" disabled={saving}><Save className="h-4 w-4" />{saving ? "Salvando…" : "Salvar sensor"}</Button>
            </form>
          )}
        </Panel>

        <Panel title="Sensores cadastrados" icon={<Radio className="h-5 w-5 text-primary" />} className="xl:col-span-2">
          {sensorsQ.isPending ? <p className="text-sm text-muted-foreground">Carregando…</p> : sensors.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum sensor ainda.</p> : (
            <div className="grid gap-3 md:grid-cols-2">
              {sensors.map((s) => <SensorCard key={s.id} sensor={s} plotLabel={plots.find((p) => p.uuid === s.plot_id)?.id ?? "—"}
                last={readings.find((r) => r.sensor_id === s.id)} onKey={(key) => setShownKey({ name: s.name, key })} />)}
            </div>
          )}
        </Panel>
      </div>

      <Comparison sensors={sensors} />
    </>
  );
}

function SensorCard({ sensor, plotLabel, last, onKey }: { sensor: Sensor; plotLabel: string; last?: { value: number; recorded_at: string; source: string }; onKey: (k: string) => void }) {
  const mut = useSensorMutations();
  const { user } = usePlotsQuery();
  const mine = sensor.owner_id === user?.id;
  const m = metrics[sensor.metric];
  const [value, setValue] = useState("");
  const [when, setWhen] = useState(localNow);
  const [busy, setBusy] = useState(false);
  const online = sensor.last_seen_at && Date.now() - new Date(sensor.last_seen_at).getTime() < 60 * 60 * 1000;

  const send = async () => {
    const r = readingSchema(sensor.metric).safeParse({ value: value === "" ? NaN : Number(value.replace(",", ".")), recorded_at: new Date(when) });
    if (!r.success) { toast.error(r.error.issues[0]?.message ?? "Leitura inválida"); return; }
    setBusy(true);
    try { await mut.addReading(sensor.id, r.data.value, r.data.recorded_at); setValue(""); toast.success("Leitura enviada"); }
    catch { toast.error("Leitura recusada"); } finally { setBusy(false); }
  };

  return (
    <div className="min-w-0 rounded-xl border p-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <div className="min-w-0"><p className="font-semibold">{sensor.name}</p><p className="text-xs text-muted-foreground">{m.label} · {plotLabel}{sensor.model && ` · ${sensor.model}`}</p></div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${online ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>{online ? "Ativo" : "Sem sinal"}</span>
      </div>
      <p className="mt-3 font-display text-2xl font-semibold tabular-nums">{last ? last.value : "—"}<span className="ml-1 text-sm font-normal text-muted-foreground">{m.unit}</span></p>
      <p className="text-xs text-muted-foreground">{last ? `${new Date(last.recorded_at).toLocaleString("pt-BR")} · ${last.source === "device" ? "automática" : "manual"}` : "Nenhuma leitura recebida"}</p>
      {mine && (
        <>
          <form className="mt-3 grid grid-cols-2 gap-2" onSubmit={(e) => { e.preventDefault(); void send(); }}>
            <input className={input} inputMode="decimal" placeholder={`Valor (${m.unit})`} aria-label="Valor da leitura" value={value} onChange={(e) => setValue(e.target.value)} />
            <input className={input} type="datetime-local" aria-label="Data e hora" value={when} onChange={(e) => setWhen(e.target.value)} />
            <Button type="submit" className="col-span-2" disabled={busy}>{busy ? "Enviando…" : "Enviar leitura manual"}</Button>
          </form>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={async () => { if (!confirm("Gerar nova chave? A anterior deixa de funcionar.")) return; try { onKey(await mut.rotateKey(sensor.id)); } catch { toast.error("Falha ao gerar chave"); } }}><KeyRound className="h-4 w-4" />Nova chave</Button>
            <Button variant="ghost" size="sm" onClick={async () => { if (!confirm(`Excluir ${sensor.name} e suas leituras?`)) return; try { await mut.remove(sensor.id); toast.success("Sensor excluído"); } catch { toast.error("Falha ao excluir"); } }}><Trash2 className="h-4 w-4" />Excluir</Button>
          </div>
        </>
      )}
    </div>
  );
}

function Comparison({ sensors }: { sensors: Sensor[] }) {
  const { plots } = usePlotsQuery();
  const readingsQ = useReadings();
  const withSensors = plots.filter((p) => p.uuid && sensors.some((s) => s.plot_id === p.uuid && (s.metric === "temperature" || s.metric === "rain")));
  const [plotUuid, setPlotUuid] = useState("");
  const plot = withSensors.find((p) => p.uuid === plotUuid) ?? withSensors[0];
  const base = useBaseForecast(plot?.location);

  const rows = useMemo(() => {
    if (!plot) return [];
    const ids = (metric: Metric) => new Set(sensors.filter((s) => s.plot_id === plot.uuid && s.metric === metric).map((s) => s.id));
    const t = ids("temperature"), r = ids("rain");
    const all = readingsQ.data ?? [];
    const temp = dailyStats(all.filter((x) => t.has(x.sensor_id)));
    const rain = dailyStats(all.filter((x) => r.has(x.sensor_id)));
    return (base.data ?? []).map((b) => ({ ...b, temp: temp.get(b.date), rainReal: rain.get(b.date) })).reverse();
  }, [plot, sensors, readingsQ.data, base.data]);

  const diff = (a?: number, b?: number) => a == null || b == null ? "" : ` (${a - b >= 0 ? "+" : ""}${(a - b).toFixed(1)})`;

  return (
    <Panel title="Previsão x medição real" icon={<Scale className="h-5 w-5 text-water" />} className="mt-5">
      <p className="mb-3 text-xs text-muted-foreground">A previsão serve de base; no dia seguinte ela é comparada com o que seus sensores de temperatura e chuva realmente mediram.</p>
      {withSensors.length === 0 ? <p className="text-sm text-muted-foreground">Cadastre um sensor de temperatura ou chuva para ver a comparação.</p> : (
        <>
          <select className={`${input} mb-3 max-w-xs`} aria-label="Talhão" value={plot?.uuid} onChange={(e) => setPlotUuid(e.target.value)}>
            {withSensors.map((p) => <option key={p.uuid} value={p.uuid}>{p.id} · {p.name}</option>)}
          </select>
          {!plot?.location ? <p className="text-sm text-muted-foreground">Este talhão não tem localização cadastrada.</p> : base.isError ? <p className="text-sm text-muted-foreground">Não foi possível carregar a previsão.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead><tr className="text-left text-xs text-muted-foreground"><th className="py-2">Dia</th><th>Máx. prevista / medida</th><th>Mín. prevista / medida</th><th>Chuva prevista / medida</th></tr></thead>
                <tbody>{rows.map((d) => (
                  <tr key={d.date} className="border-t">
                    <td className="py-2 font-medium">{new Date(d.date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })}</td>
                    <td>{d.max}° / {d.temp ? `${d.temp.max.toFixed(1)}°${diff(d.temp.max, d.max)}` : "—"}</td>
                    <td>{d.min}° / {d.temp ? `${d.temp.min.toFixed(1)}°${diff(d.temp.min, d.min)}` : "—"}</td>
                    <td>{d.rain} mm / {d.rainReal ? `${d.rainReal.sum.toFixed(1)} mm${diff(d.rainReal.sum, d.rain)}` : "—"}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Panel>
  );
}
