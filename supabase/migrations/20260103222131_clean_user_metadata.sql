-- Migration: Clean up redundant user_metadata to reduce JWT/session size
--
-- Problem: The session object stored in SecureStore exceeds 2048 bytes,
-- causing slow auth initialization and timeout warnings.
--
-- Solution: Remove redundant fields from user_metadata that are already
-- present in the JWT claims (email, sub, email_verified, phone_verified).
-- Only keep display_name which is needed by the app.

-- Clean up existing users' metadata
UPDATE auth.users
SET raw_user_meta_data =
  CASE
    WHEN raw_user_meta_data ? 'display_name'
    THEN jsonb_build_object('display_name', raw_user_meta_data->>'display_name')
    ELSE '{}'::jsonb
  END
WHERE raw_user_meta_data IS NOT NULL
  AND (
    raw_user_meta_data ? 'email'
    OR raw_user_meta_data ? 'sub'
    OR raw_user_meta_data ? 'email_verified'
    OR raw_user_meta_data ? 'phone_verified'
  );

-- Note: Cannot add COMMENT to auth.users as we don't own it.
-- Metadata policy: Only store display_name in raw_user_meta_data.
-- Other fields (email, sub, email_verified, phone_verified) are already
-- in JWT claims and should not be duplicated to keep session size under 2KB.
