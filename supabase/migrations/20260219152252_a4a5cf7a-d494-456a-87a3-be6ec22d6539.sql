
ALTER TABLE public.companies ADD COLUMN monthly_payment_amount integer;
ALTER TABLE public.companies ADD COLUMN monthly_payment_start_date date;
ALTER TABLE public.companies ADD COLUMN monthly_payment_active boolean NOT NULL DEFAULT false;
