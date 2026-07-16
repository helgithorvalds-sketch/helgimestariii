import { supabase } from "@/integrations/supabase/client";

export type ReminderChannel = "sms" | "email";
export type ReminderStatus = "queued" | "sent" | "cancelled" | "failed";

export interface Reminder {
  id: string;
  companyId: string;
  channel: ReminderChannel;
  recipient: string;
  message: string;
  scheduledDate: string;
  status: ReminderStatus;
  sentAt: string | null;
  error: string | null;
  createdAt: string;
}

function rowToReminder(r: any): Reminder {
  return {
    id: r.id,
    companyId: r.company_id,
    channel: r.channel,
    recipient: r.recipient,
    message: r.message,
    scheduledDate: r.scheduled_date,
    status: r.status,
    sentAt: r.sent_at,
    error: r.error,
    createdAt: r.created_at,
  };
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function defaultTemplate(companyName: string) {
  return `Góðan dag! Þetta er áminning: við hjá Norðurvef munum hringja í ykkur í dag. Kær kveðja, Helgi.`;
}

export async function createReminder(input: {
  companyId: string;
  channel?: ReminderChannel;
  recipient: string;
  message: string;
  scheduledDate?: string;
}): Promise<Reminder | null> {
  const { data, error } = await supabase
    .from("notifications_outbox")
    .insert({
      company_id: input.companyId,
      channel: input.channel || "sms",
      recipient: input.recipient,
      message: input.message,
      scheduled_date: input.scheduledDate || todayISO(),
      status: "queued",
    })
    .select()
    .single();
  if (error) {
    console.error("createReminder", error);
    return null;
  }
  return rowToReminder(data);
}

export async function cancelReminder(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("notifications_outbox")
    .update({ status: "cancelled" })
    .eq("id", id);
  return !error;
}

export async function listRemindersForDate(dateISO?: string): Promise<Reminder[]> {
  const d = dateISO || todayISO();
  const { data, error } = await supabase
    .from("notifications_outbox")
    .select("*")
    .eq("scheduled_date", d)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data || []).map(rowToReminder);
}

export async function listActiveForCompany(companyId: string): Promise<Reminder[]> {
  const { data, error } = await supabase
    .from("notifications_outbox")
    .select("*")
    .eq("company_id", companyId)
    .in("status", ["queued", "sent"])
    .eq("scheduled_date", todayISO());
  if (error) return [];
  return (data || []).map(rowToReminder);
}

export async function triggerSendReminders(): Promise<{ processed: number } | null> {
  const { data, error } = await supabase.functions.invoke("send-reminders", { body: {} });
  if (error) return null;
  return data as any;
}