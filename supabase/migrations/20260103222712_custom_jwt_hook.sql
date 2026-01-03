-- Migration: Custom JWT Hook to reduce token size
--
-- Problem: The JWT includes redundant data in user_metadata (email, sub,
-- email_verified, phone_verified) that's already present in other claims.
-- This causes the session to exceed SecureStore's 2KB recommendation.
--
-- Solution: Create a custom access token hook that strips redundant fields
-- from user_metadata, keeping only app-specific data like display_name.
--
-- IMPORTANT: After running this migration, you must enable the hook in
-- Supabase Dashboard → Authentication → Hooks → Custom Access Token
-- Set it to: public.custom_access_token_hook

-- Create the custom JWT hook function
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  user_metadata jsonb;
  clean_metadata jsonb;
BEGIN
  -- Get current claims
  claims := event->'claims';
  user_metadata := claims->'user_metadata';

  -- Build clean metadata with only app-specific fields
  -- Keep display_name if it exists, otherwise empty object
  IF user_metadata ? 'display_name' THEN
    clean_metadata := jsonb_build_object('display_name', user_metadata->>'display_name');
  ELSE
    clean_metadata := '{}'::jsonb;
  END IF;

  -- Replace user_metadata with cleaned version
  claims := jsonb_set(claims, '{user_metadata}', clean_metadata);

  -- Return modified event
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Grant execute permission to Supabase auth (required for hooks)
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- Revoke from public for security
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM anon;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.custom_access_token_hook IS
'Custom JWT hook that removes redundant fields from user_metadata to reduce token size.
Only keeps display_name. Must be enabled in Supabase Dashboard → Authentication → Hooks.';
