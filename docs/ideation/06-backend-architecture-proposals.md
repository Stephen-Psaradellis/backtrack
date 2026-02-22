# Backend Architecture Proposals

**Date**: 2026-02-08
**Author**: System Architecture Review
**Scope**: Backtrack (Love Ledger) -- Supabase PostgreSQL + Edge Functions + React Native Client

---

## Table of Contents

1. [Current State Summary](#current-state-summary)
2. [P0 -- Critical Scalability and Security](#p0----critical-scalability-and-security)
3. [P1 -- High-Priority Features and Optimizations](#p1----high-priority-features-and-optimizations)
4. [P2 -- Medium-Priority Enhancements](#p2----medium-priority-enhancements)
5. [P3 -- Nice-to-Have Improvements](#p3----nice-to-have-improvements)
6. [Migration Strategy](#migration-strategy)

---

## Current State Summary

### Database (60+ migrations)
- **Core tables**: profiles, locations, posts, conversations, messages, notifications
- **Supporting tables**: blocks, reports, location_visits, user_checkins, location_regulars, regulars_connections, favorite_locations, profile_photos, expo_push_tokens, match_notifications, photo_shares, events, event_attendance, location_streaks, post_responses, rate_limits, message_rate_limit_violations
- **Extensions**: PostGIS (geospatial), uuid-ossp
- **RLS**: Enabled on all tables with participant-scoped policies
- **Indexes**: Comprehensive -- 80+ indexes including partial indexes, composite indexes, and GIST spatial indexes
- **RPC functions**: ~25 server-side functions covering geospatial queries, check-ins, regulars mode, blocking, moderation, conversations, account deletion, rate limiting
- **Stored geography column**: `locations.geog` (computed, indexed) for optimized spatial queries

### Edge Functions (4)
- `moderate-image`: Google Cloud Vision SafeSearch with persistent rate limiting
- `send-notification`: Expo Push API with batch support, retry logic, token cleanup
- `send-match-notification`: Tier 1 match notifications (verified check-in overlap)
- `send-spark-notification`: Spark notifications for frequent location visitors

### Client Services
- `backgroundLocation.ts`: Background GPS tracking with dwell detection, check-in prompts
- `notifications.ts`: Push notification registration and handling
- `locationService.ts`: Foreground location utilities

### Lib Layer
- `conversations.ts`: Atomic upsert conversation creation via RPC
- `accountDeletion.ts`: GDPR-compliant scheduled and immediate deletion with storage cleanup
- `rateLimit.ts`: In-memory sliding window rate limiter (client-side)
- `offlineMessageQueue.ts`: AsyncStorage-based message queue with retry logic
- `dataExport.ts`: GDPR Article 20 data portability (parallel data collection)
- `moderation.ts`: Block/unblock, report submission, hidden user filtering via RPC
- `analytics.ts`: PostHog integration with anonymous IDs, opt-out support
- `sentry.ts`: Error tracking and performance monitoring

### What Works Well
- PostGIS spatial queries with stored geography column and GIST indexes
- Tiered discovery system (verified check-in > favorite spot > unverified)
- Blocking enforcement in RLS policies and RPC functions
- SECURITY DEFINER functions with auth.uid() validation (migration 20260205)
- Atomic conversation upsert eliminating race conditions
- LATERAL JOIN optimization for conversation listing (N+1 fix)
- Persistent server-side rate limiting for edge functions
- Offline message queue with retry and TTL

### Gaps Identified
- No real-time presence or typing indicators
- No read receipts (is_read exists but no push/realtime notification of read events)
- No message text moderation (only image moderation exists)
- No automated content moderation escalation (report thresholds exist but no automation)
- No caching layer (every request hits PostgreSQL directly)
- No scheduled jobs infrastructure (pg_cron commented out, no cleanup automation)
- No analytics pipeline (PostHog client-side only, no server-side event collection)
- No CDN for image delivery (images served directly from Supabase Storage)
- No search/discovery algorithm beyond tiered matching
- Rate limiting is per-endpoint hardcoded, not configurable per user tier
- No admin dashboard or moderation tools backend

---

## P0 -- Critical Scalability and Security

### PROPOSAL 01: Scheduled Job Infrastructure (pg_cron)

**Title**: Enable pg_cron for Automated Maintenance Tasks

**Current State**: Multiple functions exist that need periodic execution but have no automation:
- `deactivate_expired_posts()` -- posts expire after 30 days but no cron deactivates them
- `cleanup_old_location_visits()` -- location visits older than 3 hours should be purged
- `cleanup_rate_limits()` -- stale rate limit entries need periodic cleanup
- `refresh_location_regulars()` -- regulars mode needs daily recalculation
- Old `user_checkins` with `checked_out_at IS NULL` that are days old need auto-checkout

Without these jobs, expired posts remain visible, location_visits grows unbounded, rate_limits accumulates stale rows, and regulars mode data goes stale.

**Proposed Architecture**:
```sql
-- Enable pg_cron extension (Supabase dashboard > Database > Extensions)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 1. Deactivate expired posts (every hour)
SELECT cron.schedule('deactivate-expired-posts', '0 * * * *',
  'SELECT deactivate_expired_posts()');

-- 2. Cleanup old location visits (every 30 min)
SELECT cron.schedule('cleanup-location-visits', '*/30 * * * *',
  'SELECT cleanup_old_location_visits()');

-- 3. Cleanup stale rate limits (every hour)
SELECT cron.schedule('cleanup-rate-limits', '15 * * * *',
  'SELECT cleanup_rate_limits()');

-- 4. Refresh regulars mode (daily at 4 AM UTC)
SELECT cron.schedule('refresh-regulars', '0 4 * * *',
  'SELECT refresh_location_regulars()');

-- 5. Auto-checkout stale checkins (every 2 hours)
SELECT cron.schedule('auto-checkout-stale', '0 */2 * * *',
  $$UPDATE user_checkins SET checked_out_at = NOW()
    WHERE checked_out_at IS NULL
    AND checked_in_at < NOW() - INTERVAL '12 hours'$$);

-- 6. Vacuum analyze on high-churn tables (weekly Sunday 3 AM)
SELECT cron.schedule('vacuum-high-churn', '0 3 * * 0',
  'VACUUM ANALYZE messages, location_visits, notifications');
```

**Priority**: P0 (critical)
**Effort**: S (Small) -- enabling extension + 6 schedule statements
**Dependencies**: Supabase Pro plan (pg_cron requires it)

---

### PROPOSAL 02: Message Text Moderation Pipeline

**Title**: Server-Side Chat Message Content Moderation

**Current State**: Only profile photos are moderated (via Google Cloud Vision). Chat messages have no content moderation. A user can send hate speech, harassment, phishing links, or explicit text through conversations without any automated filtering. The only protection is the user-facing "Report" button, which requires manual review.

**Proposed Architecture**:

*Phase 1 -- Keyword and Pattern Filter (Edge Function)*
```
New Edge Function: moderate-message
  Triggered by: Database webhook on messages INSERT

  Pipeline:
  1. Receive message payload (message_id, content, sender_id, conversation_id)
  2. Run against deny-list (slurs, known harassment patterns)
  3. Run against URL extraction + phishing domain check
  4. Score message: clean / warning / blocked
  5. If blocked: mark message as hidden, create auto-report
  6. If warning: flag for review, allow delivery with asterisk
  7. Update messages table with moderation_status column
```

*Phase 2 -- AI-Assisted Moderation (Future)*
```
  Replace keyword filter with Anthropic/OpenAI classification:
  - Prompt: "Classify this chat message for a dating app..."
  - Categories: clean, flirty_ok, harassment, hate_speech, spam, scam
  - Only escalate to AI for messages that match suspicious patterns
  - Cache classification results for repeated patterns
```

*Schema changes*:
```sql
ALTER TABLE messages ADD COLUMN IF NOT EXISTS moderation_status TEXT
  DEFAULT 'clean' CHECK (moderation_status IN ('clean', 'flagged', 'hidden', 'pending'));
ALTER TABLE messages ADD COLUMN IF NOT EXISTS moderation_result JSONB;

CREATE INDEX idx_messages_moderation ON messages(moderation_status)
  WHERE moderation_status != 'clean';
```

**Priority**: P0 (critical for App Store compliance and user safety)
**Effort**: M (Medium) -- new edge function, schema changes, deny-list maintenance
**Dependencies**: None (can use simple pattern matching in Phase 1)

---

### PROPOSAL 03: Connection Pooling and Query Caching Strategy

**Title**: Implement Connection Pooling Optimization and Query-Level Caching

**Current State**: Every Supabase client request establishes a connection through Supabase's built-in PgBouncer, but there is no application-level caching. Every API call results in a PostgreSQL query. At 100K+ users, frequently-accessed data (location details, profile data, active post counts) will overwhelm the database.

**Proposed Architecture**:

*Layer 1 -- Supabase Edge Function Caching*
```typescript
// Shared utility: supabase/functions/_shared/cache.ts
const CACHE = new Map<string, { data: unknown; expiry: number }>();

export function getCached<T>(key: string): T | null {
  const entry = CACHE.get(key);
  if (!entry || Date.now() > entry.expiry) {
    CACHE.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCache(key: string, data: unknown, ttlSeconds: number): void {
  CACHE.set(key, { data, expiry: Date.now() + ttlSeconds * 1000 });
}

// Usage in edge functions:
const cacheKey = `location:${locationId}`;
let location = getCached(cacheKey);
if (!location) {
  location = await supabase.from('locations').select('*').eq('id', locationId).single();
  setCache(cacheKey, location, 300); // 5 min TTL
}
```

*Layer 2 -- Materialized Views for Hot Queries*
```sql
-- Location stats (refreshed every 15 min by pg_cron)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_location_stats AS
SELECT
  l.id,
  l.name,
  l.latitude,
  l.longitude,
  COUNT(DISTINCT p.id) FILTER (WHERE p.is_active AND p.expires_at > NOW()) AS active_post_count,
  COUNT(DISTINCT lr.user_id) FILTER (WHERE lr.is_regular) AS regular_count,
  MAX(p.created_at) AS latest_post_at
FROM locations l
LEFT JOIN posts p ON p.location_id = l.id
LEFT JOIN location_regulars lr ON lr.location_id = l.id
GROUP BY l.id, l.name, l.latitude, l.longitude;

CREATE UNIQUE INDEX ON mv_location_stats(id);
CREATE INDEX ON mv_location_stats(active_post_count DESC);

-- Refresh every 15 minutes
SELECT cron.schedule('refresh-location-stats', '*/15 * * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_location_stats');
```

*Layer 3 -- CDN for Image Delivery*
```
Current: Client -> Supabase Storage -> PostgreSQL -> S3
Proposed: Client -> Supabase CDN (built-in) -> S3

Enable via Supabase Dashboard:
  Storage > Settings > Enable CDN

Add cache-control headers to storage uploads:
  { cacheControl: '3600', contentType: 'image/jpeg' }

For profile photos (approved, rarely change):
  cache-control: public, max-age=86400 (24h)

For shared photos in chat:
  cache-control: private, max-age=3600 (1h)
```

**Priority**: P0 (critical for scaling beyond 10K users)
**Effort**: L (Large) -- materialized views, cache utility, CDN configuration, testing
**Dependencies**: pg_cron (Proposal 01) for materialized view refresh

---

### PROPOSAL 04: Automated Report Escalation and Content Auto-Hide

**Title**: Automated Moderation Escalation System

**Current State**: `get_report_count()` function exists but nothing acts on it. The migration comment says "Consider implementing auto-hide logic when report_count exceeds threshold" but this was never built. Reports sit in `pending` status indefinitely with no notification to moderators and no automated action.

**Proposed Architecture**:

```sql
-- 1. Auto-hide threshold function
CREATE OR REPLACE FUNCTION check_and_auto_hide_content()
RETURNS TRIGGER AS $$
DECLARE
  v_report_count INTEGER;
  v_threshold INTEGER := 3; -- Auto-hide after 3 independent reports
BEGIN
  -- Count non-dismissed reports for this entity
  SELECT COUNT(DISTINCT reporter_id)
  INTO v_report_count
  FROM reports
  WHERE reported_type = NEW.reported_type
    AND reported_id = NEW.reported_id
    AND status != 'dismissed';

  -- Auto-hide if threshold reached
  IF v_report_count >= v_threshold THEN
    IF NEW.reported_type = 'post' THEN
      UPDATE posts SET is_active = false WHERE id = NEW.reported_id;
    ELSIF NEW.reported_type = 'message' THEN
      UPDATE messages SET moderation_status = 'hidden'
      WHERE id = NEW.reported_id;
    ELSIF NEW.reported_type = 'user' THEN
      -- Flag user profile for review (don't auto-ban)
      UPDATE profiles SET is_flagged = true WHERE id = NEW.reported_id;
    END IF;

    -- Auto-escalate report status
    UPDATE reports
    SET status = 'auto_escalated'
    WHERE reported_type = NEW.reported_type
      AND reported_id = NEW.reported_id
      AND status = 'pending';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger on new reports
CREATE TRIGGER on_report_created_check_threshold
  AFTER INSERT ON reports
  FOR EACH ROW
  EXECUTE FUNCTION check_and_auto_hide_content();

-- 3. Add status for auto-escalation
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_valid_status;
ALTER TABLE reports ADD CONSTRAINT reports_valid_status
  CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed', 'auto_escalated'));

-- 4. Add flagged column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT false;
CREATE INDEX idx_profiles_flagged ON profiles(id) WHERE is_flagged = true;
```

**Priority**: P0 (critical for App Store compliance -- Apple requires active moderation)
**Effort**: M (Medium)
**Dependencies**: Proposal 02 (message moderation_status column)

---

## P1 -- High-Priority Features and Optimizations

### PROPOSAL 05: Real-Time Presence and Typing Indicators

**Title**: Supabase Realtime Presence for Chat

**Current State**: Messages use Supabase Realtime for live delivery (subscribed on the client), but there is no presence system. Users cannot see if the other person is online or typing. For a dating/social app, this is a significant engagement gap -- users abandon conversations when they get no signal of life from the other party.

**Proposed Architecture**:

*Supabase Realtime Presence (no schema changes needed)*:
```typescript
// lib/presence.ts
import { supabase } from './supabase'

export function subscribeToPresence(conversationId: string, userId: string) {
  const channel = supabase.channel(`conversation:${conversationId}`)

  // Track presence
  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      // Returns: { [key]: [{ user_id, online_at, is_typing }] }
      onPresenceUpdate(state)
    })
    .on('presence', { event: 'join' }, ({ key, newPresences }) => {
      onUserJoined(newPresences)
    })
    .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      onUserLeft(leftPresences)
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          user_id: userId,
          online_at: new Date().toISOString(),
          is_typing: false,
        })
      }
    })

  return channel
}

export async function setTyping(channel: RealtimeChannel, userId: string, typing: boolean) {
  await channel.track({
    user_id: userId,
    online_at: new Date().toISOString(),
    is_typing: typing,
  })
}
```

This approach uses Supabase Realtime Presence which is built into the SDK and requires zero backend changes. Presence state is ephemeral (lives in memory on Supabase's Realtime server) and automatically cleans up when users disconnect.

**Priority**: P1 (high -- major engagement driver)
**Effort**: S (Small) -- client-side only, no migrations needed
**Dependencies**: None

---

### PROPOSAL 06: Read Receipts via Realtime Broadcast

**Title**: Message Read Receipts with Realtime Notification

**Current State**: Messages have an `is_read` boolean and a `mark_conversation_as_read()` RPC function. However, the sender receives no notification when their messages are read. The only way to know is to re-query the messages table, which happens on next conversation open.

**Proposed Architecture**:

*Client-side broadcast (no schema changes)*:
```typescript
// When user reads messages in a conversation:
async function markMessagesAsRead(conversationId: string, userId: string) {
  // 1. Update database (existing RPC)
  await supabase.rpc('mark_conversation_as_read', {
    conv_id: conversationId,
    user_id: userId,
  })

  // 2. Broadcast read receipt via Realtime
  const channel = supabase.channel(`conversation:${conversationId}`)
  await channel.send({
    type: 'broadcast',
    event: 'read_receipt',
    payload: {
      user_id: userId,
      read_at: new Date().toISOString(),
    },
  })
}

// Sender subscribes to read receipts:
channel.on('broadcast', { event: 'read_receipt' }, (payload) => {
  // Update local message state to show "read" indicators
  updateMessagesAsRead(payload.user_id, payload.read_at)
})
```

*Optional: Add `read_at` timestamp for precise read timing*:
```sql
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Update mark_conversation_as_read to set timestamp
CREATE OR REPLACE FUNCTION mark_conversation_as_read(conv_id UUID, user_id UUID)
RETURNS INTEGER AS $$
DECLARE rows_updated INTEGER;
BEGIN
  UPDATE messages
  SET is_read = true, read_at = NOW()
  WHERE conversation_id = conv_id
    AND sender_id != user_id
    AND is_read = false;
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated;
END;
$$ LANGUAGE plpgsql;
```

**Priority**: P1 (high -- expected feature in messaging apps)
**Effort**: S (Small) -- mostly client-side with optional schema tweak
**Dependencies**: None

---

### PROPOSAL 07: Database Partitioning for High-Volume Tables

**Title**: Range Partitioning for Messages, Notifications, and Location Visits

**Current State**: The `messages` table is append-only with no partitioning. At scale (100K users, ~50 active conversations each, ~20 messages/day), the table will grow to hundreds of millions of rows within months. `location_visits` has a 3-hour cleanup window but accumulates rapidly during peak hours. `notifications` is also append-only.

**Proposed Architecture**:

```sql
-- MESSAGES: Partition by month on created_at
-- This enables efficient pruning of old data and faster time-range queries

-- Step 1: Create new partitioned table
CREATE TABLE messages_partitioned (
  id UUID DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE NOT NULL,
  read_at TIMESTAMPTZ,
  moderation_status TEXT DEFAULT 'clean',
  moderation_result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Step 2: Create monthly partitions (automated via pg_partman or pg_cron)
CREATE TABLE messages_y2026m01 PARTITION OF messages_partitioned
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE messages_y2026m02 PARTITION OF messages_partitioned
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
-- ... auto-generate via pg_cron monthly

-- Step 3: Indexes on each partition (auto-inherited)
CREATE INDEX ON messages_partitioned(conversation_id, created_at DESC);
CREATE INDEX ON messages_partitioned(sender_id);
CREATE INDEX ON messages_partitioned(conversation_id, is_read) WHERE is_read = FALSE;

-- NOTIFICATIONS: Partition by month (enables fast deletion of old notifications)
-- LOCATION_VISITS: Partition by day (3-hour cleanup window, high-churn)
```

Migration strategy: Use `pg_dump` + logical replication or a zero-downtime migration with a view that unions old and new tables during transition.

**Priority**: P1 (high -- prevents performance cliff at scale)
**Effort**: XL (Extra Large) -- requires careful migration of existing data
**Dependencies**: None, but should coordinate with Proposal 01 (pg_cron) for auto-partition creation

---

### PROPOSAL 08: Push Notification Scheduling and Batching

**Title**: Notification Queue with Deduplication and Scheduling

**Current State**: Edge functions send push notifications synchronously on database webhook triggers. There is no deduplication (a user could receive multiple spark notifications for the same location in quick succession), no scheduling (all notifications fire immediately), and no batching across notification types. The `match_notifications` table tracks sent notifications, but spark and message notifications have no deduplication.

**Proposed Architecture**:

```sql
-- Unified notification queue table
CREATE TABLE notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'match', 'message', 'spark', 'checkin_reminder', 'regulars_discovery'
  )),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  -- Scheduling
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  -- Deduplication
  dedup_key TEXT, -- e.g., 'spark:location_id:user_id:date'
  -- State
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled', 'deduplicated')),
  sent_at TIMESTAMPTZ,
  error TEXT,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deduplication: only one notification per dedup_key per 4-hour window
CREATE UNIQUE INDEX idx_notification_queue_dedup
  ON notification_queue(dedup_key, user_id)
  WHERE status = 'pending' AND dedup_key IS NOT NULL;

-- Processing index
CREATE INDEX idx_notification_queue_pending
  ON notification_queue(scheduled_for ASC)
  WHERE status = 'pending';

-- User's recent notifications
CREATE INDEX idx_notification_queue_user
  ON notification_queue(user_id, created_at DESC);
```

*New Edge Function: process-notification-queue*
```
Triggered by: pg_cron every 30 seconds

Pipeline:
1. SELECT batch of pending notifications WHERE scheduled_for <= NOW()
2. Group by user_id for batching
3. For each user:
   a. Check notification preferences
   b. Fetch push tokens
   c. Combine multiple pending notifications into digest if > 3
   d. Send via Expo Push API
   e. Update status to sent/failed
4. Handle failures with exponential backoff (max 3 attempts)
```

Benefits:
- Deduplication prevents notification spam
- Scheduling enables "quiet hours" (don't send between 11 PM - 7 AM local time)
- Batching reduces API calls to Expo
- Digest mode prevents notification fatigue ("3 new posts at your spots" instead of 3 separate notifications)

**Priority**: P1 (high -- notification quality directly impacts retention)
**Effort**: L (Large) -- new table, new edge function, refactor existing notification functions
**Dependencies**: Proposal 01 (pg_cron for queue processing)

---

### PROPOSAL 09: Discovery Algorithm Enhancement

**Title**: Weighted Scoring Algorithm for Post Discovery

**Current State**: `get_posts_for_user()` uses a simple 3-tier system: verified_checkin > regular_spot > unverified. Within each tier, posts are sorted by recency. This is a good start, but it does not account for:
- How recent the check-in was (a check-in 1 hour ago is more relevant than 3 hours ago)
- How often the user visits the location (daily regular vs occasional visitor)
- Post engagement (posts with more responses may be less relevant -- already matched)
- Avatar similarity (the core matching concept -- not computed server-side)
- Time-of-day relevance (posts from "last night" are more relevant in the morning)

**Proposed Architecture**:

```sql
CREATE OR REPLACE FUNCTION get_scored_posts_for_user(
  p_user_lat DOUBLE PRECISION DEFAULT NULL,
  p_user_lon DOUBLE PRECISION DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  post_id UUID,
  location_id UUID,
  location_name TEXT,
  producer_id UUID,
  message TEXT,
  target_avatar JSONB,
  sighting_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  matching_tier verification_tier,
  relevance_score DOUBLE PRECISION,
  distance_meters DOUBLE PRECISION
) AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  RETURN QUERY
  WITH base_posts AS (
    -- Existing tier logic from get_posts_for_user
    SELECT ... -- (same filtering as current function)
  ),
  scored AS (
    SELECT
      bp.*,
      -- RELEVANCE SCORE: weighted combination of signals
      (
        -- Tier weight (0-50 points)
        CASE bp.matching_tier
          WHEN 'verified_checkin' THEN 50.0
          WHEN 'regular_spot' THEN 30.0
          ELSE 10.0
        END
        +
        -- Recency weight (0-25 points, exponential decay)
        25.0 * EXP(-EXTRACT(EPOCH FROM NOW() - bp.created_at) / 86400.0)
        +
        -- Distance weight (0-15 points, if user location provided)
        CASE WHEN p_user_lat IS NOT NULL AND l.geog IS NOT NULL THEN
          15.0 * (1.0 - LEAST(
            ST_Distance(
              ST_SetSRID(ST_MakePoint(p_user_lon, p_user_lat), 4326)::geography,
              l.geog
            ) / 10000.0, -- Normalize to 10km
            1.0
          ))
        ELSE 0.0 END
        +
        -- Low response count bonus (0-10 points)
        -- Posts with fewer responses are more likely to need matches
        10.0 * (1.0 / (1.0 + COALESCE(response_count, 0)))
      ) AS relevance_score,
      -- Distance for display
      CASE WHEN p_user_lat IS NOT NULL AND l.geog IS NOT NULL THEN
        ST_Distance(
          ST_SetSRID(ST_MakePoint(p_user_lon, p_user_lat), 4326)::geography,
          l.geog
        )
      ELSE NULL END AS distance_meters
    FROM base_posts bp
    JOIN locations l ON l.id = bp.location_id
    LEFT JOIN (
      SELECT post_id, COUNT(*) as response_count
      FROM post_responses GROUP BY post_id
    ) pr ON pr.post_id = bp.post_id
  )
  SELECT * FROM scored
  ORDER BY relevance_score DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

**Priority**: P1 (high -- core product differentiator)
**Effort**: M (Medium) -- new RPC function, client integration
**Dependencies**: None

---

## P2 -- Medium-Priority Enhancements

### PROPOSAL 10: Server-Side Analytics Event Collection

**Title**: Backend Analytics Pipeline via Database Triggers

**Current State**: Analytics is client-side only (PostHog). Server-side events (post creation, conversation starts, match notifications sent) are not tracked. If a user has analytics opt-out enabled or the PostHog SDK fails to initialize, those events are lost. There is no way to measure server-side funnel metrics like "posts created per location per day" or "match rate by tier."

**Proposed Architecture**:

```sql
-- Server-side analytics events table
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
) PARTITION BY RANGE (created_at);

-- Monthly partitions
CREATE TABLE analytics_events_y2026m02 PARTITION OF analytics_events
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- Indexes
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type, created_at DESC);
CREATE INDEX idx_analytics_events_user ON analytics_events(user_id, created_at DESC);

-- RLS: No user access (service_role only)
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Trigger functions for automatic event collection
CREATE OR REPLACE FUNCTION track_post_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO analytics_events (event_type, user_id, properties)
  VALUES ('post_created', NEW.producer_id, jsonb_build_object(
    'location_id', NEW.location_id,
    'has_sighting_date', NEW.sighting_date IS NOT NULL
  ));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_post_created_analytics
  AFTER INSERT ON posts
  FOR EACH ROW EXECUTE FUNCTION track_post_created();

-- Similar triggers for: conversation_created, message_sent,
-- block_created, report_created, checkin_completed
```

*Aggregate views for dashboards*:
```sql
CREATE MATERIALIZED VIEW mv_daily_metrics AS
SELECT
  date_trunc('day', created_at) AS day,
  event_type,
  COUNT(*) AS event_count,
  COUNT(DISTINCT user_id) AS unique_users
FROM analytics_events
WHERE created_at > NOW() - INTERVAL '90 days'
GROUP BY date_trunc('day', created_at), event_type;

-- Refresh nightly
SELECT cron.schedule('refresh-daily-metrics', '0 5 * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_metrics');
```

**Priority**: P2 (medium -- important for product decisions but not user-facing)
**Effort**: M (Medium)
**Dependencies**: Proposal 01 (pg_cron), Proposal 07 (partitioning strategy)

---

### PROPOSAL 11: Edge Function Shared Middleware Layer

**Title**: Unified Edge Function Middleware (Auth, CORS, Rate Limiting, Logging)

**Current State**: Each edge function independently implements:
- CORS handling (moderate-image has a robust implementation, send-notification uses `*`)
- Authentication checks (some check JWT, some trust service_role)
- Rate limiting (only moderate-image has it)
- Error handling (inconsistent patterns)
- Logging (some use console.error, some are silent)

This leads to inconsistent security posture and duplicated code.

**Proposed Architecture**:

```
supabase/functions/_shared/
  middleware.ts       -- Request pipeline
  auth.ts             -- JWT validation and user extraction
  cors.ts             -- Unified CORS with environment awareness
  rateLimit.ts        -- Server-side rate limiting
  logger.ts           -- Structured logging
  errors.ts           -- Standard error responses
  types.ts            -- Shared type definitions
```

```typescript
// _shared/middleware.ts
import { validateAuth } from './auth.ts'
import { handleCors } from './cors.ts'
import { checkRateLimit } from './rateLimit.ts'
import { createLogger } from './logger.ts'

interface MiddlewareConfig {
  requireAuth?: boolean          // Default: true
  requireServiceRole?: boolean   // Default: false
  rateLimit?: { windowMs: number; maxRequests: number }
  allowedMethods?: string[]      // Default: ['POST']
}

export function withMiddleware(
  handler: (req: Request, context: MiddlewareContext) => Promise<Response>,
  config: MiddlewareConfig = {}
) {
  return async (req: Request): Promise<Response> => {
    const logger = createLogger(config.name)

    // 1. CORS
    const corsResponse = handleCors(req)
    if (corsResponse) return corsResponse

    // 2. Method check
    if (config.allowedMethods && !config.allowedMethods.includes(req.method)) {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
    }

    // 3. Auth
    const auth = await validateAuth(req, {
      requireServiceRole: config.requireServiceRole
    })
    if (config.requireAuth !== false && !auth.valid) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // 4. Rate limiting
    if (config.rateLimit) {
      const rateLimitResult = await checkRateLimit(auth.userId, config.rateLimit)
      if (!rateLimitResult.allowed) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { 'Retry-After': '60' }
        })
      }
    }

    // 5. Execute handler
    try {
      return await handler(req, { auth, logger })
    } catch (error) {
      logger.error('Handler error', { error })
      return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
    }
  }
}
```

**Priority**: P2 (medium -- reduces technical debt, improves security consistency)
**Effort**: M (Medium) -- shared code + refactor 4 existing functions
**Dependencies**: None

---

### PROPOSAL 12: Admin and Moderation Dashboard Backend

**Title**: Service-Role Admin API for Content Moderation

**Current State**: There is no admin interface or backend API for moderators. Reports go into the `reports` table with no way to review or act on them except through direct database access. Photos flagged by Google Vision are auto-rejected, but there is no appeal or manual review process.

**Proposed Architecture**:

```sql
-- Admin roles table
CREATE TABLE admin_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('moderator', 'admin', 'super_admin')),
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;
-- Only super_admins can see/modify admin_roles
CREATE POLICY "admin_roles_super_admin" ON admin_roles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_roles ar WHERE ar.user_id = auth.uid() AND ar.role = 'super_admin')
  );

-- Admin action log (audit trail)
CREATE TABLE admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  action_type TEXT NOT NULL, -- 'resolve_report', 'ban_user', 'approve_photo', etc.
  target_type TEXT NOT NULL, -- 'report', 'user', 'post', 'photo'
  target_id UUID NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_actions_admin ON admin_actions(admin_id, created_at DESC);
CREATE INDEX idx_admin_actions_target ON admin_actions(target_type, target_id);

-- RPC: Get moderation queue
CREATE OR REPLACE FUNCTION get_moderation_queue(
  p_type TEXT DEFAULT NULL, -- 'report', 'photo', 'user'
  p_limit INTEGER DEFAULT 50
)
RETURNS JSONB AS $$
BEGIN
  -- Verify caller is a moderator
  IF NOT EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Return pending items based on type
  RETURN (
    SELECT jsonb_build_object(
      'reports', (
        SELECT jsonb_agg(row_to_json(r))
        FROM (
          SELECT r.*, p.display_name as reporter_name
          FROM reports r
          JOIN profiles p ON p.id = r.reporter_id
          WHERE r.status IN ('pending', 'auto_escalated')
          ORDER BY
            CASE r.status WHEN 'auto_escalated' THEN 0 ELSE 1 END,
            r.created_at ASC
          LIMIT p_limit
        ) r
      ),
      'flagged_users', (
        SELECT jsonb_agg(row_to_json(u))
        FROM (
          SELECT p.id, p.display_name, p.is_flagged, p.created_at,
            (SELECT COUNT(*) FROM reports WHERE reported_id = p.id AND reported_type = 'user') as report_count
          FROM profiles p
          WHERE p.is_flagged = true
          LIMIT p_limit
        ) u
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

*New Edge Function: admin-api*
```
Endpoints (all require admin role):
  POST /resolve-report   { reportId, action: 'dismiss' | 'warn' | 'ban' }
  POST /ban-user          { userId, reason, duration }
  POST /review-photo      { photoId, action: 'approve' | 'reject' }
  GET  /dashboard-stats   -- active users, pending reports, flagged users
  GET  /user-detail       { userId } -- full profile + reports + blocks
```

**Priority**: P2 (medium -- necessary before significant user growth)
**Effort**: L (Large) -- schema, RPC functions, new edge function, and eventually a web UI
**Dependencies**: Proposal 04 (auto-escalation creates items for the queue)

---

### PROPOSAL 13: User Ban System

**Title**: Temporary and Permanent User Bans

**Current State**: Blocking is user-to-user (A blocks B). There is no system-level ban mechanism. A user reported by many people and auto-escalated (Proposal 04) has their profile flagged, but they can still use the app. There is no way to temporarily or permanently prevent a user from posting, messaging, or logging in.

**Proposed Architecture**:

```sql
CREATE TABLE user_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ban_type TEXT NOT NULL CHECK (ban_type IN ('temporary', 'permanent', 'shadow')),
  reason TEXT NOT NULL,
  -- Restrictions
  restrict_posting BOOLEAN DEFAULT true,
  restrict_messaging BOOLEAN DEFAULT true,
  restrict_login BOOLEAN DEFAULT false,
  -- Duration (null = permanent)
  banned_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- NULL for permanent bans
  -- Admin
  banned_by UUID REFERENCES auth.users(id),
  -- Tracking
  is_active BOOLEAN DEFAULT true,
  lifted_at TIMESTAMPTZ,
  lifted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_bans_active ON user_bans(user_id) WHERE is_active = true;
CREATE INDEX idx_user_bans_expires ON user_bans(expires_at) WHERE is_active = true AND expires_at IS NOT NULL;

-- Function to check if user is banned (called in RLS policies and RPC functions)
CREATE OR REPLACE FUNCTION is_user_banned(p_user_id UUID, p_action TEXT DEFAULT 'any')
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_bans
    WHERE user_id = p_user_id
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > NOW())
      AND (
        p_action = 'any'
        OR (p_action = 'post' AND restrict_posting)
        OR (p_action = 'message' AND restrict_messaging)
        OR (p_action = 'login' AND restrict_login)
      )
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Add ban check to posts INSERT policy
DROP POLICY IF EXISTS "posts_insert_own" ON posts;
CREATE POLICY "posts_insert_own" ON posts FOR INSERT
  WITH CHECK (
    auth.uid() = producer_id
    AND NOT is_user_banned(auth.uid(), 'post')
  );

-- Add ban check to messages INSERT policy
-- (Update the existing messages_insert_participant policy similarly)

-- Auto-expire bans via pg_cron
SELECT cron.schedule('expire-temp-bans', '*/15 * * * *',
  $$UPDATE user_bans SET is_active = false, lifted_at = NOW()
    WHERE is_active = true AND expires_at IS NOT NULL AND expires_at <= NOW()$$);
```

**Priority**: P2 (medium -- required before moderation dashboard is useful)
**Effort**: M (Medium)
**Dependencies**: Proposal 01 (pg_cron), Proposal 12 (admin API)

---

### PROPOSAL 14: Configurable Rate Limiting by User Tier

**Title**: Tiered Rate Limiting with User Reputation

**Current State**: Rate limits are hardcoded: 20 messages/minute, 200/hour for everyone. 10 image moderations/minute. No differentiation between new accounts (higher risk) and established users (lower risk). No ability to increase limits for power users or decrease them for suspicious accounts.

**Proposed Architecture**:

```sql
-- Rate limit tiers
CREATE TABLE rate_limit_tiers (
  id TEXT PRIMARY KEY, -- 'new_user', 'established', 'trusted', 'restricted'
  display_name TEXT NOT NULL,
  messages_per_minute INTEGER NOT NULL DEFAULT 20,
  messages_per_hour INTEGER NOT NULL DEFAULT 200,
  posts_per_day INTEGER NOT NULL DEFAULT 10,
  photo_uploads_per_hour INTEGER NOT NULL DEFAULT 5,
  api_requests_per_minute INTEGER NOT NULL DEFAULT 60
);

INSERT INTO rate_limit_tiers VALUES
  ('restricted', 'Restricted', 5, 20, 1, 1, 10),
  ('new_user', 'New User', 10, 100, 5, 3, 30),
  ('established', 'Established', 20, 200, 10, 5, 60),
  ('trusted', 'Trusted', 30, 300, 20, 10, 120);

-- Add tier to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rate_limit_tier TEXT
  DEFAULT 'new_user' REFERENCES rate_limit_tiers(id);

-- Auto-promote users based on account age and activity
CREATE OR REPLACE FUNCTION auto_promote_rate_limit_tier()
RETURNS INTEGER AS $$
DECLARE v_promoted INTEGER := 0;
BEGIN
  -- Promote new_user -> established after 7 days + 5 messages sent
  UPDATE profiles p SET rate_limit_tier = 'established'
  WHERE p.rate_limit_tier = 'new_user'
    AND p.created_at < NOW() - INTERVAL '7 days'
    AND (SELECT COUNT(*) FROM messages WHERE sender_id = p.id) >= 5
    AND NOT EXISTS (SELECT 1 FROM user_bans WHERE user_id = p.id AND is_active = true);

  GET DIAGNOSTICS v_promoted = ROW_COUNT;

  -- Promote established -> trusted after 30 days + 0 reports against
  UPDATE profiles p SET rate_limit_tier = 'trusted'
  WHERE p.rate_limit_tier = 'established'
    AND p.created_at < NOW() - INTERVAL '30 days'
    AND NOT EXISTS (
      SELECT 1 FROM reports WHERE reported_id = p.id AND status != 'dismissed'
    );

  GET DIAGNOSTICS v_promoted = v_promoted + ROW_COUNT;
  RETURN v_promoted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run daily
SELECT cron.schedule('auto-promote-tiers', '0 6 * * *',
  'SELECT auto_promote_rate_limit_tier()');
```

*Update RLS policies to use tier-based limits*:
```sql
-- Replace hardcoded message rate limit
CREATE OR REPLACE FUNCTION get_user_message_limit(p_user_id UUID, p_window TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT CASE p_window
      WHEN 'minute' THEN rlt.messages_per_minute
      WHEN 'hour' THEN rlt.messages_per_hour
    END
    FROM profiles p
    JOIN rate_limit_tiers rlt ON rlt.id = p.rate_limit_tier
    WHERE p.id = p_user_id
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

**Priority**: P2 (medium)
**Effort**: M (Medium)
**Dependencies**: Proposal 01 (pg_cron), Proposal 13 (ban system for 'restricted' tier)

---

## P3 -- Nice-to-Have Improvements

### PROPOSAL 15: Full-Text Search for Posts and Locations

**Title**: PostgreSQL Full-Text Search with tsvector

**Current State**: There is no search functionality. Users browse posts by location (map-based) and by tier (discovery feed). There is no way to search for posts by keyword in the message, or to search locations by name with fuzzy matching.

**Proposed Architecture**:

```sql
-- Add tsvector columns
ALTER TABLE posts ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', COALESCE(message, '') || ' ' || COALESCE(note, ''))
  ) STORED;

ALTER TABLE locations ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(address, ''))
  ) STORED;

-- GIN indexes for fast full-text search
CREATE INDEX idx_posts_search ON posts USING GIN(search_vector);
CREATE INDEX idx_locations_search ON locations USING GIN(search_vector);

-- Search function
CREATE OR REPLACE FUNCTION search_posts(
  p_query TEXT,
  p_location_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  post_id UUID, location_name TEXT, message TEXT,
  created_at TIMESTAMPTZ, rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, l.name, p.message, p.created_at,
    ts_rank(p.search_vector, plainto_tsquery('english', p_query)) AS rank
  FROM posts p
  JOIN locations l ON l.id = p.location_id
  WHERE p.search_vector @@ plainto_tsquery('english', p_query)
    AND p.is_active = true
    AND p.expires_at > NOW()
    AND (p_location_id IS NULL OR p.location_id = p_location_id)
    AND NOT EXISTS (
      SELECT 1 FROM blocks b
      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = p.producer_id)
         OR (b.blocker_id = p.producer_id AND b.blocked_id = auth.uid())
    )
  ORDER BY rank DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

**Priority**: P3 (nice-to-have)
**Effort**: S (Small) -- stored generated columns + GIN indexes + RPC function
**Dependencies**: None

---

### PROPOSAL 16: Conversation Expiration and Archival

**Title**: Auto-Archive Stale Conversations

**Current State**: Conversations persist indefinitely once created. A pending conversation (never accepted) and an active conversation with no messages for 6 months are both stored identically. There is no cleanup or archival strategy.

**Proposed Architecture**:

```sql
-- Auto-decline pending conversations after 7 days
-- Auto-archive active conversations with no messages for 90 days

CREATE OR REPLACE FUNCTION archive_stale_conversations()
RETURNS JSONB AS $$
DECLARE
  v_declined INTEGER;
  v_archived INTEGER;
BEGIN
  -- Decline pending conversations older than 7 days
  UPDATE conversations
  SET status = 'expired', is_active = false
  WHERE status = 'pending'
    AND created_at < NOW() - INTERVAL '7 days';
  GET DIAGNOSTICS v_declined = ROW_COUNT;

  -- Archive active conversations with no recent messages
  UPDATE conversations c
  SET is_active = false
  WHERE c.is_active = true
    AND c.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM messages m
      WHERE m.conversation_id = c.id
        AND m.created_at > NOW() - INTERVAL '90 days'
    )
    AND c.updated_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS v_archived = ROW_COUNT;

  RETURN jsonb_build_object(
    'declined_pending', v_declined,
    'archived_stale', v_archived
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add expired status
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_valid_status;
ALTER TABLE conversations ADD CONSTRAINT conversations_valid_status
  CHECK (status IN ('pending', 'active', 'declined', 'blocked', 'expired'));

-- Run weekly
SELECT cron.schedule('archive-stale-conversations', '0 3 * * 1',
  'SELECT archive_stale_conversations()');
```

**Priority**: P3 (nice-to-have)
**Effort**: S (Small)
**Dependencies**: Proposal 01 (pg_cron)

---

### PROPOSAL 17: Webhook Event System for External Integrations

**Title**: Generic Webhook Dispatch System

**Current State**: Database webhooks are configured individually for each edge function. There is no unified event system that external services can subscribe to. If a third-party analytics tool, email service, or moderation service needs to receive events, a new webhook must be manually configured.

**Proposed Architecture**:

```sql
-- Webhook subscriptions
CREATE TABLE webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL, -- 'post.created', 'conversation.started', 'user.reported', etc.
  target_url TEXT NOT NULL,
  secret TEXT NOT NULL, -- For HMAC signature verification
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook delivery log
CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES webhook_subscriptions(id),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status_code INTEGER,
  response_body TEXT,
  attempts INTEGER DEFAULT 0,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generic event dispatch function
CREATE OR REPLACE FUNCTION dispatch_webhook_event(
  p_event_type TEXT,
  p_payload JSONB
)
RETURNS VOID AS $$
BEGIN
  -- Queue webhook deliveries for all active subscriptions
  INSERT INTO webhook_deliveries (subscription_id, event_type, payload)
  SELECT ws.id, p_event_type, p_payload
  FROM webhook_subscriptions ws
  WHERE ws.event_type = p_event_type AND ws.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Priority**: P3 (nice-to-have -- useful for future integrations)
**Effort**: M (Medium)
**Dependencies**: Proposal 01 (pg_cron for delivery processing)

---

### PROPOSAL 18: Database Connection Health Monitoring

**Title**: Proactive Database Health Checks and Alerting

**Current State**: There is no monitoring of database health metrics. Connection pool saturation, slow query accumulation, table bloat, and index usage are invisible until they cause user-facing failures.

**Proposed Architecture**:

```sql
-- Health check function (callable via pg_cron or external monitoring)
CREATE OR REPLACE FUNCTION get_database_health()
RETURNS JSONB AS $$
BEGIN
  RETURN jsonb_build_object(
    'connections', (SELECT jsonb_build_object(
      'active', (SELECT count(*) FROM pg_stat_activity WHERE state = 'active'),
      'idle', (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle'),
      'total', (SELECT count(*) FROM pg_stat_activity)
    )),
    'table_sizes', (SELECT jsonb_object_agg(relname, pg_size_pretty(pg_total_relation_size(relid)))
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(relid) DESC
      LIMIT 10
    ),
    'slow_queries', (SELECT count(*) FROM pg_stat_activity
      WHERE state = 'active' AND query_start < NOW() - INTERVAL '5 seconds'),
    'cache_hit_ratio', (SELECT round(
      sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0) * 100, 2
    ) FROM pg_statio_user_tables),
    'dead_tuples', (SELECT jsonb_object_agg(relname, n_dead_tup)
      FROM pg_stat_user_tables
      WHERE n_dead_tup > 10000
      ORDER BY n_dead_tup DESC
      LIMIT 5
    ),
    'index_usage', (SELECT jsonb_object_agg(indexrelname, idx_scan)
      FROM pg_stat_user_indexes
      WHERE idx_scan = 0 AND schemaname = 'public'
      LIMIT 10
    ),
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log health metrics hourly
SELECT cron.schedule('health-check-hourly', '0 * * * *',
  $$INSERT INTO analytics_events (event_type, properties)
    VALUES ('db_health_check', get_database_health())$$);
```

**Priority**: P3 (nice-to-have -- becomes critical at scale)
**Effort**: S (Small)
**Dependencies**: Proposal 01 (pg_cron), Proposal 10 (analytics_events table)

---

## Migration Strategy

### Phase 1: Foundation (Week 1-2)
| Proposal | Title | Effort | Dependency |
|----------|-------|--------|------------|
| 01 | pg_cron Scheduled Jobs | S | None |
| 04 | Auto-Hide Escalation | M | None |
| 05 | Realtime Presence | S | None |
| 06 | Read Receipts | S | None |

### Phase 2: Safety and Scale (Week 3-4)
| Proposal | Title | Effort | Dependency |
|----------|-------|--------|------------|
| 02 | Message Text Moderation | M | 01 |
| 03 | Query Caching + CDN | L | 01 |
| 11 | Edge Function Middleware | M | None |

### Phase 3: Product Enhancement (Week 5-8)
| Proposal | Title | Effort | Dependency |
|----------|-------|--------|------------|
| 08 | Notification Queue | L | 01 |
| 09 | Discovery Algorithm | M | None |
| 10 | Server-Side Analytics | M | 01 |
| 13 | User Ban System | M | 01 |

### Phase 4: Growth Infrastructure (Week 9-12)
| Proposal | Title | Effort | Dependency |
|----------|-------|--------|------------|
| 07 | Table Partitioning | XL | None |
| 12 | Admin Dashboard | L | 04, 13 |
| 14 | Tiered Rate Limiting | M | 01, 13 |

### Phase 5: Polish (Backlog)
| Proposal | Title | Effort | Dependency |
|----------|-------|--------|------------|
| 15 | Full-Text Search | S | None |
| 16 | Conversation Archival | S | 01 |
| 17 | Webhook System | M | 01 |
| 18 | DB Health Monitoring | S | 01, 10 |

---

## Summary

| # | Title | Priority | Effort | Category |
|---|-------|----------|--------|----------|
| 01 | pg_cron Scheduled Jobs | P0 | S | Infrastructure |
| 02 | Message Text Moderation | P0 | M | Security |
| 03 | Query Caching + CDN | P0 | L | Scalability |
| 04 | Automated Report Escalation | P0 | M | Security |
| 05 | Real-Time Presence | P1 | S | Feature |
| 06 | Read Receipts | P1 | S | Feature |
| 07 | Table Partitioning | P1 | XL | Scalability |
| 08 | Notification Queue | P1 | L | Feature |
| 09 | Discovery Algorithm | P1 | M | Feature |
| 10 | Server-Side Analytics | P2 | M | Observability |
| 11 | Edge Function Middleware | P2 | M | Architecture |
| 12 | Admin Dashboard Backend | P2 | L | Operations |
| 13 | User Ban System | P2 | M | Security |
| 14 | Tiered Rate Limiting | P2 | M | Security |
| 15 | Full-Text Search | P3 | S | Feature |
| 16 | Conversation Archival | P3 | S | Maintenance |
| 17 | Webhook Event System | P3 | M | Integration |
| 18 | DB Health Monitoring | P3 | S | Observability |

**Total estimated effort**: 2S + 1S + 2S + 1L + 1S + 1S + 1XL + 1L + 1M + 1M + 1M + 1L + 1M + 1M + 1S + 1S + 1M + 1S = 7S + 5M + 3L + 1XL

**Critical path**: Proposal 01 (pg_cron) unblocks 10 of the 18 proposals. It should be the very first migration applied.
