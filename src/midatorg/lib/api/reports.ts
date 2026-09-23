import { supabase, requireUid } from '../supabase';
import type { CreateReportInput, Report } from '../types';

export async function createReport(input: CreateReportInput): Promise<Report> {
  const uid = await requireUid();
  const { data, error } = await supabase
    .from('mt_reports')
    .insert({
      reporter_id: uid,
      reported_user_id: input.reported_user_id ?? null,
      listing_id: input.listing_id ?? null,
      deal_id: input.deal_id ?? null,
      reason: input.reason.slice(0, 60),
      details: input.details?.trim() ? input.details.trim().slice(0, 1000) : null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
