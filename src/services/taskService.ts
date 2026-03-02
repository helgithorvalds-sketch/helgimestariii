import { supabase } from "@/integrations/supabase/client";

export interface Task {
  id: string;
  companyId: string;
  description: string;
  deadline: string | null;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
}

function rowToTask(row: any): Task {
  return {
    id: row.id,
    companyId: row.company_id,
    description: row.description,
    deadline: row.deadline,
    completed: row.completed,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

export async function fetchTasksByCompany(companyId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) { console.error("Error fetching tasks:", error); return []; }
  return (data || []).map(rowToTask);
}

export async function fetchAllTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("deadline", { ascending: true, nullsFirst: false });
  if (error) { console.error("Error fetching all tasks:", error); return []; }
  return (data || []).map(rowToTask);
}

export async function addTask(companyId: string, description: string, deadline: string | null): Promise<Task | null> {
  const { data, error } = await supabase
    .from("tasks")
    .insert({ company_id: companyId, description, deadline })
    .select()
    .single();
  if (error) { console.error("Error adding task:", error); return null; }
  return rowToTask(data);
}

export async function toggleTaskCompleted(id: string, completed: boolean): Promise<boolean> {
  const { error } = await supabase
    .from("tasks")
    .update({ completed, completed_at: completed ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) { console.error("Error toggling task:", error); return false; }
  return true;
}

export async function deleteTask(id: string): Promise<boolean> {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) { console.error("Error deleting task:", error); return false; }
  return true;
}
