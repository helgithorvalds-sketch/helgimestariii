
-- Create companies table
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner TEXT NOT NULL DEFAULT '',
  company_id TEXT NOT NULL DEFAULT '',
  logo_url TEXT,
  stage TEXT NOT NULL DEFAULT 'email_sent' CHECK (stage IN ('email_sent', 'registered', 'preview', 'finished', 'paid')),
  preview_sub_status TEXT CHECK (preview_sub_status IN ('sold_preview', 'fifty_fifty', 'needed_website')),
  estimated_price INTEGER NOT NULL DEFAULT 160000,
  custom_price INTEGER,
  checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT NOT NULL DEFAULT '',
  personality_description TEXT NOT NULL DEFAULT '',
  preview_sent BOOLEAN NOT NULL DEFAULT false,
  projected_earnings INTEGER NOT NULL DEFAULT 160000,
  amount_paid INTEGER,
  paid_date TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Public access policies (no auth required for this app)
CREATE POLICY "Allow all read" ON public.companies FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON public.companies FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON public.companies FOR UPDATE USING (true);
CREATE POLICY "Allow all delete" ON public.companies FOR DELETE USING (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
