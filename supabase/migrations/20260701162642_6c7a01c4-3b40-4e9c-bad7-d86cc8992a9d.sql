
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_school_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_enrolled(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.teaches_class(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_school_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_enrolled(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.teaches_class(uuid) TO authenticated;
