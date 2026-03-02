CREATE TABLE public.tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  description text NOT NULL DEFAULT '',
  deadline timestamp with time zone,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all read" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON public.tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON public.tasks FOR UPDATE USING (true);
CREATE POLICY "Allow all delete" ON public.tasks FOR DELETE USING (true);