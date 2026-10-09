import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Clock } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { useAuth } from "@/lib/use-auth";
import { getOwnProfile } from "@/lib/profile.functions";
import { greetingForHour, producerFirstName } from "@/lib/greeting";

export function DashboardGreeting() {
  const { user, ready } = useAuth();
  const getProfile = useServerFn(getOwnProfile);
  const profile = useQuery({
    queryKey: ["own-profile", user?.id],
    queryFn: () => getProfile(),
    enabled: ready && Boolean(user),
  });
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const name = user ? producerFirstName(profile.data?.full_name) : "";
  const greeting = now ? greetingForHour(now.getHours()) : "Olá";
  const date = now?.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const time = now?.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

  return <PageHeader
    title={`${greeting}${name ? `, ${name}` : ""}`}
    subtitle={date ?? "Painel agrícola"}
    right={<div className="flex flex-wrap items-center gap-3">
      <time dateTime={now?.toISOString()} aria-label={`Hora local: ${time ?? "carregando"}`} title="Horário local do seu dispositivo" className="flex items-center gap-2 whitespace-nowrap text-sm font-medium tabular-nums text-foreground">
        <Clock className="h-4 w-4 text-muted-foreground" />{time ?? "--:--:--"}
      </time>
      <span className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary"><span className="live-dot h-2 w-2 rounded-full bg-primary" />Ao vivo</span>
    </div>}
  />;
}