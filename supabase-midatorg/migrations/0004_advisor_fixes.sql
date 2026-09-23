-- =====================================================================
-- Miðatorg — advisor fixes (Supabase security linter, after 0001–0003)
--   * function_search_path_mutable: pin search_path on the two functions
--     that were created without one.
--   * anon/authenticated_security_definer_function_executable: trigger
--     functions are only ever invoked by their triggers (Postgres checks
--     EXECUTE at CREATE TRIGGER time, not when the trigger fires), so
--     take them off the PostgREST RPC surface entirely; RPCs that require
--     a signed-in user are no longer callable by anon (they only raised
--     AUTH_REQUIRED / NOT_ALLOWED for anon anyway).
--   Helpers referenced inside RLS policies (mt_is_admin, mt_is_banned,
--   mt_is_deal_party, mt_setting_int, mt_setting_bool, mt_can_read_proof)
--   are evaluated as the querying role and must stay executable.
--   NOTE: the 'from anon' revokes below turned out to be ineffective on
--   their own (anon inherits EXECUTE from PUBLIC); 0005 completes them.
--   The same statements were folded into 0001/0002 so a fresh deploy from
--   the files is clean; all of them are idempotent.
-- =====================================================================

-- search_path
alter function public.mt_set_updated_at() set search_path = public;
alter function public.mt_internal() set search_path = public;

-- trigger functions: not an RPC
revoke execute on function public.mt_set_updated_at() from public, anon, authenticated;
revoke execute on function public.mt_handle_new_user() from public, anon, authenticated;
revoke execute on function public.mt_handle_user_updated() from public, anon, authenticated;
revoke execute on function public.mt_listings_before_insert() from public, anon, authenticated;
revoke execute on function public.mt_listings_before_update() from public, anon, authenticated;
revoke execute on function public.mt_requests_before_insert() from public, anon, authenticated;
revoke execute on function public.mt_requests_before_update() from public, anon, authenticated;
revoke execute on function public.mt_profiles_before_update() from public, anon, authenticated;
revoke execute on function public.mt_events_before_insert() from public, anon, authenticated;
revoke execute on function public.mt_listings_after_insert_notify() from public, anon, authenticated;
revoke execute on function public.mt_requests_after_insert_notify() from public, anon, authenticated;
revoke execute on function public.mt_messages_after_insert_notify() from public, anon, authenticated;

-- RPCs that need a signed-in user: not callable anonymously
revoke execute on function public.mt_reserve_listing(uuid, integer) from anon;
revoke execute on function public.mt_deal_transition(uuid, text, text) from anon;
revoke execute on function public.mt_rate_deal(uuid, integer, text) from anon;
revoke execute on function public.mt_admin_set_ban(uuid, boolean, text) from anon;
revoke execute on function public.mt_admin_set_verification(uuid, public.mt_verification_level) from anon;
