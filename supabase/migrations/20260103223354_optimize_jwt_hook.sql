-- Migration: Optimize JWT Hook - also clear app_metadata
--
-- Further reduces JWT size by clearing app_metadata which only contains
-- provider info that's not needed by the app.

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  user_metadata jsonb;
  clean_user_metadata jsonb;
BEGIN
  -- Get current claims
  claims := event->'claims';
  user_metadata := claims->'user_metadata';

  -- Build clean user_metadata with only app-specific fields
  IF user_metadata ? 'display_name' THEN
    clean_user_metadata := jsonb_build_object('display_name', user_metadata->>'display_name');
  ELSE
    clean_user_metadata := '{}'::jsonb;
  END IF;

  -- Clear user_metadata (redundant with top-level claims)
  claims := jsonb_set(claims, '{user_metadata}', clean_user_metadata);

  -- Clear app_metadata (provider info not needed by app)
  claims := jsonb_set(claims, '{app_metadata}', '{}'::jsonb);

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;
