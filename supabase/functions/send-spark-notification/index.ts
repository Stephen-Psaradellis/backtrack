// ============================================================================
// Send Spark Notification Edge Function
// ============================================================================
// This Edge Function sends "Spark" push notifications to users when someone
// creates a post at a location they frequently visit.
//
// Features:
// - Queries frequent visitors of the post location
// - Respects spark_notifications preference
// - Sends push notifications via Expo Push API
// - Records sent notifications to prevent duplicates
// ============================================================================

import { createClient } from 'npm:@supabase/supabase-js@2'

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
// Supabase Client
// ============================================================================

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SECRET_KEY')!

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

// ============================================================================
// Constants
// ============================================================================

const EXPO_PUSH_API_URL = 'https://exp.host/--/api/v2/push/send'
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Delay execution for a specified number of milliseconds
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Fetch all push tokens for a user
 */
async function getUserPushTokens(userId: string): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_user_push_tokens', {
    p_user_id: userId
  })

  if (error) {
    console.error(`Failed to fetch push tokens for ${userId}:`, error)
    return []
  }

  return (data || []).map((row: { token: string }) => row.token)
}

/**
 * Remove an invalid push token from the database
 */
async function removeInvalidToken(token: string): Promise<void> {
  const { error } = await supabase.rpc('remove_invalid_push_token', {
    p_token: token
  })

  if (error) {
    console.error('Failed to remove invalid token:', error)
  }
}

/**
 * Get users who should receive spark notifications for this post
 */
async function getSparkRecipients(
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

/**
 * Record that spark notifications were sent
 */
async function recordNotificationsSent(
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

/**
 * Send notifications to Expo Push API with retry logic
 */
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

/**
 * Process push tickets and handle invalid tokens
 */
async function processTickets(
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

      // Remove invalid tokens
      if (ticket.details?.error === 'DeviceNotRegistered') {
        await removeInvalidToken(token)
      }
    }
  }

  return { sent, failed }
}

// ============================================================================
// Main Handler
// ============================================================================

Deno.serve(async (req) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    const body: SparkNotificationRequest = await req.json()
    const { post_id, location_id, producer_id } = body

    // Validate required fields
    if (!post_id || !location_id || !producer_id) {
      return new Response(JSON.stringify({
        error: 'Missing required fields',
        required: ['post_id', 'location_id', 'producer_id']
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    console.log(`Processing spark notification for post ${post_id} at location ${location_id}`)

    // Get recipients
    const recipients = await getSparkRecipients(post_id, location_id, producer_id)

    if (recipients.length === 0) {
      console.log('No eligible recipients for spark notification')
      return new Response(JSON.stringify({
        success: true,
        sent: 0,
        message: 'No eligible recipients'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    console.log(`Found ${recipients.length} eligible recipients`)

    // Build notifications for each recipient
    const allNotifications: ExpoNotification[] = []
    const tokenToUserMap: Map<string, string> = new Map()
    const allTokens: string[] = []

    for (const recipient of recipients) {
      const tokens = await getUserPushTokens(recipient.user_id)

      for (const token of tokens) {
        allNotifications.push({
          to: token,
          title: 'Spark at your spot! ✨',
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
      console.log('No push tokens found for recipients')
      return new Response(JSON.stringify({
        success: true,
        sent: 0,
        message: 'No push tokens for recipients'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Send notifications
    console.log(`Sending ${allNotifications.length} notifications`)
    const tickets = await sendToExpo(allNotifications)

    // Process results
    const { sent, failed } = await processTickets(tickets, allTokens)

    // Record sent notifications
    const successfulUserIds = [...new Set(
      tickets
        .map((ticket, i) => ticket.status === 'ok' ? tokenToUserMap.get(allTokens[i]) : null)
        .filter((id): id is string => id !== null)
    )]

    if (successfulUserIds.length > 0) {
      await recordNotificationsSent(successfulUserIds, post_id, location_id)
    }

    console.log(`Spark notification complete: ${sent} sent, ${failed} failed`)

    return new Response(JSON.stringify({
      success: true,
      sent,
      failed,
      recipientCount: recipients.length
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error processing spark notification:', error)

    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
