
-- Restrict access to authenticated users only (was public/anyone)
DROP POLICY IF EXISTS "Allow all read" ON public.companies;
DROP POLICY IF EXISTS "Allow all insert" ON public.companies;
DROP POLICY IF EXISTS "Allow all update" ON public.companies;
DROP POLICY IF EXISTS "Allow all delete" ON public.companies;

DROP POLICY IF EXISTS "Allow all read" ON public.call_logs;
DROP POLICY IF EXISTS "Allow all insert" ON public.call_logs;
DROP POLICY IF EXISTS "Allow all update" ON public.call_logs;
DROP POLICY IF EXISTS "Allow all delete" ON public.call_logs;

DROP POLICY IF EXISTS "Allow all read" ON public.tasks;
DROP POLICY IF EXISTS "Allow all insert" ON public.tasks;
DROP POLICY IF EXISTS "Allow all update" ON public.tasks;
DROP POLICY IF EXISTS "Allow all delete" ON public.tasks;

REVOKE ALL ON public.companies FROM anon;
REVOKE ALL ON public.call_logs FROM anon;
REVOKE ALL ON public.tasks FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.call_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;

CREATE POLICY "Authenticated users can read companies" ON public.companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert companies" ON public.companies FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update companies" ON public.companies FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete companies" ON public.companies FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read call_logs" ON public.call_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert call_logs" ON public.call_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update call_logs" ON public.call_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete call_logs" ON public.call_logs FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read tasks" ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update tasks" ON public.tasks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete tasks" ON public.tasks FOR DELETE TO authenticated USING (true);
