import { Link } from "@tanstack/react-router";
import { MessageCircle, PieChart, Target, Lightbulb, Settings } from "lucide-react";
import type { ReactNode } from "react";
import { AgentAvatar } from "./AgentAvatar";

const NAV = [
  { to: "/chat", label: "Chat", icon: MessageCircle },
  { to: "/resumo", label: "Resumo", icon: PieChart },
  { to: "/metas", label: "Metas", icon: Target },
  { to: "/insights", label: "Insights", icon: Lightbulb },
  { to: "/configuracoes", label: "Ajustes", icon: Settings },
] as const;

export function AppShell({ children, fullHeight }: { children: ReactNode; fullHeight?: boolean }) {
  return (
    <div className="flex h-dvh bg-background">
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-sidebar p-5 md:flex">
        <div className="mb-8 flex items-center gap-3">
          <AgentAvatar />
          <div>
            <p className="font-display text-lg font-bold leading-tight">Agente</p>
            <p className="text-sm text-muted-foreground">Financeiro</p>
          </div>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
              activeProps={{ className: "bg-sidebar-accent text-foreground" }}>
              <Icon className="size-5" /> {label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <main className={fullHeight ? "min-h-0 flex-1" : "min-h-0 flex-1 overflow-y-auto pb-24 md:pb-8"}>{children}</main>
        <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t bg-card/95 backdrop-blur md:hidden">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground"
              activeProps={{ className: "text-primary" }}>
              <Icon className="size-5" /> {label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mx-auto w-full max-w-4xl px-5 pb-4 pt-8">
      <h1 className="text-3xl font-bold">{title}</h1>
      {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
    </header>
  );
}
