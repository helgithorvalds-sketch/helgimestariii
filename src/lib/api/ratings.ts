import { supabase, requireUid } from '../supabase';
import { uniq } from './_shared';
import { getPublicProfilesMap } from './profiles';
import type { Rating, RatingWithRater } from '../types';

/** `mt_rate_deal` — once per party, only after completion. */
export async function rateDeal(dealId: string, score: number, comment?: string | null): Promise<Rating> {
  const { data, error } = await supabase.rpc('mt_rate_deal', {
    p_deal_id: dealId,
    p_score: score,
    p_comment: comment?.trim() ? comment.trim() : undefined,
  });
  if (error) throw error;
  return data as Rating;
}

/** Ratings received by a user, newest first, with the rater's public profile. */
export async function listRatingsForUser(userId: string): Promise<RatingWithRater[]> {
  const { data, error } = await supabase
    .from('mt_ratings')
    .select('*')
    .eq('ratee_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = data ?? [];
  const raters = await getPublicProfilesMap(uniq(rows.map((r) => r.rater_id)));
  return rows.flatMap((r) => {
    const rater = raters.get(r.rater_id);
    return rater ? [{ ...r, rater }] : [];
  });
}

export async function getMyRatingForDeal(dealId: string): Promise<Rating | null> {
  const uid = await requireUid();
  const { data, error } = await supabase
    .from('mt_ratings')
    .select('*')
    .eq('deal_id', dealId)
    .eq('rater_id', uid)
    .maybeSingle();
  if (error) throw error;
  return data;
}
