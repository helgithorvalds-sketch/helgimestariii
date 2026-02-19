
CREATE TABLE public.call_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  called_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all read" ON public.call_logs FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON public.call_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON public.call_logs FOR UPDATE USING (true);
CREATE POLICY "Allow all delete" ON public.call_logs FOR DELETE USING (true);

CREATE INDEX idx_call_logs_company_id ON public.call_logs(company_id);
