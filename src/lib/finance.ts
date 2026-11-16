export const CATEGORIES = [
  "Alimentação", "Mercado", "Transporte", "Moradia", "Contas", "Saúde",
  "Lazer", "Compras", "Educação", "Assinaturas", "Salário", "Outros",
] as const;

export const CATEGORY_EMOJI: Record<string, string> = {
  Alimentação: "🍽️", Mercado: "🛒", Transporte: "🚗", Moradia: "🏠", Contas: "💡",
  Saúde: "💊", Lazer: "🎉", Compras: "🛍️", Educação: "📚", Assinaturas: "📺",
  Salário: "💰", Outros: "📦",
};

export function brl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function normalizeCategory(c: string): string {
  return (CATEGORIES as readonly string[]).includes(c) ? c : "Outros";
}

export type Tx = { kind: string; amount: number; category: string; occurred_on: string };

/** Totals for the given month (YYYY-MM). */
export function monthTotals(txs: Tx[], month: string) {
  let income = 0, expense = 0;
  const byCategory: Record<string, number> = {};
  for (const t of txs) {
    if (!t.occurred_on.startsWith(month)) continue;
    const v = Number(t.amount);
    if (t.kind === "income") income += v;
    else {
      expense += v;
      byCategory[t.category] = (byCategory[t.category] ?? 0) + v;
    }
  }
  return { income, expense, balance: income - expense, byCategory };
}
