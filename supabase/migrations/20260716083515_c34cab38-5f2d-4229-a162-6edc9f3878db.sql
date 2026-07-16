
CREATE TABLE public.communications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'email',
  direction TEXT,
  subject TEXT,
  body TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_ref TEXT,
  processed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX communications_company_occurred_idx ON public.communications(company_id, occurred_at DESC);
CREATE UNIQUE INDEX communications_source_ref_unique ON public.communications(source_ref) WHERE source_ref IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.communications TO anon, authenticated;
GRANT ALL ON public.communications TO service_role;
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read communications" ON public.communications FOR SELECT USING (true);
CREATE POLICY "Public insert communications" ON public.communications FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update communications" ON public.communications FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete communications" ON public.communications FOR DELETE USING (true);

CREATE TABLE public.comm_status (
  company_id UUID NOT NULL PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  summary TEXT,
  needs_reply BOOLEAN NOT NULL DEFAULT false,
  needs_reply_reason TEXT,
  last_comm_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.comm_status TO anon, authenticated;
GRANT ALL ON public.comm_status TO service_role;
ALTER TABLE public.comm_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read comm_status" ON public.comm_status FOR SELECT USING (true);
CREATE POLICY "Public insert comm_status" ON public.comm_status FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update comm_status" ON public.comm_status FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete comm_status" ON public.comm_status FOR DELETE USING (true);

CREATE TRIGGER update_comm_status_updated_at BEFORE UPDATE ON public.comm_status
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
