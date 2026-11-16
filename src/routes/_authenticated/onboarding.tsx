import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AgentAvatar } from "@/components/app/AgentAvatar";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Boas-vindas — Agente Financeiro" }, { name: "description", content: "Configure seu Agente Financeiro em 3 passos." }, { property: "og:title", content: "Boas-vindas — Agente Financeiro" }, { property: "og:description", content: "Configure seu Agente Financeiro em 3 passos." }] }),
  component: Onboarding,
});

const GOALS = ["Sair das dívidas", "Montar reserva de emergência", "Economizar para uma viagem", "Entender para onde vai meu dinheiro"];

function Onboarding() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { user } = Route.useRouteContext();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [income, setIncome] = useState("");
  const [goal, setGoal] = useState(GOALS[3]);
  const [saving, setSaving] = useState(false);

  async function finish() {
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({
      id: user.id, display_name: name || null, monthly_income: income ? Number(income.replace(",", ".")) : null, main_goal: goal, onboarded: true,
    });
    if (!error) {
      await supabase.from("chat_messages").insert({
        user_id: user.id, role: "assistant",
        content: `Oi${name ? `, ${name}` : ""}! 👋 Eu sou seu **Agente Financeiro**. Para começar, me conte um gasto de hoje, tipo: *"gastei 25 no almoço"*. Eu anoto e organizo tudo pra você.`,
      });
    }
    setSaving(false);
    if (error) return toast.error("Não foi possível salvar.");
    await qc.invalidateQueries();
    nav({ to: "/chat" });
  }

  const steps = [
    <div key="0" className="space-y-4">
      <h1 className="text-3xl font-bold">Oi! Como posso te chamar?</h1>
      <p className="text-muted-foreground">Sou o seu agente financeiro. Vou te ajudar a organizar o dinheiro conversando.</p>
      <Input autoFocus placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} className="h-12 rounded-xl text-base" />
    </div>,
    <div key="1" className="space-y-4">
      <h1 className="text-3xl font-bold">Quanto entra por mês, mais ou menos?</h1>
      <p className="text-muted-foreground">Pode ser aproximado. Isso me ajuda a dar dicas melhores. Você pode pular.</p>
      <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
        <Input inputMode="decimal" placeholder="3000" value={income} onChange={(e) => setIncome(e.target.value)} className="h-12 rounded-xl pl-11 text-base" /></div>
    </div>,
    <div key="2" className="space-y-4">
      <h1 className="text-3xl font-bold">Qual é seu foco agora?</h1>
      <div className="grid gap-2">
        {GOALS.map((g) => (
          <button key={g} type="button" onClick={() => setGoal(g)} className={cn("rounded-xl border bg-card px-4 py-3 text-left font-medium transition-colors", goal === g && "border-primary bg-secondary")}>{g}</button>
        ))}
      </div>
    </div>,
  ];

  return (
    <div className="grid min-h-dvh place-items-center bg-hero px-5">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <AgentAvatar />
          <div className="flex gap-1.5">{[0, 1, 2].map((i) => <span key={i} className={cn("h-1.5 w-8 rounded-full bg-border", i <= step && "bg-primary")} />)}</div>
        </div>
        {steps[step]}
        <div className="mt-8 flex gap-3">
          {step > 0 && <Button variant="outline" className="h-12 flex-1 rounded-full" onClick={() => setStep(step - 1)}>Voltar</Button>}
          <Button className="h-12 flex-1 rounded-full" disabled={saving} onClick={() => (step < 2 ? setStep(step + 1) : finish())}>{step < 2 ? "Continuar" : "Começar a conversar"}</Button>
        </div>
      </div>
    </div>
  );
}
