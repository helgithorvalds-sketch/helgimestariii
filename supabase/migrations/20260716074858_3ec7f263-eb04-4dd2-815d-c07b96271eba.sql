
-- Call outcome + weekly goal + tilboð timestamp support
ALTER TABLE public.call_logs
  ADD COLUMN IF NOT EXISTS outcome text;

CREATE INDEX IF NOT EXISTS call_logs_outcome_hour_idx ON public.call_logs (outcome, called_at);
CREATE INDEX IF NOT EXISTS call_logs_company_called_idx ON public.call_logs (company_id, called_at DESC);

ALTER TABLE public.daily_settings
  ADD COLUMN IF NOT EXISTS weekly_goal_calls integer NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS weekly_goal_offers integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS weekly_goal_paid integer NOT NULL DEFAULT 300000;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS email_sent_at timestamptz;

-- Backfill: any company currently in email_sent stage gets updated_at as fallback timestamp
UPDATE public.companies
   SET email_sent_at = updated_at
 WHERE stage = 'email_sent' AND email_sent_at IS NULL;
