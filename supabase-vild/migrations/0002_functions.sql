-- =====================================================================
-- VILD — functions, RPCs, realtime, cron, storage
--
--   1. vild_credit_for            the rule engine (mirrors creditFor in seed.ts)
--   2. vild_products_public       catalogue with the credit of the moment
--   3. wallet tokens              60 s QR tokens + the long-lived pass barcode token
--   4. vild_redeem_quote          "what happens if I pay X here now"
--   5. vild_record_purchase       the one writer of purchases + ledger (spend, then earn)
--   6. vild_adjust_credit         manual corrections (service role)
--   7. vild_expire_credit         24-month expiry, FIFO (cron hourly)
--   8. vild_merchant_stats        dashboard numbers
--   9. merchant RPCs              invite user, POS connections, settlements
--  10. reports                    e-money threshold (Act 114/2021 art. 38)
--  11. realtime, cron, storage    guarded so the file also applies to plain Postgres
--
-- Error codes are raised as plain exception messages ('AUTH_REQUIRED',
-- 'NOT_FOUND', 'INSUFFICIENT_CREDIT' …) so the app's errorMessage() can map them.
-- =====================================================================

create sequence if not exists public.vild_receipt_seq start 50000;

-- ---------------------------------------------------------------------
-- 1. Rule engine
--
-- Same precedence and window logic as creditFor() in src/vild/data/seed.ts:
--   * a rule counts only if active, inside [starts_at, ends_at], on one of
--     its weekdays (ISO, Monday = 1) and inside [hours_from, hours_to) —
--     all evaluated in Atlantic/Reykjavik;
--   * product rule > category rule > merchant rule;
--   * at the same scope a time-boxed rule (weekdays or hours set) beats an
--     always-on one; then the newest (created_at) wins;
--   * fixed_amount is capped at the price; pct = round(fixed / price × 100);
--   * rate_pct → amount = round(price × pct / 100).
-- ---------------------------------------------------------------------
create or replace function public.vild_credit_for_line(
  p_merchant text, p_product_id text, p_category text, p_price integer, p_at timestamptz default now()
) returns table (amount integer, pct numeric, rule_id text)
language sql stable set search_path = public as $$
  with local as (
    select (p_at at time zone 'Atlantic/Reykjavik') as ts
  ),
  candidates as (
    select r.*,
           (r.weekdays is not null or r.hours_from is not null) as time_boxed
    from public.vild_reward_rules r, local
    where r.merchant_id = p_merchant
      and r.active
      and (r.starts_at is null or r.starts_at <= p_at)
      and (r.ends_at is null or r.ends_at >= p_at)
      and (r.weekdays is null or extract(isodow from local.ts)::integer = any (r.weekdays))
      and (r.hours_from is null or (local.ts::time >= r.hours_from and local.ts::time < r.hours_to))
  ),
  picked as (
    select c.*
    from candidates c
    where (c.scope = 'product' and p_product_id is not null and c.product_id = p_product_id)
       or (c.scope = 'category' and p_category is not null and c.category = p_category)
       or (c.scope = 'merchant')
    order by case c.scope when 'product' then 0 when 'category' then 1 else 2 end,
             c.time_boxed desc, c.created_at desc, c.id
    limit 1
  )
  select
    case
      when p.id is null then 0
      when p.fixed_amount is not null then least(p.fixed_amount, p_price)
      else round(p_price * p.rate_pct / 100)::integer
    end as amount,
    case
      when p.id is null then 0
      when p.fixed_amount is not null then case when p_price > 0 then round(p.fixed_amount::numeric / p_price * 100) else 0 end
      else p.rate_pct
    end as pct,
    p.id as rule_id
  from (select 1) one
  left join picked p on true;
$$;
comment on function public.vild_credit_for_line is 'Rule engine for one receipt line. Reads only the public rules, so it is callable by anyone (vild_products_public needs it with the caller''s rights).';
grant execute on function public.vild_credit_for_line(text, text, text, integer, timestamptz) to anon, authenticated, service_role;

create or replace function public.vild_credit_for(p_product_id text, p_merchant_id text, p_at timestamptz default now())
returns table (amount integer, pct numeric, rule_id text)
language sql stable security definer set search_path = public as $$
  select c.amount, c.pct, c.rule_id
  from public.vild_products p
  cross join lateral public.vild_credit_for_line(p.merchant_id, p.id, p.category, p.price, p_at) c
  where p.id = p_product_id and p.merchant_id = p_merchant_id;
$$;
comment on function public.vild_credit_for is 'Credit (amount, pct, rule) for buying a product at full price at the given moment. Callable by anyone: it only reads the public catalogue.';
grant execute on function public.vild_credit_for(text, text, timestamptz) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- 2. Products with their credit right now
-- ---------------------------------------------------------------------
create view public.vild_products_public as
select p.id, p.merchant_id, p.external_sku, p.name, p.category, p.price, p.image, p.description, p.featured, p.active,
       c.amount as credit_amount, c.pct as credit_pct, c.rule_id
from public.vild_products p
cross join lateral public.vild_credit_for_line(p.merchant_id, p.id, p.category, p.price, now()) c
where p.active;
comment on view public.vild_products_public is 'Active products with credit_amount / credit_pct resolved for now(). What the app lists.';
grant select on public.vild_products_public to anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. Wallet tokens
--   * In-app QR: "VILD-XXXX-XXXX", 60 s, single charge. Alphabet without 0/O/1/I.
--   * Wallet pass barcode: "VILDP-" + 20 chars, long-lived, rotated on demand.
--   Tokens never contain or derive from the user id or kennitala.
-- ---------------------------------------------------------------------
create or replace function public.vild_random_code(p_len integer)
returns text language sql volatile set search_path = public as $$
  -- 256 mod 32 = 0, so get_byte % 32 is unbiased
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + (get_byte(b, i) % 32), 1), '' order by i)
  from extensions.gen_random_bytes(p_len) b, generate_series(0, p_len - 1) i;
$$;
revoke execute on function public.vild_random_code(integer) from public, anon, authenticated;

create or replace function public.vild_issue_wallet_token(p_user uuid)
returns table (token text, issued_at timestamptz, expires_at timestamptz)
language plpgsql volatile security definer set search_path = public as $$
declare
  v_token text;
  v_now timestamptz := now();
  v_ttl integer := public.vild_setting_int('wallet_token_seconds', 60);
begin
  if p_user is null then raise exception 'INVALID_INPUT: user'; end if;
  if not (p_user = auth.uid() or public.vild_is_service_role()) then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (select 1 from public.vild_profiles where id = p_user and deleted_at is null) then raise exception 'NOT_FOUND'; end if;
  for i in 1..5 loop
    v_token := 'VILD-' || public.vild_random_code(4) || '-' || public.vild_random_code(4);
    begin
      insert into public.vild_wallet_tokens (token, user_id, issued_at, expires_at)
      values (v_token, p_user, v_now, v_now + make_interval(secs => v_ttl));
      return query select v_token, v_now, v_now + make_interval(secs => v_ttl);
      return;
    exception when unique_violation then
      -- 32^8 keys; a collision inside 60 s is practically impossible, but retry anyway
    end;
  end loop;
  raise exception 'TOKEN_COLLISION';
end $$;
comment on function public.vild_issue_wallet_token is 'A fresh 60-second QR token for the signed-in user (their own id only).';
revoke execute on function public.vild_issue_wallet_token(uuid) from public, anon;
grant execute on function public.vild_issue_wallet_token(uuid) to authenticated, service_role;

/** Creates the pass secrets for a user if missing; returns the row. Service role only. */
create or replace function public.vild_ensure_pass_secrets(p_user uuid)
returns public.vild_pass_secrets
language plpgsql volatile security definer set search_path = public as $$
declare
  v_row public.vild_pass_secrets;
begin
  if not public.vild_is_service_role() then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_row from public.vild_pass_secrets where user_id = p_user;
  if found then return v_row; end if;
  insert into public.vild_pass_secrets (user_id, barcode_token, auth_token)
  values (p_user, 'VILDP-' || public.vild_random_code(20), encode(extensions.gen_random_bytes(24), 'hex'))
  on conflict (user_id) do nothing;
  select * into v_row from public.vild_pass_secrets where user_id = p_user;
  return v_row;
end $$;
revoke execute on function public.vild_ensure_pass_secrets(uuid) from public, anon, authenticated;
grant execute on function public.vild_ensure_pass_secrets(uuid) to service_role;

/** The user (or the service role) rotates the pass barcode token, e.g. after a lost phone. Returns nothing: the new pass is fetched through vild-wallet-pass. */
create or replace function public.vild_rotate_pass_token(p_user uuid)
returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  if not (p_user = auth.uid() or public.vild_is_service_role()) then raise exception 'AUTH_REQUIRED'; end if;
  insert into public.vild_pass_secrets (user_id, barcode_token, auth_token)
  values (p_user, 'VILDP-' || public.vild_random_code(20), encode(extensions.gen_random_bytes(24), 'hex'))
  on conflict (user_id) do update
    set barcode_token = excluded.barcode_token, rotated_at = now(), pass_updated_at = now();
end $$;
revoke execute on function public.vild_rotate_pass_token(uuid) from public, anon;
grant execute on function public.vild_rotate_pass_token(uuid) to authenticated, service_role;

/**
 * The till scans a token → who is it and what can they spend here?
 * Accepts both the 60 s QR token and the pass barcode token. Never returns
 * kennitala, phone, e-mail or the full name: the cashier sees a first name.
 * Service role only (vild-till / vild-pos-webhook).
 */
create or replace function public.vild_resolve_wallet_token(p_token text)
returns table (user_id uuid, first_name text, token_kind text, used boolean, pockets jsonb)
language plpgsql stable security definer set search_path = public as $$
declare
  v_user uuid;
  v_kind text;
  v_used boolean := false;
  v_token text := upper(btrim(coalesce(p_token, '')));
begin
  if not public.vild_is_service_role() then raise exception 'AUTH_REQUIRED'; end if;
  if v_token ~ '^VILD-[A-Z2-9]{4}-[A-Z2-9]{4}$' then
    select t.user_id, t.used_at is not null into v_user, v_used
    from public.vild_wallet_tokens t where t.token = v_token and t.expires_at > now();
    v_kind := 'qr';
  elsif v_token ~ '^VILDP-[A-Z2-9]{20}$' then
    select s.user_id into v_user from public.vild_pass_secrets s where s.barcode_token = v_token;
    v_kind := 'pass';
  end if;
  if v_user is null then raise exception 'TOKEN_INVALID'; end if;
  if exists (select 1 from public.vild_profiles p where p.id = v_user and p.deleted_at is not null) then raise exception 'TOKEN_INVALID'; end if;
  return query
    select v_user,
           split_part(p.name, ' ', 1),
           v_kind,
           v_used,
           coalesce((select jsonb_agg(jsonb_build_object('merchant_id', k.merchant_id, 'balance', k.balance) order by k.merchant_id)
                     from public.vild_pockets k where k.user_id = v_user), '[]'::jsonb)
    from public.vild_profiles p where p.id = v_user;
end $$;
revoke execute on function public.vild_resolve_wallet_token(text) from public, anon, authenticated;
grant execute on function public.vild_resolve_wallet_token(text) to service_role;

/** Marks a QR token as used by a charge (one charge per token). Pass tokens are reusable. Returns the user id. */
create or replace function public.vild_consume_wallet_token(p_token text)
returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare
  v_user uuid;
  v_token text := upper(btrim(coalesce(p_token, '')));
begin
  if not public.vild_is_service_role() then raise exception 'AUTH_REQUIRED'; end if;
  if v_token ~ '^VILDP-[A-Z2-9]{20}$' then
    select s.user_id into v_user from public.vild_pass_secrets s where s.barcode_token = v_token;
    if v_user is null then raise exception 'TOKEN_INVALID'; end if;
    return v_user;
  end if;
  update public.vild_wallet_tokens t set used_at = now()
   where t.token = v_token and t.expires_at > now() and t.used_at is null
   returning t.user_id into v_user;
  if v_user is null then raise exception 'TOKEN_INVALID'; end if;
  return v_user;
end $$;
revoke execute on function public.vild_consume_wallet_token(text) from public, anon, authenticated;
grant execute on function public.vild_consume_wallet_token(text) to service_role;

/** Hourly: drop expired QR tokens (they are useless after 60 s; the table stays small). */
create or replace function public.vild_cleanup_tokens()
returns integer language plpgsql volatile security definer set search_path = public as $$
declare v_n integer;
begin
  delete from public.vild_wallet_tokens where expires_at < now() - interval '1 hour';
  get diagnostics v_n = row_count;
  return v_n;
end $$;
revoke execute on function public.vild_cleanup_tokens() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. Redeem quote
-- ---------------------------------------------------------------------
create or replace function public.vild_redeem_quote(p_user uuid, p_merchant text, p_total integer, p_use_credit boolean default true)
returns table (available integer, applied integer, to_pay integer, will_earn integer)
language plpgsql stable security definer set search_path = public as $$
declare
  v_balance integer;
  v_rate numeric;
  v_applied integer;
begin
  if not (p_user = auth.uid() or public.vild_is_service_role()) then raise exception 'AUTH_REQUIRED'; end if;
  if p_total is null or p_total < 0 then raise exception 'INVALID_INPUT: total'; end if;
  select default_rate_pct into v_rate from public.vild_merchants where id = p_merchant;
  if v_rate is null then raise exception 'NOT_FOUND'; end if;
  select coalesce(sum(amount), 0)::integer into v_balance from public.vild_ledger where user_id = p_user and merchant_id = p_merchant;
  v_applied := case when p_use_credit then least(v_balance, p_total) else 0 end;
  return query select v_balance, v_applied, p_total - v_applied, round((p_total - v_applied) * v_rate / 100)::integer;
end $$;
comment on function public.vild_redeem_quote is 'available / applied / to_pay / will_earn (at the chain default rate on the money part) for a purchase of p_total at p_merchant. Own id only.';
revoke execute on function public.vild_redeem_quote(uuid, text, integer, boolean) from public, anon;
grant execute on function public.vild_redeem_quote(uuid, text, integer, boolean) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- 5. Record a purchase (the only writer of purchases, items and earn/spend rows)
--
--   p_items: [{ "product_id": "p_margherita", "qty": 1 } | { "name": "Kaffi", "qty": 2, "unit_price": 590 }]
--     unit_price defaults to the catalogue price; a line without product_id
--     gets the chain default credit (merchant-scope rule) at its unit_price.
--   Order of operations (same as MockApi.recordPurchase):
--     1. total = Σ unit_price × qty; credit_full = Σ unit_credit × qty
--     2. spend = p_use_credit ? min(balance, total) : 0   → 'spend' row
--     3. earn  = round(credit_full × (total − spend) / total) → 'earn' row
--        (no credit on the part paid with credit — Takk terms §5)
--   Idempotent on (merchant, external_id): a repeat returns the rows of the
--   first call. Serialised per pocket with an advisory lock so balance_after
--   is always right. Service role only.
-- ---------------------------------------------------------------------
create or replace function public.vild_record_purchase(
  p_merchant text,
  p_location text,
  p_user uuid,
  p_items jsonb,
  p_use_credit boolean default true,
  p_source text default 'till',
  p_external_id text default null,
  p_occurred_at timestamptz default now(),
  p_raw jsonb default null
) returns setof public.vild_ledger
language plpgsql volatile security definer set search_path = public as $$
declare
  v_merchant public.vild_merchants;
  v_location public.vild_locations;
  v_purchase_id uuid;
  v_item jsonb;
  v_product public.vild_products;
  v_product_id text;
  v_name text;
  v_qty integer;
  v_unit_price integer;
  v_credit integer;
  v_rule text;
  v_total integer := 0;
  v_credit_full integer := 0;
  v_balance integer;
  v_spend integer := 0;
  v_earn integer := 0;
  v_receipt text;
  v_desc text := '';
  v_at timestamptz := coalesce(p_occurred_at, now());
  v_lines jsonb := '[]'::jsonb;
begin
  if not public.vild_is_service_role() then raise exception 'AUTH_REQUIRED'; end if;
  if p_source not in ('pos_webhook', 'till', 'demo') then raise exception 'INVALID_INPUT: source'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'INVALID_INPUT: items'; end if;
  if v_at > now() + interval '5 minutes' then raise exception 'INVALID_INPUT: occurred_at in the future'; end if;

  select * into v_merchant from public.vild_merchants where id = p_merchant;
  if not found or v_merchant.status <> 'active' then raise exception 'NOT_FOUND: merchant'; end if;
  if p_location is not null then
    select * into v_location from public.vild_locations where id = p_location and merchant_id = p_merchant;
    if not found then raise exception 'NOT_FOUND: location'; end if;
  end if;
  if not exists (select 1 from public.vild_profiles where id = p_user and deleted_at is null) then raise exception 'NOT_FOUND: user'; end if;

  -- idempotent replay (before the lock, cheap)
  if p_external_id is not null then
    select id into v_purchase_id from public.vild_purchases where merchant_id = p_merchant and external_id = p_external_id;
    if v_purchase_id is not null then
      return query select * from public.vild_ledger where purchase_id = v_purchase_id order by created_at, kind desc;
      return;
    end if;
  end if;

  perform set_config('vild.internal', '1', true);
  perform pg_advisory_xact_lock(hashtext(p_user::text || ':' || p_merchant));

  -- re-check under the lock (two deliveries of the same receipt at once)
  if p_external_id is not null then
    select id into v_purchase_id from public.vild_purchases where merchant_id = p_merchant and external_id = p_external_id;
    if v_purchase_id is not null then
      return query select * from public.vild_ledger where purchase_id = v_purchase_id order by created_at, kind desc;
      return;
    end if;
  end if;

  -- price and credit per line
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_product_id := nullif(v_item ->> 'product_id', '');
    v_qty := coalesce((v_item ->> 'qty')::integer, 1);
    if v_qty < 1 or v_qty > 999 then raise exception 'INVALID_INPUT: qty'; end if;
    v_product := null;
    if v_product_id is not null then
      select * into v_product from public.vild_products where id = v_product_id and merchant_id = p_merchant;
      if not found then raise exception 'NOT_FOUND: product %', v_product_id; end if;
    elsif nullif(v_item ->> 'sku', '') is not null then
      select * into v_product from public.vild_products where merchant_id = p_merchant and external_sku = v_item ->> 'sku';
      if found then v_product_id := v_product.id; end if;
    end if;
    v_name := coalesce(nullif(v_item ->> 'name', ''), v_product.name);
    if v_name is null then raise exception 'INVALID_INPUT: item needs product_id, sku or name'; end if;
    v_unit_price := coalesce((v_item ->> 'unit_price')::integer, v_product.price);
    if v_unit_price is null or v_unit_price < 0 then raise exception 'INVALID_INPUT: unit_price'; end if;
    select c.amount, c.rule_id into v_credit, v_rule
    from public.vild_credit_for_line(p_merchant, v_product_id, v_product.category, v_unit_price, v_at) c;
    v_total := v_total + v_unit_price * v_qty;
    v_credit_full := v_credit_full + v_credit * v_qty;
    v_lines := v_lines || jsonb_build_object('product_id', v_product_id, 'name', left(v_name, 120), 'qty', v_qty, 'unit_price', v_unit_price, 'credit', v_credit * v_qty, 'rule_id', v_rule);
    v_desc := v_desc || case when v_desc = '' then '' else ', ' end || case when v_qty > 1 then v_qty || '× ' else '' end || left(v_name, 120);
  end loop;

  select coalesce(sum(amount), 0)::integer into v_balance from public.vild_ledger where user_id = p_user and merchant_id = p_merchant;

  -- spend first (never at a venue that does not take redemption), then earn on the money part only
  if p_use_credit and (v_location.id is null or v_location.accepts_redemption) then
    v_spend := least(v_balance, v_total);
  end if;
  v_earn := case when v_total > 0 then round(v_credit_full * (v_total - v_spend)::numeric / v_total)::integer else 0 end;

  v_receipt := coalesce(nullif(p_raw ->> 'receipt_no', ''), nextval('public.vild_receipt_seq')::text);

  insert into public.vild_purchases (merchant_id, location_id, user_id, receipt_no, external_id, total, paid_with_credit, paid_with_money, source, occurred_at, raw)
  values (p_merchant, p_location, p_user, v_receipt, p_external_id, v_total, v_spend, v_total - v_spend, p_source, v_at, p_raw)
  returning id into v_purchase_id;

  insert into public.vild_purchase_items (purchase_id, product_id, name, qty, unit_price, credit, rule_id)
  select v_purchase_id, x.product_id, x.name, x.qty, x.unit_price, x.credit, x.rule_id
  from jsonb_to_recordset(v_lines) as x(product_id text, name text, qty integer, unit_price integer, credit integer, rule_id text);

  if v_spend > 0 then
    v_balance := v_balance - v_spend;
    insert into public.vild_ledger (user_id, merchant_id, location_id, purchase_id, kind, amount, balance_after, description, created_at)
    values (p_user, p_merchant, p_location, v_purchase_id, 'spend', -v_spend, v_balance, 'Inneign nýtt', v_at - interval '1 second');
  end if;
  v_balance := v_balance + v_earn;
  insert into public.vild_ledger (user_id, merchant_id, location_id, purchase_id, kind, amount, balance_after, description, expires_at, created_at)
  values (p_user, p_merchant, p_location, v_purchase_id, 'earn', v_earn, v_balance, v_desc,
          v_at + make_interval(months => public.vild_setting_int('expiry_months', 24)), v_at);

  return query select * from public.vild_ledger where purchase_id = v_purchase_id order by created_at, kind desc;
end $$;
comment on function public.vild_record_purchase is 'Records an identified purchase: spends credit first (if asked), earns on the money part per the rules at occurred_at, writes purchase + items + ledger atomically. Idempotent on (merchant, external_id). Service role only.';
revoke execute on function public.vild_record_purchase(text, text, uuid, jsonb, boolean, text, text, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.vild_record_purchase(text, text, uuid, jsonb, boolean, text, text, timestamptz, jsonb) to service_role;

-- ---------------------------------------------------------------------
-- 6. Manual adjustment (support desk, refunds). Service role only.
-- ---------------------------------------------------------------------
create or replace function public.vild_adjust_credit(p_user uuid, p_merchant text, p_amount integer, p_description text)
returns public.vild_ledger
language plpgsql volatile security definer set search_path = public as $$
declare
  v_balance integer;
  v_row public.vild_ledger;
begin
  if not public.vild_is_service_role() then raise exception 'AUTH_REQUIRED'; end if;
  if p_amount is null or p_amount = 0 then raise exception 'INVALID_INPUT: amount'; end if;
  perform set_config('vild.internal', '1', true);
  perform pg_advisory_xact_lock(hashtext(p_user::text || ':' || p_merchant));
  select coalesce(sum(amount), 0)::integer into v_balance from public.vild_ledger where user_id = p_user and merchant_id = p_merchant;
  if v_balance + p_amount < 0 then raise exception 'INSUFFICIENT_CREDIT'; end if;
  insert into public.vild_ledger (user_id, merchant_id, kind, amount, balance_after, description)
  values (p_user, p_merchant, 'adjust', p_amount, v_balance + p_amount, left(coalesce(p_description, 'Leiðrétting'), 200))
  returning * into v_row;
  return v_row;
end $$;
revoke execute on function public.vild_adjust_credit(uuid, text, integer, text) from public, anon, authenticated;
grant execute on function public.vild_adjust_credit(uuid, text, integer, text) to service_role;

-- ---------------------------------------------------------------------
-- 7. Expiry (cron, hourly)
--
-- Rule (consumer terms): credit expires 24 months after it was earned.
-- FIFO consumption: every positive row (earn, welcome, adjust) is a lot with
-- an expiry; spends and earlier expiries consume lots oldest-expiry-first
-- (vild_lots). A lot past its expires_at with remaining > 0 is expired by one
-- 'expire' row per pocket per run, amount = −Σ remaining of the expired lots.
-- Because the expire row itself consumes the oldest lots, vild_lots reports
-- those lots as empty afterwards — the rule is self-consistent and needs no
-- per-lot bookkeeping table.
-- ---------------------------------------------------------------------
create or replace function public.vild_expire_credit()
returns integer language plpgsql volatile security definer set search_path = public as $$
declare
  r record;
  v_expired integer;
  v_balance integer;
  v_rows integer := 0;
begin
  perform set_config('vild.internal', '1', true);
  for r in
    select distinct l.user_id, l.merchant_id
    from public.vild_ledger l
    where l.amount > 0 and l.expires_at is not null and l.expires_at < now()
  loop
    perform pg_advisory_xact_lock(hashtext(r.user_id::text || ':' || r.merchant_id));
    select coalesce(sum(lot.remaining), 0)::integer into v_expired
    from public.vild_lots(r.user_id, r.merchant_id) lot
    where lot.expires_at is not null and lot.expires_at < now() and lot.remaining > 0;
    if v_expired > 0 then
      select coalesce(sum(amount), 0)::integer into v_balance from public.vild_ledger where user_id = r.user_id and merchant_id = r.merchant_id;
      insert into public.vild_ledger (user_id, merchant_id, kind, amount, balance_after, description)
      values (r.user_id, r.merchant_id, 'expire', -v_expired, v_balance - v_expired, 'Inneign rann út (24 mánuðir)');
      v_rows := v_rows + 1;
    end if;
  end loop;
  return v_rows;
end $$;
comment on function public.vild_expire_credit is 'Writes one expire row per pocket for lots older than expiry_months (FIFO, see vild_lots). Returns the number of pockets touched. Cron hourly.';
revoke execute on function public.vild_expire_credit() from public, anon, authenticated;
grant execute on function public.vild_expire_credit() to service_role;

-- ---------------------------------------------------------------------
-- 8. Merchant dashboard
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
           sum(amount) filter (where amount > 0 and kind in ('earn', 'welcome')) as issued,
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

  select coalesce(sum(amount) filter (where amount > 0 and kind in ('earn', 'welcome')), 0),
         coalesce(-sum(amount) filter (where kind = 'spend'), 0)
  into v_issued, v_redeemed
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

  select coalesce(jsonb_agg(t order by t.qty desc), '[]'::jsonb) into v_top from (
    select i.product_id as "productId", max(i.name) as name, sum(i.qty)::integer as qty, sum(i.credit)::bigint as credit
    from public.vild_purchase_items i join public.vild_purchases p on p.id = i.purchase_id
    where p.merchant_id = p_merchant and p.occurred_at >= v_from_ts and i.product_id is not null
    group by i.product_id order by sum(i.qty) desc limit 5
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
    'creditRedeemed', v_redeemed,
    'returningCustomersPct', v_returning,
    'newMembers', v_new,
    'avgBasket', case when v_purchases > 0 then round(v_revenue::numeric / v_purchases) else 0 end,
    'daily', coalesce(v_daily, '[]'::jsonb),
    'topProducts', v_top,
    'byLocation', v_by_loc
  );
end $$;
comment on function public.vild_merchant_stats is 'MerchantStats JSON for the portal dashboard (camelCase keys, same shape as src/vild/lib/types.ts). Merchant users of the chain only.';
revoke execute on function public.vild_merchant_stats(text, integer) from public, anon;
grant execute on function public.vild_merchant_stats(text, integer) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- 9. Merchant RPCs
-- ---------------------------------------------------------------------
/** Invite a team member. Managers may invite managers/staff; only an owner may invite an owner. */
create or replace function public.vild_invite_merchant_user(
  p_merchant text, p_name text, p_email text, p_role text default 'staff', p_location_ids text[] default null
) returns public.vild_merchant_users
language plpgsql volatile security definer set search_path = public as $$
declare
  v_row public.vild_merchant_users;
  v_user uuid;
begin
  if not (public.vild_is_merchant_user(p_merchant, 'manager') or public.vild_is_service_role()) then raise exception 'AUTH_REQUIRED'; end if;
  if p_role not in ('owner', 'manager', 'staff') then raise exception 'INVALID_INPUT: role'; end if;
  if p_role = 'owner' and not (public.vild_is_merchant_user(p_merchant, 'owner') or public.vild_is_service_role()) then raise exception 'OWNER_REQUIRED'; end if;
  if p_location_ids is not null and exists (select 1 from unnest(p_location_ids) x where not exists (select 1 from public.vild_locations l where l.id = x and l.merchant_id = p_merchant)) then
    raise exception 'INVALID_INPUT: location_ids';
  end if;
  perform set_config('vild.internal', '1', true);
  -- link straight away if the person already has an account with this e-mail
  select id into v_user from auth.users where lower(email) = lower(btrim(p_email)) limit 1;
  insert into public.vild_merchant_users (merchant_id, user_id, name, email, role, location_ids, accepted_at)
  values (p_merchant, v_user, left(btrim(coalesce(p_name, '')), 80), lower(btrim(p_email)), p_role, p_location_ids, case when v_user is not null then now() end)
  on conflict (merchant_id, email) do update
    set name = excluded.name, role = excluded.role, location_ids = excluded.location_ids
  returning * into v_row;
  return v_row;
end $$;
revoke execute on function public.vild_invite_merchant_user(text, text, text, text, text[]) from public, anon;
grant execute on function public.vild_invite_merchant_user(text, text, text, text, text[]) to authenticated, service_role;

/**
 * Create a POS connection. Returns the API key and webhook secret ONCE; the
 * key is stored hashed. Owner only. The POS sends the key as x-vild-api-key
 * and signs each body with HMAC-SHA256(secret) in x-vild-signature.
 */
create or replace function public.vild_set_pos_connection(p_merchant text, p_location text default null, p_vendor text default 'other', p_config jsonb default '{}')
returns table (connection_id uuid, api_key text, webhook_secret text)
language plpgsql volatile security definer set search_path = public as $$
declare
  v_key text := 'vk_' || public.vild_random_code(32);
  v_secret text := encode(extensions.gen_random_bytes(32), 'hex');
  v_id uuid;
begin
  if not (public.vild_is_merchant_user(p_merchant, 'owner') or public.vild_is_service_role()) then raise exception 'AUTH_REQUIRED'; end if;
  if p_location is not null and not exists (select 1 from public.vild_locations where id = p_location and merchant_id = p_merchant) then raise exception 'NOT_FOUND: location'; end if;
  if p_vendor not in ('noona', 'upsell', 'resto', 'dk', 'ls', 'straumur', 'regla', 'other') then raise exception 'INVALID_INPUT: vendor'; end if;
  insert into public.vild_pos_connections (merchant_id, location_id, vendor, api_key_hash, webhook_secret, config)
  values (p_merchant, p_location, p_vendor, encode(extensions.digest(v_key, 'sha256'), 'hex'), v_secret, coalesce(p_config, '{}'::jsonb))
  returning id into v_id;
  return query select v_id, v_key, v_secret;
end $$;
revoke execute on function public.vild_set_pos_connection(text, text, text, jsonb) from public, anon;
grant execute on function public.vild_set_pos_connection(text, text, text, jsonb) to authenticated, service_role;

create or replace function public.vild_revoke_pos_connection(p_connection uuid)
returns void language plpgsql volatile security definer set search_path = public as $$
declare v_merchant text;
begin
  select merchant_id into v_merchant from public.vild_pos_connections where id = p_connection;
  if v_merchant is null then raise exception 'NOT_FOUND'; end if;
  if not (public.vild_is_merchant_user(v_merchant, 'owner') or public.vild_is_service_role()) then raise exception 'AUTH_REQUIRED'; end if;
  update public.vild_pos_connections set status = 'revoked', revoked_at = now() where id = p_connection;
end $$;
revoke execute on function public.vild_revoke_pos_connection(uuid) from public, anon;
grant execute on function public.vild_revoke_pos_connection(uuid) to authenticated, service_role;

/**
 * Monthly statement per chain. Default: the previous calendar month. Re-runs
 * update an 'open' statement; invoiced/paid ones are left alone.
 * platform_fee = credit_issued × platform_fee_pct / 100.
 */
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
           coalesce(sum(amount) filter (where amount > 0 and kind in ('earn', 'welcome', 'adjust')), 0),
           coalesce(-sum(amount) filter (where kind = 'spend'), 0),
           coalesce(-sum(amount) filter (where kind = 'expire'), 0),
           round(coalesce(sum(amount) filter (where amount > 0 and kind in ('earn', 'welcome', 'adjust')), 0) * v_fee / 100),
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
revoke execute on function public.vild_close_settlements(date) from public, anon, authenticated;
grant execute on function public.vild_close_settlements(date) to service_role;

-- ---------------------------------------------------------------------
-- 10. E-money threshold report (Act 114/2021 art. 38)
--   Credit redeemed per chain in the trailing 12 months, in ISK and EUR.
--   Above EUR 1m the limited-network exemption must be notified to
--   Seðlabanki Íslands. Service role / SQL editor only.
-- ---------------------------------------------------------------------
create or replace function public.vild_threshold_report()
returns table (merchant_id text, redeemed_isk bigint, issued_isk bigint, redeemed_eur numeric, threshold_eur integer, above_threshold boolean)
language sql stable security definer set search_path = public as $$
  select m.id,
         coalesce(-sum(l.amount) filter (where l.kind = 'spend'), 0)::bigint,
         coalesce(sum(l.amount) filter (where l.amount > 0), 0)::bigint,
         round(coalesce(-sum(l.amount) filter (where l.kind = 'spend'), 0) / public.vild_setting_int('eur_isk_rate', 150)::numeric),
         public.vild_setting_int('emoney_threshold_eur', 1000000),
         round(coalesce(-sum(l.amount) filter (where l.kind = 'spend'), 0) / public.vild_setting_int('eur_isk_rate', 150)::numeric) >= public.vild_setting_int('emoney_threshold_eur', 1000000)
  from public.vild_merchants m
  left join public.vild_ledger l on l.merchant_id = m.id and l.created_at >= now() - interval '12 months'
  group by m.id;
$$;
revoke execute on function public.vild_threshold_report() from public, anon, authenticated;
grant execute on function public.vild_threshold_report() to service_role;

-- ---------------------------------------------------------------------
-- 11. Realtime, cron, storage (guarded: skipped on plain Postgres)
-- ---------------------------------------------------------------------
do $$
begin
  -- Realtime: the app subscribes to its own ledger rows (RLS filters by user_id).
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    execute 'alter publication supabase_realtime add table public.vild_ledger';
  end if;

  -- Cron (pg_cron runs inside the database as postgres; the functions set vild.internal themselves)
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    execute 'create extension if not exists pg_cron with schema pg_catalog';
    execute $c$ select cron.schedule('vild-expire-credit',   '7 * * * *',  $j$ select public.vild_expire_credit() $j$) $c$;
    execute $c$ select cron.schedule('vild-cleanup-tokens',  '13 * * * *', $j$ select public.vild_cleanup_tokens() $j$) $c$;
    execute $c$ select cron.schedule('vild-close-settlements','30 3 1 * *', $j$ select public.vild_close_settlements() $j$) $c$;
    -- APNs push sweep for wallet passes: see supabase-vild/README.md "Wallet pass updates" (needs pg_net + the project URL)
  end if;

  -- Storage buckets
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('vild-product-images', 'vild-product-images', true, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
    on conflict (id) do nothing;
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('vild-merchant-assets', 'vild-merchant-assets', false, 10485760, array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'application/pdf'])
    on conflict (id) do nothing;

    -- product images: public read; a chain's managers write under <merchant_id>/…
    execute $p$ create policy "vild_product_images_read" on storage.objects for select using (bucket_id = 'vild-product-images') $p$;
    execute $p$ create policy "vild_product_images_write" on storage.objects for insert to authenticated
      with check (bucket_id = 'vild-product-images' and public.vild_is_merchant_user((storage.foldername(name))[1], 'manager')) $p$;
    execute $p$ create policy "vild_product_images_update" on storage.objects for update to authenticated
      using (bucket_id = 'vild-product-images' and public.vild_is_merchant_user((storage.foldername(name))[1], 'manager')) $p$;
    execute $p$ create policy "vild_product_images_delete" on storage.objects for delete to authenticated
      using (bucket_id = 'vild-product-images' and public.vild_is_merchant_user((storage.foldername(name))[1], 'manager')) $p$;
    -- merchant assets: the chain's team only, under <merchant_id>/…
    execute $p$ create policy "vild_merchant_assets_rw" on storage.objects for all to authenticated
      using (bucket_id = 'vild-merchant-assets' and public.vild_is_merchant_user((storage.foldername(name))[1], 'staff'))
      with check (bucket_id = 'vild-merchant-assets' and public.vild_is_merchant_user((storage.foldername(name))[1], 'manager')) $p$;
  end if;
end $$;
