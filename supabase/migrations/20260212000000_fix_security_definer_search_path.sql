-- Fix search_path for SECURITY DEFINER functions (if they exist)
-- Uses dynamic SQL to avoid parse-time errors for missing functions

DO $$
DECLARE
  funcs TEXT[] := ARRAY[
    'is_conversation_participant(UUID, UUID)',
    'get_posts_for_location(UUID)',
    'get_user_conversations(UUID)',
    'can_access_conversation(UUID, UUID)',
    'record_location_visit(UUID, UUID)',
    'verify_location_visit(UUID, UUID)',
    'can_post_at_location(UUID, UUID)'
  ];
  func TEXT;
BEGIN
  FOREACH func IN ARRAY funcs LOOP
    BEGIN
      EXECUTE format('ALTER FUNCTION public.%s SET search_path = public', func);
    EXCEPTION WHEN undefined_function THEN
      -- Function doesn't exist, skip it
      NULL;
    END;
  END LOOP;
END;
$$;
