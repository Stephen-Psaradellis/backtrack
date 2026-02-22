# Backend Security & Quality Review

**Date**: 2026-02-08
**Scope**: RLS policies, Edge Functions, client services, data privacy, code quality
**Codebase**: Backtrack (love-ledger) -- React Native (Expo) + Supabase

---

## Executive Summary

This review audited the complete Supabase backend: 60+ migrations, 4 Edge Functions, all lib/ modules, and services/. **33 findings** were identified across security, privacy, and quality categories.

**Severity Breakdown:**
- Critical: 4 findings -- immediate action required
- High: 14 findings -- fix before production launch
- Medium: 12 findings -- fix within next release cycle
- Low: 2 findings -- address when convenient
- Positive: 8 areas of strong practice identified

---

## 1. Critical Findings

### 1.1 [CRITICAL] Edge Functions Lack Authentication Verification

| Attribute | Detail |
|---|---|
| **Files** | `supabase/functions/send-notification/index.ts:351`, `supabase/functions/send-match-notification/index.ts:227`, `supabase/functions/send-spark-notification/index.ts:222` |
| **Current State** | All three notification Edge Functions accept POST requests without verifying the `Authorization` header or caller identity. Any client that can reach the function URL can trigger arbitrary push notifications to any `userId`. |
| **Expected** | Every Edge Function should extract and verify the JWT from `Authorization: Bearer <token>` header or validate that the request comes from a trusted webhook origin with a shared secret. |
| **Impact** | An attacker can send spoofed push notifications to any user. Full notification impersonation. |
| **Acceptance Criteria** | (1) Requests without valid auth return HTTP 401. (2) `userId` for notifications is derived from the session or validated against a webhook secret. (3) Unit tests confirm unauthenticated requests are rejected. |

### 1.2 [CRITICAL] No Webhook Signature Verification

| Attribute | Detail |
|---|---|
| **Files** | All Edge Functions triggered by database webhooks |
| **Current State** | The notification functions are designed to be triggered by Supabase database webhooks, but none verify that incoming requests actually originate from Supabase's webhook system. No shared secret, HMAC signature, or IP allowlist. |
| **Expected** | Verify requests using: (a) shared secret in custom header, (b) IP allowlisting, (c) service role key in Authorization header, or (d) webhook signing secret with HMAC. |
| **Impact** | Any external party can invoke these functions directly. |
| **Acceptance Criteria** | (1) All webhook-triggered functions verify a secret or signing key. (2) Requests without valid auth are rejected with 401. |

### 1.3 [CRITICAL] send-notification CORS Allows All Origins (`*`)

| Attribute | Detail |
|---|---|
| **File** | `supabase/functions/send-notification/index.ts:358` |
| **Current State** | The CORS preflight handler returns `Access-Control-Allow-Origin: *`. Combined with no auth (1.1), any webpage can trigger push notifications to any user. |
| **Expected** | CORS should restrict origin to app domains (as `moderate-image` already does), or be removed entirely for webhook-only functions. |
| **Acceptance Criteria** | (1) `Access-Control-Allow-Origin` restricted to known domains. (2) Wildcard `*` never used in production. |

### 1.4 [CRITICAL] send-match-notification CORS Allows All Origins (`*`)

| Attribute | Detail |
|---|---|
| **File** | `supabase/functions/send-match-notification/index.ts:233` |
| **Current State** | Same wildcard CORS as 1.3. |
| **Expected** | Same remediation as 1.3. |
| **Acceptance Criteria** | Same as 1.3. |

---

## 2. High Findings

### 2.1 [HIGH] moderate-image Rate Limits by photo_id, Not by User

| Attribute | Detail |
|---|---|
| **File** | `supabase/functions/moderate-image/index.ts:343` |
| **Current State** | Rate limiter passes `photo_id` as the identifier. Each unique photo_id gets its own window. |
| **Expected** | Rate limit keyed on authenticated user ID from JWT. |
| **Impact** | Attacker bypasses rate limiting by sending different photo_id values, consuming Vision API quota. |
| **Acceptance Criteria** | (1) Rate limit keyed on verified user ID. (2) Tests confirm different photo_ids from same user share rate limit. |

### 2.2 [HIGH] moderate-image Has No Authentication Check

| Attribute | Detail |
|---|---|
| **File** | `supabase/functions/moderate-image/index.ts:320-340` |
| **Current State** | Creates service-role client but never extracts/validates caller JWT. Anyone discovering the URL can call it. |
| **Expected** | Extract Authorization header, verify JWT, associate with authenticated user. |
| **Acceptance Criteria** | (1) Unauthenticated requests receive 401. (2) Authenticated user ID used for rate limiting. (3) `storage_path` verified to belong to the user. |

### 2.3 [HIGH] storage_path Not Validated Against User Ownership

| Attribute | Detail |
|---|---|
| **File** | `supabase/functions/moderate-image/index.ts:337,369` |
| **Current State** | `storage_path` from request body used directly to download/delete files from selfies bucket. Service-role client bypasses storage RLS. |
| **Expected** | Verify `storage_path` prefix matches authenticated user's ID and `photo_id` belongs to them. |
| **Impact** | Attacker can trigger moderation (and potentially deletion) of another user's photos. |
| **Acceptance Criteria** | (1) photo_id confirmed to belong to calling user. (2) storage_path prefix matches user ID. (3) Cross-user path manipulation rejected. |

### 2.4 [HIGH] Input Validation After Rate Limit Consumption

| Attribute | Detail |
|---|---|
| **File** | `supabase/functions/moderate-image/index.ts:342-366` |
| **Current State** | Rate limit check (line 343) occurs before input validation (line 358). Requests with missing fields consume rate limit tokens before rejection. |
| **Expected** | Validate input before consuming rate limit tokens. |
| **Acceptance Criteria** | (1) Requests with missing fields return 400 without consuming rate limit. (2) Code order: parse -> validate -> rate limit. |

### 2.5 [HIGH] Client-Side Rate Limiting Is Trivially Bypassable

| Attribute | Detail |
|---|---|
| **File** | `lib/rateLimit.ts:65` |
| **Current State** | In-memory `Map` cleared on app restart. `clearRateLimitStore()` is exported. Direct API calls skip it entirely. |
| **Expected** | Client-side rate limiting is UX-only. All critical endpoints must have server-side rate limits. |
| **Acceptance Criteria** | (1) Every client-rate-limited endpoint has server-side enforcement. (2) Documentation states lib/rateLimit.ts is UX-only. |

### 2.6 [HIGH] send-spark-notification Leaks Error Details

| Attribute | Detail |
|---|---|
| **File** | `supabase/functions/send-spark-notification/index.ts:339-341` |
| **Current State** | Returns `error.message` directly in response. Can leak DB errors, query structures, stack traces. |
| **Expected** | Log full error server-side; return generic error to client. |
| **Acceptance Criteria** | (1) 500 responses contain only "Internal server error". (2) Detailed errors logged server-side only. |

### 2.7 [HIGH] send-match-notification Leaks Error Details

| Attribute | Detail |
|---|---|
| **File** | `supabase/functions/send-match-notification/index.ts:350` |
| **Current State** | Returns `String(error)` in response body. |
| **Expected** | Same remediation as 2.6. |

### 2.8 [HIGH] auth.users Record Not Deleted on Account Deletion

| Attribute | Detail |
|---|---|
| **Files** | `supabase/migrations/20260207000000_add_checkins_to_account_deletion.sql:121-123`, `lib/accountDeletion.ts:187,317-322` |
| **Current State** | `delete_user_account` RPC deletes public schema data. Client calls `supabase.auth.signOut()`. No code/cron deletes `auth.users` record. Email, metadata, hashed password persist indefinitely. |
| **Expected** | Edge Function calls `auth.admin.deleteUser(userId)` after data deletion, or cron job processes pending deletions. |
| **Impact** | GDPR right-to-erasure violation. |
| **Acceptance Criteria** | (1) auth.users record removed within 24h of deletion. (2) Edge Function calls auth.admin.deleteUser(). (3) Tests verify auth record is gone post-deletion. |

### 2.9 [HIGH] Scheduled Deletions Are Never Executed

| Attribute | Detail |
|---|---|
| **File** | `supabase/migrations/20251231200000_account_deletion.sql:153-191` |
| **Current State** | `scheduled_account_deletions` table and `schedule_account_deletion` function exist, but no cron/Edge Function processes pending deletions when `scheduled_for < NOW()`. |
| **Expected** | pg_cron job or Edge Function runs daily to execute pending deletions. |
| **Acceptance Criteria** | (1) Scheduled process runs daily. (2) Executed deletions marked with `executed_at = NOW()`. (3) Monitoring for failed executions. |

### 2.10 [HIGH] Data Export Missing Several Tables

| Attribute | Detail |
|---|---|
| **File** | `lib/dataExport.ts:77-97` |
| **Current State** | Exports 9 tables. Account deletion deletes from 17 tables. Missing: `favorite_locations`, `notification_preferences`, `user_event_tokens`, `match_notifications`, `terms_acceptance`, `frequent_locations`, `spark_notifications_sent`, `location_visit_history`. |
| **Expected** | Export all user-data tables per GDPR Article 20. |
| **Acceptance Criteria** | (1) exportUserData queries every table from which delete_user_account deletes. (2) Tests verify all tables represented. |

### 2.11 [HIGH] Data Export Uses Incorrect Column Names

| Attribute | Detail |
|---|---|
| **File** | `lib/dataExport.ts:90` |
| **Current State** | Conversations query uses `user1_id`/`user2_id` but schema uses `producer_id`/`consumer_id`. Query silently returns no results. |
| **Expected** | Use `.or(\`producer_id.eq.${userId},consumer_id.eq.${userId}\`)`. |
| **Acceptance Criteria** | (1) Correct column names. (2) Integration tests confirm conversations in export. |

### 2.12 [HIGH] No Request Body Size Limit on Edge Functions

| Attribute | Detail |
|---|---|
| **Files** | All 4 Edge Functions |
| **Current State** | No `Content-Length` check before `req.json()`. moderate-image downloads full images amplifying memory usage. |
| **Expected** | Check Content-Length and reject oversized payloads (1MB for notifications, 10KB for moderate-image IDs). |
| **Acceptance Criteria** | (1) Oversized payloads rejected with HTTP 413. (2) Tests confirm enforcement. |

### 2.13 [HIGH] No Rate Limiting on Notification Edge Functions

| Attribute | Detail |
|---|---|
| **Files** | `send-notification`, `send-match-notification`, `send-spark-notification` |
| **Current State** | Zero rate limiting (unlike moderate-image). Combined with no auth, unlimited requests possible. |
| **Expected** | Per-user per-minute limits (e.g., 20/min). |
| **Acceptance Criteria** | (1) Each function enforces rate limits. (2) 429 responses include Retry-After header. |

### 2.14 [HIGH] No Server-Side Auth Rate Limiting

| Attribute | Detail |
|---|---|
| **File** | `lib/rateLimit.ts:216-219` |
| **Current State** | Auth rate limit (5/min) is client-side only. Direct API calls to Supabase Auth bypass it. |
| **Expected** | Verify Supabase built-in auth rate limiting is configured. Add custom limits if needed. |
| **Acceptance Criteria** | (1) Supabase Auth rate limits documented and verified. (2) Brute-force testing confirms server-side limits. |

---

## 3. Medium Findings

### 3.1 [MEDIUM] SECURITY DEFINER Functions Missing search_path

| Attribute | Detail |
|---|---|
| **Files** | `supabase/migrations/018_rls_policies.sql:339-469`, `015_rls_policies.sql:295-304` |
| **Current State** | Several SECURITY DEFINER functions lack `SET search_path = public`. Migration 20260205 correctly adds it to newer functions but older ones remain vulnerable to search path injection. |
| **Acceptance Criteria** | Every SECURITY DEFINER function has `SET search_path = public`. |

### 3.2 [MEDIUM] Stateful Global Regex in Validation

| Attribute | Detail |
|---|---|
| **File** | `lib/validation.ts:121` |
| **Current State** | `URL_PATTERN` uses `/gi` flag. With `.test()`, global flag causes alternating true/false results. |
| **Acceptance Criteria** | Remove `g` flag or reset `lastIndex` before each `.test()` call. |

### 3.3 [MEDIUM] SQL Injection Pattern Matching Overly Aggressive

| Attribute | Detail |
|---|---|
| **File** | `lib/validation.ts:126-128` |
| **Current State** | Regex matches common English words ("select", "table", "update"). Breaks user content. App already uses parameterized queries via Supabase SDK. |
| **Acceptance Criteria** | Remove SQL keyword stripping. Rely on parameterized queries. |

### 3.4 [MEDIUM] Location Data in Unencrypted AsyncStorage

| Attribute | Detail |
|---|---|
| **File** | `services/backgroundLocation.ts:124,144,155,199-206` |
| **Current State** | Dwell state (GPS coords, location IDs, user ID) stored in plain AsyncStorage. Auth tokens use SecureStore. |
| **Acceptance Criteria** | Sensitive location data stored in SecureStore or encrypted before AsyncStorage. |

### 3.5 [MEDIUM] Inconsistent Coordinate Precision Reduction

| Attribute | Detail |
|---|---|
| **File** | `services/backgroundLocation.ts:222-224,258-259` |
| **Current State** | Background service reduces precision (~1.1km), but `checkin_to_location` RPC stores full-precision `verification_lat`/`verification_lon` in the database. |
| **Acceptance Criteria** | All stored coordinates truncated to 2-3 decimal places. |

### 3.6 [MEDIUM] No Automated Location Data Retention/Purge

| Attribute | Detail |
|---|---|
| **File** | `lib/dataExport.ts:149-182` |
| **Current State** | `cleanupOldLocationData` is user-triggered only. No server-side process enforces retention limits. Location data accumulates indefinitely. |
| **Acceptance Criteria** | pg_cron purges location data >90 days. Covers checkins, visit history, frequent locations. |

### 3.7 [MEDIUM] moderate-image Vision API Errors Logged Verbosely

| Attribute | Detail |
|---|---|
| **File** | `supabase/functions/moderate-image/index.ts:273-274,408-414` |
| **Current State** | Full Vision API error text stored in DB moderation result and returned in responses. |
| **Acceptance Criteria** | Only error classification stored in DB. Client receives generic error. |

### 3.8 [MEDIUM] Inconsistent CORS Handling Across Edge Functions

| Attribute | Detail |
|---|---|
| **Files** | All 4 Edge Functions |
| **Current State** | moderate-image has restrictive CORS. send-notification/match-notification have wildcard `*`. send-spark-notification has no CORS handler at all. |
| **Acceptance Criteria** | Consistent CORS policy across all functions. Webhook-only functions reject browser CORS. |

### 3.9 [MEDIUM] Rate Limit Fallback Has TOCTOU Race Condition

| Attribute | Detail |
|---|---|
| **File** | `supabase/functions/moderate-image/index.ts:140-193` |
| **Current State** | Fallback path does SELECT then UPDATE without `FOR UPDATE` lock. Concurrent requests can pass the check simultaneously. |
| **Acceptance Criteria** | Fallback uses atomic upsert or is removed in favor of guaranteed RPC. |

### 3.10 [MEDIUM] Message Rate Limit RLS Missing Index

| Attribute | Detail |
|---|---|
| **File** | `supabase/migrations/20260207000001_chat_message_rate_limiting.sql:31-51` |
| **Current State** | Rate limit policy counts messages by `sender_id` + `created_at` on every INSERT. No composite index exists. |
| **Acceptance Criteria** | Index on `messages(sender_id, created_at DESC)` exists. EXPLAIN ANALYZE shows index scan. |

### 3.11 [MEDIUM] No Security Event Monitoring

| Attribute | Detail |
|---|---|
| **Files** | Across codebase |
| **Current State** | Good Sentry error reporting but no dedicated security event tracking. `message_rate_limit_violations` table exists but trigger not attached. |
| **Acceptance Criteria** | Security events table tracks auth failures, moderation rejections, rate limit violations. Alert thresholds defined. |

### 3.12 [MEDIUM] No UUID Validation in Edge Functions

| Attribute | Detail |
|---|---|
| **Files** | All Edge Functions |
| **Current State** | UUID parameters from request bodies not validated. PostgreSQL rejects invalid UUIDs with unhandled DB errors. |
| **Acceptance Criteria** | All ID parameters validated against UUID regex. Invalid UUIDs get 400 response. |

---

## 4. Low Findings

### 4.1 [LOW] AsyncStorage Settings Check Not Truly Atomic

| Attribute | Detail |
|---|---|
| **File** | `services/backgroundLocation.ts:172-194,395-399` |
| **Current State** | Comments say "ATOMIC CHECK" but AsyncStorage has no compare-and-swap. Adequate for serial background task but misleading. |
| **Acceptance Criteria** | Update comments to reflect best-effort mitigation. |

### 4.2 [LOW] No Notification Content Sanitization in Edge Functions

| Attribute | Detail |
|---|---|
| **Files** | `send-match-notification/index.ts:293`, `send-spark-notification/index.ts:277` |
| **Current State** | Location names from DB interpolated into notifications without sanitization. Client-side backgroundLocation.ts correctly uses `sanitizeLocationName`, but Edge Functions don't. |
| **Acceptance Criteria** | Edge Functions sanitize user-originated content in notification payloads. |

---

## 5. Positive Findings

The audit identified several areas of strong security practice:

1. **Comprehensive RLS coverage** -- All public tables have RLS enabled with well-structured policies including block-relationship checking.
2. **Proactive RPC auth fixes** -- Migration `20260205000000_fix_rpc_auth_checks.sql` fixed 5 SECURITY DEFINER functions that lacked `auth.uid()` validation.
3. **Message tamper prevention** -- `prevent_message_tampering` trigger prevents modification of content, sender, and timestamps after creation.
4. **Encrypted auth token storage** -- SecureStore for auth tokens with `detectSessionInUrl: false` for React Native.
5. **Sentry PII redaction** -- `beforeSend` hook with comprehensive sensitive data pattern detection and redaction.
6. **Fail-closed rate limiting** -- moderate-image rejects requests when DB rate limit check fails (line 195-198).
7. **Storage bucket policies** -- User-folder-based ownership, private selfies bucket with MIME/size restrictions.
8. **Input sanitization library** -- `lib/utils/sanitize.ts` handles dangerous Unicode, control characters, HTML escaping.

---

## Summary Table

| # | Finding | Severity | Category |
|---|---|---|---|
| 1.1 | Notification functions lack auth | Critical | Auth Bypass |
| 1.2 | No webhook signature verification | Critical | Auth Bypass |
| 1.3 | send-notification wildcard CORS | Critical | CORS |
| 1.4 | send-match-notification wildcard CORS | Critical | CORS |
| 2.1 | Rate limit by photo_id not user | High | Rate Limit |
| 2.2 | moderate-image no auth | High | Auth Bypass |
| 2.3 | storage_path not ownership-validated | High | Access Control |
| 2.4 | Input validation after rate limit | High | Rate Limit |
| 2.5 | Client-side rate limit bypassable | High | Rate Limit |
| 2.6 | spark-notification error leakage | High | Info Leak |
| 2.7 | match-notification error leakage | High | Info Leak |
| 2.8 | auth.users not deleted (GDPR) | High | Privacy |
| 2.9 | Scheduled deletions never execute | High | Privacy |
| 2.10 | Data export missing 8 tables | High | Privacy |
| 2.11 | Data export wrong column names | High | Bug |
| 2.12 | No request body size limit | High | DoS |
| 2.13 | No notification rate limiting | High | Rate Limit |
| 2.14 | No server-side auth rate limiting | High | Rate Limit |
| 3.1-3.12 | 12 Medium findings | Medium | Various |
| 4.1-4.2 | 2 Low findings | Low | Quality |

**Totals: 4 Critical, 14 High, 12 Medium, 2 Low**
