import { useQuery } from "@tanstack/react-query";
import type { LatLng } from "@/lib/plots-store";

export type DayForecast = {
  day: string; max: number; min: number; rain: number; rainProb: number; et0: number;
  icon: "sun" | "cloud-sun" | "rain" | "cloud";
};

const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" });

function iconFor(code: number): DayForecast["icon"] {
  if (code >= 51) return "rain";
  if (code >= 3) return "cloud";
  if (code >= 1) return "cloud-sun";
  return "sun";
}

/** Open-Meteo: previsão diária real (gratuita, sem chave) para uma coordenada. */
export async function fetchForecast({ lat, lng }: LatLng): Promise<DayForecast[]> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}` +
    "&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,et0_fao_evapotranspiration,weather_code&timezone=auto&forecast_days=7";
  const res = await fetch(url);
  if (!res.ok) throw new Error("weather");
  const d = (await res.json()).daily;
  return (d.time as string[]).map((t, i) => {
    const label = i === 0 ? "Hoje" : weekday.format(new Date(t + "T12:00:00Z")).replace(".", "");
    return {
      day: label.charAt(0).toUpperCase() + label.slice(1),
      max: Math.round(d.temperature_2m_max[i]), min: Math.round(d.temperature_2m_min[i]),
      rain: +(d.precipitation_sum[i] ?? 0).toFixed(1), rainProb: d.precipitation_probability_max[i] ?? 0,
      et0: +(d.et0_fao_evapotranspiration[i] ?? 0).toFixed(1), icon: iconFor(d.weather_code[i] ?? 0),
    };
  });
}

export function useForecast(loc?: LatLng) {
  return useQuery({
    queryKey: ["forecast", loc?.lat.toFixed(3), loc?.lng.toFixed(3)],
    queryFn: () => fetchForecast(loc!),
    enabled: !!loc,
    staleTime: 30 * 60 * 1000,
  });
}
