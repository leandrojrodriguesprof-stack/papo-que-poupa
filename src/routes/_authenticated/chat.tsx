import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { SendHorizonal } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { AgentAvatar } from "@/components/app/AgentAvatar";
import { messagesQuery, profileQuery } from "@/lib/queries";
import { sendAgentMessage } from "@/lib/agent.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({ meta: [{ title: "Chat — Agente Financeiro" }, { name: "description", content: "Converse com seu agente e registre gastos." }, { property: "og:title", content: "Chat — Agente Financeiro" }, { property: "og:description", content: "Converse com seu agente e registre gastos." }] }),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(messagesQuery), context.queryClient.ensureQueryData(profileQuery)]),
  component: ChatPage,
});

const SUGGESTIONS = ["gastei 30 no almoço", "paguei 120 de luz", "recebi 2500 de salário", "quero criar uma meta de 1000 pra viagem", "como estou esse mês?"];

type Msg = { id: string; role: string; content: string; created_at: string };

function ChatPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data: profile } = useQuery(profileQuery);
  const { data: messages } = useSuspenseQuery(messagesQuery);
  const send = useServerFn(sendAgentMessage);
  const [text, setText] = useState("");
  const [pending, setPending] = useState<Msg | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (profile && !profile.onboarded) nav({ to: "/onboarding" }); }, [profile, nav]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length, pending]);
  useEffect(() => { inputRef.current?.focus(); }, [pending]);

  async function submit(value: string) {
    const v = value.trim();
    if (!v || pending) return;
    setText("");
    setPending({ id: "pending", role: "user", content: v, created_at: new Date().toISOString() });
    try {
      const r = await send({ data: { text: v } });
      if (r.recorded) toast.success(r.recorded === 1 ? "1 lançamento registrado" : `${r.recorded} lançamentos registrados`);
    } catch {
      toast.error("O agente não conseguiu responder agora. Tente de novo.");
      setText(v);
    } finally {
      await qc.invalidateQueries();
      setPending(null);
    }
  }

  const list: Msg[] = pending ? [...messages, pending] : messages;

  return (
    <AppShell fullHeight>
      <div className="flex h-full flex-col">
        <header className="flex items-center gap-3 bg-primary px-4 py-3 text-primary-foreground">
          <AgentAvatar className="bg-primary-foreground/20" />
          <div className="flex-1">
            <p className="font-semibold leading-tight">Agente Financeiro</p>
            <p className="text-xs opacity-80">{pending ? "digitando…" : "online"}</p>
          </div>
          <Link to="/resumo" className="rounded-full bg-primary-foreground/15 px-3 py-1.5 text-xs font-medium">Ver resumo</Link>
        </header>
        <div className="chat-wall min-h-0 flex-1 overflow-y-auto px-3 py-4 md:px-8">
          <div className="mx-auto flex max-w-3xl flex-col gap-2">
            {list.length === 0 && (
              <div className="mx-auto my-10 max-w-xs rounded-2xl bg-card p-5 text-center text-sm text-muted-foreground shadow-sm">
                Conte um gasto como se fosse para um amigo. Ex.: <em>“gastei 18 de uber”</em>.
              </div>
            )}
            {list.map((m) => {
              const me = m.role === "user";
              return (
                <div key={m.id} className={cn("flex", me ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[85%] rounded-2xl px-3.5 py-2 text-[15px] leading-relaxed shadow-sm md:max-w-[70%]",
                    me ? "rounded-br-sm bg-bubble-me text-bubble-me-foreground" : "rounded-bl-sm bg-bubble-agent")}>
                    <div className="[&_p]:my-0.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-semibold">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                    <p className="mt-0.5 text-right text-[10px] opacity-60">{new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
              );
            })}
            {pending && (
              <div className="flex justify-start">
                <div className="flex gap-1 rounded-2xl rounded-bl-sm bg-bubble-agent px-4 py-3 shadow-sm">
                  {[0, 1, 2].map((i) => <span key={i} className="typing-dot size-2 rounded-full bg-muted-foreground" style={{ animationDelay: `${i * 0.15}s` }} />)}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        </div>
        <div className="border-t bg-background px-3 pb-20 pt-2 md:pb-3">
          <div className="mx-auto max-w-3xl">
            <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" disabled={!!pending} onClick={() => submit(s)} className="shrink-0 rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary">{s}</button>
              ))}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); submit(text); }} className="flex items-end gap-2">
              <textarea ref={inputRef} rows={1} value={text} onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(text); } }}
                placeholder="Escreva uma mensagem" aria-label="Mensagem"
                className="max-h-32 min-h-11 flex-1 resize-none rounded-3xl border bg-card px-4 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-ring" />
              <button type="submit" aria-label="Enviar" disabled={!text.trim() || !!pending} className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-50">
                <SendHorizonal className="size-5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
