
-- Restore anon+authenticated access for public app without auth
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.call_logs TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO anon, authenticated;

-- Drop existing restrictive policies and recreate as permissive for all
DROP POLICY IF EXISTS "Authenticated users can read companies" ON public.companies;
DROP POLICY IF EXISTS "Authenticated users can insert companies" ON public.companies;
DROP POLICY IF EXISTS "Authenticated users can update companies" ON public.companies;
DROP POLICY IF EXISTS "Authenticated users can delete companies" ON public.companies;

DROP POLICY IF EXISTS "Authenticated users can read call_logs" ON public.call_logs;
DROP POLICY IF EXISTS "Authenticated users can insert call_logs" ON public.call_logs;
DROP POLICY IF EXISTS "Authenticated users can update call_logs" ON public.call_logs;
DROP POLICY IF EXISTS "Authenticated users can delete call_logs" ON public.call_logs;

DROP POLICY IF EXISTS "Authenticated users can read tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can delete tasks" ON public.tasks;

CREATE POLICY "Public read companies" ON public.companies FOR SELECT USING (true);
CREATE POLICY "Public insert companies" ON public.companies FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update companies" ON public.companies FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete companies" ON public.companies FOR DELETE USING (true);

CREATE POLICY "Public read call_logs" ON public.call_logs FOR SELECT USING (true);
CREATE POLICY "Public insert call_logs" ON public.call_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update call_logs" ON public.call_logs FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete call_logs" ON public.call_logs FOR DELETE USING (true);

CREATE POLICY "Public read tasks" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Public insert tasks" ON public.tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update tasks" ON public.tasks FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete tasks" ON public.tasks FOR DELETE USING (true);
