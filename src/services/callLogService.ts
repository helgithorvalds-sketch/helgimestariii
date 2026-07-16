import { supabase } from "@/integrations/supabase/client";

export interface CallLog {
  id: string;
  companyId: string;
  calledAt: string;
  notes: string;
  outcome?: string | null;
  createdAt: string;
}

function rowToCallLog(row: any): CallLog {
  return {
    id: row.id,
    companyId: row.company_id,
    calledAt: row.called_at,
    notes: row.notes,
    outcome: row.outcome ?? null,
    createdAt: row.created_at,
  };
}

export async function fetchCallLogs(companyId: string): Promise<CallLog[]> {
  const { data, error } = await supabase
    .from("call_logs")
    .select("*")
    .eq("company_id", companyId)
    .order("called_at", { ascending: false });

  if (error) {
    console.error("Error fetching call logs:", error);
    return [];
  }
  return (data || []).map(rowToCallLog);
}

export async function fetchRecentCallLogs(limit: number = 30): Promise<CallLog[]> {
  const { data, error } = await supabase
    .from("call_logs")
    .select("*")
    .order("called_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching recent call logs:", error);
    return [];
  }
  return (data || []).map(rowToCallLog);
}

export async function addCallLog(companyId: string, notes: string, outcome?: string | null): Promise<CallLog | null> {
  const { data, error } = await supabase
    .from("call_logs")
    .insert({ company_id: companyId, notes, outcome: outcome ?? null, called_at: new Date().toISOString() } as any)
    .select()
    .single();

  if (error) {
    console.error("Error adding call log:", error);
    return null;
  }
  return rowToCallLog(data);
}

/**
 * Global hourly answer-rate stats + per-company recent hour preferences.
 * Answer rate = answered / (answered + no_answer). Rejected/other outcomes ignored.
 */
export interface HourStats {
  totalCalls: number;
  perHour: Record<number, { answered: number; noAnswer: number }>;
  bestHour: number | null; // 0..23 with highest answer rate (min 3 samples), null if not enough data
}

export async function fetchHourStats(): Promise<HourStats> {
  const { data, error } = await supabase
    .from("call_logs")
    .select("called_at, outcome")
    .not("outcome", "is", null);
  if (error || !data) return { totalCalls: 0, perHour: {}, bestHour: null };
  const perHour: Record<number, { answered: number; noAnswer: number }> = {};
  for (const r of data as any[]) {
    const h = new Date(r.called_at).getHours();
    if (!perHour[h]) perHour[h] = { answered: 0, noAnswer: 0 };
    if (r.outcome === "answered") perHour[h].answered++;
    else if (r.outcome === "no_answer") perHour[h].noAnswer++;
  }
  let bestHour: number | null = null;
  let bestRate = -1;
  for (const [h, s] of Object.entries(perHour)) {
    const total = s.answered + s.noAnswer;
    if (total < 3) continue;
    const rate = s.answered / total;
    if (rate > bestRate) { bestRate = rate; bestHour = Number(h); }
  }
  return { totalCalls: data.length, perHour, bestHour };
}

/** Answer rate per company for the last N calls (fallback to global). */
export async function fetchCompanyAnswerRates(): Promise<Record<string, number>> {
  const { data } = await supabase
    .from("call_logs")
    .select("company_id, outcome")
    .not("outcome", "is", null);
  const bucket: Record<string, { a: number; n: number }> = {};
  for (const r of (data as any[]) || []) {
    if (!bucket[r.company_id]) bucket[r.company_id] = { a: 0, n: 0 };
    if (r.outcome === "answered") bucket[r.company_id].a++;
    else if (r.outcome === "no_answer") bucket[r.company_id].n++;
  }
  const out: Record<string, number> = {};
  for (const [id, s] of Object.entries(bucket)) {
    const tot = s.a + s.n;
    if (tot >= 1) out[id] = s.a / tot;
  }
  return out;
}

export async function deleteCallLog(id: string): Promise<boolean> {
  const { error } = await supabase.from("call_logs").delete().eq("id", id);
  if (error) {
    console.error("Error deleting call log:", error);
    return false;
  }
  return true;
}
