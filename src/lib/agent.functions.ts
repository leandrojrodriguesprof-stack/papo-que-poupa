import { createServerFn } from "@tanstack/react-start";
import { generateResponse } from "@lovable.dev/ai-gateway";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CATEGORIES, monthTotals, normalizeCategory } from "./finance";

const MODEL = "openai/gpt-6-astra" as const;

function extractText(res: unknown): string {
  const r = res as { output_text?: string; output?: Array<{ type: string; content?: Array<{ type: string; text?: string }> }> };
  if (typeof r.output_text === "string" && r.output_text) return r.output_text;
  return (r.output ?? [])
    .filter((o) => o.type === "message")
    .flatMap((o) => o.content ?? [])
    .filter((c) => c.type === "output_text")
    .map((c) => c.text ?? "")
    .join("");
}

const agentSchema = {
  type: "object",
  additionalProperties: false,
  required: ["reply", "transactions", "goal_deposits", "new_goals"],
  properties: {
    reply: { type: "string" },
    transactions: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        required: ["kind", "amount", "category", "description", "date"],
        properties: {
          kind: { type: "string", enum: ["expense", "income"] },
          amount: { type: "number" },
          category: { type: "string", enum: [...CATEGORIES] },
          description: { type: "string" },
          date: { type: "string", description: "YYYY-MM-DD" },
        },
      },
    },
    goal_deposits: {
      type: "array",
      items: {
        type: "object", additionalProperties: false, required: ["goal_id", "amount"],
        properties: { goal_id: { type: "string" }, amount: { type: "number" } },
      },
    },
    new_goals: {
      type: "array",
      items: {
        type: "object", additionalProperties: false, required: ["title", "target_amount", "emoji"],
        properties: { title: { type: "string" }, target_amount: { type: "number" }, emoji: { type: "string" } },
      },
    },
  },
};

type AgentOut = {
  reply: string;
  transactions: { kind: "expense" | "income"; amount: number; category: string; description: string; date: string }[];
  goal_deposits: { goal_id: string; amount: number }[];
  new_goals: { title: string; target_amount: number; emoji: string }[];
};

export const sendAgentMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ text: z.string().trim().min(1).max(2000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);

    const { error: insErr } = await supabase.from("chat_messages").insert({ user_id: userId, role: "user", content: data.text });
    if (insErr) throw new Error(insErr.message);

    const [{ data: profile }, { data: goals }, { data: txs }, { data: history }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("goals").select("id,title,target_amount,saved_amount"),
      supabase.from("transactions").select("kind,amount,category,occurred_on").gte("occurred_on", today.slice(0, 7) + "-01"),
      supabase.from("chat_messages").select("role,content").order("created_at", { ascending: false }).limit(30),
    ]);
    const totals = monthTotals((txs ?? []).map((t) => ({ ...t, amount: Number(t.amount) })), today.slice(0, 7));

    const instructions = `Você é o "Agente Financeiro", um amigo paciente que ajuda iniciantes a organizar o dinheiro pelo chat, em português do Brasil.
Hoje é ${today}. Usuário: ${profile?.display_name ?? "amigo"}. Renda mensal informada: ${profile?.monthly_income ?? "não informada"}. Objetivo: ${profile?.main_goal ?? "não informado"}.
Mês atual: receitas R$${totals.income.toFixed(2)}, gastos R$${totals.expense.toFixed(2)}, por categoria ${JSON.stringify(totals.byCategory)}.
Metas (id, título, alvo, guardado): ${JSON.stringify(goals ?? [])}.
Regras:
- Quando a mensagem descrever gastos ou ganhos ("gastei 30 no uber", "recebi 2000 de salário"), registre cada um em transactions com a categoria mais adequada. Datas relativas ("ontem") viram YYYY-MM-DD.
- Quando a pessoa disser que guardou dinheiro para uma meta existente, use goal_deposits com o id correto. Se pedir para criar uma meta, use new_goals.
- Não invente transações. Se o valor estiver ambíguo, pergunte.
- reply: curto como WhatsApp (1-4 frases), caloroso, confirme o que registrou com valores em R$, e quando fizer sentido dê UMA dica prática simples. Pode usar emojis com moderação e markdown leve.`;

    const input = [...(history ?? [])].reverse().map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    }));

    const res = await generateResponse({
      model: MODEL,
      instructions,
      input,
      text: { format: { type: "json_schema", name: "agent_turn", strict: true, schema: agentSchema } },
    });
    let out: AgentOut;
    try {
      out = JSON.parse(extractText(res)) as AgentOut;
    } catch {
      out = { reply: "Desculpe, não entendi bem. Pode repetir?", transactions: [], goal_deposits: [], new_goals: [] };
    }

    const txRows = out.transactions
      .filter((t) => t.amount > 0)
      .map((t) => ({
        user_id: userId, kind: t.kind, amount: Math.round(t.amount * 100) / 100,
        category: normalizeCategory(t.category), description: t.description,
        occurred_on: /^\d{4}-\d{2}-\d{2}$/.test(t.date) ? t.date : today,
      }));
    if (txRows.length) {
      const { error } = await supabase.from("transactions").insert(txRows);
      if (error) throw new Error(error.message);
    }
    for (const d of out.goal_deposits) {
      const g = goals?.find((x) => x.id === d.goal_id);
      if (!g || d.amount <= 0) continue;
      await supabase.from("goals").update({ saved_amount: Number(g.saved_amount) + d.amount }).eq("id", g.id);
    }
    if (out.new_goals.length) {
      await supabase.from("goals").insert(out.new_goals.map((g) => ({ user_id: userId, title: g.title, target_amount: g.target_amount, emoji: g.emoji || "🎯" })));
    }

    const { error: aErr } = await supabase.from("chat_messages").insert({ user_id: userId, role: "assistant", content: out.reply });
    if (aErr) throw new Error(aErr.message);
    return { reply: out.reply, recorded: txRows.length };
  });

export const generateInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const since = new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10);
    const [{ data: profile }, { data: txs }, { data: goals }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", context.userId).maybeSingle(),
      supabase.from("transactions").select("kind,amount,category,description,occurred_on").gte("occurred_on", since),
      supabase.from("goals").select("title,target_amount,saved_amount"),
    ]);
    const res = await generateResponse({
      model: MODEL,
      instructions: "Você é um educador financeiro para iniciantes no Brasil. Responda em português, simples e encorajador.",
      input: [{
        role: "user",
        content: `Renda: ${profile?.monthly_income ?? "?"}. Objetivo: ${profile?.main_goal ?? "?"}. Transações dos últimos 60 dias: ${JSON.stringify(txs ?? [])}. Metas: ${JSON.stringify(goals ?? [])}. Gere 4 recomendações personalizadas de economia, com base nos dados reais (cite valores em R$). Se houver poucos dados, dê dicas para começar.`,
      }],
      text: {
        format: {
          type: "json_schema", name: "insights", strict: true,
          schema: {
            type: "object", additionalProperties: false, required: ["insights"],
            properties: {
              insights: {
                type: "array",
                items: {
                  type: "object", additionalProperties: false,
                  required: ["emoji", "title", "body", "potential_saving"],
                  properties: {
                    emoji: { type: "string" }, title: { type: "string" }, body: { type: "string" },
                    potential_saving: { type: "number", description: "economia mensal estimada em R$, 0 se não se aplica" },
                  },
                },
              },
            },
          },
        },
      },
    });
    try {
      return JSON.parse(extractText(res)) as { insights: { emoji: string; title: string; body: string; potential_saving: number }[] };
    } catch {
      return { insights: [] };
    }
  });
