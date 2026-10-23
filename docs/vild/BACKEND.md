# VILD backend — pointer

The backend lives in `supabase-vild/` (migrations, seed, edge functions) with its own README that
covers project creation, applying migrations, secrets and the POS contract. This page keeps the one
flow everyone asks about.

## A purchase at the till, step by step

1. Guest opens **Kort**; the app calls `vild_issue_wallet_token` → `VILD-XXXX-XXXX`, valid 60 s,
   rendered as a QR. (The wallet pass carries a long-lived per-user pass token instead.)
2. Cashier scans it. Either the POS sends the receipt to `vild-pos-webhook` with the token inside
   `customer.wallet_token`, or the cashier uses the till flow (`vild-till /lookup` → shows first name
   and balance; `/charge` with the amount).
3. `vild_record_purchase` (security definer, service role):
   - locks the (user, merchant) pocket (advisory lock);
   - rejects a duplicate `external_id` for the merchant (idempotent);
   - computes credit per line with `vild_credit_for(product, merchant, occurred_at)`;
   - if credit was requested: `spend` row = −min(balance, total);
   - `earn` row = credit × (money part / total), `expires_at` = occurred_at + 24 months;
   - writes `vild_purchases`, `vild_purchase_items`, both ledger rows with `balance_after`;
   - returns `{ applied, to_pay, earned, balance_after }`.
4. The POS prints "Inneign nýtt −1.500 kr. · Ný inneign +149 kr. · Staða 989 kr." on the receipt.
5. A ledger insert triggers the pass update sweep (`vild-wallet-pass /push-updates`) and a push.
6. The app's **Yfirlit** shows the receipt; **Heim** counts the balance up.

## What `vild_record_purchase` actually returns

The SQL function returns the ledger rows it wrote (`setof vild_ledger`: the optional `spend` row,
then the `earn` row). The edge functions turn them into the receipt summary above:
`applied = −spend.amount`, `earned = earn.amount`, `balance_after` of the last row, plus
`receipt_no` from `vild_purchases`. The app reads the same rows through the `vild_ledger_entries`
view, which adds the receipt total and the items.

## Where things live

| Concern | Object |
|---|---|
| Rule engine (product > category > merchant, time-boxed first, newest wins) | `vild_credit_for`, `vild_credit_for_line` — same logic as `creditFor()` in `src/vild/data/seed.ts`, checked by `supabase-vild/test/assertions.sql` |
| Balances / pockets | `vild_pockets` view (sum of `vild_ledger`), FIFO lots in `vild_lots` |
| Expiry (24 months, FIFO) | `vild_expire_credit`, cron hourly |
| Monthly statement per chain | `vild_close_settlements`, cron on the 1st → `vild_settlements` |
| QR token (60 s) / pass token | `vild_issue_wallet_token`, `vild_resolve_wallet_token`, `vild_pass_secrets` |
| POS webhook contract | `supabase-vild/functions/vild-pos-webhook/receipt.ts` (+ `adapters/noona.ts`, unverified) |
| Cashier till + demo purchase | `supabase-vild/functions/vild-till` |
| Electronic ID | `supabase-vild/functions/vild-eid` + `migrations/0003_eid.sql` |
| Apple / Google wallet | `supabase-vild/functions/vild-wallet-pass` |
| Frontend adapter | `src/vild/data/supabase.ts` (`VITE_VILD_DATA=supabase`), types in `database.types.ts` |

Time zone note: the IANA zone is `Atlantic/Reykjavik` (there is no `Europe/Reykjavik`); it is UTC
year-round, and the rule windows (weekdays, hours) are evaluated in it.
