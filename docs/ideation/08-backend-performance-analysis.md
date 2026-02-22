# Backend Performance Analysis

**Date**: 2026-02-08
**Scope**: Database queries, edge functions, background services, caching, reliability
**Codebase**: Backtrack (love-ledger) -- React Native (Expo) + Supabase

---

## Executive Summary

The Backtrack backend has a solid foundation with good indexing coverage and optimized RPC functions. However, several performance bottlenecks remain that will become critical at scale. This report identifies **23 findings** across 5 categories, ranging from quick wins to architectural improvements, with estimated impact for each.

**Priority Breakdown:**
- Critical (P0): 4 findings -- must fix before scaling
- High (P1): 7 findings -- fix within next sprint
- Medium (P2): 8 findings -- plan for next release
- Low (P3): 4 findings -- nice-to-have improvements

---

## 1. Database Query Performance

### 1.1 [P0-CRITICAL] Geospatial Functions Not Using Stored Geography Column

**Component**: `supabase/migrations/016_geospatial_functions.sql` -- `get_nearby_locations()`, `get_locations_with_active_posts()`

**Current Behavior**: The original geospatial RPC functions (`get_nearby_locations`, `get_locations_with_active_posts`) reconstruct `ST_SetSRID(ST_MakePoint(l.longitude, l.latitude), 4326)::geography` for every row during every query. While migration `20260117100000_backend_performance_fixes.sql` added a stored `geog` column and created `get_locations_near_point_optimized()`, the two primary functions called by the application (`get_nearby_locations` at `lib/utils/geo.ts:443` and `get_locations_with_active_posts` at `lib/utils/geo.ts:554`) were never updated to use the stored column.

**Problem**: Every spatial query computes geography conversion per-row. With 10,000 locations in a metro area, each query performs 10,000 `ST_MakePoint` + `::geography` casts unnecessarily. The GIST index on `idx_locations_geog_stored` is not leveraged by these functions, defeating the purpose of the stored column migration.

**Expected Behavior**: All geospatial functions should reference `l.geog` instead of constructing geography inline.

**Proposed Fix**: Update `get_nearby_locations` and `get_locations_with_active_posts` to use `l.geog`:
```sql
-- In get_nearby_locations:
WHERE ST_DWithin(user_point, l.geog, radius_meters)
-- distance:
ST_Distance(user_point, l.geog) AS distance_meters

-- In get_locations_with_active_posts:
WHERE ST_DWithin(user_point, l.geog, radius_meters)
ST_Distance(user_point, l.geog) AS distance_meters
```

**Impact**: ~2x faster spatial queries (eliminates per-row geography construction). At 10,000 locations, estimated reduction from ~50ms to ~25ms per query.

**Acceptance Criteria**:
- Both functions produce identical results before and after change
- `EXPLAIN ANALYZE` shows `idx_locations_geog_stored` being used
- Query time reduced by >30% on test dataset of 5,000+ locations

---

### 1.2 [P0-CRITICAL] Background Location Service Uses Non-Optimized RPC

**Component**: `services/backgroundLocation.ts:262` -- `findNearbyLocation()`

**Current Behavior**: The background location task calls `get_locations_near_point` (the non-optimized version) which still constructs geography inline per-row.

**Problem**: This function runs every 2 minutes (production) for every user with background tracking enabled. At 1,000 concurrent users, this generates 30,000 spatial queries per hour, all using the slow path.

**Expected Behavior**: Use `get_locations_near_point_optimized` which uses the stored `geog` column and the GIST index on it.

**Proposed Fix**: Change the RPC call in `findNearbyLocation()`:
```typescript
const { data, error } = await supabase.rpc('get_locations_near_point_optimized', {
  p_lat: reducedLat,
  p_lon: reducedLon,
  p_radius_meters: 200,
  p_limit: 1,
})
```

**Impact**: ~2x faster background location checks. At scale (1,000 users, 2-min intervals), saves ~15,000 unnecessary geography computations per hour.

**Acceptance Criteria**:
- Background location checks return identical results
- Function correctly calls `get_locations_near_point_optimized`
- Unit tests pass

---

### 1.3 [P1-HIGH] Data Export Performs Unbounded Queries

**Component**: `lib/dataExport.ts:77-97` -- `exportUserData()`

**Current Behavior**: The function runs 9 parallel queries using `Promise.all` with no result limits:
```typescript
supabase.from('posts').select('id, message, note, emoji, ...').eq('producer_id', userId)
supabase.from('messages').select('id, content, ...').eq('sender_id', userId)
```
None of these queries have `.limit()` applied.

**Problem**: For power users, this could fetch thousands of messages and posts in a single request. A user with 5,000 messages would receive a multi-megabyte JSON response, potentially causing:
- Edge function timeout (default 60s)
- Memory pressure on the client
- Supabase row-level performance degradation for large result sets

**Expected Behavior**: Paginated export with configurable batch sizes, or streaming export.

**Proposed Fix**: Add `.limit(1000)` to each query as a safety measure, and implement pagination for the full export:
```typescript
// Quick fix: Add limits
supabase.from('messages').select('...').eq('sender_id', userId).limit(1000)

// Better: Paginated export with cursor-based pagination
async function exportWithPagination(table, filter, pageSize = 500) {
  let allData = []
  let offset = 0
  while (true) {
    const { data } = await supabase.from(table).select('...').range(offset, offset + pageSize - 1)
    if (!data?.length) break
    allData.push(...data)
    offset += pageSize
  }
  return allData
}
```

**Impact**: Prevents timeouts and memory issues for power users. Estimated reduction from potential 30s+ queries to <5s with 1,000-row limit.

**Acceptance Criteria**:
- No single query returns more than 1,000 rows without pagination
- Export completes within 30s for users with up to 10,000 records
- Error handling for partial export failures

---

### 1.4 [P1-HIGH] getUserConversations Has Dual Query Paths

**Component**: `lib/conversations.ts:555-620` -- `getUserConversations()`

**Current Behavior**: There are two implementations for fetching user conversations:
1. An optimized RPC function `get_user_conversations` (in migration `20260117100000`) with LATERAL JOINs for last message and unread counts
2. A direct table query in `lib/conversations.ts:577-598` that does `supabase.from('conversations').select('*')` without any message/unread data

The TypeScript code calls the direct query, not the optimized RPC. The RPC function includes last_message_content, last_message_at, and unread_count in a single query. The direct approach requires N+1 subsequent fetches for this data at the component level.

**Problem**: The optimized RPC exists but is not being called. The application uses the inferior query path.

**Expected Behavior**: The application should use the `get_user_conversations` RPC function.

**Proposed Fix**: Update `getUserConversations()` to call the RPC:
```typescript
const { data, error } = await supabase.rpc('get_user_conversations', {
  p_limit: limit,
  p_offset: offset,
})
```

**Impact**: Reduces conversation list load from potentially 50+ queries (N+1 for message previews) to 1 query. Estimated 10-50x improvement in conversation list load time.

**Acceptance Criteria**:
- Conversation list includes last_message_content, last_message_at, unread_count
- Single RPC call replaces multiple queries
- Load time for 50 conversations < 200ms

---

### 1.5 [P1-HIGH] Rate Limit Check in useSendMessage Issues Two Extra Queries Per Message

**Component**: `components/chat/hooks/useSendMessage.ts:217-278` -- `checkDatabaseRateLimit()`

**Current Behavior**: Before every message send, the hook performs TWO count queries against the `messages` table:
```typescript
// Query 1: Count messages in last minute
const { count: minuteCount } = await supabase
  .from('messages')
  .select('*', { count: 'exact', head: true })
  .eq('sender_id', currentUserId)
  .gte('created_at', oneMinuteAgo.toISOString())

// Query 2: Count messages in last hour
const { count: hourCount } = await supabase
  .from('messages')
  .select('*', { count: 'exact', head: true })
  .eq('sender_id', currentUserId)
  .gte('created_at', oneHourAgo.toISOString())
```

**Problem**: This adds ~200-400ms latency to every single message send. For a chat conversation, this is noticeable. The `count: 'exact'` option forces a sequential scan count. These queries run on top of the client-side rate limit check that already exists.

**Expected Behavior**: A single lightweight RPC call or removal of the DB check when client-side check passes.

**Proposed Fix**: Create a single RPC function for rate limit checking:
```sql
CREATE OR REPLACE FUNCTION check_message_rate_limit(p_sender_id UUID)
RETURNS TABLE(minute_count INT, hour_count INT)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    (SELECT count(*)::int FROM messages
     WHERE sender_id = p_sender_id AND created_at > now() - interval '1 minute'),
    (SELECT count(*)::int FROM messages
     WHERE sender_id = p_sender_id AND created_at > now() - interval '1 hour');
$$;
```
Or better: rely on the client-side check for normal flow and only check DB-side when client-side count is close to the limit (e.g., remaining < 3).

**Impact**: Reduces message send latency by 200-400ms per message. For rapid chat conversations, this is a significant UX improvement.

**Acceptance Criteria**:
- Message send latency reduced by >150ms
- Rate limiting still enforced correctly
- Single DB round-trip or conditional skip

---

### 1.6 [P2-MEDIUM] Missing Index on messages.sender_id + created_at

**Component**: Database schema -- `messages` table

**Current Behavior**: The rate limit queries filter by `sender_id` and `created_at`:
```sql
WHERE sender_id = ? AND created_at > ?
```
Existing indexes cover `conversation_id` + `is_read` and `conversation_id` + `created_at`, but there is no composite index on `(sender_id, created_at)`.

**Problem**: Rate limit count queries perform a sequential scan on `sender_id` without an efficient index path, then filter by `created_at`. As the messages table grows, these queries slow proportionally.

**Expected Behavior**: Composite index supports the rate limit query pattern.

**Proposed Fix**:
```sql
CREATE INDEX IF NOT EXISTS idx_messages_sender_created
ON messages(sender_id, created_at DESC);
```

**Impact**: Rate limit queries from ~50ms to ~5ms. Marginal storage overhead.

**Acceptance Criteria**:
- `EXPLAIN` shows index scan for rate limit queries
- No regression on message insert performance

---

### 1.7 [P2-MEDIUM] Location History RPC Fetches All 30-Day Data Then Filters Client-Side

**Component**: `hooks/useLocationHistory.ts:108-133` -- `fetchData()`

**Current Behavior**: The hook calls `get_locations_visited_in_last_month` with a fixed 30-day window, then applies client-side filtering if `daysBack` differs from 30:
```typescript
if (daysBack !== DEFAULT_DAYS_BACK && filteredData.length > 0) {
  filteredData = filteredData.filter((location) => {
    const visitDate = new Date(location.last_visited_at)
    return visitDate >= cutoffDate
  })
}
```

**Problem**: When `daysBack` is 7, the app still fetches 30 days of data from the server, then discards ~77% on the client. This wastes bandwidth and processing time.

**Expected Behavior**: The RPC should accept a `daysBack` parameter and filter server-side.

**Proposed Fix**: Modify the RPC to accept a configurable window:
```sql
CREATE OR REPLACE FUNCTION get_locations_visited_in_period(
  p_user_id UUID,
  p_days_back INTEGER DEFAULT 30
) ...
WHERE lv.created_at > now() - (p_days_back || ' days')::interval
```

**Impact**: Reduces data transfer by up to 77% for shorter time windows. Estimated 100-500ms savings on slow networks.

**Acceptance Criteria**:
- RPC accepts `p_days_back` parameter
- Client-side filtering removed
- Results identical for same time window

---

### 1.8 [P2-MEDIUM] getConversation Uses SELECT *

**Component**: `lib/conversations.ts:292` -- `getConversation()`

**Current Behavior**: Fetches all columns:
```typescript
const { data, error } = await supabase
  .from('conversations')
  .select('*')
  .eq('id', conversationId)
  .single()
```

**Problem**: `SELECT *` fetches every column including potentially large text fields and timestamps that may not be needed. As the schema evolves, this silently fetches new columns too.

**Expected Behavior**: Select only the columns actually used.

**Proposed Fix**:
```typescript
.select('id, post_id, producer_id, consumer_id, is_active, created_at, updated_at')
```

**Impact**: Minor -- reduces payload size by ~20-30%. More importantly, prevents future column additions from increasing payload silently.

**Acceptance Criteria**:
- Only required columns fetched
- No TypeScript type errors
- All consuming code still works

---

## 2. Edge Function Performance

### 2.1 [P0-CRITICAL] Send-Notification Edge Function Creates New Supabase Client at Module Level

**Component**: `supabase/functions/send-notification/index.ts:63-66`

**Current Behavior**: The Supabase client is created at module scope:
```typescript
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
```
This is replicated identically in `send-match-notification/index.ts:63-66` and `send-spark-notification/index.ts:54-57`.

**Problem**: Module-level initialization means the Supabase client is created during cold start but the connection is not pooled or reused across invocations of the same warm instance. Each edge function creates its own isolated client. While Deno Deploy keeps warm instances, there is no connection pooling configuration applied.

**Expected Behavior**: Connection reuse with proper pooling configuration.

**Proposed Fix**: Configure the client with connection pooling mode:
```typescript
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  db: {
    schema: 'public',
  },
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})
```
Also consider using `SUPABASE_DB_URL` with pgbouncer for direct database access in edge functions when doing multiple queries.

**Impact**: Reduces cold start time by ~100-200ms. Connection reuse across warm invocations.

**Acceptance Criteria**:
- Edge function cold start < 500ms
- Connection reuse verified in warm instance

---

### 2.2 [P1-HIGH] Send-Match-Notification Records Notifications Sequentially

**Component**: `supabase/functions/send-match-notification/index.ts:330-335`

**Current Behavior**: After sending notifications, each successful notification is recorded individually in a sequential loop:
```typescript
for (let i = 0; i < response.data.length; i++) {
  if (response.data[i].status === 'ok') {
    const match = matchesWithTokens[i]
    await recordNotification(body.postId, match.user_id, match.checkin_id)
  }
}
```

**Problem**: For 20 matches, this performs 20 sequential database calls. Each call has ~10-20ms network latency, adding 200-400ms total.

**Expected Behavior**: Batch insert all notification records in a single query.

**Proposed Fix**: Create a batch RPC or use a single insert:
```typescript
const successfulNotifications = response.data
  .map((ticket, i) => ticket.status === 'ok' ? matchesWithTokens[i] : null)
  .filter(Boolean)
  .map(match => ({
    post_id: body.postId,
    user_id: match.user_id,
    checkin_id: match.checkin_id,
    sent_at: new Date().toISOString(),
  }))

await supabase.from('match_notifications').insert(successfulNotifications)
```

**Impact**: 20 DB calls reduced to 1. Estimated 200-400ms savings per notification batch.

**Acceptance Criteria**:
- Single database call for notification recording
- No duplicate notification records
- Edge function execution time reduced

---

### 2.3 [P1-HIGH] Send-Spark-Notification Fetches Push Tokens Per-Recipient (N+1)

**Component**: `supabase/functions/send-spark-notification/index.ts:270-271`

**Current Behavior**: For each spark recipient, push tokens are fetched individually:
```typescript
for (const recipient of recipients) {
  const tokens = await getUserPushTokens(recipient.user_id)
  // ...
}
```

**Problem**: N+1 query pattern. For 15 recipients, this performs 15 sequential RPC calls to fetch push tokens. Each adds ~10-20ms latency.

**Expected Behavior**: Batch fetch all push tokens for all recipients in a single query.

**Proposed Fix**: Create a batch RPC function:
```sql
CREATE OR REPLACE FUNCTION get_push_tokens_for_users(p_user_ids UUID[])
RETURNS TABLE(user_id UUID, token TEXT)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT user_id, token FROM expo_push_tokens
  WHERE user_id = ANY(p_user_ids);
$$;
```
Then call it once:
```typescript
const userIds = recipients.map(r => r.user_id)
const { data: allTokens } = await supabase.rpc('get_push_tokens_for_users', {
  p_user_ids: userIds
})
```

**Impact**: N queries reduced to 1. For 15 recipients, ~150-300ms savings.

**Acceptance Criteria**:
- Single query for all push tokens
- Token-to-user mapping maintained
- All notification features preserved

---

### 2.4 [P2-MEDIUM] Moderate-Image Downloads Full Image Into Memory

**Component**: `supabase/functions/moderate-image/index.ts:369-401`

**Current Behavior**: The function downloads the full image from Supabase Storage, converts to base64 in memory, then sends to Google Vision API:
```typescript
const { data: imageData } = await supabase.storage.from('selfies').download(storage_path)
const arrayBuffer = await imageData.arrayBuffer()
const uint8Array = new Uint8Array(arrayBuffer)
base64Image = base64Encode(uint8Array)
```

**Problem**: For large images (5-10MB selfies), this requires 2-3x the image size in memory (original + base64). Edge functions have memory limits (typically 150MB). Multiple concurrent moderation requests could cause out-of-memory failures.

**Expected Behavior**: Stream the image or use a signed URL for Vision API to fetch directly.

**Proposed Fix**: Use a public signed URL and pass it to Vision API instead of base64:
```typescript
const { data: signedUrl } = await supabase.storage
  .from('selfies')
  .createSignedUrl(storage_path, 60) // 60 second expiry

const requestBody = {
  requests: [{
    image: { source: { imageUri: signedUrl.signedUrl } }, // URL instead of base64
    features: [{ type: 'SAFE_SEARCH_DETECTION' }],
  }],
}
```

**Impact**: Reduces memory usage from ~20MB to <1MB per request. Prevents OOM at scale.

**Acceptance Criteria**:
- Vision API called with image URL instead of base64
- Signed URL has short expiry (60s)
- Moderation results identical

---

### 2.5 [P2-MEDIUM] Duplicate Expo Push API Helper Code Across 3 Edge Functions

**Component**: All 3 notification edge functions

**Current Behavior**: `sendToExpo()`, `delay()`, retry logic, ticket processing, and `removeInvalidToken()` are copy-pasted across `send-notification`, `send-match-notification`, and `send-spark-notification`.

**Problem**: Code duplication means bug fixes must be applied 3 times. The retry logic differs slightly between functions (linear vs exponential backoff). This is a maintenance risk, not a runtime performance issue.

**Expected Behavior**: Shared utility module for Expo Push API interactions.

**Proposed Fix**: Create `supabase/functions/_shared/expo-push.ts`:
```typescript
export async function sendToExpo(notifications, retryCount = 0) { ... }
export async function processTickets(tickets, tokens) { ... }
export async function removeInvalidToken(supabase, token) { ... }
```

**Impact**: Maintenance improvement. Ensures consistent retry behavior. No runtime performance change.

**Acceptance Criteria**:
- Shared module imported by all 3 edge functions
- Consistent retry logic (exponential backoff)
- All notification tests pass

---

## 3. Real-time and Background Services

### 3.1 [P0-CRITICAL] Background Location Makes Network Call Every Update Even When Stationary

**Component**: `services/backgroundLocation.ts:335-449` -- `BACKGROUND_LOCATION_TASK`

**Current Behavior**: Every location update (every 2 minutes in production) triggers:
1. `AsyncStorage.getItem` for tracking settings
2. `AsyncStorage.getItem` for dwell state
3. `supabase.rpc('get_locations_near_point')` to find nearby locations
4. Potentially `AsyncStorage.setItem` to save state

Even when the user has not moved at all.

**Problem**: The `findNearbyLocation()` database call happens every 2 minutes regardless of whether the user's position changed. For a user sitting at their desk for 8 hours, this generates 240 unnecessary RPC calls. At 1,000 users, that is 240,000 unnecessary queries per day.

**Expected Behavior**: Skip the database call if the user's position has not significantly changed since the last check.

**Proposed Fix**: Add position-change detection before the RPC call:
```typescript
const dwellState = await getDwellState()

// Skip DB call if position hasn't changed significantly
if (dwellState.currentLocation) {
  const distance = calculateDistance(
    latitude, longitude,
    dwellState.currentLocation.latitude,
    dwellState.currentLocation.longitude
  )
  if (distance < 20) { // Less than 20m movement
    // Still at same spot, no need to query DB
    // Just check dwell time for notification
    if (!dwellState.notificationSent) {
      const dwellTimeMinutes = dwellState.arrivedAt
        ? (now - dwellState.arrivedAt) / (1000 * 60) : 0
      if (dwellTimeMinutes >= promptMinutes) {
        await sendCheckinPromptNotification(...)
      }
    }
    return
  }
}

// Only query DB when position changed significantly
const nearbyLocation = await findNearbyLocation(latitude, longitude)
```

**Impact**: Eliminates ~80% of background database calls for stationary users. Reduces battery drain from network activity. At 1,000 users, saves ~192,000 queries/day.

**Acceptance Criteria**:
- DB calls only when user moves >20m
- Dwell time tracking still accurate
- Notification prompts still fire correctly
- Battery usage reduced measurably

---

### 3.2 [P1-HIGH] Background Task Reads AsyncStorage Twice Per Update

**Component**: `services/backgroundLocation.ts:357-362`

**Current Behavior**: Each background location update reads AsyncStorage twice:
```typescript
const settings = await getTrackingSettings()  // AsyncStorage.getItem #1
const dwellState = await getDwellState()       // AsyncStorage.getItem #2
```

**Problem**: Two separate AsyncStorage reads add ~5-10ms each on Android. These are cold reads every time since the background task has no in-memory state.

**Expected Behavior**: Single read or batched reads.

**Proposed Fix**: Use `AsyncStorage.multiGet` to batch both reads:
```typescript
const [[, settingsJson], [, dwellJson]] = await AsyncStorage.multiGet([
  TRACKING_SETTINGS_KEY,
  DWELL_STATE_KEY,
])
const settings = settingsJson ? JSON.parse(settingsJson) : null
const dwellState = dwellJson ? JSON.parse(dwellJson) : defaultDwellState
```

**Impact**: Reduces AsyncStorage reads from 2 to 1 batch operation. ~5-10ms savings per background update.

**Acceptance Criteria**:
- Single `multiGet` call replaces two `getItem` calls
- State parsing handles null values correctly
- Background task behavior unchanged

---

### 3.3 [P2-MEDIUM] Coordinate Precision Reduction Applied Redundantly

**Component**: `services/backgroundLocation.ts:259-260` and `hooks/useCheckin.ts:195-200`

**Current Behavior**: Both the background location service and the check-in hook independently implement `reduceCoordinatePrecision()`:
```typescript
// backgroundLocation.ts:
const reducedLat = reduceCoordinatePrecision(lat)  // rounds to 2 decimal places

// useCheckin.ts:
const reduceCoordinatePrecision = (value: number): number => {
  return Math.round(value * 100) / 100
}
```

**Problem**: The background service reduces precision to ~1.1km before querying nearby locations within 200m. This is contradictory -- rounding to 1.1km resolution while searching a 200m radius means the search center could be off by up to 550m, causing missed locations. The check-in hook has the same issue but uses GPS accuracy-based dynamic radius which partially compensates.

**Expected Behavior**: Use higher precision for proximity queries (~10m = 4 decimal places), reserve 2-decimal privacy reduction for stored/transmitted data only.

**Proposed Fix**: Increase precision for the RPC query parameter:
```typescript
// For proximity queries: 4 decimal places = ~11m precision
const queryLat = Math.round(lat * 10000) / 10000
const queryLon = Math.round(lon * 10000) / 10000

// For stored/logged data: keep 2 decimal places for privacy
const storedLat = Math.round(lat * 100) / 100
```

**Impact**: Eliminates false negatives in location matching. Users within 200m of a location will no longer be missed due to coordinate rounding.

**Acceptance Criteria**:
- Query coordinates use 4 decimal places
- Stored coordinates use 2 decimal places (GDPR)
- Location detection accuracy improved

---

## 4. Caching Opportunities

### 4.1 [P1-HIGH] No Client-Side Caching for Notification Settings

**Component**: `supabase/functions/send-notification/index.ts:106-121` -- `isNotificationEnabled()`

**Current Behavior**: Every notification dispatch checks notification preferences via an RPC call:
```typescript
async function isNotificationEnabled(userId, notificationType) {
  const { data, error } = await supabase.rpc('is_notification_enabled', { ... })
  return data === true
}
```
For batch notifications (e.g., 20 users), this issues 20 sequential preference checks.

**Problem**: Notification preferences rarely change. Checking them on every notification send adds latency and database load.

**Expected Behavior**: Cache preferences with short TTL, or batch-check multiple users.

**Proposed Fix**: Create a batch RPC and use in-function caching:
```sql
CREATE OR REPLACE FUNCTION get_notification_preferences_batch(p_user_ids UUID[], p_type TEXT)
RETURNS TABLE(user_id UUID, enabled BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT np.user_id, COALESCE(
    CASE p_type WHEN 'match' THEN np.matches_enabled WHEN 'message' THEN np.messages_enabled END,
    true
  ) FROM notification_preferences np WHERE np.user_id = ANY(p_user_ids);
$$;
```

**Impact**: 20 RPC calls reduced to 1 for batch notifications. ~200ms savings per batch.

**Acceptance Criteria**:
- Single query for batch preference checks
- Default to enabled if no preference record
- Preferences cached for duration of function invocation

---

### 4.2 [P2-MEDIUM] No Caching of Active Checkin State

**Component**: `hooks/useCheckin.ts:131-161` -- `getActiveCheckin()`

**Current Behavior**: The active check-in is fetched from the database via RPC every time the component mounts:
```typescript
const { data, error } = await supabase.rpc('get_active_checkin')
```
There is no local caching. If the user navigates between screens, the check-in state is re-fetched each time.

**Problem**: Unnecessary repeated RPC calls for data that changes infrequently (only on check-in/check-out).

**Expected Behavior**: Cache the active check-in in React state and only refetch on check-in/check-out operations.

**Proposed Fix**: Use a React context or AsyncStorage cache:
```typescript
// Cache active checkin in AsyncStorage
const ACTIVE_CHECKIN_KEY = 'backtrack:active_checkin'

async function getCachedActiveCheckin() {
  const cached = await AsyncStorage.getItem(ACTIVE_CHECKIN_KEY)
  if (cached) {
    const { data, timestamp } = JSON.parse(cached)
    if (Date.now() - timestamp < 5 * 60 * 1000) { // 5 min TTL
      return data
    }
  }
  // Fetch from DB and cache
  const { data } = await supabase.rpc('get_active_checkin')
  await AsyncStorage.setItem(ACTIVE_CHECKIN_KEY, JSON.stringify({
    data, timestamp: Date.now()
  }))
  return data
}
```

**Impact**: Eliminates redundant RPC calls on screen navigation. Estimated 1-3 RPC calls saved per app session.

**Acceptance Criteria**:
- Active check-in cached with 5-minute TTL
- Cache invalidated on check-in/check-out
- Fresh data on manual refetch

---

### 4.3 [P2-MEDIUM] Nearby Locations Not Cached Between Tab Switches

**Component**: `hooks/useNearbyLocations.ts:153-221` -- `fetchLocations()`

**Current Behavior**: Every time the map view mounts or coordinates change, a full RPC call is made. No stale-while-revalidate pattern. The 300ms debounce only handles rapid coordinate changes, not remounts.

**Problem**: Switching between tabs causes a full refetch even if the user hasn't moved. Each spatial query costs ~25-50ms server-side plus network latency.

**Expected Behavior**: Return cached results immediately on remount, then refresh in background.

**Proposed Fix**: Implement stale-while-revalidate with coordinate-based cache keys:
```typescript
const locationCache = useRef<Map<string, { data: any[], timestamp: number }>>(new Map())

const getCacheKey = (lat: number, lon: number) =>
  `${lat.toFixed(3)}_${lon.toFixed(3)}_${radiusMeters}`

// On fetch, check cache first
const cacheKey = getCacheKey(lat, lon)
const cached = locationCache.current.get(cacheKey)
if (cached && Date.now() - cached.timestamp < 30000) { // 30s TTL
  setLocations(cached.data)
  // Still refresh in background
}
```

**Impact**: Eliminates redundant location queries on tab switches. Estimated 2-5 queries saved per user session.

**Acceptance Criteria**:
- Cached results shown immediately on remount
- Background refresh updates data
- Cache invalidated after 30 seconds or significant location change

---

### 4.4 [P3-LOW] No Caching in Notification Counts

**Component**: `hooks/useNotificationCounts.ts:100-145`

**Current Behavior**: Notification counts are fetched from the database on every component mount with no caching or polling interval.

**Problem**: On every tab switch or screen transition that renders the badge, a new RPC call is made.

**Expected Behavior**: Cache counts with 30-second TTL, poll periodically.

**Proposed Fix**: Add polling with caching:
```typescript
const POLL_INTERVAL_MS = 30000 // 30 seconds

useEffect(() => {
  fetchData()
  const interval = setInterval(fetchData, POLL_INTERVAL_MS)
  return () => clearInterval(interval)
}, [fetchData])
```

**Impact**: Reduces unnecessary queries while keeping counts reasonably fresh.

**Acceptance Criteria**:
- Counts refresh every 30 seconds
- Immediate refresh on app foreground
- No duplicate polling intervals

---

## 5. Reliability and Observability

### 5.1 [P1-HIGH] Edge Functions Lack Structured Logging

**Component**: All 4 edge functions

**Current Behavior**: Logging uses plain `console.error` and `console.log`:
```typescript
console.error('Failed to get post location:', error?.message)
console.log(`Processing spark notification for post ${post_id}`)
```

**Problem**: No structured logging format. Cannot correlate requests, measure latencies, or set up alerting. In Supabase edge function logs, these are plain strings with no metadata.

**Expected Behavior**: Structured JSON logging with request IDs, timestamps, and duration metrics.

**Proposed Fix**: Add a logging helper:
```typescript
function log(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...data,
  }
  console[level === 'error' ? 'error' : 'log'](JSON.stringify(entry))
}

// Usage
const startTime = performance.now()
// ... process ...
log('info', 'notification_sent', {
  postId,
  duration_ms: performance.now() - startTime,
  recipients: matches.length,
  sent: result.sent,
  failed: result.failed,
})
```

**Impact**: Enables monitoring, alerting, and performance tracking for edge functions.

**Acceptance Criteria**:
- All edge function logs in JSON format
- Request duration tracked
- Error details include context
- Logs searchable by post_id, user_id

---

### 5.2 [P1-HIGH] No Sentry Integration in Edge Functions

**Component**: All 4 edge functions

**Current Behavior**: Errors are logged to `console.error` only. No error tracking service integration. The client-side app has comprehensive Sentry integration (`lib/sentry.ts`), but edge functions have none.

**Problem**: Edge function errors are only visible in Supabase dashboard logs. No alerting, no error grouping, no trend tracking. Critical notification failures could go unnoticed for hours.

**Expected Behavior**: Edge function errors reported to Sentry or equivalent monitoring.

**Proposed Fix**: Add Sentry to edge functions using the Sentry Deno SDK:
```typescript
import * as Sentry from 'https://deno.land/x/sentry/mod.ts'

Sentry.init({
  dsn: Deno.env.get('SENTRY_DSN'),
  environment: 'production',
  release: 'edge-functions@1.0.0',
})

// Wrap handler
Deno.serve(async (req) => {
  try {
    // ... handler logic
  } catch (error) {
    Sentry.captureException(error, { extra: { function: 'send-notification' } })
    throw error
  }
})
```

**Impact**: Critical for production readiness. Enables proactive error detection and debugging.

**Acceptance Criteria**:
- All edge function errors reported to Sentry
- Error context includes function name and request data
- Alert configured for notification failure rates > 5%

---

### 5.3 [P2-MEDIUM] Offline Message Queue Has No Deduplication

**Component**: `lib/offlineMessageQueue.ts:212-239` -- `queueOfflineMessage()`

**Current Behavior**: Messages are queued with an ID generated from timestamp + random:
```typescript
const id = `offline-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
```
The `processOfflineQueue` function processes all queued messages and sends them.

**Problem**: If the app crashes during a send and the message was actually delivered, the queue will retry and send a duplicate. There is no idempotency key or duplicate detection. The `sendToSupabase` function in `useSendMessage.ts` also retries with exponential backoff, which could result in duplicates if the insert succeeds but the response times out.

**Expected Behavior**: Idempotent message sends with deduplication.

**Proposed Fix**: Add an idempotency key to message inserts:
```typescript
// Generate idempotency key at queue time
const idempotencyKey = `msg-${conversationId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

// Use it in the insert
await supabase.from('messages').insert({
  conversation_id: conversationId,
  sender_id: senderId,
  content,
  idempotency_key: idempotencyKey,
})
```
With a unique constraint on `idempotency_key` to prevent duplicates.

**Impact**: Prevents duplicate messages in unreliable network conditions.

**Acceptance Criteria**:
- No duplicate messages after retry
- Unique constraint on idempotency_key
- Queue correctly handles "already sent" responses

---

### 5.4 [P2-MEDIUM] No Health Check Endpoint

**Component**: Backend infrastructure

**Current Behavior**: There is no health check endpoint for the Supabase backend. The only way to know if the backend is responsive is to make a real query.

**Problem**: Cannot implement uptime monitoring, load balancer health checks, or degraded-service detection.

**Expected Behavior**: Lightweight health check that verifies database connectivity and edge function availability.

**Proposed Fix**: Create a health check edge function:
```typescript
// supabase/functions/health/index.ts
Deno.serve(async () => {
  const startTime = performance.now()
  try {
    const { error } = await supabase.from('profiles').select('count', { count: 'exact', head: true })
    const dbLatencyMs = performance.now() - startTime

    return new Response(JSON.stringify({
      status: 'ok',
      db: { connected: !error, latency_ms: Math.round(dbLatencyMs) },
      timestamp: new Date().toISOString(),
    }), { status: 200 })
  } catch {
    return new Response(JSON.stringify({
      status: 'degraded',
      timestamp: new Date().toISOString(),
    }), { status: 503 })
  }
})
```

**Impact**: Enables uptime monitoring and alerting. Foundation for SLA tracking.

**Acceptance Criteria**:
- Health endpoint responds in < 500ms
- Returns database connectivity status
- Suitable for external monitoring (UptimeRobot, etc.)
- Does not require authentication

---

### 5.5 [P3-LOW] Account Deletion Does Not Clean Up Offline Queue

**Component**: `lib/accountDeletion.ts:193-298` -- `deleteAccountImmediately()`

**Current Behavior**: Account deletion removes database records and storage files but does not clear the AsyncStorage offline message queue.

**Problem**: After account deletion, queued messages remain in AsyncStorage. If a new user signs in on the same device, `processOfflineQueue` could attempt to send messages from the deleted account's queue.

**Expected Behavior**: Clear all AsyncStorage data on account deletion.

**Proposed Fix**: Add queue cleanup to `deleteAccountImmediately()`:
```typescript
import { clearOfflineQueue } from './offlineMessageQueue'

// After successful deletion:
try {
  await clearOfflineQueue()
  await AsyncStorage.multiRemove([
    'backtrack:dwell_state',
    'backtrack:tracking_settings',
    'notification_last_seen_at',
  ])
} catch {
  // Non-critical cleanup
}
```

**Impact**: Prevents orphaned data and potential message leaks between accounts.

**Acceptance Criteria**:
- Offline queue cleared on account deletion
- All AsyncStorage keys with `backtrack:` prefix removed
- Cleanup failure does not block deletion

---

### 5.6 [P3-LOW] No Circuit Breaker for Expo Push API

**Component**: All notification edge functions

**Current Behavior**: Retry logic with exponential backoff, but no circuit breaker. If the Expo Push API is down, every notification attempt will wait through 3 retries (1s + 2s + 4s = 7s) before failing.

**Problem**: During an Expo API outage, all notification edge functions will be blocked for ~7 seconds per invocation. With many concurrent invocations, this could exhaust edge function concurrency limits.

**Expected Behavior**: Circuit breaker that short-circuits after repeated failures, with automatic recovery.

**Proposed Fix**: Implement simple in-memory circuit breaker:
```typescript
let consecutiveFailures = 0
let circuitOpenUntil = 0

async function sendWithCircuitBreaker(notifications) {
  if (Date.now() < circuitOpenUntil) {
    throw new Error('Circuit breaker open: Expo Push API unavailable')
  }

  try {
    const result = await sendToExpo(notifications)
    consecutiveFailures = 0
    return result
  } catch (error) {
    consecutiveFailures++
    if (consecutiveFailures >= 5) {
      circuitOpenUntil = Date.now() + 60000 // Open for 1 minute
    }
    throw error
  }
}
```

**Impact**: Prevents cascading failures during Expo API outages. Reduces edge function timeout waste.

**Acceptance Criteria**:
- Circuit opens after 5 consecutive failures
- Circuit closes after 1-minute cooldown
- Notifications queued for retry when circuit is open

---

### 5.7 [P3-LOW] Sentry trace sample rate may be too low

**Component**: `lib/sentry.ts:231`

**Current Behavior**: `tracesSampleRate: 0.1` -- only 10% of transactions are traced.

**Problem**: With only 10% sampling, performance issues may not be captured consistently. This is acceptable for high-traffic apps but for a pre-launch app with lower traffic, important performance data could be missed.

**Expected Behavior**: Higher sample rate during early launch, reduced as traffic increases.

**Proposed Fix**: Use adaptive sampling based on user count:
```typescript
tracesSampleRate: __DEV__ ? 1.0 : 0.5, // 50% in production, 100% in dev
```
Reduce to 0.1-0.2 once the app exceeds 10,000 DAU.

**Impact**: More complete performance data during early launch phase.

**Acceptance Criteria**:
- Sample rate configurable via environment variable
- Performance data covers >50% of transactions pre-launch
- No measurable impact on app performance

---

## Summary Table

| # | Priority | Component | Issue | Est. Impact |
|---|----------|-----------|-------|-------------|
| 1.1 | P0 | Geospatial RPCs | Not using stored geography column | 2x faster spatial queries |
| 1.2 | P0 | Background Location | Uses non-optimized RPC | 2x faster bg checks |
| 3.1 | P0 | Background Location | Network call every update even when stationary | 80% fewer DB calls |
| 2.1 | P0 | Edge Functions | No connection pooling config | 100-200ms cold start reduction |
| 1.3 | P1 | Data Export | Unbounded queries | Prevent timeouts |
| 1.4 | P1 | Conversations | Optimized RPC not used | 10-50x faster conversation list |
| 1.5 | P1 | Chat Messages | 2 extra count queries per message | 200-400ms/message savings |
| 2.2 | P1 | Match Notifications | Sequential notification recording | 200-400ms/batch savings |
| 2.3 | P1 | Spark Notifications | N+1 push token fetching | 150-300ms savings |
| 4.1 | P1 | Notifications | No preference caching | 200ms/batch savings |
| 5.1 | P1 | Edge Functions | No structured logging | Observability |
| 5.2 | P1 | Edge Functions | No Sentry integration | Error tracking |
| 1.6 | P2 | Messages | Missing sender+created index | 10x faster rate limit queries |
| 1.7 | P2 | Location History | Client-side date filtering | 77% bandwidth reduction |
| 1.8 | P2 | Conversations | SELECT * usage | 20-30% payload reduction |
| 2.4 | P2 | Image Moderation | Full image in memory | Prevent OOM |
| 2.5 | P2 | Edge Functions | Duplicated Expo Push code | Maintenance |
| 3.3 | P2 | Coordinates | Precision too low for proximity | Accuracy improvement |
| 4.2 | P2 | Check-in | No active checkin caching | 1-3 queries/session saved |
| 4.3 | P2 | Map View | No location cache on remount | 2-5 queries/session saved |
| 5.3 | P2 | Offline Queue | No message deduplication | Prevent duplicates |
| 5.4 | P2 | Infrastructure | No health check endpoint | Uptime monitoring |
| 3.2 | P1 | Background Location | Two AsyncStorage reads per update | 5-10ms savings |
| 4.4 | P3 | Notifications | No count caching | Reduce queries |
| 5.5 | P3 | Account Deletion | Orphaned AsyncStorage data | Data cleanup |
| 5.6 | P3 | Expo Push API | No circuit breaker | Prevent cascading failures |
| 5.7 | P3 | Sentry | Low trace sample rate | Better perf data |

---

## Recommended Implementation Order

### Sprint 1 (Quick Wins -- 1-2 days)
1. **1.1** Update geospatial RPCs to use stored `geog` column
2. **1.2** Switch background service to optimized RPC
3. **1.5** Create single rate-limit RPC or make DB check conditional
4. **1.6** Add `idx_messages_sender_created` index

### Sprint 2 (High Impact -- 3-5 days)
5. **3.1** Add position-change detection to background task
6. **1.4** Switch `getUserConversations()` to use RPC
7. **2.2** Batch notification recording
8. **2.3** Batch push token fetching
9. **3.2** Use `multiGet` for AsyncStorage reads

### Sprint 3 (Reliability -- 3-5 days)
10. **5.1** Add structured logging to edge functions
11. **5.2** Add Sentry to edge functions
12. **5.4** Create health check endpoint
13. **2.1** Configure connection pooling for edge function clients

### Sprint 4 (Polish -- 3-5 days)
14. **1.3** Add limits to data export queries
15. **4.1** Batch notification preference checks
16. **3.3** Fix coordinate precision for proximity queries
17. **2.4** Use signed URLs for image moderation
18. **5.3** Add idempotency to message sends
