DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'special_offer'
  ) THEN
    ALTER TABLE public.companies ADD COLUMN special_offer boolean NOT NULL DEFAULT false;
  END IF;
END $$;