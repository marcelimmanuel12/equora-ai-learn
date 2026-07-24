
-- Revoke default PUBLIC EXECUTE on all SECURITY DEFINER functions,
-- then grant only what each function legitimately needs.

-- Helpers used inside RLS policies: authenticated users must be able to execute them
REVOKE ALL ON FUNCTION public.current_school_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_school_id() TO authenticated;

REVOKE ALL ON FUNCTION public.is_enrolled(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_enrolled(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.teaches_class(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.teaches_class(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Admin-only RPCs: callable by signed-in users; internal admin check gates access
REVOKE ALL ON FUNCTION public.admin_set_user_active(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_active(uuid, boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_create_user(uuid, text, text, public.app_role, public.disability_type) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_user(uuid, text, text, public.app_role, public.disability_type) TO authenticated;

-- Bootstrap: needed by anon visitors during initial setup (guarded by school_count check inside)
REVOKE ALL ON FUNCTION public.school_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.school_count() TO anon, authenticated;

REVOKE ALL ON FUNCTION public.bootstrap_school(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bootstrap_school(uuid, text, text, text) TO anon, authenticated;

-- Trigger helper: not user-callable
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
