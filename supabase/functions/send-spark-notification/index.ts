// ============================================================================
// Send Spark Notification Edge Function
// ============================================================================
// Sends "Spark" push notifications to users when someone creates a post
// at a location they frequently visit.
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

interface SparkNotificationRequest {
  post_id: string
  location_id: string
  producer_id: string
}

interface SparkRecipient {
  user_id: string
  location_name: string
}

interface ExpoNotification {
  to: string
  title: string
  body: string
  data?: Record<string, unknown>
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

async function getUserPushTokens(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string
): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_user_push_tokens', {
    p_user_id: userId
  })

  if (error) {
    console.error(`Failed to fetch push tokens for user:`, error)
    return []
  }

  return (data || []).map((row: { token: string }) => row.token)
}

async function removeInvalidToken(
  supabase: ReturnType<typeof createServiceClient>,
  token: string
): Promise<void> {
  const { error } = await supabase.rpc('remove_invalid_push_token', {
    p_token: token
  })

  if (error) {
    console.error('Failed to remove invalid token:', error)
  }
}

async function getSparkRecipients(
  supabase: ReturnType<typeof createServiceClient>,
  postId: string,
  locationId: string,
  producerId: string
): Promise<SparkRecipient[]> {
  const { data, error } = await supabase.rpc('get_spark_notification_recipients', {
    p_post_id: postId,
    p_location_id: locationId,
    p_producer_id: producerId
  })

  if (error) {
    console.error('Failed to get spark recipients:', error)
    return []
  }

  return data || []
}

async function recordNotificationsSent(
  supabase: ReturnType<typeof createServiceClient>,
  userIds: string[],
  postId: string,
  locationId: string
): Promise<void> {
  const { error } = await supabase.rpc('record_spark_notification_sent', {
    p_user_ids: userIds,
    p_post_id: postId,
    p_location_id: locationId
  })

  if (error) {
    console.error('Failed to record notifications sent:', error)
  }
}

async function sendToExpo(
  notifications: ExpoNotification[],
  retryCount = 0
): Promise<ExpoPushTicket[]> {
  if (notifications.length === 0) {
    return []
  }

  try {
    const response = await fetch(EXPO_PUSH_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(notifications)
    })

    if (!response.ok) {
      if (response.status >= 500 && retryCount < MAX_RETRIES) {
        await delay(RETRY_DELAY_MS * Math.pow(2, retryCount))
        return sendToExpo(notifications, retryCount + 1)
      }
      throw new Error(`Expo API returned ${response.status}`)
    }

    const result = await response.json()
    return result.data || []
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      await delay(RETRY_DELAY_MS * Math.pow(2, retryCount))
      return sendToExpo(notifications, retryCount + 1)
    }
    throw error
  }
}

async function processTickets(
  supabase: ReturnType<typeof createServiceClient>,
  tickets: ExpoPushTicket[],
  tokens: string[]
): Promise<{ sent: number; failed: number }> {
  let sent = 0
  let failed = 0

  for (let i = 0; i < tickets.length; i++) {
    const ticket = tickets[i]
    const token = tokens[i]

    if (ticket.status === 'ok') {
      sent++
    } else {
      failed++

      if (ticket.details?.error === 'DeviceNotRegistered') {
        await removeInvalidToken(supabase, token)
      }
    }
  }

  return { sent, failed }
}

// ============================================================================
// Main Handler
// ============================================================================

Deno.serve(withMiddleware(async (_req, { supabase, body, origin }) => {
  const { post_id, location_id, producer_id } = body as SparkNotificationRequest

  // Validate required fields
  if (!post_id || !isValidUUID(post_id) || !location_id || !isValidUUID(location_id) || !producer_id || !isValidUUID(producer_id)) {
    return new Response(JSON.stringify({
      error: 'Missing or invalid required fields',
      required: ['post_id', 'location_id', 'producer_id']
    }), {
      status: 400,
      headers: addCorsHeaders({ 'Content-Type': 'application/json' }, origin)
    })
  }

  // Get recipients
  const recipients = await getSparkRecipients(supabase, post_id, location_id, producer_id)

  if (recipients.length === 0) {
    return new Response(JSON.stringify({
      success: true,
      sent: 0,
      message: 'No eligible recipients'
    }), {
      status: 200,
      headers: addCorsHeaders({ 'Content-Type': 'application/json' }, origin)
    })
  }

  // Build notifications for each recipient
  const allNotifications: ExpoNotification[] = []
  const tokenToUserMap: Map<string, string> = new Map()
  const allTokens: string[] = []

  for (const recipient of recipients) {
    const tokens = await getUserPushTokens(supabase, recipient.user_id)

    for (const token of tokens) {
      allNotifications.push({
        to: token,
        title: 'Spark at your spot!',
        body: `Someone posted at ${recipient.location_name} - a place you frequent!`,
        data: {
          type: 'spark',
          post_id,
          location_id,
          url: `backtrack://post/${post_id}`
        },
        sound: 'default',
        priority: 'high',
        channelId: 'default'
      })

      tokenToUserMap.set(token, recipient.user_id)
      allTokens.push(token)
    }
  }

  if (allNotifications.length === 0) {
    return new Response(JSON.stringify({
      success: true,
      sent: 0,
      message: 'No push tokens for recipients'
    }), {
      status: 200,
      headers: addCorsHeaders({ 'Content-Type': 'application/json' }, origin)
    })
  }

  // Send notifications
  const tickets = await sendToExpo(allNotifications)

  // Process results
  const { sent, failed } = await processTickets(supabase, tickets, allTokens)

  // Record sent notifications
  const successfulUserIds = [...new Set(
    tickets
      .map((ticket, i) => ticket.status === 'ok' ? tokenToUserMap.get(allTokens[i]) : null)
      .filter((id): id is string => id !== null)
  )]

  if (successfulUserIds.length > 0) {
    await recordNotificationsSent(supabase, successfulUserIds, post_id, location_id)
  }

  return new Response(JSON.stringify({
    success: true,
    sent,
    failed,
    recipientCount: recipients.length
  }), {
    status: 200,
    headers: addCorsHeaders({ 'Content-Type': 'application/json' }, origin)
  })
}, {
  allowServiceRole: true,
  webhookSecret: Deno.env.get('WEBHOOK_SECRET') || undefined,
}))
