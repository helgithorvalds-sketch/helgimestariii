import { supabase } from "@/integrations/supabase/client";

// The generated types file may not include the new tables yet on the first
// build after the migration — cast the client to any for these queries.
const db = supabase as any;

export type CommChannel = "email" | "messenger" | "sms" | "note";
export type CommDirection = "inbound" | "outbound" | null;

export interface Communication {
  id: string;
  companyId: string;
  channel: CommChannel;
  direction: CommDirection;
  subject: string | null;
  body: string;
  occurredAt: string;
  sourceRef: string | null;
  processed: boolean;
  createdAt: string;
}

export interface CommStatus {
  companyId: string;
  summary: string | null;
  needsReply: boolean;
  needsReplyReason: string | null;
  lastCommAt: string | null;
  updatedAt: string;
}

function rowToComm(r: any): Communication {
  return {
    id: r.id,
    companyId: r.company_id,
    channel: r.channel,
    direction: r.direction ?? null,
    subject: r.subject ?? null,
    body: r.body,
    occurredAt: r.occurred_at,
    sourceRef: r.source_ref ?? null,
    processed: !!r.processed,
    createdAt: r.created_at,
  };
}

function rowToStatus(r: any): CommStatus {
  return {
    companyId: r.company_id,
    summary: r.summary ?? null,
    needsReply: !!r.needs_reply,
    needsReplyReason: r.needs_reply_reason ?? null,
    lastCommAt: r.last_comm_at ?? null,
    updatedAt: r.updated_at,
  };
}

export async function fetchCommunications(companyId: string): Promise<Communication[]> {
  const { data, error } = await db
    .from("communications")
    .select("*")
    .eq("company_id", companyId)
    .order("occurred_at", { ascending: false });
  if (error) {
    console.error("fetchCommunications", error);
    return [];
  }
  return (data || []).map(rowToComm);
}

export async function addCommunication(input: {
  companyId: string;
  channel: CommChannel;
  direction?: CommDirection;
  subject?: string | null;
  body: string;
  occurredAt?: string;
}): Promise<Communication | null> {
  const payload: any = {
    company_id: input.companyId,
    channel: input.channel,
    direction: input.direction ?? null,
    subject: input.subject ?? null,
    body: input.body,
    processed: false,
  };
  if (input.occurredAt) payload.occurred_at = input.occurredAt;
  const { data, error } = await db
    .from("communications")
    .insert(payload)
    .select()
    .single();
  if (error) {
    console.error("addCommunication", error);
    return null;
  }
  // update last_comm_at + needs_reply=true for inbound
  await upsertCommStatus(input.companyId, {
    lastCommAt: (data as any).occurred_at,
    ...(input.direction === "inbound" ? { needsReply: true, needsReplyReason: "Ný skilaboð frá þeim" } : {}),
  });
  return rowToComm(data);
}

export async function fetchCommStatus(companyId: string): Promise<CommStatus | null> {
  const { data, error } = await db
    .from("comm_status")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();
  if (error) {
    console.error("fetchCommStatus", error);
    return null;
  }
  return data ? rowToStatus(data) : null;
}

export async function fetchAllNeedsReply(): Promise<CommStatus[]> {
  const { data, error } = await db
    .from("comm_status")
    .select("*")
    .eq("needs_reply", true)
    .order("last_comm_at", { ascending: false, nullsFirst: false });
  if (error) {
    console.error("fetchAllNeedsReply", error);
    return [];
  }
  return (data || []).map(rowToStatus);
}

export async function upsertCommStatus(
  companyId: string,
  patch: Partial<Omit<CommStatus, "companyId" | "updatedAt">>,
): Promise<CommStatus | null> {
  const payload: any = { company_id: companyId };
  if (patch.summary !== undefined) payload.summary = patch.summary;
  if (patch.needsReply !== undefined) payload.needs_reply = patch.needsReply;
  if (patch.needsReplyReason !== undefined) payload.needs_reply_reason = patch.needsReplyReason;
  if (patch.lastCommAt !== undefined) payload.last_comm_at = patch.lastCommAt;
  const { data, error } = await db
    .from("comm_status")
    .upsert(payload, { onConflict: "company_id" })
    .select()
    .single();
  if (error) {
    console.error("upsertCommStatus", error);
    return null;
  }
  return rowToStatus(data);
}

export async function markReplied(companyId: string): Promise<CommStatus | null> {
  return upsertCommStatus(companyId, { needsReply: false, needsReplyReason: null });
}

export function channelLabel(ch: CommChannel): string {
  switch (ch) {
    case "email": return "Tölvupóstur";
    case "messenger": return "Messenger";
    case "sms": return "SMS";
    case "note": return "Glósa";
  }
}