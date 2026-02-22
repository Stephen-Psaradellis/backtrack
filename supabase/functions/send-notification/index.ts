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
//
// Security:
// - Requires service role key or webhook signature for authentication
// - CORS restricted to allowed origins only
// - Error details sanitized in responses
// ============================================================================

import {
  withMiddleware,
  addCorsHeaders,
  sanitizeError,
  createServiceClient,
  isValidUUID,
  sanitizeNotificationContent,
} from '../_shared/middleware.ts'

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
// Constants
// ============================================================================

const EXPO_PUSH_API_URL = 'https://exp.host/--/api/v2/push/send'
const MAX_BATCH_SIZE = 100
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

// ============================================================================
// Helper Functions
// ============================================================================

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function getUserPushTokens(supabase: ReturnType<typeof createServiceClient>, userId: string): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_user_push_tokens', {
    p_user_id: userId
  })

  if (error) {
    throw new Error('Failed to fetch push tokens')
  }

  return (data || []).map((row: { token: string }) => row.token)
}

async function isNotificationEnabled(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  notificationType: 'match' | 'message'
): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_notification_enabled', {
    p_user_id: userId,
    p_notification_type: notificationType
  })

  if (error) {
    return true
  }

  return data === true
}

async function removeInvalidToken(supabase: ReturnType<typeof createServiceClient>, token: string): Promise<void> {
  await supabase.rpc('remove_invalid_push_token', {
    p_token: token
  })
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
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notifications),
    })

    if (!response.ok) {
      if (response.status >= 500 && retryCount < MAX_RETRIES) {
        await delay(RETRY_DELAY_MS * Math.pow(2, retryCount))
        return sendToExpo(notifications, retryCount + 1)
      }

      throw new Error(`Expo Push API error: ${response.status}`)
    }

    const result: ExpoPushResponse = await response.json()
    return result.data
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      await delay(RETRY_DELAY_MS * Math.pow(2, retryCount))
      return sendToExpo(notifications, retryCount + 1)
    }
    throw error
  }
}

async function processExpoPushTickets(
  supabase: ReturnType<typeof createServiceClient>,
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

      if (ticket.details?.error === 'DeviceNotRegistered') {
        invalidTokens.push(token)
        await removeInvalidToken(supabase, token)
      }
    }
  }

  return { successful, failed, invalidTokens }
}

async function sendNotification(
  supabase: ReturnType<typeof createServiceClient>,
  request: NotificationRequest
): Promise<{
  success: boolean
  sentCount: number
  failedCount: number
  skipped: boolean
  reason?: string
}> {
  const userId = request.userId
  const title = sanitizeNotificationContent(request.title, 200)
  const body = sanitizeNotificationContent(request.body, 500)
  const data = request.data

  if (data?.type) {
    const enabled = await isNotificationEnabled(supabase, userId, data.type)
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

  const tokens = await getUserPushTokens(supabase, userId)

  if (tokens.length === 0) {
    return {
      success: true,
      sentCount: 0,
      failedCount: 0,
      skipped: true,
      reason: 'No push tokens registered for user'
    }
  }

  const notifications: ExpoNotification[] = tokens.map(token => ({
    to: token,
    title,
    body,
    data: data as Record<string, unknown>,
    sound: 'default' as const,
    priority: 'high' as const,
    channelId: 'default'
  }))

  const tickets = await sendToExpo(notifications)
  const result = await processExpoPushTickets(supabase, tickets, tokens)

  return {
    success: result.failed === 0,
    sentCount: result.successful,
    failedCount: result.failed,
    skipped: false
  }
}

async function sendBatchNotifications(
  supabase: ReturnType<typeof createServiceClient>,
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

  for (let i = 0; i < requests.length; i += MAX_BATCH_SIZE) {
    const batch = requests.slice(i, i + MAX_BATCH_SIZE)

    for (const request of batch) {
      try {
        const result = await sendNotification(supabase, request)
        results.push({
          userId: request.userId,
          ...result
        })

        totalSent += result.sentCount
        totalFailed += result.failedCount
        if (result.skipped) {
          totalSkipped++
        }
      } catch {
        results.push({
          userId: request.userId,
          success: false,
          sentCount: 0,
          failedCount: 1,
          skipped: false,
          reason: 'Failed to send notification'
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

Deno.serve(withMiddleware(async (_req, { supabase, body, origin }) => {
  const requestBody = body as BatchNotificationRequest | NotificationRequest

  // Check if this is a batch request or single notification
  if ('notifications' in requestBody && Array.isArray(requestBody.notifications)) {
    const batchRequest = requestBody as BatchNotificationRequest

    if (batchRequest.notifications.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No notifications provided' }),
        {
          status: 400,
          headers: addCorsHeaders({ 'Content-Type': 'application/json' }, origin),
        }
      )
    }

    const result = await sendBatchNotifications(supabase, batchRequest.notifications)

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
        headers: addCorsHeaders({ 'Content-Type': 'application/json' }, origin),
      }
    )
  } else {
    const notificationRequest = requestBody as NotificationRequest

    if (!notificationRequest.userId || !isValidUUID(notificationRequest.userId)) {
      return new Response(
        JSON.stringify({ error: 'Valid userId is required' }),
        {
          status: 400,
          headers: addCorsHeaders({ 'Content-Type': 'application/json' }, origin),
        }
      )
    }

    if (!notificationRequest.title) {
      return new Response(
        JSON.stringify({ error: 'title is required' }),
        {
          status: 400,
          headers: addCorsHeaders({ 'Content-Type': 'application/json' }, origin),
        }
      )
    }

    if (!notificationRequest.body) {
      return new Response(
        JSON.stringify({ error: 'body is required' }),
        {
          status: 400,
          headers: addCorsHeaders({ 'Content-Type': 'application/json' }, origin),
        }
      )
    }

    const result = await sendNotification(supabase, notificationRequest)

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
        headers: addCorsHeaders({ 'Content-Type': 'application/json' }, origin),
      }
    )
  }
}, {
  allowServiceRole: true,
  webhookSecret: Deno.env.get('WEBHOOK_SECRET') || undefined,
}))
