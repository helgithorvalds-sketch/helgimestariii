-- =====================================================================
-- Miðatorg — advisor fixes, part 2
--   0004 revoked EXECUTE from anon on the sign-in-only RPCs, but anon still
--   inherited it from PUBLIC (Postgres' default grant on functions), so the
--   linter kept flagging them and anon could still reach AUTH_REQUIRED.
--   Revoke from PUBLIC too and grant explicitly to the roles that may call
--   them. Same statements are folded into 0002 for fresh deploys.
-- =====================================================================

revoke execute on function public.mt_reserve_listing(uuid, integer) from public, anon;
grant execute on function public.mt_reserve_listing(uuid, integer) to authenticated, service_role;
revoke execute on function public.mt_deal_transition(uuid, text, text) from public, anon;
grant execute on function public.mt_deal_transition(uuid, text, text) to authenticated, service_role;
revoke execute on function public.mt_rate_deal(uuid, integer, text) from public, anon;
grant execute on function public.mt_rate_deal(uuid, integer, text) to authenticated, service_role;
revoke execute on function public.mt_admin_set_ban(uuid, boolean, text) from public, anon;
grant execute on function public.mt_admin_set_ban(uuid, boolean, text) to authenticated, service_role;
revoke execute on function public.mt_admin_set_verification(uuid, public.mt_verification_level) from public, anon;
grant execute on function public.mt_admin_set_verification(uuid, public.mt_verification_level) to authenticated, service_role;
