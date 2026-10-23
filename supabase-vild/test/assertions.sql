-- Behavioural checks against the local cluster (see local_db.sh). Each block
-- raises on failure. The numbers mirror src/vild/test/foundation.test.ts.
\set ON_ERROR_STOP on

-- ---------------------------------------------------------------------
-- Rule engine (same expectations as foundation.test.ts "credit rules")
-- ---------------------------------------------------------------------
do $$
declare r record;
begin
  -- Friday 2026-10-23 16:00 Reykjavik: outside lunch
  select * into r from public.vild_credit_for('p_margherita', 'm_luna', '2026-10-23T16:00:00Z');
  if r.pct <> 50 or r.amount <> 1495 or r.rule_id <> 'r_margherita' then raise exception 'margherita: %', r; end if;
  select * into r from public.vild_credit_for('p_pepperoni', 'm_luna', '2026-10-23T16:00:00Z');
  if r.pct <> 10 or r.amount <> 329 or r.rule_id <> 'r_default' then raise exception 'pepperoni: %', r; end if;
  select * into r from public.vild_credit_for('p_cola', 'm_luna', '2026-10-23T16:00:00Z');
  if r.amount <> 0 or r.rule_id <> 'r_drinks' then raise exception 'cola: %', r; end if;
  select * into r from public.vild_credit_for('p_cake', 'm_luna', '2026-10-23T16:00:00Z');
  if r.pct <> 15 or r.amount <> 194 then raise exception 'cake: %', r; end if;
  -- Friday lunch: the time-boxed pizza rule wins over the merchant default, not over the product rule
  select * into r from public.vild_credit_for('p_pepperoni', 'm_luna', '2026-10-23T12:30:00Z');
  if r.pct <> 30 or r.amount <> 987 or r.rule_id <> 'r_lunch' then raise exception 'pepperoni lunch: %', r; end if;
  select * into r from public.vild_credit_for('p_margherita', 'm_luna', '2026-10-23T12:30:00Z');
  if r.pct <> 50 then raise exception 'margherita lunch: %', r; end if;
  -- window edges: 11:00 in, 14:00 out
  select * into r from public.vild_credit_for('p_pepperoni', 'm_luna', '2026-10-23T11:00:00Z');
  if r.pct <> 30 then raise exception 'lunch start edge: %', r; end if;
  select * into r from public.vild_credit_for('p_pepperoni', 'm_luna', '2026-10-23T14:00:00Z');
  if r.pct <> 10 then raise exception 'lunch end edge: %', r; end if;
  -- Saturday lunch: weekday rule off
  select * into r from public.vild_credit_for('p_pepperoni', 'm_luna', '2026-10-24T12:30:00Z');
  if r.pct <> 10 then raise exception 'saturday: %', r; end if;
  -- inactive Tuesday rule stays off
  select * into r from public.vild_credit_for('p_fries', 'm_luna', '2026-10-27T16:00:00Z');
  if r.pct <> 10 then raise exception 'tuesday inactive: %', r; end if;
  -- fixed amount capped at price; pct derived
  select * into r from public.vild_credit_for_line('m_luna', null, 'side', 500, now());
  if r.amount <> 50 then raise exception 'merchant default on 500: %', r; end if;
  raise notice 'rule engine: ok';
end $$;

do $$
declare r record;
begin
  perform set_config('vild.internal', '1', true);
  insert into public.vild_reward_rules (id, merchant_id, scope, product_id, rate_pct, fixed_amount, name, created_at)
  values ('r_test_fixed', 'm_luna', 'product', 'p_fries', null, 900, 'Fixed test', now());
  select * into r from public.vild_credit_for('p_fries', 'm_luna', now());
  if r.amount <> 890 or r.pct <> 101 or r.rule_id <> 'r_test_fixed' then raise exception 'fixed cap: %', r; end if;
  delete from public.vild_reward_rules where id = 'r_test_fixed';
  -- exactly one of rate/fixed
  begin
    insert into public.vild_reward_rules (merchant_id, scope, rate_pct, fixed_amount, name) values ('m_luna', 'merchant', 5, 100, 'bad');
    raise exception 'check constraint missing';
  exception when check_violation then null;
  end;
  raise notice 'fixed amount + constraints: ok';
end $$;

-- ---------------------------------------------------------------------
-- Users, welcome credit, tokens, quote, purchase
-- ---------------------------------------------------------------------
do $$
declare
  v_user uuid;
  v_bal integer;
  r record;
  v_tok text;
  v_n integer;
  v_pid uuid;
begin
  -- a signup creates the profile and the welcome credit in the live chain
  insert into auth.users (email, phone, raw_user_meta_data) values (null, '3546661234', '{"name":"Helgi"}') returning id into v_user;
  select balance into v_bal from public.vild_pockets where user_id = v_user and merchant_id = 'm_luna';
  if v_bal <> 500 then raise exception 'welcome credit: %', v_bal; end if;

  -- act as the service role from here on (edge functions)
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);

  -- quote: 2990 with 500 available → applied 500, earn 10% of 2490 = 249
  select * into r from public.vild_redeem_quote(v_user, 'm_luna', 2990, true);
  if r.available <> 500 or r.applied <> 500 or r.to_pay <> 2490 or r.will_earn <> 249 then raise exception 'quote: %', r; end if;

  -- token round trip
  select token into v_tok from public.vild_issue_wallet_token(v_user);
  if v_tok !~ '^VILD-[A-Z2-9]{4}-[A-Z2-9]{4}$' then raise exception 'token format: %', v_tok; end if;
  select * into r from public.vild_resolve_wallet_token(v_tok);
  if r.user_id <> v_user or r.first_name <> 'Helgi' or r.used then raise exception 'resolve: %', r; end if;
  if public.vild_consume_wallet_token(v_tok) <> v_user then raise exception 'consume'; end if;
  begin
    perform public.vild_consume_wallet_token(v_tok);
    raise exception 'token reused';
  exception when others then
    if sqlerrm not like 'TOKEN_INVALID%' then raise; end if;
  end;

  -- purchase: Margherita with credit. spend 500, earn round(1495 × 2490/2990) = 1245
  select count(*) into v_n from public.vild_record_purchase('m_luna', 'l_laugavegur', v_user, '[{"product_id":"p_margherita","qty":1}]', true, 'till', 'ext-1', '2026-10-23T16:00:00Z', null);
  if v_n <> 2 then raise exception 'rows: %', v_n; end if;
  select * into r from public.vild_ledger where user_id = v_user and kind = 'spend';
  if r.amount <> -500 or r.balance_after <> 0 then raise exception 'spend row: %', r; end if;
  select * into r from public.vild_ledger where user_id = v_user and kind = 'earn';
  if r.amount <> 1245 or r.balance_after <> 1245 or r.description <> 'Margherita' then raise exception 'earn row: %', r; end if;
  if r.expires_at <> '2026-10-23T16:00:00Z'::timestamptz + interval '24 months' then raise exception 'expiry: %', r.expires_at; end if;
  select * into r from public.vild_purchases where user_id = v_user;
  if r.total <> 2990 or r.paid_with_credit <> 500 or r.paid_with_money <> 2490 then raise exception 'purchase: %', r; end if;
  v_pid := r.id;

  -- idempotent replay returns the same two rows and writes nothing
  select count(*) into v_n from public.vild_record_purchase('m_luna', 'l_laugavegur', v_user, '[{"product_id":"p_margherita","qty":1}]', true, 'till', 'ext-1', now(), null);
  if v_n <> 2 or (select count(*) from public.vild_purchases where user_id = v_user) <> 1 then raise exception 'idempotency'; end if;

  -- second purchase without credit: 2× burger (20%) + cola (0%) = 2×578 = 1156, with a sku line and a free-text line
  select count(*) into v_n from public.vild_record_purchase('m_luna', 'l_kringlan', v_user,
    '[{"product_id":"p_luna_burger","qty":2},{"product_id":"p_cola","qty":1},{"name":"Sérréttur","qty":1,"unit_price":1000}]', false, 'pos_webhook', 'ext-2', '2026-10-23T16:30:00Z', '{"receipt_no":"R-77"}');
  select * into r from public.vild_ledger where user_id = v_user and purchase_id <> v_pid;
  if r.kind <> 'earn' or r.amount <> 1156 + 100 or r.balance_after <> 1245 + 1256 then raise exception 'second earn: %', r; end if;
  if r.description <> '2× Lúnuborgari, Kók 0,33 l, Sérréttur' then raise exception 'desc: %', r.description; end if;
  if (select receipt_no from public.vild_purchases where id = r.purchase_id) <> 'R-77' then raise exception 'receipt no'; end if;

  -- ledger entries view carries items and receipt
  select * into r from public.vild_ledger_entries where user_id = v_user and purchase_id = v_pid and kind = 'earn';
  if r.purchase_total <> 2990 or jsonb_array_length(r.items) <> 1 or (r.items -> 0 ->> 'credit')::int <> 1495 then raise exception 'entries view: %', r; end if;

  -- append-only
  begin
    update public.vild_ledger set amount = 1 where user_id = v_user;
    raise exception 'ledger update allowed';
  exception when others then
    if sqlerrm not like 'LEDGER_APPEND_ONLY%' then raise; end if;
  end;
  begin
    delete from public.vild_ledger where user_id = v_user;
    raise exception 'ledger delete allowed';
  exception when others then
    if sqlerrm not like 'LEDGER_APPEND_ONLY%' then raise; end if;
  end;

  -- pocket view
  select * into r from public.vild_pockets where user_id = v_user;
  if r.balance <> 2501 or r.earned_total <> 500 + 1245 + 1256 or r.spent_total <> 500 then raise exception 'pocket: %', r; end if;
  -- FIFO by expiry: the earn lot dated 16:00 today expires before the welcome lot written "now",
  -- so the 500 spend came out of it → 745 left in the soonest-expiring lot
  if r.next_expiry_amount <> 745 then raise exception 'next expiry lot: %', r; end if;

  -- adjust + insufficient credit
  perform public.vild_adjust_credit(v_user, 'm_luna', -2501, 'test');
  begin
    perform public.vild_adjust_credit(v_user, 'm_luna', -1, 'test');
    raise exception 'overdraft allowed';
  exception when others then
    if sqlerrm not like 'INSUFFICIENT_CREDIT%' then raise; end if;
  end;
  raise notice 'purchase flow: ok';
end $$;

-- ---------------------------------------------------------------------
-- Expiry (FIFO): earn two lots, spend part, age the first lot, expire
-- ---------------------------------------------------------------------
do $$
declare
  v_user uuid;
  r record;
  v_n integer;
begin
  update public.vild_settings set value = '0' where key = 'welcome_credit';
  insert into auth.users (email) values ('expiry@test.is') returning id into v_user;
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  -- lot A: 1000 earned 25 months ago (Margherita full price 2990 → 1495 … use adjust for exact numbers)
  perform set_config('vild.internal', '1', true);
  insert into public.vild_ledger (user_id, merchant_id, kind, amount, balance_after, description, expires_at, created_at)
  values (v_user, 'm_luna', 'earn', 1000, 1000, 'A', now() - interval '1 day', now() - interval '25 months');
  insert into public.vild_ledger (user_id, merchant_id, kind, amount, balance_after, description, expires_at, created_at)
  values (v_user, 'm_luna', 'earn', 700, 1700, 'B', now() + interval '23 months', now() - interval '1 month');
  insert into public.vild_ledger (user_id, merchant_id, kind, amount, balance_after, description, created_at)
  values (v_user, 'm_luna', 'spend', -300, 1400, 'spend', now() - interval '2 weeks');
  -- FIFO: the spend consumed 300 of A → A remaining 700, B remaining 700 (checked in the next block)
end $$;

do $$
declare
  v_user uuid := (select id from auth.users where email = 'expiry@test.is');
  r record;
  v_n integer;
begin
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  select remaining into v_n from public.vild_lots(v_user, 'm_luna') where amount = 1000;
  if v_n <> 700 then raise exception 'lot A remaining: %', v_n; end if;
  select remaining into v_n from public.vild_lots(v_user, 'm_luna') where amount = 700;
  if v_n <> 700 then raise exception 'lot B remaining: %', v_n; end if;
  select next_expiry_amount into v_n from public.vild_pockets where user_id = v_user;
  if v_n <> 700 then raise exception 'next expiry amount: %', v_n; end if;

  v_n := public.vild_expire_credit();
  if v_n <> 1 then raise exception 'pockets expired: %', v_n; end if;
  select * into r from public.vild_ledger where user_id = v_user and kind = 'expire';
  if r.amount <> -700 or r.balance_after <> 700 then raise exception 'expire row: %', r; end if;
  -- running it again changes nothing; lot A is now empty, B untouched
  if public.vild_expire_credit() <> 0 then raise exception 'expiry not idempotent'; end if;
  select remaining into v_n from public.vild_lots(v_user, 'm_luna') where amount = 1000;
  if v_n <> 0 then raise exception 'lot A after expiry: %', v_n; end if;
  select remaining into v_n from public.vild_lots(v_user, 'm_luna') where amount = 700;
  if v_n <> 700 then raise exception 'lot B after expiry: %', v_n; end if;
  select balance into v_n from public.vild_pockets where user_id = v_user;
  if v_n <> 700 then raise exception 'balance after expiry: %', v_n; end if;
  update public.vild_settings set value = '500' where key = 'welcome_credit';
  raise notice 'expiry: ok';
end $$;

-- ---------------------------------------------------------------------
-- RLS: a consumer sees only their own rows; a merchant user sees the chain
-- ---------------------------------------------------------------------
do $$
declare
  v_helgi uuid := (select id from auth.users where phone = '3546661234');
  v_other uuid := (select id from auth.users where email = 'expiry@test.is');
  v_owner uuid;
  v_n integer;
  r record;
begin
  -- owner signs up with the invited e-mail → linked
  insert into auth.users (email) values ('johanna@luna.is') returning id into v_owner;
  if (select user_id from public.vild_merchant_users where email = 'johanna@luna.is') <> v_owner then raise exception 'owner not linked'; end if;

  -- as Helgi (authenticated)
  perform set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'sub', v_helgi)::text, true);
  set local role authenticated;
  select count(*) into v_n from public.vild_ledger;
  if v_n <> (select count(*) from public.vild_ledger_entries) then raise exception 'entries view count'; end if;
  if exists (select 1 from public.vild_ledger where user_id = v_other) then raise exception 'rls: saw another user''s ledger'; end if;
  if exists (select 1 from public.vild_pockets where user_id = v_other) then raise exception 'rls: saw another user''s pocket'; end if;
  if (select count(*) from public.vild_profiles) <> 1 then raise exception 'rls: profiles'; end if;
  if exists (select 1 from public.vild_merchants) then raise exception 'rls: consumer read merchants table'; end if;
  if (select count(*) from public.vild_merchant_public) <> 1 then raise exception 'merchant_public'; end if;
  if (select count(*) from public.vild_products_public) <> 15 then raise exception 'products_public'; end if;
  select credit_amount into v_n from public.vild_products_public where id = 'p_margherita';
  if v_n <> 1495 then raise exception 'products_public credit: %', v_n; end if;
  -- own profile: allowed columns only
  update public.vild_profiles set name = 'Helgi M.', marketing_opt_in = true where id = v_helgi;
  begin
    update public.vild_profiles set kennitala = '0101302989' where id = v_helgi;
    raise exception 'kennitala editable by owner';
  exception when others then
    if sqlerrm not like 'IMMUTABLE_COLUMN%' then raise; end if;
  end;
  -- cannot issue a token for someone else, cannot call internal RPCs
  begin
    perform public.vild_issue_wallet_token(v_other);
    raise exception 'token for other user';
  exception when others then
    if sqlerrm not like 'AUTH_REQUIRED%' then raise; end if;
  end;
  begin
    perform public.vild_record_purchase('m_luna', 'l_laugavegur', v_helgi, '[{"product_id":"p_fries","qty":1}]', false, 'demo', null, now(), null);
    raise exception 'consumer recorded a purchase';
  exception when insufficient_privilege then null;
  when others then if sqlerrm not like 'AUTH_REQUIRED%' then raise; end if;
  end;
  begin
    perform public.vild_resolve_wallet_token('VILD-AAAA-AAAA');
    raise exception 'consumer resolved a token';
  exception when insufficient_privilege then null;
  when others then if sqlerrm not like 'AUTH_REQUIRED%' then raise; end if;
  end;
  begin
    perform count(*) from public.vild_wallet_tokens;
    raise exception 'consumer read wallet tokens';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.vild_ledger (user_id, merchant_id, kind, amount, balance_after) values (v_helgi, 'm_luna', 'earn', 99999, 99999);
    raise exception 'consumer wrote the ledger';
  exception when insufficient_privilege then null;
  when others then if sqlerrm not like 'LEDGER_INTERNAL_ONLY%' then raise; end if;
  end;
  begin
    update public.vild_reward_rules set rate_pct = 99 where id = 'r_default';
    if (select rate_pct from public.vild_reward_rules where id = 'r_default') = 99 then raise exception 'consumer edited a rule'; end if;
  end;
  reset role;

  -- as the owner (merchant user)
  perform set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'sub', v_owner)::text, true);
  set local role authenticated;
  if not public.vild_is_merchant_user('m_luna', 'owner') then raise exception 'is_merchant_user'; end if;
  if (select count(*) from public.vild_merchants) <> 1 then raise exception 'owner reads merchant table'; end if;
  update public.vild_reward_rules set rate_pct = 12 where id = 'r_default';
  if (select rate_pct from public.vild_reward_rules where id = 'r_default') <> 12 then raise exception 'owner rule update'; end if;
  update public.vild_reward_rules set rate_pct = 10 where id = 'r_default';
  insert into public.vild_reward_rules (merchant_id, scope, product_id, rate_pct, name) values ('m_luna', 'product', 'p_fries', 40, 'Franskar');
  select credit_pct into v_n from public.vild_products_public where id = 'p_fries';
  if v_n <> 40 then raise exception 'new rule not applied: %', v_n; end if;
  delete from public.vild_reward_rules where name = 'Franskar';
  update public.vild_merchants set description = 'x', default_rate_pct = 11 where id = 'm_luna';
  begin
    update public.vild_merchants set status = 'coming' where id = 'm_luna';
    raise exception 'owner changed status';
  exception when others then
    if sqlerrm not like 'IMMUTABLE_COLUMN%' then raise; end if;
  end;
  update public.vild_merchants set default_rate_pct = 10 where id = 'm_luna';
  -- invite + stats + settlements + pos connection
  perform public.vild_invite_merchant_user('m_luna', 'Nýr', 'nyr@luna.is', 'staff', '{l_grandi}');
  if (select role from public.vild_merchant_users where email = 'nyr@luna.is') <> 'staff' then raise exception 'invite'; end if;
  if (select count(*) from public.vild_settlements) <> 2 then raise exception 'settlements read'; end if;
  select * into r from public.vild_set_pos_connection('m_luna', null, 'noona', '{"company_id":"c1"}');
  if r.api_key !~ '^vk_[A-Z2-9]{32}$' or length(r.webhook_secret) <> 64 then raise exception 'pos connection: %', r; end if;
  if (select count(*) from public.vild_pos_connections_public) <> 1 then raise exception 'connections view'; end if;
  begin
    perform count(*) from public.vild_pos_connections;
    raise exception 'owner read secrets';
  exception when insufficient_privilege then null;
  end;
  -- the owner cannot see consumers' ledgers, only purchases of the chain
  if exists (select 1 from public.vild_ledger where user_id <> v_owner) then raise exception 'owner read ledger'; end if;
  if (select count(*) from public.vild_purchases) <> 2 then raise exception 'owner purchases: %', (select count(*) from public.vild_purchases); end if;
  reset role;

  -- stats (as owner) — one purchase today, the demo rows were dated 2026-10-23
  perform set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'sub', v_owner)::text, true);
  set local role authenticated;
  select public.vild_merchant_stats('m_luna', 400) into r;
  reset role;
  raise notice 'rls: ok';
end $$;

do $$
declare
  v_owner uuid := (select id from auth.users where email = 'johanna@luna.is');
  j jsonb;
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'sub', v_owner)::text, true);
  j := public.vild_merchant_stats('m_luna', 30);
  if (j ->> 'purchases')::int < 0 or jsonb_array_length(j -> 'daily') <> 30 or jsonb_array_length(j -> 'byLocation') <> 9 then raise exception 'stats: %', j; end if;
  if (j ->> 'merchantId') <> 'm_luna' or (j ->> 'periodDays')::int <> 30 then raise exception 'stats keys: %', j; end if;
  raise notice 'stats: ok (purchases=% revenue=% issued=%)', j ->> 'purchases', j ->> 'revenue', j ->> 'creditIssued';
end $$;

-- ---------------------------------------------------------------------
-- Settlements + eID + seed demo history + threshold report
-- ---------------------------------------------------------------------
do $$
declare
  v_helgi uuid := (select id from auth.users where phone = '3546661234');
  r record;
  v_n integer;
begin
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  v_n := public.vild_close_settlements('2026-10-01');
  if v_n <> 1 then raise exception 'settlements closed: %', v_n; end if;
  select * into r from public.vild_settlements where merchant_id = 'm_luna' and period_from = '2026-10-01';
  if r.credit_issued < 1245 or r.platform_fee <> round(r.credit_issued * 0.10) then raise exception 'settlement figures: %', r; end if;

  -- eID
  perform public.vild_eid_apply(v_helgi, '010130-2989', 'Helgi Már Þorvaldsson', 'idp.kenni.is');
  select * into r from public.vild_profiles where id = v_helgi;
  if r.kennitala <> '0101302989' or r.legal_name <> 'Helgi Már Þorvaldsson' or r.eid_verified_at is null or length(r.kennitala_hash) <> 64 then raise exception 'eid apply: %', r; end if;
  begin
    perform public.vild_eid_apply(v_helgi, '0101302979', 'x', 'y');
    raise exception 'bad check digit accepted';
  exception when others then
    if sqlerrm not like 'INVALID_INPUT%' then raise; end if;
  end;
  if not public.vild_kennitala_valid('1201743399') or public.vild_kennitala_valid('1201743389') or public.vild_kennitala_valid('1201743391') then raise exception 'kennitala check'; end if;

  -- demo history replays eleven visits
  v_n := public.vild_seed_demo_history(v_helgi);
  if v_n <> 11 then raise exception 'demo history: %', v_n; end if;
  select * into r from public.vild_pockets where user_id = v_helgi;
  if r.balance <= 0 then raise exception 'demo balance: %', r; end if;
  -- the threshold report runs
  select * into r from public.vild_threshold_report() where merchant_id = 'm_luna';
  if r.above_threshold then raise exception 'threshold'; end if;
  raise notice 'settlements/eid/demo: ok (demo balance % kr.)', r.redeemed_isk;
end $$;
