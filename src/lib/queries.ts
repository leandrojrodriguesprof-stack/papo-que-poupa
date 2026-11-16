import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const profileQuery = queryOptions({
  queryKey: ["profile"],
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("profiles").select("*").eq("id", u.user!.id).maybeSingle();
    if (error) throw error;
    return data;
  },
});

export const transactionsQuery = queryOptions({
  queryKey: ["transactions"],
  queryFn: async () => {
    const { data, error } = await supabase.from("transactions").select("*").order("occurred_on", { ascending: false }).order("created_at", { ascending: false }).limit(500);
    if (error) throw error;
    return data.map((t) => ({ ...t, amount: Number(t.amount) }));
  },
});

export const goalsQuery = queryOptions({
  queryKey: ["goals"],
  queryFn: async () => {
    const { data, error } = await supabase.from("goals").select("*").order("created_at");
    if (error) throw error;
    return data.map((g) => ({ ...g, target_amount: Number(g.target_amount), saved_amount: Number(g.saved_amount) }));
  },
});

export const messagesQuery = queryOptions({
  queryKey: ["messages"],
  queryFn: async () => {
    const { data, error } = await supabase.from("chat_messages").select("id,role,content,created_at").order("created_at").limit(300);
    if (error) throw error;
    return data;
  },
});
