# Plan: Daily call workflow

Icelandic UI, white/blue theme preserved. No existing companies touched — only schema additions and new UI. All state persisted in Lovable Cloud (companies, call_logs tables already exist).

## 1. Database additions (one migration)

Add columns to `companies` (nullable, safe for existing rows):
- `address text`
- `industry text` (geiri)
- `rejected boolean not null default false` — for "Hafnað / ekki áhuga"
- `rejected_at timestamptz`
- `last_call_outcome text` — 'answered' | 'no_answer' | 'rejected' | 'interested'

Add unique index on `lower(company_id)` where `company_id <> ''` to prevent duplicate kennitala.

(call_logs already stores notes + called_at; we reuse it for outcome history by prefixing the note, e.g. `[Svaraði] ...`.)

## 2. New layout — `src/pages/Index.tsx` (or new `CallDashboard.tsx`)

Two-pane daily workspace, replacing/augmenting current call section:

```text
┌─────────────────────────────┬───────────────────────────────┐
│ Á eftir að hringja          │ Áætluð símtöl                 │
│ (no next_call_at,           │ ─ Í dag (+ overdue, red)      │
│  not rejected,              │ ─ Á morgun                    │
│  stage != paid)             │ ─ Síðar                       │
│                             │   sorted by next_call_at      │
│  [Hringja] per row          │   [Hringja] per row           │
└─────────────────────────────┴───────────────────────────────┘
Below: collapsed "Hafnað / Lokað" list (rejected=true).
```

Overdue logic: `next_call_at < startOfToday` → shown in "Í dag" with red highlight + "Á eftir" label.

## 3. Call outcome modal (new `CallOutcomeModal.tsx`)

Triggered by [Hringja] button on either pane. Four buttons:

- **Svaraði** → fields: next call date+time (default tomorrow 10:00), note, outcome subtext. Saves: insert call_log `[Svaraði] note`, set `next_call_at`, `last_call_outcome='answered'`, `rejected=false`.
- **Svaraði ekki** → one-click: set `next_call_at = tomorrow same time` (editable inline date picker), insert call_log `[Svaraði ekki]`, `last_call_outcome='no_answer'`.
- **Hafnað / ekki áhuga** → optional note, set `rejected=true`, `rejected_at=now()`, clear `next_call_at`, insert call_log `[Hafnað] note`. Moves to "Hafnað/Lokað".
- **Áhugasamur** → set `stage='preview'`, `previewSubStatus='needed_website'` default, clear `next_call_at` (or keep), insert call_log `[Áhugasamur]`. Card disappears from call list, appears in Forskoðun.

## 4. Add Company — fix "Nýtt fyrirtæki"

Update `AddCompanyModal.tsx` fields: nafn, kennitala, eigandi, netfang, sími, heimilisfang, geiri, upphafsstaða (stage select). On submit:
1. Trim kennitala. If empty → allow. If present → query `companies` where `company_id = ?`; if exists, show inline error "Fyrirtæki með þessa kennitölu er þegar til: {name}" and abort.
2. Insert via existing `addCompany` service (extended with address, industry).

## 5. Forskoðun (preview) outcome tracking

In `CompanyModal.tsx` when `stage === 'preview'`: add a "Niðurstaða forskoðunar" section with the four existing sub-statuses as buttons (Vildi forskoðun / Selt sýnishorn / 50/50 / Þarf vefsíðu) + a "Selt fyrir (kr.)" amount input.

On save:
- Update `previewSubStatus`.
- If amount > 0 → set `amount_paid` (add to existing) and `projected_earnings` accordingly so the existing Greiðslusaga/Fjármál totals pick it up automatically (Finances page already sums these).

## 6. Persistence & auto-refresh

- All updates via existing `companyService` + `callLogService` (Supabase).
- Day grouping computed in-render from `next_call_at` against `new Date()` — re-renders on focus and after each mutation, so yesterday's items roll into today automatically.

## Files touched

- New migration (columns + unique index)
- New: `src/components/CallOutcomeModal.tsx`
- New: `src/components/ScheduledCallsPane.tsx`, `src/components/PendingCallsPane.tsx` (or one `CallDashboard.tsx`)
- Edit: `src/pages/Index.tsx` — two-pane layout + rejected section
- Edit: `src/components/AddCompanyModal.tsx` — new fields + kennitala dedupe
- Edit: `src/components/CompanyModal.tsx` — preview outcome section
- Edit: `src/services/companyService.ts` + `src/types.ts` — address, industry, rejected, lastCallOutcome

## Out of scope (ask if you want them)

- Auth / per-user data isolation (tables remain public as today).
- Moving Kanban board layout — left/right pane is added to the calls view, Kanban stays.
