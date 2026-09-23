-- =====================================================================
-- Miðatorg — scheduled tix.is import (after 0001–0005)
--   * pg_net for HTTP calls from Postgres (pg_cron is already installed
--     on Supabase projects; the create below is a no-op there).
--   * a pg_cron job that POSTs to the mt-import-tix edge function every
--     six hours at :17 (17 */6 * * *  →  00:17, 06:17, 12:17, 18:17 UTC).
--
--   The function is deployed with verify_jwt = true, so the Authorization
--   header has to carry a JWT. The project's *legacy anon key* is used
--   here on purpose: the newer sb_publishable_… key (the one the frontend
--   uses, VITE_MIDATORG_SUPABASE_PUBLISHABLE_KEY) is not a JWT and the
--   functions gateway rejects it with 401 when JWT verification is on.
--   The anon key is public (it ships in every frontend bundle); the
--   function itself only lets the anon role and admins trigger a run.
--
--   Re-running this file replaces the job (unschedule + schedule).
-- =====================================================================

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

select cron.unschedule('mt-import-tix')
 where exists (select 1 from cron.job where jobname = 'mt-import-tix');

select cron.schedule(
  'mt-import-tix',
  '17 */6 * * *',
  $$
  select net.http_post(
    url := 'https://qiylxtybmlzvoadvbnca.supabase.co/functions/v1/mt-import-tix',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpeWx4dHlibWx6dm9hZHZibmNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxNTY1MDksImV4cCI6MjEwNTczMjUwOX0.zx5h__z7_-U9_FVle9ch6Xa6J1SkFietH5ZFDr18Q_8',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpeWx4dHlibWx6dm9hZHZibmNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxNTY1MDksImV4cCI6MjEwNTczMjUwOX0.zx5h__z7_-U9_FVle9ch6Xa6J1SkFietH5ZFDr18Q_8'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);
