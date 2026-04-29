// ============================================================================
// Send Match Notification Edge Function
// ============================================================================
// Sends push notifications to users with verified check-ins when a new post
// is created at their location (Tier 1 matches).
//
// Security:
// - Requires service role key or webhook signature
// - CORS restricted to allowed origins
// - Error details sanitized
// ============================================================================

import {
  withMiddleware,
  addCorsHeaders,
  createServiceClient,
  isValidUUID,
} from '../_shared/middleware.ts'

// ============================================================================
// Types
// ============================================================================

interface MatchNotificationRequest {
  postId: string
  locationId?: string
  locationName?: string
}

interface PostTimeWindow {
  sighting_date: string | null
  sighting_end_date: string | null
  time_granularity: string | null
}

interface TierOneMatch {
  user_id: string
  checkin_id: string
  checked_in_at: string
  push_token: string
}

interface ExpoNotification {
  to: string
  title: string
  body: string
  data: Record<string, unknown>
  sound: 'default'
  priority: 'high'
  channelId: string
}

interface ExpoPushTicket {
  status: 'ok' | 'error'
  id?: string
  message?: string
  details?: {
    error?: 'DeviceNotRegistered' | 'InvalidCredentials' | 'MessageTooBig' | 'MessageRateExceeded'
  }
}

interface ExpoPushResponse {
  data: ExpoPushTicket[]
}

// ============================================================================
// Constants
// ============================================================================

const EXPO_PUSH_API_URL = 'https://exp.host/--/api/v2/push/send'
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

// ============================================================================
// Helper Functions
// ============================================================================

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function getPostLocation(
  supabase: ReturnType<typeof createServiceClient>,
  postId: string
): Promise<{ locationId: string, locationName: string, timeWindow: PostTimeWindow } | null> {
  const { data, error } = await supabase
    .from('posts')
    .select(`
      location_id,
      sighting_date,
      sighting_end_date,
      time_granularity,
      locations (name)
    `)
    .eq('id', postId)
    .single()

  if (error || !data) {
    return null
  }

  return {
    locationId: data.location_id,
    locationName: (data.locations as { name: string })?.name || 'a location',
    timeWindow: {
      sighting_date: data.sighting_date,
      sighting_end_date: data.sighting_end_date,
      time_granularity: data.time_granularity,
    },
  }
}

/**
 * Builds a short, human-readable time phrase for the push body.
 * Examples: "Saturday evening", "yesterday afternoon", "around 9pm Saturday".
 * Returns null if no usable sighting time is available — caller should fall
 * back to a generic message.
 *
 * Kept inline (not imported from utils/dateTime.ts) because that module is
 * React Native code and would pull in the wrong runtime types under Deno.
 */
function formatPushTimeWindow(tw: PostTimeWindow): string | null {
  if (!tw.sighting_date) return null

  const start = new Date(tw.sighting_date)
  if (isNaN(start.getTime())) return null

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfPostDay = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const dayDiff = Math.round((startOfToday.getTime() - startOfPostDay.getTime()) / 86400000)

  let dayLabel: string
  if (dayDiff === 0) dayLabel = 'today'
  else if (dayDiff === 1) dayLabel = 'yesterday'
  else if (dayDiff > 1 && dayDiff < 7) {
    dayLabel = start.toLocaleDateString('en-US', { weekday: 'long' })
  } else {
    dayLabel = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const granularity = tw.time_granularity
  if (granularity === 'morning' || granularity === 'afternoon' || granularity === 'evening') {
    return `${dayLabel} ${granularity}`
  }

  // Specific / hour granularity → include time of day
  const hour = start.getHours()
  const period = hour >= 5 && hour < 12 ? 'morning'
    : hour >= 12 && hour < 17 ? 'afternoon'
    : hour >= 17 && hour < 22 ? 'evening'
    : 'night'

  if (granularity === 'day' || granularity === 'week') {
    return dayLabel
  }

  // specific / hour: include approximate clock time
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  const ampm = hour < 12 ? 'am' : 'pm'
  return `${dayLabel} around ${hour12}${ampm} (${period})`
}

async function getTierOneMatches(
  supabase: ReturnType<typeof createServiceClient>,
  postId: string
): Promise<TierOneMatch[]> {
  const { data, error } = await supabase.rpc('get_tier_1_matches_for_post', {
    p_post_id: postId,
  })

  if (error) {
    console.error('Failed to get Tier 1 matches:', error.message)
    return []
  }

  return (data || []) as TierOneMatch[]
}

async function recordNotification(
  supabase: ReturnType<typeof createServiceClient>,
  postId: string,
  userId: string,
  checkinId: string
): Promise<void> {
  const { error } = await supabase.rpc('record_match_notification', {
    p_post_id: postId,
    p_user_id: userId,
    p_checkin_id: checkinId,
  })

  if (error) {
    console.error('Failed to record notification:', error.message)
  }
}

async function removeInvalidToken(
  supabase: ReturnType<typeof createServiceClient>,
  token: string
): Promise<void> {
  const { error } = await supabase
    .from('expo_push_tokens')
    .delete()
    .eq('token', token)

  if (error) {
    console.error('Failed to remove invalid token:', error.message)
  }
}

async function sendToExpo(
  notifications: ExpoNotification[],
  retryCount = 0
): Promise<ExpoPushResponse | null> {
  try {
    const response = await fetch(EXPO_PUSH_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(notifications),
    })

    if (!response.ok) {
      if (response.status >= 500 && retryCount < MAX_RETRIES) {
        await delay(RETRY_DELAY_MS * (retryCount + 1))
        return sendToExpo(notifications, retryCount + 1)
      }
      throw new Error(`Expo API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      await delay(RETRY_DELAY_MS * (retryCount + 1))
      return sendToExpo(notifications, retryCount + 1)
    }
    console.error('Failed to send to Expo:', error)
    return null
  }
}

async function processTickets(
  supabase: ReturnType<typeof createServiceClient>,
  tickets: ExpoPushTicket[],
  matches: TierOneMatch[]
): Promise<{ sent: number; failed: number }> {
  let sent = 0
  let failed = 0

  for (let i = 0; i < tickets.length; i++) {
    const ticket = tickets[i]
    const match = matches[i]

    if (ticket.status === 'ok') {
      sent++
    } else {
      failed++
      if (ticket.details?.error === 'DeviceNotRegistered' && match?.push_token) {
        await removeInvalidToken(supabase, match.push_token)
      }
    }
  }

  return { sent, failed }
}

// ============================================================================
// Main Handler
// ============================================================================

Deno.serve(withMiddleware(async (_req, { supabase, body, origin }) => {
  const requestBody = body as MatchNotificationRequest

  if (!requestBody.postId || !isValidUUID(requestBody.postId)) {
    return new Response(
      JSON.stringify({ error: 'Valid postId is required' }),
      { status: 400, headers: addCorsHeaders({ 'Content-Type': 'application/json' }, origin) }
    )
  }

  // Always fetch post details — we need the sighting time window for the push
  // body, and locationName as a fallback. The optional locationName in the
  // request body is treated as a hint, not authoritative.
  const postLocation = await getPostLocation(supabase, requestBody.postId)
  if (!postLocation) {
    return new Response(
      JSON.stringify({ error: 'Post not found' }),
      { status: 404, headers: addCorsHeaders({ 'Content-Type': 'application/json' }, origin) }
    )
  }
  const locationName = requestBody.locationName || postLocation.locationName
  const timePhrase = formatPushTimeWindow(postLocation.timeWindow)

  // Find Tier 1 matches
  const matches = await getTierOneMatches(supabase, requestBody.postId)

  if (matches.length === 0) {
    return new Response(
      JSON.stringify({
        success: true,
        sent: 0,
        failed: 0,
        message: 'No Tier 1 matches found',
      }),
      { status: 200, headers: addCorsHeaders({ 'Content-Type': 'application/json' }, origin) }
    )
  }

  // Build notifications
  const notifications: ExpoNotification[] = matches
    .filter(m => m.push_token)
    .map(match => ({
      to: match.push_token,
      title: 'Someone may be looking for you!',
      body: timePhrase
        ? `Someone posted about ${timePhrase} at ${locationName} — were you there?`
        : `A new post was created at ${locationName} — were you there?`,
      data: {
        type: 'tier_1_match',
        postId: requestBody.postId,
        url: `backtrack://post/${requestBody.postId}`,
      },
      sound: 'default' as const,
      priority: 'high' as const,
      channelId: 'matches',
    }))

  if (notifications.length === 0) {
    return new Response(
      JSON.stringify({
        success: true,
        sent: 0,
        failed: 0,
        message: 'No push tokens for matches',
      }),
      { status: 200, headers: addCorsHeaders({ 'Content-Type': 'application/json' }, origin) }
    )
  }

  // Send to Expo
  const response = await sendToExpo(notifications)

  if (!response) {
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to send notifications' }),
      { status: 500, headers: addCorsHeaders({ 'Content-Type': 'application/json' }, origin) }
    )
  }

  // Process results and record sent notifications
  const matchesWithTokens = matches.filter(m => m.push_token)
  const { sent, failed } = await processTickets(supabase, response.data, matchesWithTokens)

  // Record successful notifications
  for (let i = 0; i < response.data.length; i++) {
    if (response.data[i].status === 'ok') {
      const match = matchesWithTokens[i]
      await recordNotification(supabase, requestBody.postId, match.user_id, match.checkin_id)
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      sent,
      failed,
      matchCount: matches.length,
    }),
    { status: 200, headers: addCorsHeaders({ 'Content-Type': 'application/json' }, origin) }
  )
}, {
  allowServiceRole: true,
  webhookSecret: Deno.env.get('WEBHOOK_SECRET') || undefined,
}))
