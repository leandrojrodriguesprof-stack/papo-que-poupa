import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageCircle, Target, PieChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AgentAvatar } from "@/components/app/AgentAvatar";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Agente Financeiro — suas finanças numa conversa" },
      { name: "description", content: "Registre gastos escrevendo como no WhatsApp. O Agente Financeiro classifica, acompanha metas e sugere economias." },
      { property: "og:title", content: "Agente Financeiro — suas finanças numa conversa" },
      { property: "og:description", content: "Registre gastos escrevendo como no WhatsApp. Sem planilhas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});


function Bubble({ me, children }: { me?: boolean; children: React.ReactNode }) {
  return (
    <div className={me ? "flex justify-end" : "flex justify-start"}>
      <div className={(me ? "rounded-br-sm bg-bubble-me text-bubble-me-foreground" : "rounded-bl-sm bg-bubble-agent") + " max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm"}>
        {children}
      </div>
    </div>
  );
}

function Landing() {
  return (
    <div className="min-h-dvh bg-hero">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <AgentAvatar />
          <span className="font-display text-xl font-bold">Agente Financeiro</span>
        </div>
        <Button asChild variant="ghost"><Link to="/auth">Entrar</Link></Button>
      </header>
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-8 md:grid-cols-2 md:pt-16">
        <div>
          <p className="mb-4 inline-block rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground">Sem planilhas. Sem complicação.</p>
          <h1 className="text-5xl font-extrabold leading-[1.05] md:text-6xl">Cuidar do dinheiro pode ser só uma conversa.</h1>
          <p className="mt-6 max-w-md text-lg text-muted-foreground">Escreva “gastei 35 no almoço” e pronto. O agente organiza, acompanha suas metas e te mostra onde dá pra economizar.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="h-12 rounded-full px-8 text-base shadow-soft"><Link to="/auth">Começar grátis</Link></Button>
          </div>
          <ul className="mt-10 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
            <li className="flex items-center gap-2"><MessageCircle className="size-4 text-primary" /> Chat simples</li>
            <li className="flex items-center gap-2"><PieChart className="size-4 text-primary" /> Resumo automático</li>
            <li className="flex items-center gap-2"><Target className="size-4 text-primary" /> Metas que motivam</li>
          </ul>
        </div>
        <div className="mx-auto w-full max-w-sm overflow-hidden rounded-[2rem] border bg-card shadow-soft">
          <div className="flex items-center gap-3 bg-primary px-4 py-3 text-primary-foreground">
            <AgentAvatar className="size-9 bg-primary-foreground/20" />
            <div><p className="font-semibold leading-tight">Agente Financeiro</p><p className="text-xs opacity-80">online</p></div>
          </div>
          <div className="chat-wall space-y-3 p-4">
            <Bubble me>gastei 42 no mercado e 18 de uber</Bubble>
            <Bubble>Anotado! 🛒 R$ 42,00 em Mercado e 🚗 R$ 18,00 em Transporte. Você já usou 31% do orçamento do mês.</Bubble>
            <Bubble me>guardei 100 pra viagem</Bubble>
            <Bubble>Boa! 🎯 Sua meta “Viagem” chegou a 45%. Faltam R$ 1.100,00.</Bubble>
          </div>
        </div>
      </section>
    </div>
  );
}
