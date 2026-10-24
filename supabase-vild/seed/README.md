# Seed data

| File | What |
|---|---|
| `seed.sql` | The demo catalogue of `src/vild/data/seed.ts`: 5 sectors, the chain **Lúna** (`m_luna`), 9 venues, 15 products, 9 reward rules, 4 offers, 3 team invites, and `vild_seed_demo_history(user)` which replays the mock's eleven visits for a real auth user (12:xx / 19:xx), dates the welcome credit and `member_since` the day before the first visit, and computes the monthly statements of those months with `vild_close_settlements`. No settlement figures are inserted by hand. |
| `test_users.sql` | Comments only: how to create the demo consumer (phone OTP) and the three merchant accounts through Supabase Auth, and a POS connection for curl. |

Apply order: migrations `0001` → `0005`, then `seed.sql`, then follow `test_users.sql`.

## Removing the demo data before launch

Run in the SQL editor as `postgres`. The ledger is append-only and `vild_purchases.user_id` is
`on delete restrict`, so neither deleting the ledger rows directly nor deleting the demo users works
on its own. The block below disables the delete guard for one transaction, removes the rows written
with `source = 'demo'`, then the accounts, then the catalogue.

```sql
begin;
-- 1. demo purchases and their ledger rows (the append-only trigger is disabled for this transaction only)
alter table public.vild_ledger disable trigger vild_ledger_no_delete;
delete from public.vild_ledger where purchase_id in (select id from public.vild_purchases where source = 'demo');
delete from public.vild_ledger where kind = 'welcome' and user_id in (select id from auth.users where phone = '3546661234' or email like '%@luna.is');
delete from public.vild_purchases where source = 'demo';
alter table public.vild_ledger enable trigger vild_ledger_no_delete;

-- 2. demo accounts (auth → cascades to profiles, tokens, pass data, eid sessions)
delete from auth.users where phone = '3546661234' or email in ('johanna@luna.is', 'kristjan@luna.is', 'elin@luna.is');

-- 3. the fictional chain (cascades to venues, products, rules, offers, invites, settlements, POS connections + events)
delete from public.vild_merchants where id = 'm_luna';
drop function if exists public.vild_seed_demo_history(uuid);
commit;
```

Keep the sectors (`vild_sectors`): they are real product configuration, not demo data. Set
`demo_purchases_enabled` to `false` in `vild_settings` so the in-app "Prófa kaup" flow stops working:

```sql
update public.vild_settings set value = 'false' where key = 'demo_purchases_enabled';
```
