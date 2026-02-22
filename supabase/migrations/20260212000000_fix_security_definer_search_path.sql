-- Fix search_path for SECURITY DEFINER functions
-- Security definer functions without explicit search_path can be exploited
-- via search_path manipulation attacks

-- Fix is_conversation_participant(UUID, UUID)
ALTER FUNCTION public.is_conversation_participant(UUID, UUID)
  SET search_path = public;

-- Fix get_posts_for_location(UUID)
ALTER FUNCTION public.get_posts_for_location(UUID)
  SET search_path = public;

-- Fix get_user_conversations(UUID)
ALTER FUNCTION public.get_user_conversations(UUID)
  SET search_path = public;

-- Fix can_access_conversation(UUID, UUID)
ALTER FUNCTION public.can_access_conversation(UUID, UUID)
  SET search_path = public;

-- Fix record_location_visit(UUID, UUID)
ALTER FUNCTION public.record_location_visit(UUID, UUID)
  SET search_path = public;

-- Fix verify_location_visit(UUID, UUID)
ALTER FUNCTION public.verify_location_visit(UUID, UUID)
  SET search_path = public;

-- Fix can_post_at_location(UUID, UUID)
ALTER FUNCTION public.can_post_at_location(UUID, UUID)
  SET search_path = public;

-- Verification query (run manually to verify):
-- SELECT
--   p.proname as function_name,
--   pg_catalog.pg_get_function_arguments(p.oid) as arguments,
--   CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END as security,
--   p.proconfig as search_path_setting
-- FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public'
--   AND p.proname IN (
--     'is_conversation_participant',
--     'get_posts_for_location',
--     'get_user_conversations',
--     'can_access_conversation',
--     'record_location_visit',
--     'verify_location_visit',
--     'can_post_at_location'
--   )
-- ORDER BY p.proname;
