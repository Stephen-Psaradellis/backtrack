# Matching Features Rollout — Follow-ups

Tracks remaining work for the 6-feature matching/connecting rollout shipped
on 2026-04-28. Features delivered: 2.1 timeline overlay, 2.8 high-confidence
push, 3.3 progressive disclosure cards, 3.7 auto-expire on accept,
4.3 co-presence badge, 5.6 OAuth-verified socials.

## Pre-deploy ops blockers

- [ ] **(2.8) Configure prod match-notification trigger.** Set
  `app_configuration.match_notification_url` to
  `https://<project-ref>.supabase.co/functions/v1/send-match-notification`
  and `app_configuration.service_role_key` to the project service-role JWT.
  Until both are non-empty and the URL is not the `YOUR_PROJECT_REF`
  placeholder, `on_post_created_match` no-ops gracefully.
- [ ] **(5.6) Register OAuth apps with Instagram, X/Twitter, TikTok.**
  Get client_id and client_secret from each. Configure each provider's
  allowed redirect URI to `backtrack://oauth/social-callback`. Set
  `app_configuration.social_oauth_{platform}_client_id`,
  `social_oauth_{platform}_client_secret`, and
  `social_oauth_redirect_uri`.
- [ ] **(5.6) Generate + set OAuth secrets.** Generate two random 32-byte
  strings and set
  `app_configuration.social_oauth_state_secret` and
  `social_token_encryption_key`. Without these, `oauth-social-start`
  returns 503 and `record_verified_social_account` raises.
- [ ] **(5.6) Verify deep link path resolves on iOS + Android.**
  `Linking.createURL('oauth/social-callback')` must produce
  `backtrack://oauth/social-callback` in dev/preview/prod. Expo dev clients
  sometimes route through `exp://` which providers won't accept. May need
  `eas.json` prebuild config tweak.
- [ ] **(5.6) Run `npx expo install expo-web-browser`.** Added to
  `package.json` (~15.0.8) but lockfile + node_modules need refresh.
  `useConnectSocial.ts` imports it for OAuth flow.

## Test / coverage debt

- [ ] **(2.8) Update `supabase/functions/__tests__/send-match-notification.test.ts`.**
  Tests at lines 491-522 build expected push body strings inline; update for
  the new `Someone posted about ${timePhrase} at ${locationName}` format.
  Add coverage for `formatPushTimeWindow` branches: morning/afternoon/evening
  granularity, today/yesterday/weekday/older labels, point-in-time vs range,
  no sighting time fallback.
- [ ] **(3.3) Update `components/__tests__/PostCard.test.tsx`.** Lines 125,
  135, 166, 221, 228 still pass `compact={true}` (now removed). Replace with
  `expandable={true}` assertions and add tests for tap-to-expand,
  `defaultExpanded`, chevron rendering, and conditional `PostReactions`
  mounting.
- [ ] **(5.6) Tests for OAuth + sharing flow.** Edge function tests with
  mocked provider responses (token exchange, profile fetch). RPC tests for
  share/revoke/get_match_socials with non-active conversations + non-
  participant callers (should be denied). Hook tests for `useConnectSocial`
  happy + cancel paths.

## Polish / UX

- [ ] **(3.7) "Resolved" badge in producer's My Posts.** Posts with
  `resolved_at IS NOT NULL` should show a Resolved badge. Data is now
  available; this is UI-only.
- [ ] **(all) Regenerate `types/database.ts`.** Run `supabase gen types`
  after the new migrations land. New columns: `posts.resolved_at`,
  `posts.resolved_response_id`. New RPCs: `get_post_user_overlap`,
  `get_my_overlaps_for_posts`, `get_conversation_copresence`,
  `get_my_verified_socials`, `disconnect_social_account`,
  `share_socials_with_conversation`, `revoke_social_share`,
  `get_match_socials`. New tables: `verified_social_accounts`,
  `conversation_social_shares`.

## Resilience

- [ ] **(5.6) Token refresh background job.** Some providers (Instagram
  Basic Display) issue short-lived tokens with refresh endpoints. Verified
  handles will go stale once tokens expire. Add a scheduled function to
  refresh tokens nearing `token_expires_at`, OR auto-disconnect on expiry
  (lower-effort path).
- [ ] **(5.6) GDPR account deletion audit log.** ON DELETE CASCADE on
  `profiles(id)` already removes `verified_social_accounts` and
  `conversation_social_shares` rows automatically, but the GDPR deletion
  function logs explicit per-table deletion counts. Add the two new tables
  to that list for audit completeness.
