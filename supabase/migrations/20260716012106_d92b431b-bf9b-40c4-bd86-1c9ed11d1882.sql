
-- daily_schedules
CREATE TABLE public.daily_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_date date NOT NULL,
  block_time time NOT NULL,
  duration_min integer NOT NULL DEFAULT 15,
  kind text NOT NULL DEFAULT 'call',
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_schedules TO anon, authenticated;
GRANT ALL ON public.daily_schedules TO service_role;
ALTER TABLE public.daily_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read daily_schedules" ON public.daily_schedules FOR SELECT USING (true);
CREATE POLICY "Public insert daily_schedules" ON public.daily_schedules FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update daily_schedules" ON public.daily_schedules FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete daily_schedules" ON public.daily_schedules FOR DELETE USING (true);
CREATE TRIGGER trg_daily_schedules_updated BEFORE UPDATE ON public.daily_schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_daily_schedules_date ON public.daily_schedules(schedule_date);

-- daily_settings singleton
CREATE TABLE public.daily_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_start time NOT NULL DEFAULT '09:00',
  work_end time NOT NULL DEFAULT '17:00',
  max_calls integer NOT NULL DEFAULT 10,
  vacation_mode boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_settings TO anon, authenticated;
GRANT ALL ON public.daily_settings TO service_role;
ALTER TABLE public.daily_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read daily_settings" ON public.daily_settings FOR SELECT USING (true);
CREATE POLICY "Public insert daily_settings" ON public.daily_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update daily_settings" ON public.daily_settings FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete daily_settings" ON public.daily_settings FOR DELETE USING (true);
CREATE TRIGGER trg_daily_settings_updated BEFORE UPDATE ON public.daily_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.daily_settings (work_start, work_end, max_calls, vacation_mode) VALUES ('09:00','17:00',10,false);

-- notifications_outbox
CREATE TABLE public.notifications_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'sms',
  recipient text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  scheduled_date date NOT NULL DEFAULT (now()::date),
  status text NOT NULL DEFAULT 'queued',
  sent_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications_outbox TO anon, authenticated;
GRANT ALL ON public.notifications_outbox TO service_role;
ALTER TABLE public.notifications_outbox ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read notifications_outbox" ON public.notifications_outbox FOR SELECT USING (true);
CREATE POLICY "Public insert notifications_outbox" ON public.notifications_outbox FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update notifications_outbox" ON public.notifications_outbox FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete notifications_outbox" ON public.notifications_outbox FOR DELETE USING (true);
CREATE TRIGGER trg_notifications_outbox_updated BEFORE UPDATE ON public.notifications_outbox FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_notifications_outbox_date_status ON public.notifications_outbox(scheduled_date, status);
