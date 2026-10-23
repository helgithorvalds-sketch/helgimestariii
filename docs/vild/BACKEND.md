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
