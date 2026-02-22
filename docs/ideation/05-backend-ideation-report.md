# Backend Ideation & Improvements Report

**Date**: 2026-02-08
**Project**: Backtrack (love-ledger) -- Location-based social/dating app
**Stack**: React Native (Expo) + Supabase (PostgreSQL, Edge Functions, Realtime, Storage)
**Contributors**: Security Reviewer, System Architect, Performance Analyst, Code Quality Auditor

---

## Executive Summary

Four specialized agents conducted an independent deep audit of the Backtrack backend, producing 74 total findings across security (33), architecture (18), and performance (23). This master report consolidates all findings into **prioritized, actionable tasks** with current/expected state and acceptance criteria.

**Critical path**: Enable `pg_cron` (unblocks 10+ tasks) -> Fix Edge Function auth (4 critical security issues) -> Fix GDPR gaps (3 high privacy issues) -> Performance quick wins (geospatial, indexes).

---

## Table of Contents

1. [P0 -- Critical: Fix Before Launch](#p0-critical)
2. [P1 -- High: Fix Within Next Sprint](#p1-high)
3. [P2 -- Medium: Plan for Next Release](#p2-medium)
4. [P3 -- Nice-to-Have](#p3-nice-to-have)
5. [Detailed Reports](#detailed-reports)
6. [Implementation Roadmap](#implementation-roadmap)

---

<a id="p0-critical"></a>
## P0 -- Critical: Fix Before Launch

### TASK-01: Add Authentication to All Edge Functions

| Field | Detail |
|-------|--------|
| **Area** | Edge Functions (send-notification, send-match-notification, send-spark-notification, moderate-image) |
| **Current State** | All 4 Edge Functions accept requests without verifying caller identity. No JWT validation, no webhook signature checking. Any client with the function URL can invoke them. CORS is wildcard `*` on 2 of 3 notification functions. |
| **Expected** | Every Edge Function validates incoming requests via JWT verification or webhook shared secret. CORS restricted to app domains only. |
| **Effort** | M (2-3 days) |
| **Acceptance Criteria** | <ul><li>Unauthenticated requests return HTTP 401</li><li>Webhook-triggered functions verify shared secret in header</li><li>CORS restricted to `backtrack.social` domains (no wildcard `*`)</li><li>moderate-image extracts user ID from JWT for rate limiting</li><li>storage_path ownership validated against authenticated user</li><li>Unit tests for auth rejection on all 4 functions</li></ul> |

### TASK-02: Enable pg_cron for Scheduled Jobs

| Field | Detail |
|-------|--------|
| **Area** | Database infrastructure |
| **Current State** | 5 cleanup/maintenance functions exist but have no automation. Expired posts stay visible, location_visits grows unbounded, regulars mode data goes stale, scheduled account deletions never execute. |
| **Expected** | pg_cron enabled with jobs for: expired post cleanup, location visit pruning, regulars recalculation, scheduled deletion execution, location data retention. |
| **Effort** | S (1 day) |
| **Acceptance Criteria** | <ul><li>pg_cron extension enabled in Supabase dashboard</li><li>5+ cron jobs created with appropriate schedules</li><li>Scheduled deletions processed daily (GDPR compliance)</li><li>Expired posts cleaned up hourly</li><li>Location data pruned beyond 90-day retention</li></ul> |

### TASK-03: Fix GDPR Data Deletion Gaps

| Field | Detail |
|-------|--------|
| **Area** | Account deletion, data export (`lib/accountDeletion.ts`, `lib/dataExport.ts`) |
| **Current State** | (1) `auth.users` record never deleted -- email, hashed password persist indefinitely. (2) Scheduled deletions table exists but no processor runs. (3) Data export missing 8 tables. (4) Data export uses wrong column names (`user1_id`/`user2_id` instead of `producer_id`/`consumer_id`). |
| **Expected** | Complete GDPR compliance: full data erasure including auth record, scheduled deletion processing, complete data export. |
| **Effort** | M (2-3 days) |
| **Acceptance Criteria** | <ul><li>New Edge Function calls `auth.admin.deleteUser()` after data deletion</li><li>auth.users record removed within 24h of account deletion</li><li>pg_cron job processes scheduled deletions daily</li><li>Data export includes all 17 user-data tables</li><li>Conversations query uses `producer_id`/`consumer_id`</li><li>Integration tests verify complete data erasure</li></ul> |

### TASK-04: Fix Geospatial Query Performance

| Field | Detail |
|-------|--------|
| **Area** | Database RPCs (`supabase/migrations/016_geospatial_functions.sql`) |
| **Current State** | `get_nearby_locations` and `get_locations_with_active_posts` reconstruct `ST_MakePoint(...)::geography` per-row despite a stored `geog` column with GIST index existing. Background location service calls non-optimized RPC every 2 minutes per user. |
| **Expected** | All geospatial functions use stored `l.geog` column. Background service calls optimized RPC. |
| **Effort** | S (half day) |
| **Acceptance Criteria** | <ul><li>Both functions use `l.geog` instead of inline geography construction</li><li>`backgroundLocation.ts` calls `get_locations_near_point_optimized`</li><li>EXPLAIN ANALYZE shows `idx_locations_geog_stored` being used</li><li>~2x speedup on spatial queries verified</li></ul> |

### TASK-05: Add Message Text Moderation

| Field | Detail |
|-------|--------|
| **Area** | Edge Functions, database triggers |
| **Current State** | Only images are moderated (via Google Vision). Chat messages have zero content filtering for hate speech, harassment, phishing URLs, or explicit text. |
| **Expected** | Keyword/pattern filter on message INSERT, with path to AI-assisted classification. |
| **Effort** | M (2-3 days) |
| **Acceptance Criteria** | <ul><li>New Edge Function or DB trigger filters messages on INSERT</li><li>Known harmful patterns flagged/blocked</li><li>Flagged messages quarantined for review</li><li>False positive rate < 1% for common English</li></ul> |

---

<a id="p1-high"></a>
## P1 -- High Priority: Fix Within Next Sprint

### TASK-06: Eliminate Background Location Unnecessary Network Calls

| Field | Detail |
|-------|--------|
| **Area** | `services/backgroundLocation.ts:335-449` |
| **Current State** | Every 2-minute location update triggers a Supabase RPC regardless of movement. At 1,000 users = 240,000 unnecessary queries/day. Two sequential AsyncStorage reads per update. |
| **Expected** | 20m movement threshold before network calls. Cache last-known location. Batch AsyncStorage reads. |
| **Effort** | S (1 day) |
| **Acceptance Criteria** | <ul><li>No RPC called if user moved < 20m since last check</li><li>~80% reduction in background network calls</li><li>Single AsyncStorage read per update (combine dwell + settings)</li><li>Battery impact measurably reduced</li></ul> |

### TASK-07: Use Optimized Conversation RPC

| Field | Detail |
|-------|--------|
| **Area** | `lib/conversations.ts` |
| **Current State** | `getUserConversations()` does `SELECT *` from conversations without message previews or unread counts, forcing N+1 queries at component level. An optimized RPC with LATERAL JOINs exists but isn't used. |
| **Expected** | Use the optimized `get_user_conversations` RPC that returns previews and counts in one query. |
| **Effort** | S (half day) |
| **Acceptance Criteria** | <ul><li>Single RPC call returns conversations with last message preview and unread count</li><li>No N+1 queries at component level</li><li>Chat list load time reduced by >50%</li></ul> |

### TASK-08: Add Edge Function Shared Middleware

| Field | Detail |
|-------|--------|
| **Area** | `supabase/functions/_shared/` |
| **Current State** | Each of 4 Edge Functions reimplements auth, CORS, rate limiting, error handling, and logging independently and inconsistently. |
| **Expected** | Shared middleware module in `_shared/` for auth verification, CORS, rate limiting, error formatting, structured logging. |
| **Effort** | M (2-3 days) |
| **Acceptance Criteria** | <ul><li>Shared `middleware.ts` handles auth, CORS, rate limiting</li><li>All 4 functions use shared middleware</li><li>Consistent error responses (no detail leakage)</li><li>Structured logging with request IDs</li></ul> |

### TASK-09: Add Database Rate Limit Index

| Field | Detail |
|-------|--------|
| **Area** | `supabase/migrations/` |
| **Current State** | Message rate limit RLS policy counts `sender_id` + `created_at` on every INSERT with no composite index. Sequential scan on growing messages table. |
| **Expected** | Composite index on `messages(sender_id, created_at DESC)`. |
| **Effort** | S (1 hour) |
| **Acceptance Criteria** | <ul><li>Index exists: `CREATE INDEX idx_messages_sender_recent ON messages(sender_id, created_at DESC)`</li><li>EXPLAIN ANALYZE shows index scan for rate limit subqueries</li></ul> |

### TASK-10: Implement Real-Time Presence & Typing Indicators

| Field | Detail |
|-------|--------|
| **Area** | Supabase Realtime, client hooks |
| **Current State** | No presence or typing indicator system. Users can't see if the other person is online or typing. |
| **Expected** | Supabase Realtime Presence for online status and typing indicators in chat. |
| **Effort** | S (1 day, client-side only using existing Supabase Realtime) |
| **Acceptance Criteria** | <ul><li>Chat screen shows typing indicator when other user is typing</li><li>Online/offline presence in conversation list</li><li>Presence state automatically syncs on app foreground/background</li></ul> |

### TASK-11: Add Read Receipts

| Field | Detail |
|-------|--------|
| **Area** | Database, Supabase Realtime |
| **Current State** | `mark_conversation_as_read()` RPC exists but no read receipt broadcast to other participant. No visual feedback on message read status. |
| **Expected** | Broadcast read events via Realtime channel. Optional `read_at` column on messages. |
| **Effort** | S (1 day) |
| **Acceptance Criteria** | <ul><li>Message sender sees read status (checkmarks or similar)</li><li>Read events broadcast via Supabase Realtime</li><li>Read state persists across app restarts</li></ul> |

### TASK-12: Automated Report Escalation

| Field | Detail |
|-------|--------|
| **Area** | Database triggers |
| **Current State** | `get_report_count()` exists but nothing acts on it. Reported content remains visible regardless of report count. |
| **Expected** | Trigger on `reports` INSERT that auto-hides content after 3 independent reports and escalates for moderator review. |
| **Effort** | M (1-2 days) |
| **Acceptance Criteria** | <ul><li>Content auto-hidden after 3 reports from different users</li><li>Moderator queue populated for review</li><li>Reporter notified of action taken</li></ul> |

### TASK-13: Fix SECURITY DEFINER search_path

| Field | Detail |
|-------|--------|
| **Area** | `supabase/migrations/018_rls_policies.sql`, `015_rls_policies.sql` |
| **Current State** | Several older SECURITY DEFINER functions lack `SET search_path = public`. Newer functions (from 20260205 migration) have it. |
| **Expected** | All SECURITY DEFINER functions include `SET search_path = public`. |
| **Effort** | S (1 hour) |
| **Acceptance Criteria** | <ul><li>Migration adds `SET search_path = public` to all affected functions</li><li>Query confirms no SECURITY DEFINER function lacks it</li></ul> |

---

<a id="p2-medium"></a>
## P2 -- Medium Priority: Plan for Next Release

### TASK-14: Add Query Caching Layer

| Field | Detail |
|-------|--------|
| **Area** | Database, Edge Functions |
| **Current State** | Every request hits PostgreSQL directly. No materialized views for hot queries. No CDN for images. |
| **Expected** | Materialized views for location stats and discovery. Edge function in-memory caching. Supabase Storage CDN. |
| **Effort** | L (1 week) |
| **Acceptance Criteria** | <ul><li>Materialized views for location stats refresh via pg_cron</li><li>CDN enabled for selfies bucket</li><li>Discovery queries use materialized views</li></ul> |

### TASK-15: Notification Queue & Scheduling

| Field | Detail |
|-------|--------|
| **Area** | Database, Edge Functions |
| **Current State** | Notifications sent synchronously. No deduplication, quiet hours, or digest batching. |
| **Expected** | `notification_queue` table with deduplication keys, scheduling (quiet hours), digest batching, queue processor Edge Function. |
| **Effort** | L (1 week) |
| **Acceptance Criteria** | <ul><li>Notifications queued and processed asynchronously</li><li>Duplicate notifications deduplicated</li><li>Quiet hours respected per user preference</li></ul> |

### TASK-16: Discovery Algorithm Enhancement

| Field | Detail |
|-------|--------|
| **Area** | Database RPCs |
| **Current State** | Flat 3-tier sort (verified > regular > new). No distance weighting, recency decay, or engagement signals. |
| **Expected** | Weighted scoring: exponential recency decay + distance weighting + response count signals. Configurable weights. |
| **Effort** | M (2-3 days) |
| **Acceptance Criteria** | <ul><li>New `get_scored_posts` RPC with weighted formula</li><li>A/B testable via weight configuration</li><li>Posts ranked by relevance, not just tier</li></ul> |

### TASK-17: Encrypt Location Data in AsyncStorage

| Field | Detail |
|-------|--------|
| **Area** | `services/backgroundLocation.ts` |
| **Current State** | GPS coordinates, location IDs, user ID stored in plain AsyncStorage. Auth tokens use SecureStore. |
| **Expected** | Location data encrypted before AsyncStorage or moved to SecureStore. |
| **Effort** | S (half day) |
| **Acceptance Criteria** | <ul><li>Dwell state data encrypted at rest</li><li>Tracking settings (containing userId) similarly protected</li></ul> |

### TASK-18: Fix Validation Library Issues

| Field | Detail |
|-------|--------|
| **Area** | `lib/validation.ts` |
| **Current State** | (1) `URL_PATTERN` uses global flag causing stateful `.test()`. (2) SQL injection pattern matching strips common English words. |
| **Expected** | Remove `g` flag from test-only regexes. Remove SQL keyword stripping (rely on parameterized queries). |
| **Effort** | S (1 hour) |
| **Acceptance Criteria** | <ul><li>`.test()` calls produce consistent results across invocations</li><li>`sanitizeForStorage` doesn't strip SQL keywords</li><li>Existing tests pass</li></ul> |

### TASK-19: Server-Side Analytics Pipeline

| Field | Detail |
|-------|--------|
| **Area** | Database triggers |
| **Current State** | Client-side PostHog only. No server-side event tracking. |
| **Expected** | DB triggers collecting events into partitioned `analytics_events` table with materialized view aggregations. |
| **Effort** | M (2-3 days) |
| **Acceptance Criteria** | <ul><li>Key events (matches, messages, check-ins) tracked server-side</li><li>Aggregation views for dashboard queries</li></ul> |

### TASK-20: Admin/Moderation Dashboard Backend

| Field | Detail |
|-------|--------|
| **Area** | Database, Edge Functions |
| **Current State** | No admin role system. No moderation queue. No audit logging. |
| **Expected** | `admin_roles` table, `admin_actions` audit log, `get_moderation_queue()` RPC, `admin-api` Edge Function. |
| **Effort** | L (1 week) |
| **Acceptance Criteria** | <ul><li>Admin roles assignable to users</li><li>Moderation queue accessible via RPC</li><li>All admin actions audit-logged</li></ul> |

### TASK-21: User Ban System

| Field | Detail |
|-------|--------|
| **Area** | Database, RLS policies |
| **Current State** | Users can be blocked individually but no global ban system. No temporary bans. |
| **Expected** | Temporary/permanent bans with granular restrictions (posting, messaging, login). Auto-expiry via pg_cron. Integration into RLS. |
| **Effort** | M (2-3 days) |
| **Acceptance Criteria** | <ul><li>Ban table with reason, duration, type</li><li>RLS policies check ban status</li><li>Expired bans auto-removed by pg_cron</li></ul> |

### TASK-22: Security Event Monitoring

| Field | Detail |
|-------|--------|
| **Area** | Database, Edge Functions |
| **Current State** | Good Sentry error tracking but no dedicated security event monitoring. `message_rate_limit_violations` table exists but trigger not attached. |
| **Expected** | Security events table/tags for auth failures, moderation rejections, rate limit violations. Alert thresholds. |
| **Effort** | M (2 days) |
| **Acceptance Criteria** | <ul><li>`log_message_rate_limit_violation` trigger attached and active</li><li>Security events tracked with alerting</li></ul> |

### TASK-23: Consistent Coordinate Precision

| Field | Detail |
|-------|--------|
| **Area** | Database RPCs, `services/backgroundLocation.ts` |
| **Current State** | Background service reduces GPS precision to ~1.1km, but `checkin_to_location` RPC stores full-precision `verification_lat`/`verification_lon`. |
| **Expected** | All stored coordinates truncated to 2-3 decimal places for privacy. |
| **Effort** | S (1 hour) |
| **Acceptance Criteria** | <ul><li>`checkin_to_location` truncates verification coordinates before INSERT</li><li>Audit confirms no full-precision user coordinates stored</li></ul> |

---

<a id="p3-nice-to-have"></a>
## P3 -- Nice-to-Have

### TASK-24: Full-Text Search on Posts & Locations

| Field | Detail |
|-------|--------|
| **Current State** | No text search capability. |
| **Expected** | `tsvector` columns with GIN indexes on posts and locations. |
| **Effort** | S |

### TASK-25: Conversation Archival

| Field | Detail |
|-------|--------|
| **Current State** | Conversations persist forever. No auto-decline or archival. |
| **Expected** | Auto-decline pending conversations after 7 days, auto-archive inactive after 90 days. |
| **Effort** | S |

### TASK-26: Table Partitioning for Scale

| Field | Detail |
|-------|--------|
| **Current State** | All tables are unpartitioned. |
| **Expected** | Range partitioning on messages (monthly), notifications (monthly), location_visits (daily). |
| **Effort** | XL |

### TASK-27: Database Health Monitoring RPC

| Field | Detail |
|-------|--------|
| **Current State** | No database health visibility. |
| **Expected** | `get_database_health()` function reporting connections, table sizes, cache hit ratios, dead tuples, unused indexes. |
| **Effort** | S |

### TASK-28: Circuit Breaker for External APIs

| Field | Detail |
|-------|--------|
| **Current State** | No circuit breaker for Expo Push API or Google Vision API. |
| **Expected** | Circuit breaker pattern that stops calling failing external APIs after N failures. |
| **Effort** | M |

---

<a id="detailed-reports"></a>
## Detailed Reports

| Report | File | Findings |
|--------|------|----------|
| Architecture Proposals | `docs/ideation/06-backend-architecture-proposals.md` | 18 proposals across 4 priority levels |
| Security & Quality Review | `docs/ideation/07-backend-security-quality-review.md` | 33 findings (4 critical, 14 high, 12 medium, 2 low) |
| Performance Analysis | `docs/ideation/08-backend-performance-analysis.md` | 23 findings across 5 categories |

---

<a id="implementation-roadmap"></a>
## Implementation Roadmap

### Sprint 1: Foundation & Security (Week 1-2)
- **TASK-02**: Enable pg_cron (unblocks 10+ tasks)
- **TASK-01**: Add Edge Function authentication
- **TASK-09**: Add message rate limit index
- **TASK-13**: Fix SECURITY DEFINER search_path
- **TASK-18**: Fix validation library issues

### Sprint 2: GDPR & Performance (Week 3-4)
- **TASK-03**: Fix GDPR data deletion gaps
- **TASK-04**: Fix geospatial query performance
- **TASK-06**: Eliminate unnecessary background network calls
- **TASK-07**: Use optimized conversation RPC
- **TASK-23**: Consistent coordinate precision

### Sprint 3: Features & Safety (Week 5-6)
- **TASK-05**: Add message text moderation
- **TASK-08**: Edge Function shared middleware
- **TASK-10**: Real-time presence & typing
- **TASK-11**: Read receipts
- **TASK-12**: Automated report escalation

### Sprint 4: Scale & Polish (Week 7-8)
- **TASK-14**: Query caching layer
- **TASK-15**: Notification queue & scheduling
- **TASK-16**: Discovery algorithm enhancement
- **TASK-17**: Encrypt location data
- **TASK-19**: Server-side analytics
- **TASK-20**: Admin dashboard backend
- **TASK-21**: User ban system
- **TASK-22**: Security event monitoring
