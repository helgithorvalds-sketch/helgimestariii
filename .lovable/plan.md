# Molten Redesign + Dagurinn + Láta vita

Big three-part update. Full visual reskin to "Molten" liquid glass, a new home page called Dagurinn (daily schedule), and a Láta vita reminder flow on leads.

## Part 1 — Molten liquid-glass reskin (whole app)

Design tokens in `src/index.css` + `tailwind.config.ts`:
- Background: warm near-black `hsl(20 15% 6%)` with warm brown tint. Foreground: warm off-white.
- Accent: ember/magma gradient — `--ember-1: 22 100% 58%`, `--ember-2: 14 92% 50%`, `--ember-3: 35 100% 62%`. `--gradient-ember: linear-gradient(135deg, hsl(var(--ember-2)), hsl(var(--ember-1)), hsl(var(--ember-3)))`.
- Glass surface: `--glass-bg: 30 20% 12% / 0.55`, `--glass-border: 30 40% 70% / 0.12`, `--glass-highlight: 30 60% 80% / 0.06`. Shadow: `--shadow-glow: 0 20px 60px -20px hsl(var(--ember-1) / 0.35)`.
- Fonts: distinctive display + body pairing (Fraunces or similar for display headers, Inter Tight for body). Numbers use light-weight tabular figures.

Reusable primitives:
- `GlassCard` — translucent panel with `backdrop-blur-xl`, thin gradient border, subtle inner highlight, hover lift.
- `AuroraBackground` — fixed-position layer with 3 slow-drifting radial ember blobs (CSS keyframes), sits behind everything.
- `StatusPill` — small glass rounded pill variants (success / warn / queued / sent / neutral).
- `RingProgress` — SVG ring with ember gradient stroke, used for daily % and hero stats.
- `CountUp` — animated number that counts to value on mount.
- `Sparkline` — tiny inline SVG line for stat cards.

Apply globally:
- Mount `AuroraBackground` in `App.tsx`.
- Rewrap page shells and existing cards (Kanban columns, lead cards, finance cards, task cards, modals) with `GlassCard` styles — no logic changes, only className/wrapper swaps and token replacements.
- Buttons: primary uses ember gradient + glow; ghost/secondary uses glass.
- Mobile nav: convert current top NavLinks to a bottom glass tab bar on `<md` screens with big touch targets. Keep top nav on desktop.

All Icelandic text and functionality preserved. No DB changes in Part 1.

## Part 2 — Dagurinn (Today) — new home page

Route change: `/` → `Dagurinn`. Move current Index (Kanban) to `/kanban`. Add `Dagurinn` to nav (first item).

New DB table `daily_schedules`:
- `id`, `schedule_date` (date), `block_time` (time), `duration_min` (int), `kind` (enum text: prep|call|break|followup|email|custom), `company_id` (nullable fk companies), `title` (text), `notes` (text), `status` (pending|done|skipped), `created_at`, `updated_at`.
- RLS: permissive (matches existing companies/tasks policies to keep app working without auth).
- Trigger: `update_updated_at_column` on update.

New DB table `daily_settings` (singleton row per user — for now single global row):
- `id`, `work_start` (time default 09:00), `work_end` (time default 17:00), `max_calls` (int default 10), `vacation_mode` (bool default false), timestamps.

Page composition:
- Header: Icelandic date (`fimmtudagur, 16. júlí 2026`), greeting ("Góðan daginn, Helgi"), giant `RingProgress` (light-weight big number center) = `% blokka klárað í dag`.
- Settings gear opens a glass sheet: work_start, work_end, max_calls, Frí toggle.
- Vacation mode: replaces schedule with a relaxed empty state ("Í fríi — engin símtöl í dag").
- Timeline: vertical list of glass blocks. Each block: time range, kind icon, title (company name for calls), phone `tel:` link, note textarea (inline autosave), checkbox → done/skipped.
- Yesterday strip at bottom: calls made yesterday, streak count. Streak = consecutive days where all pending blocks were done or skipped.
- Generation logic (client-side, idempotent per date):
  - On load, if no schedule rows for today: build blocks between work_start and work_end.
  - 15 min `prep` at start.
  - Up to `max_calls` `call` blocks (15 min each) from companies in stage `to_call` / with `next_call_at <= today`, prioritized by `next_call_at asc` then created_at.
  - 15 min `break` mid-morning.
  - Remaining time filled with `followup`/`email` blocks from companies in `preview` stage without recent contact.
  - Rollover: on generate, unfinished (pending) blocks from prior days with call kind are re-queued at top for today.

Services + hooks:
- `src/services/scheduleService.ts` — fetch/generate/update/delete blocks and settings.
- `src/pages/Dagurinn.tsx` — page.
- Small components: `ScheduleBlock`, `DailySettingsSheet`, `YesterdayStrip`.

## Part 3 — Láta vita (reminder outbox)

New DB table `notifications_outbox`:
- `id`, `company_id` (fk), `channel` (sms|email default sms), `recipient` (text — phone or email), `message` (text), `scheduled_date` (date), `status` (queued|sent|cancelled|failed), `sent_at` (tz nullable), `error` (text nullable), timestamps.
- Permissive RLS matching other tables.

On each lead card in `to_call` stage:
- "Láta vita" button → dialog: "Viltu að [company] fái skilaboð um að við hringjum í dag?" + editable message textarea prefilled with template.
- On Já: insert row (status queued, scheduled_date = today, recipient from phone or email).
- Card shows glass `StatusPill`: "Verður látinn vita í dag" while queued (with cancel X), "Látinn vita ✓" when sent.

Header bell icon (all pages):
- Badge count of today's queued rows.
- Popover glass panel listing today's queued/sent items with company, time, status; cancel button on queued.

Edge function `supabase/functions/send-reminders/index.ts`:
- Scheduled/manual trigger, no JWT.
- Fetches queued rows where `scheduled_date <= today`.
- Marks each row `sent` with `sent_at = now()`, logs to console.
- Clearly marked `// TODO: Provider integration — Twilio SMS or Resend email goes here` block that receives `{ recipient, message }` and returns success/error. Structured so future drop-in only edits that function.

Services:
- `src/services/notificationService.ts` — create, cancel, listToday, subscribe realtime.
- `src/components/NotificationBell.tsx` — header bell + popover.
- `src/components/LataVitaButton.tsx` — button + dialog on lead card.

## Technical section

Files created:
- `src/components/molten/AuroraBackground.tsx`
- `src/components/molten/GlassCard.tsx`
- `src/components/molten/RingProgress.tsx`
- `src/components/molten/CountUp.tsx`
- `src/components/molten/StatusPill.tsx`
- `src/components/molten/Sparkline.tsx`
- `src/components/MobileNav.tsx`
- `src/components/NotificationBell.tsx`
- `src/components/LataVitaButton.tsx`
- `src/pages/Dagurinn.tsx`
- `src/services/scheduleService.ts`
- `src/services/notificationService.ts`
- `supabase/functions/send-reminders/index.ts`
- Migration: `daily_schedules`, `daily_settings`, `notifications_outbox` + GRANTs + RLS + triggers.

Files edited:
- `src/App.tsx` — route `/` → `Dagurinn`, add `/kanban` for old Index, mount `AuroraBackground`.
- `src/index.css` + `tailwind.config.ts` — new tokens, glass utilities, ember gradient, aurora keyframes.
- `src/components/NavLink.tsx` + nav headers on all pages — bell icon, mobile bottom bar.
- Kanban, Leads, Finances, Tasks page shells + card wrappers — apply glass classes (className swaps only, no logic).
- Lead cards in `to_call` stage — add `LataVitaButton` and status pill.

No changes to `src/integrations/supabase/client.ts` or `types.ts` (types.ts regenerates after migration).

Constraints honored: no auth added; RLS policies stay permissive to match existing tables; all Icelandic UI text preserved verbatim.
