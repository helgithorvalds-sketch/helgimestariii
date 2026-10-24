-- =====================================================================
-- VILD — fix: vild_pockets joined vild_merchants, which consumers may not
-- read (RLS: team members only), so a member's own pockets came back empty
-- through the security_invoker view. Join the public merchant view instead.
-- Applied to the live project as "vild_0004_pockets_view_fix".
-- =====================================================================
create or replace view public.vild_pockets with (security_invoker = true) as
select
  l.user_id,
  l.merchant_id,
  m.sector_slug,
  coalesce(sum(l.amount), 0)::integer as balance,
  coalesce(sum(l.amount) filter (where l.amount > 0), 0)::integer as earned_total,
  coalesce(-sum(l.amount) filter (where l.kind = 'spend'), 0)::integer as spent_total,
  max(l.created_at) as last_activity_at,
  (select lot.expires_at from public.vild_lots(l.user_id, l.merchant_id) lot where lot.remaining > 0 and lot.expires_at is not null limit 1) as next_expiry_at,
  (select lot.remaining from public.vild_lots(l.user_id, l.merchant_id) lot where lot.remaining > 0 and lot.expires_at is not null limit 1) as next_expiry_amount
from public.vild_ledger l
join public.vild_merchant_public m on m.id = l.merchant_id
group by l.user_id, l.merchant_id, m.sector_slug;
grant select on public.vild_pockets to authenticated;
