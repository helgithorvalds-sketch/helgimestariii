import { supabase } from "@/integrations/supabase/client";

export interface CallLog {
  id: string;
  companyId: string;
  calledAt: string;
  notes: string;
  createdAt: string;
}

function rowToCallLog(row: any): CallLog {
  return {
    id: row.id,
    companyId: row.company_id,
    calledAt: row.called_at,
    notes: row.notes,
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

export async function addCallLog(companyId: string, notes: string): Promise<CallLog | null> {
  const { data, error } = await supabase
    .from("call_logs")
    .insert({ company_id: companyId, notes, called_at: new Date().toISOString() })
    .select()
    .single();

  if (error) {
    console.error("Error adding call log:", error);
    return null;
  }
  return rowToCallLog(data);
}

export async function deleteCallLog(id: string): Promise<boolean> {
  const { error } = await supabase.from("call_logs").delete().eq("id", id);
  if (error) {
    console.error("Error deleting call log:", error);
    return false;
  }
  return true;
}
