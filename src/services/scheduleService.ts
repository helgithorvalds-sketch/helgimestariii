import { supabase } from "@/integrations/supabase/client";
import { fetchCompanies } from "./companyService";
import { fetchHourStats, fetchCompanyAnswerRates } from "./callLogService";
import type { Company } from "@/types";

export type BlockKind = "prep" | "call" | "break" | "followup" | "email" | "custom";
export type BlockStatus = "pending" | "done" | "skipped";

export interface ScheduleBlock {
  id: string;
  scheduleDate: string; // YYYY-MM-DD
  blockTime: string; // HH:MM
  durationMin: number;
  kind: BlockKind;
  companyId: string | null;
  title: string;
  notes: string;
  status: BlockStatus;
}

export interface DailySettings {
  id: string;
  workStart: string;
  workEnd: string;
  maxCalls: number;
  vacationMode: boolean;
  weeklyGoalCalls: number;
  weeklyGoalOffers: number;
  weeklyGoalPaid: number;
}

function rowToBlock(r: any): ScheduleBlock {
  return {
    id: r.id,
    scheduleDate: r.schedule_date,
    blockTime: (r.block_time || "").slice(0, 5),
    durationMin: r.duration_min,
    kind: r.kind,
    companyId: r.company_id,
    title: r.title,
    notes: r.notes,
    status: r.status,
  };
}

function rowToSettings(r: any): DailySettings {
  return {
    id: r.id,
    workStart: (r.work_start || "09:00").slice(0, 5),
    workEnd: (r.work_end || "17:00").slice(0, 5),
    maxCalls: r.max_calls,
    vacationMode: r.vacation_mode,
    weeklyGoalCalls: r.weekly_goal_calls ?? 25,
    weeklyGoalOffers: r.weekly_goal_offers ?? 10,
    weeklyGoalPaid: r.weekly_goal_paid ?? 300000,
  };
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function addDaysISO(dateISO: string, days: number): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

export async function fetchDailySettings(): Promise<DailySettings> {
  const { data, error } = await supabase
    .from("daily_settings")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1);
  if (error || !data || !data.length) {
    // create default row
    const { data: created } = await supabase
      .from("daily_settings")
      .insert({})
      .select()
      .single();
    return rowToSettings(created);
  }
  return rowToSettings(data[0]);
}

export async function updateDailySettings(patch: Partial<DailySettings> & { id: string }): Promise<DailySettings | null> {
  const row: any = {};
  if (patch.workStart !== undefined) row.work_start = patch.workStart;
  if (patch.workEnd !== undefined) row.work_end = patch.workEnd;
  if (patch.maxCalls !== undefined) row.max_calls = patch.maxCalls;
  if (patch.vacationMode !== undefined) row.vacation_mode = patch.vacationMode;
  if (patch.weeklyGoalCalls !== undefined) row.weekly_goal_calls = patch.weeklyGoalCalls;
  if (patch.weeklyGoalOffers !== undefined) row.weekly_goal_offers = patch.weeklyGoalOffers;
  if (patch.weeklyGoalPaid !== undefined) row.weekly_goal_paid = patch.weeklyGoalPaid;
  const { data, error } = await supabase.from("daily_settings").update(row).eq("id", patch.id).select().single();
  if (error) return null;
  return rowToSettings(data);
}

export async function fetchBlocks(dateISO: string): Promise<ScheduleBlock[]> {
  const { data, error } = await supabase
    .from("daily_schedules")
    .select("*")
    .eq("schedule_date", dateISO)
    .order("block_time", { ascending: true });
  if (error) return [];
  return (data || []).map(rowToBlock);
}

export async function updateBlock(id: string, patch: Partial<ScheduleBlock>): Promise<void> {
  const row: any = {};
  if (patch.notes !== undefined) row.notes = patch.notes;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.blockTime !== undefined) row.block_time = patch.blockTime;
  await supabase.from("daily_schedules").update(row).eq("id", id);
}

export async function deleteBlock(id: string): Promise<void> {
  await supabase.from("daily_schedules").delete().eq("id", id);
}

function addMin(hhmm: string, min: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + min;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Generate schedule for a given date, idempotent.
 * Rolls over unfinished call blocks from prior 3 days.
 */
export async function ensureSchedule(dateISO: string, settings: DailySettings): Promise<ScheduleBlock[]> {
  const existing = await fetchBlocks(dateISO);
  if (existing.length > 0) return existing;
  if (settings.vacationMode) return [];

  // Rollover: pull pending call blocks from previous 3 days (call kind + pending)
  const from = addDaysISO(dateISO, -3);
  const { data: rollover } = await supabase
    .from("daily_schedules")
    .select("*")
    .lt("schedule_date", dateISO)
    .gte("schedule_date", from)
    .eq("status", "pending")
    .eq("kind", "call");
  const rolloverCompanyIds = new Set<string>();
  (rollover || []).forEach((r: any) => r.company_id && rolloverCompanyIds.add(r.company_id));

  const companies = await fetchCompanies();

  // Best-time-to-call intelligence
  const [hourStats, companyRates] = await Promise.all([
    fetchHourStats(),
    fetchCompanyAnswerRates(),
  ]);
  const enoughData = hourStats.totalCalls >= 20;

  // Prioritize: rollover companies first, then next_call_at <= today, then stage 'lead' with source
  const now = new Date();
  const isCallable = (c: Company) =>
    !c.rejected &&
    (c.stage === "lead" ||
      (c.nextCallAt && new Date(c.nextCallAt) <= now));
  const callable = companies.filter(isCallable);
  callable.sort((a, b) => {
    const ar = rolloverCompanyIds.has(a.id) ? 0 : 1;
    const br = rolloverCompanyIds.has(b.id) ? 0 : 1;
    if (ar !== br) return ar - br;
    if (enoughData) {
      const ra = companyRates[a.id];
      const rb = companyRates[b.id];
      // per-lead history wins
      if (ra !== undefined || rb !== undefined) {
        if ((rb ?? -1) !== (ra ?? -1)) return (rb ?? -1) - (ra ?? -1);
      }
    }
    const at = a.nextCallAt ? new Date(a.nextCallAt).getTime() : Infinity;
    const bt = b.nextCallAt ? new Date(b.nextCallAt).getTime() : Infinity;
    if (at !== bt) return at - bt;
    return (a.createdAt || "").localeCompare(b.createdAt || "");
  });

  const followupPool = companies.filter(
    (c) => c.stage === "preview" && !c.rejected,
  );

  const blocks: Array<Omit<ScheduleBlock, "id">> = [];
  let cursor = settings.workStart;
  const endMin = toMin(settings.workEnd);

  // 1) prep 15 min
  blocks.push({
    scheduleDate: dateISO,
    blockTime: cursor,
    durationMin: 15,
    kind: "prep",
    companyId: null,
    title: "Undirbúningur — yfirferð dagsins",
    notes: "",
    status: "pending",
  });
  cursor = addMin(cursor, 15);

  // 2) call blocks
  let callsPlaced = 0;
  let breakPlaced = false;
  const callSlice = callable.slice(0, settings.maxCalls);
  for (const c of callSlice) {
    if (toMin(cursor) + 15 > endMin) break;
    // insert break after ~5 calls
    if (!breakPlaced && callsPlaced === Math.min(5, Math.floor(settings.maxCalls / 2))) {
      blocks.push({
        scheduleDate: dateISO,
        blockTime: cursor,
        durationMin: 15,
        kind: "break",
        companyId: null,
        title: "Kaffihlé",
        notes: "",
        status: "pending",
      });
      cursor = addMin(cursor, 15);
      breakPlaced = true;
      if (toMin(cursor) + 15 > endMin) break;
    }
    blocks.push({
      scheduleDate: dateISO,
      blockTime: cursor,
      durationMin: 15,
      kind: "call",
      companyId: c.id,
      title: c.name,
      notes: "",
      status: "pending",
    });
    cursor = addMin(cursor, 15);
    callsPlaced++;
  }

  // 3) fill remaining with followups (20 min each)
  let fi = 0;
  while (toMin(cursor) + 20 <= endMin && fi < followupPool.length) {
    const c = followupPool[fi++];
    blocks.push({
      scheduleDate: dateISO,
      blockTime: cursor,
      durationMin: 20,
      kind: "followup",
      companyId: c.id,
      title: `Eftirfylgni — ${c.name}`,
      notes: "",
      status: "pending",
    });
    cursor = addMin(cursor, 20);
  }

  if (!blocks.length) return [];

  const rows = blocks.map((b) => ({
    schedule_date: b.scheduleDate,
    block_time: b.blockTime,
    duration_min: b.durationMin,
    kind: b.kind,
    company_id: b.companyId,
    title: b.title,
    notes: b.notes,
    status: b.status,
  }));
  const { data, error } = await supabase.from("daily_schedules").insert(rows).select();
  if (error) {
    console.error(error);
    return [];
  }
  // Mark rolled-over blocks as skipped so they don't reappear
  if ((rollover || []).length) {
    await supabase
      .from("daily_schedules")
      .update({ status: "skipped" })
      .in(
        "id",
        (rollover || []).map((r: any) => r.id),
      );
  }
  return (data || []).map(rowToBlock);
}

export async function yesterdaySummary(): Promise<{ callsDone: number; streak: number }> {
  const y = addDaysISO(todayISO(), -1);
  const yblocks = await fetchBlocks(y);
  const callsDone = yblocks.filter((b) => b.kind === "call" && b.status === "done").length;

  // streak: walk back until we find a day with any pending blocks
  let streak = 0;
  for (let i = 1; i <= 30; i++) {
    const d = addDaysISO(todayISO(), -i);
    const blocks = await fetchBlocks(d);
    if (!blocks.length) break;
    const anyPending = blocks.some((b) => b.status === "pending");
    if (anyPending) break;
    streak++;
  }
  return { callsDone, streak };
}

/** Start of current week (Monday) in local time as YYYY-MM-DD */
export function weekStartISO(base: Date = new Date()): string {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const day = (d.getDay() + 6) % 7; // Mon=0..Sun=6
  d.setDate(d.getDate() - day);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export interface WeeklyStats {
  callsMade: number;
  offersSent: number;
  krPaid: number;
}

export async function fetchWeeklyStats(): Promise<WeeklyStats> {
  const startISO = weekStartISO();
  const [y, m, d] = startISO.split("-").map(Number);
  const startLocal = new Date(y, m - 1, d, 0, 0, 0);
  const startIsoTs = startLocal.toISOString();

  const [callsRes, offersRes, paidRes] = await Promise.all([
    supabase.from("call_logs").select("id", { count: "exact", head: true }).gte("called_at", startIsoTs),
    supabase.from("companies").select("id", { count: "exact", head: true }).eq("stage", "email_sent").gte("email_sent_at", startIsoTs),
    supabase.from("companies").select("amount_paid, custom_price, estimated_price, paid_date").eq("stage", "paid").gte("paid_date", startISO),
  ]);

  const callsMade = callsRes.count || 0;
  const offersSent = offersRes.count || 0;
  let krPaid = 0;
  for (const r of (paidRes.data as any[]) || []) {
    krPaid += Number(r.amount_paid ?? r.custom_price ?? r.estimated_price ?? 0);
  }
  return { callsMade, offersSent, krPaid };
}

/**
 * Compute follow-up datetime: +N working days at same clock time (skip Sat/Sun).
 */
export function nextWorkingDay(from: Date, workingDays: number = 2): Date {
  const d = new Date(from.getTime());
  let added = 0;
  while (added < workingDays) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return d;
}