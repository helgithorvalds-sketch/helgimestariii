ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS both_regions boolean NOT NULL DEFAULT false;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS registered_in_svif boolean NOT NULL DEFAULT false;
