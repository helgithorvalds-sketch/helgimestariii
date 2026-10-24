-- =====================================================================
-- VILD — 0005: fixes from the design review (24 Oct 2026)
--
--   1. vild_welcome_credit     merchant staff get a profile but no welcome credit
--   2. vild_merchant_stats     "Inneign veitt" (creditIssued) = credit earned on
--                              purchases; the welcome credit VILD gives is reported
--                              apart (welcomeCredit); "Mest til baka" is ranked by
--                              credit and leaves zero-credit products out
--   3. vild_close_settlements  welcome credit is funded by VILD: it is neither in
--                              credit_issued nor in the fee. Already takes any month
--                              (p_month), so past months can be (re)generated
--   4. corrections of the live data the old seed / triggers wrote (one DO block,
--      guarded, safe to run again):
--        a. offer o_salad: credit_amount 672 → 673 (round(2.690 × 25 %), what creditFor shows)
--        b. the welcome rows the three Lúna staff accounts got at signup
--        c. the demo member's timeline: purchases at 12:xx / 19:xx local time, the
--           welcome row and member_since the day before the first purchase
--        d. the placeholder settlements s_2026_09 / s_2026_10 (hard-coded figures of
--           the old seed), then every month the ledger covers regenerated from the ledger
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Welcome credit: members only, not the chain's own staff
-- ---------------------------------------------------------------------
create or replace function public.vild_welcome_credit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_merchant text := public.vild_live_merchant();
  v_amount integer := public.vild_setting_int('welcome_credit', 0);
  v_prev text := coalesce(current_setting('vild.internal', true), '');
begin
  if v_merchant is null or v_amount <= 0 then return new; end if;
  -- vild_handle_new_user links an invited e-mail to its team row before it creates the profile,
  -- so staff are recognisable here (the e-mail match covers an invite that is not linked yet)
  if exists (
    select 1 from public.vild_merchant_users mu
    where mu.user_id = new.id or (new.email is not null and lower(mu.email) = lower(new.email))
  ) then
    return new;
  end if;
  perform set_config('vild.internal', '1', true);
  perform pg_advisory_xact_lock(hashtext(new.id::text || ':' || v_merchant));
  insert into public.vild_ledger (user_id, merchant_id, kind, amount, balance_after, description)
  values (new.id, v_merchant, 'welcome', v_amount,
          coalesce((select sum(amount) from public.vild_ledger where user_id = new.id and merchant_id = v_merchant), 0) + v_amount,
          'Velkomin í VILD');
  perform set_config('vild.internal', v_prev, true);
  return new;
end $$;
comment on function public.vild_welcome_credit() is 'Profile trigger: settings.welcome_credit in the live chain''s pocket for a new member. Accounts on a chain''s team (vild_merchant_users) get none. Funded by VILD: not in credit_issued and not billed in vild_close_settlements.';
revoke execute on function public.vild_welcome_credit() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Merchant dashboard
--   creditIssued  = credit earned on purchases (kind 'earn'), also in daily.issued
--   welcomeCredit = welcome credit written in the period (VILD's, shown apart)
--   topProducts   = the five products that gave the most credit (credit > 0)
-- ---------------------------------------------------------------------
create or replace function public.vild_merchant_stats(p_merchant text, p_days integer default 30)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_today date := (now() at time zone 'Atlantic/Reykjavik')::date;
  v_from date;
  v_from_ts timestamptz;
  v_daily jsonb;
  v_top jsonb;
  v_by_loc jsonb;
  v_purchases integer;
  v_revenue bigint;
  v_issued bigint;
  v_welcome bigint;
  v_redeemed bigint;
  v_returning numeric;
  v_new integer;
begin
  if not (public.vild_is_merchant_user(p_merchant, 'staff') or public.vild_is_service_role()) then raise exception 'AUTH_REQUIRED'; end if;
  p_days := greatest(1, least(coalesce(p_days, 30), 366));
  v_from := v_today - (p_days - 1);
  v_from_ts := (v_from::timestamp) at time zone 'Atlantic/Reykjavik';

  with days as (
    select d::date as day from generate_series(v_from, v_today, interval '1 day') d
  ),
  pur as (
    select (occurred_at at time zone 'Atlantic/Reykjavik')::date as day, count(*) as n, sum(total) as revenue
    from public.vild_purchases where merchant_id = p_merchant and occurred_at >= v_from_ts group by 1
  ),
  led as (
    select (created_at at time zone 'Atlantic/Reykjavik')::date as day,
           sum(amount) filter (where kind = 'earn') as issued,
           -sum(amount) filter (where kind = 'spend') as redeemed
    from public.vild_ledger where merchant_id = p_merchant and created_at >= v_from_ts group by 1
  )
  select jsonb_agg(jsonb_build_object(
           'date', to_char(days.day, 'YYYY-MM-DD'),
           'revenue', coalesce(pur.revenue, 0),
           'issued', coalesce(led.issued, 0),
           'redeemed', coalesce(led.redeemed, 0),
           'purchases', coalesce(pur.n, 0)) order by days.day)
  into v_daily
  from days left join pur on pur.day = days.day left join led on led.day = days.day;

  select count(*), coalesce(sum(total), 0) into v_purchases, v_revenue
  from public.vild_purchases where merchant_id = p_merchant and occurred_at >= v_from_ts;

  select coalesce(sum(amount) filter (where kind = 'earn'), 0),
         coalesce(sum(amount) filter (where kind = 'welcome'), 0),
         coalesce(-sum(amount) filter (where kind = 'spend'), 0)
  into v_issued, v_welcome, v_redeemed
  from public.vild_ledger where merchant_id = p_merchant and created_at >= v_from_ts;

  -- returning: share of the period's purchases made by someone who had bought here before that purchase
  -- new members: customers whose first purchase at this chain fell inside the period
  with ranked as (
    select user_id, occurred_at, row_number() over (partition by user_id order by occurred_at, id) as rn
    from public.vild_purchases where merchant_id = p_merchant
  )
  select coalesce(round(100.0 * count(*) filter (where rn > 1) / nullif(count(*), 0)), 0),
         count(distinct user_id) filter (where rn = 1)
  into v_returning, v_new
  from ranked where occurred_at >= v_from_ts;

  -- "Mest til baka": ranked by the credit the product gave (at full price), not by quantity
  select coalesce(jsonb_agg(t order by t.credit desc, t.qty desc), '[]'::jsonb) into v_top from (
    select i.product_id as "productId", max(i.name) as name, sum(i.qty)::integer as qty, sum(i.credit)::bigint as credit
    from public.vild_purchase_items i join public.vild_purchases p on p.id = i.purchase_id
    where p.merchant_id = p_merchant and p.occurred_at >= v_from_ts and i.product_id is not null
    group by i.product_id
    having sum(i.credit) > 0
    order by sum(i.credit) desc, sum(i.qty) desc
    limit 5
  ) t;

  select coalesce(jsonb_agg(jsonb_build_object('locationId', l.id, 'name', l.name, 'purchases', coalesce(s.n, 0), 'revenue', coalesce(s.revenue, 0)) order by l.name), '[]'::jsonb)
  into v_by_loc
  from public.vild_locations l
  left join (
    select location_id, count(*) as n, sum(total) as revenue from public.vild_purchases
    where merchant_id = p_merchant and occurred_at >= v_from_ts group by location_id
  ) s on s.location_id = l.id
  where l.merchant_id = p_merchant;

  return jsonb_build_object(
    'merchantId', p_merchant,
    'periodDays', p_days,
    'purchases', v_purchases,
    'revenue', v_revenue,
    'creditIssued', v_issued,
    'welcomeCredit', v_welcome,
    'creditRedeemed', v_redeemed,
    'returningCustomersPct', v_returning,
    'newMembers', v_new,
    'avgBasket', case when v_purchases > 0 then round(v_revenue::numeric / v_purchases) else 0 end,
    'daily', coalesce(v_daily, '[]'::jsonb),
    'topProducts', v_top,
    'byLocation', v_by_loc
  );
end $$;
comment on function public.vild_merchant_stats is 'MerchantStats JSON for the portal dashboard (camelCase keys, same shape as src/vild/lib/types.ts). creditIssued = credit earned on purchases; welcomeCredit (VILD''s) apart; topProducts ranked by credit. Merchant users of the chain only.';
revoke execute on function public.vild_merchant_stats(text, integer) from public, anon;
grant execute on function public.vild_merchant_stats(text, integer) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- 3. Monthly statement per chain (any month: p_month, default the previous one)
--   credit_issued = credit the chain gave: earn rows + positive adjustments.
--   Welcome credit is VILD's (a member benefit VILD funds): it is not part of
--   credit_issued and VILD's fee is not charged on it.
--   platform_fee  = credit_issued × platform_fee_pct / 100.
--   Re-runs update an 'open' statement; invoiced/paid ones are left alone.
-- ---------------------------------------------------------------------
create or replace function public.vild_close_settlements(p_month date default null)
returns integer language plpgsql volatile security definer set search_path = public as $$
declare
  v_from date := date_trunc('month', coalesce(p_month, (now() at time zone 'Atlantic/Reykjavik')::date - interval '1 month'))::date;
  v_to date := (v_from + interval '1 month' - interval '1 day')::date;
  v_from_ts timestamptz := (v_from::timestamp) at time zone 'Atlantic/Reykjavik';
  v_to_ts timestamptz := ((v_from + interval '1 month')::timestamp) at time zone 'Atlantic/Reykjavik';
  v_fee numeric := public.vild_setting_int('platform_fee_pct', 10);
  v_n integer := 0;
  m record;
begin
  for m in select id from public.vild_merchants where status = 'active' loop
    insert into public.vild_settlements (merchant_id, period_from, period_to, credit_issued, credit_redeemed, credit_expired, platform_fee, status)
    select m.id, v_from, v_to,
           coalesce(sum(amount) filter (where kind = 'earn' or (kind = 'adjust' and amount > 0)), 0),
           coalesce(-sum(amount) filter (where kind = 'spend'), 0),
           coalesce(-sum(amount) filter (where kind = 'expire'), 0),
           round(coalesce(sum(amount) filter (where kind = 'earn' or (kind = 'adjust' and amount > 0)), 0) * v_fee / 100),
           'open'
    from public.vild_ledger where merchant_id = m.id and created_at >= v_from_ts and created_at < v_to_ts
    on conflict (merchant_id, period_from) do update
      set credit_issued = excluded.credit_issued, credit_redeemed = excluded.credit_redeemed,
          credit_expired = excluded.credit_expired, platform_fee = excluded.platform_fee
      where public.vild_settlements.status = 'open';
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;
comment on function public.vild_close_settlements(date) is 'Monthly statement per active chain for the month of p_month (default: the previous month). credit_issued = earn + positive adjust; welcome credit (VILD-funded) is excluded and not billed. Only open statements are updated. Cron on the 1st; callable for past months.';
revoke execute on function public.vild_close_settlements(date) from public, anon, authenticated;
grant execute on function public.vild_close_settlements(date) to service_role;

-- ---------------------------------------------------------------------
-- 4. Live data written before these fixes. Every statement is guarded so a
--    second run changes nothing. The ledger is append-only by trigger; its two
--    guard triggers are lifted for this transaction only (the block is one
--    transaction, and a failure rolls the ALTERs back with it).
-- ---------------------------------------------------------------------
do $$
declare
  v_tz constant text := 'Atlantic/Reykjavik';
  v_demo record;
  p record;
  v_local timestamp;
  v_new timestamptz;
  v_delta interval;
  v_first timestamptz;
  v_signup timestamptz;
  v_month date;
begin
  perform set_config('vild.internal', '1', true);

  -- a. the salad offer stored a rounded-down amount (672); the rule engine says 673
  update public.vild_offers set credit_amount = 673 where id = 'o_salad' and credit_amount = 672;

  alter table public.vild_ledger disable trigger vild_ledger_no_update;
  alter table public.vild_ledger disable trigger vild_ledger_no_delete;

  -- b. welcome credit the chain's staff got at signup: only kind 'welcome', only users on a
  --    team, and only when it is the user's single ledger row (nothing else depends on it)
  delete from public.vild_ledger l
   where l.kind = 'welcome'
     and exists (select 1 from public.vild_merchant_users mu where mu.user_id = l.user_id)
     and not exists (select 1 from public.vild_ledger o where o.user_id = l.user_id and o.id <> l.id);

  -- c. demo members = users with history written by vild_seed_demo_history (raw.seed = true)
  for v_demo in select distinct user_id from public.vild_purchases where raw ->> 'seed' = 'true' loop
    -- purchases at 12:xx (before 16:00) or 19:xx local, same minutes; a time that would lie in
    -- the future moves to the day before. Receipt rows (earn/spend) move with their purchase.
    for p in select id, occurred_at from public.vild_purchases where user_id = v_demo.user_id and source = 'demo' loop
      v_local := p.occurred_at at time zone v_tz;
      v_new := (v_local::date + make_interval(hours => case when extract(hour from v_local) < 16 then 12 else 19 end)
                + (v_local - date_trunc('hour', v_local))) at time zone v_tz;
      if v_new > now() then v_new := v_new - interval '1 day'; end if;
      v_delta := v_new - p.occurred_at;
      if v_delta <> interval '0' then
        update public.vild_purchases set occurred_at = v_new where id = p.id;
        update public.vild_ledger set created_at = created_at + v_delta, expires_at = expires_at + v_delta where purchase_id = p.id;
      end if;
    end loop;
    -- signed up (welcome row, member_since) the day before the first purchase, 10:12 local
    select min(occurred_at) into v_first from public.vild_purchases where user_id = v_demo.user_id;
    v_signup := (((v_first at time zone v_tz)::date - 1)::timestamp + interval '10 hours 12 minutes') at time zone v_tz;
    update public.vild_ledger
       set created_at = v_signup,
           expires_at = v_signup + make_interval(months => public.vild_setting_int('expiry_months', 24))
     where user_id = v_demo.user_id and kind = 'welcome' and created_at > v_signup;
    update public.vild_profiles set member_since = v_signup where id = v_demo.user_id and member_since > v_signup;
  end loop;

  alter table public.vild_ledger enable trigger vild_ledger_no_update;
  alter table public.vild_ledger enable trigger vild_ledger_no_delete;

  -- d. placeholder statements of the old seed (matched on id and their exact figures), then
  --    one statement per month the ledger covers, computed from the ledger
  delete from public.vild_settlements
   where merchant_id = 'm_luna'
     and (id, credit_issued, credit_redeemed, platform_fee) in (('s_2026_09', 1842500, 1203400, 184250), ('s_2026_10', 1412300, 1031900, 141230));
  for v_month in select distinct date_trunc('month', created_at at time zone v_tz)::date from public.vild_ledger order by 1 loop
    perform public.vild_close_settlements(v_month);
  end loop;

  perform set_config('vild.internal', '', true);
end $$;
