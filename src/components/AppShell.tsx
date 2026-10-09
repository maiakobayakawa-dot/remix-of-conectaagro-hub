import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Button } from "@/components/ui/button";
import { BookOpen, CalendarDays, LayoutDashboard, Leaf, MapPin, Radio, Moon, Microscope, Settings, Sun } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

const nav = [
  { to: "/", label: "Painel", icon: LayoutDashboard },
  { to: "/talhoes", label: "Talhões", icon: MapPin },
  { to: "/sensores", label: "Sensores", icon: Radio },
  { to: "/diagnostico", label: "Diagnóstico", icon: Microscope },
  { to: "/caderno", label: "Caderno", icon: BookOpen },
  { to: "/historico", label: "Histórico", icon: CalendarDays },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const sync = () => setDark(document.documentElement.classList.contains("dark"));
    sync();
    window.addEventListener("conectaagro:theme", sync);
    return () => window.removeEventListener("conectaagro:theme", sync);
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    window.dispatchEvent(new Event("conectaagro:theme"));
  };
  return (
    <button onClick={toggle} aria-label="Alternar tema"
      className="grid h-10 w-10 place-items-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground transition hover:opacity-80">
      {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    const { error } = await supabase.auth.signOut();
    if (!error) await navigate({ to: "/auth", replace: true });
  };
  const account = ready && (user ? <Button variant="ghost" onClick={signOut}>Sair</Button> : <Button variant="ghost" asChild><Link to="/auth"><span className="lg:hidden">Entrar</span><span className="hidden lg:inline">Entrar / Criar conta</span></Link></Button>);
  return (
    <div className="min-h-screen lg:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar p-5 text-sidebar-foreground lg:flex">
        <div className="mb-10 flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground"><Leaf className="h-5 w-5" /></div>
          <div><p className="font-display text-lg font-semibold leading-none">ConectaAgro</p><p className="text-xs opacity-70">Fazenda Boa Vista</p></div>
        </div>
        <nav className="flex flex-col gap-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} activeOptions={{ exact: to === "/" }}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium opacity-80 transition hover:bg-sidebar-accent hover:opacity-100"
              activeProps={{ className: "!bg-sidebar-primary !text-sidebar-primary-foreground !opacity-100" }}>
              <Icon className="h-5 w-5" />{label}
            </Link>
          ))}
        </nav>
        <div className="mt-4 border-t border-sidebar-border pt-3">{account}</div>
        <div className="mt-auto flex items-center justify-between">
          <span className="flex items-center gap-2 text-xs opacity-80"><span className="live-dot h-2 w-2 rounded-full bg-sidebar-primary" />12 sensores online</span>
          <ThemeToggle />
        </div>
      </aside>

      <header className="mobile-header sticky top-0 z-30 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 bg-sidebar px-4 py-3 text-sidebar-foreground lg:hidden">
        <div className="flex min-w-0 items-center gap-2"><Leaf className="h-5 w-5 shrink-0 text-sidebar-primary" /><span className="truncate font-display font-semibold">ConectaAgro</span></div>
        <div className="flex shrink-0 items-center gap-1">{account}<ThemeToggle /></div>
      </header>

      <main className="app-content min-w-0 flex-1 px-4 pb-28 pt-5 sm:px-6 lg:px-10 lg:pb-10 lg:pt-8">{children}</main>

      <nav aria-label="Menu principal" className="mobile-nav fixed inset-x-0 bottom-0 z-30 grid grid-cols-7 border-t border-sidebar-border bg-sidebar text-sidebar-foreground lg:hidden">
        {nav.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} activeOptions={{ exact: to === "/" }}
            aria-label={label}
            className="flex min-w-0 flex-col items-center gap-1 py-3 text-[10px] opacity-70 sm:text-xs"
            activeProps={{ className: "!opacity-100 text-sidebar-primary" }}>
            <Icon className="h-6 w-6 shrink-0" /><span className="max-w-full truncate">{to === "/configuracoes" ? "Ajustes" : label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:flex-wrap sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

export function Panel({ title, icon, children, className = "", action }: { title?: string; icon?: ReactNode; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <section className={`min-w-0 rounded-2xl border bg-card p-4 text-card-foreground shadow-soft sm:p-5 ${className}`}>
      {title && (
        <div className="mb-4 grid min-w-0 gap-3 sm:flex sm:items-center sm:justify-between">
          <h2 className="flex min-w-0 items-center gap-2 text-base font-semibold [&>svg]:shrink-0">{icon}{title}</h2>{action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
