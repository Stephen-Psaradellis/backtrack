// ============================================================================
// Send Notification Edge Function
// ============================================================================
// This Edge Function sends push notifications to users via the Expo Push API.
// It is triggered by database webhooks when matches or messages are created.
//
// Features:
// - Fetches user push tokens from expo_push_tokens table
// - Respects user notification preferences (match/message toggles)
// - Supports batch notifications (up to 100 per request)
// - Handles invalid tokens by removing them from the database
// - Implements retry logic for transient failures
// ============================================================================

import { createClient } from 'npm:@supabase/supabase-js@2'

// ============================================================================
// Types
// ============================================================================

interface NotificationRequest {
  userId: string
  title: string
  body: string
  data?: {
    type: 'match' | 'message'
    url?: string
    id?: string
  }
}

interface BatchNotificationRequest {
  notifications: NotificationRequest[]
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

interface ExpoPushResponse {
  data: ExpoPushTicket[]
}

// ============================================================================
// Supabase Client
// ============================================================================

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

// ============================================================================
// Constants
// ============================================================================

const EXPO_PUSH_API_URL = 'https://exp.host/--/api/v2/push/send'
const MAX_BATCH_SIZE = 100
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
    throw new Error(`Failed to fetch push tokens: ${error.message}`)
  }

  return (data || []).map((row: { token: string }) => row.token)
}

/**
 * Check if a notification type is enabled for a user
 */
async function isNotificationEnabled(
  userId: string,
  notificationType: 'match' | 'message'
): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_notification_enabled', {
    p_user_id: userId,
    p_notification_type: notificationType
  })

  if (error) {
    // Default to enabled if we can't check preferences
    return true
  }

  return data === true
}

/**
 * Remove an invalid push token from the database
 */
async function removeInvalidToken(token: string): Promise<void> {
  const { error } = await supabase.rpc('remove_invalid_push_token', {
    p_token: token
  })

  if (error) {
    // Log but don't throw - token removal is not critical
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
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notifications),
    })

    if (!response.ok) {
      // Retry on 5xx errors
      if (response.status >= 500 && retryCount < MAX_RETRIES) {
        await delay(RETRY_DELAY_MS * Math.pow(2, retryCount))
        return sendToExpo(notifications, retryCount + 1)
      }

      const errorText = await response.text()
      throw new Error(`Expo Push API error: ${response.status} - ${errorText}`)
    }

    const result: ExpoPushResponse = await response.json()
    return result.data
  } catch (error) {
    // Retry on network errors
    if (retryCount < MAX_RETRIES) {
      await delay(RETRY_DELAY_MS * Math.pow(2, retryCount))
      return sendToExpo(notifications, retryCount + 1)
    }
    throw error
  }
}

/**
 * Process Expo Push API response and handle invalid tokens
 */
async function processExpoPushTickets(
  tickets: ExpoPushTicket[],
  tokens: string[]
): Promise<{ successful: number; failed: number; invalidTokens: string[] }> {
  let successful = 0
  let failed = 0
  const invalidTokens: string[] = []

  for (let i = 0; i < tickets.length; i++) {
    const ticket = tickets[i]
    const token = tokens[i]

    if (ticket.status === 'ok') {
      successful++
    } else {
      failed++

      // Check for DeviceNotRegistered error - token is invalid
      if (ticket.details?.error === 'DeviceNotRegistered') {
        invalidTokens.push(token)
        // Remove invalid token from database
        await removeInvalidToken(token)
      }
    }
  }

  return { successful, failed, invalidTokens }
}

/**
 * Send a single notification to a user
 */
async function sendNotification(request: NotificationRequest): Promise<{
  success: boolean
  sentCount: number
  failedCount: number
  skipped: boolean
  reason?: string
}> {
  const { userId, title, body, data } = request

  // Check if notification type is enabled
  if (data?.type) {
    const enabled = await isNotificationEnabled(userId, data.type)
    if (!enabled) {
      return {
        success: true,
        sentCount: 0,
        failedCount: 0,
        skipped: true,
        reason: `${data.type} notifications disabled by user`
      }
    }
  }

  // Get user's push tokens
  const tokens = await getUserPushTokens(userId)

  if (tokens.length === 0) {
    return {
      success: true,
      sentCount: 0,
      failedCount: 0,
      skipped: true,
      reason: 'No push tokens registered for user'
    }
  }

  // Build notification payloads for each token
  const notifications: ExpoNotification[] = tokens.map(token => ({
    to: token,
    title,
    body,
    data: data as Record<string, unknown>,
    sound: 'default' as const,
    priority: 'high' as const,
    channelId: 'default'
  }))

  // Send to Expo Push API
  const tickets = await sendToExpo(notifications)

  // Process response
  const result = await processExpoPushTickets(tickets, tokens)

  return {
    success: result.failed === 0,
    sentCount: result.successful,
    failedCount: result.failed,
    skipped: false
  }
}

/**
 * Send batch notifications to multiple users
 */
async function sendBatchNotifications(
  requests: NotificationRequest[]
): Promise<{
  totalSent: number
  totalFailed: number
  totalSkipped: number
  results: Array<{
    userId: string
    success: boolean
    sentCount: number
    failedCount: number
    skipped: boolean
    reason?: string
  }>
}> {
  let totalSent = 0
  let totalFailed = 0
  let totalSkipped = 0
  const results: Array<{
    userId: string
    success: boolean
    sentCount: number
    failedCount: number
    skipped: boolean
    reason?: string
  }> = []

  // Process in batches to respect Expo rate limits
  for (let i = 0; i < requests.length; i += MAX_BATCH_SIZE) {
    const batch = requests.slice(i, i + MAX_BATCH_SIZE)

    // Process each notification in the batch
    for (const request of batch) {
      try {
        const result = await sendNotification(request)
        results.push({
          userId: request.userId,
          ...result
        })

        totalSent += result.sentCount
        totalFailed += result.failedCount
        if (result.skipped) {
          totalSkipped++
        }
      } catch (error) {
        results.push({
          userId: request.userId,
          success: false,
          sentCount: 0,
          failedCount: 1,
          skipped: false,
          reason: error instanceof Error ? error.message : 'Unknown error'
        })
        totalFailed++
      }
    }
  }

  return {
    totalSent,
    totalFailed,
    totalSkipped,
    results
  }
}

// ============================================================================
// Edge Function Handler
// ============================================================================

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      },
    })
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  try {
    const body = await req.json()

    // Check if this is a batch request or single notification
    if ('notifications' in body && Array.isArray(body.notifications)) {
      // Batch notification request
      const batchRequest = body as BatchNotificationRequest

      if (batchRequest.notifications.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No notifications provided' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      const result = await sendBatchNotifications(batchRequest.notifications)

      return new Response(
        JSON.stringify({
          success: result.totalFailed === 0,
          totalSent: result.totalSent,
          totalFailed: result.totalFailed,
          totalSkipped: result.totalSkipped,
          results: result.results
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    } else {
      // Single notification request
      const notificationRequest = body as NotificationRequest

      // Validate required fields
      if (!notificationRequest.userId) {
        return new Response(
          JSON.stringify({ error: 'userId is required' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      if (!notificationRequest.title) {
        return new Response(
          JSON.stringify({ error: 'title is required' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      if (!notificationRequest.body) {
        return new Response(
          JSON.stringify({ error: 'body is required' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      const result = await sendNotification(notificationRequest)

      return new Response(
        JSON.stringify({
          success: result.success,
          sentCount: result.sentCount,
          failedCount: result.failedCount,
          skipped: result.skipped,
          reason: result.reason
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})
