/**
 * Event Details API Route
 *
 * Fetches detailed information about a specific event.
 * First checks the database cache, then falls back to external API if needed.
 *
 * Path Parameters:
 * - id: Event ID (either database UUID or external_id:platform format)
 *
 * Query Parameters:
 * - refresh: If "true", force refresh from external API (optional)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getEventDetails as getEventbriteDetails,
  normalizeEvent as normalizeEventbriteEvent,
  EventbriteApiError,
  shouldUseMockEventbrite,
} from '@/lib/api/eventbrite'
import {
  getEventDetails as getMeetupDetails,
  normalizeEvent as normalizeMeetupEvent,
  MeetupApiError,
  shouldUseMockMeetup,
} from '@/lib/api/meetup'

// ============================================================================
// Types
// ============================================================================

interface CachedEvent {
  id: string
  external_id: string
  platform: 'eventbrite' | 'meetup'
  title: string
  description: string | null
  date_time: string
  end_time: string | null
  venue_name: string | null
  venue_address: string | null
  latitude: number | null
  longitude: number | null
  image_url: string | null
  url: string | null
  category: string | null
  created_at: string
  synced_at: string
}

interface EventDetailsResponse {
  event: CachedEvent & {
    post_count: number
    is_past: boolean
    has_ended: boolean
  }
  source: 'cache' | 'api'
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if an event has ended based on its end_time or date_time
 */
function hasEventEnded(event: CachedEvent): boolean {
  const now = new Date()
  const endTime = event.end_time ? new Date(event.end_time) : null
  const startTime = new Date(event.date_time)

  if (endTime) {
    return now > endTime
  }

  // If no end time, consider event ended 3 hours after start
  const estimatedEnd = new Date(startTime.getTime() + 3 * 60 * 60 * 1000)
  return now > estimatedEnd
}

/**
 * Check if an event is in the past (has started)
 */
function isEventPast(event: CachedEvent): boolean {
  const now = new Date()
  const startTime = new Date(event.date_time)
  return now > startTime
}

/**
 * Get user's OAuth token for a provider
 */
async function getUserToken(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  provider: 'eventbrite' | 'meetup'
): Promise<string | null> {
  const { data } = await supabase
    .from('user_event_tokens')
    .select('access_token, expires_at')
    .eq('user_id', userId)
    .eq('provider', provider)
    .single()

  if (!data) return null

  // Check if token is expired (with 5 minute buffer)
  if (data.expires_at) {
    const expiresAt = new Date(data.expires_at)
    const bufferMs = 5 * 60 * 1000 // 5 minutes
    if (new Date().getTime() >= expiresAt.getTime() - bufferMs) {
      return null
    }
  }

  return data.access_token
}

/**
 * Fetch event from external API and cache it
 */
async function fetchAndCacheEvent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  externalId: string,
  platform: 'eventbrite' | 'meetup',
  accessToken: string | null
): Promise<CachedEvent | null> {
  // In dev mode with mock, we don't need a token
  const useMock = platform === 'eventbrite' ? shouldUseMockEventbrite() : shouldUseMockMeetup()

  if (!useMock && !accessToken) {
    return null
  }

  try {
    let normalizedEvent: {
      externalId: string
      platform: 'eventbrite' | 'meetup'
      title: string
      description: string | null
      dateTime: string
      endTime: string | null
      venueName: string | null
      venueAddress: string | null
      latitude: number | null
      longitude: number | null
      url: string
    }

    if (platform === 'eventbrite') {
      const event = await getEventbriteDetails(accessToken || 'mock_token', externalId)
      normalizedEvent = normalizeEventbriteEvent(event)
    } else {
      const event = await getMeetupDetails(accessToken || 'mock_token', externalId)
      normalizedEvent = normalizeMeetupEvent(event)
    }

    // Cache in database
    const { data, error } = await supabase
      .from('events')
      .upsert(
        {
          external_id: normalizedEvent.externalId,
          platform: normalizedEvent.platform,
          title: normalizedEvent.title,
          description: normalizedEvent.description,
          date_time: normalizedEvent.dateTime,
          end_time: normalizedEvent.endTime,
          venue_name: normalizedEvent.venueName,
          venue_address: normalizedEvent.venueAddress,
          latitude: normalizedEvent.latitude,
          longitude: normalizedEvent.longitude,
          url: normalizedEvent.url,
          synced_at: new Date().toISOString(),
        },
        {
          onConflict: 'external_id,platform',
          ignoreDuplicates: false,
        }
      )
      .select()
      .single()

    if (error || !data) {
      return null
    }

    return data as CachedEvent
  } catch (err) {
    // Log error but don't throw - return null to indicate fetch failed
    if (err instanceof EventbriteApiError || err instanceof MeetupApiError) {
      // API errors are expected in some cases (event not found, token expired, etc.)
      return null
    }
    return null
  }
}

/**
 * Get post count for an event
 */
async function getPostCount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string
): Promise<number> {
  const { count } = await supabase
    .from('event_posts')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId)

  return count || 0
}

// ============================================================================
// Route Handler
// ============================================================================

/**
 * GET /api/events/[id]
 *
 * Get details for a specific event
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const forceRefresh = searchParams.get('refresh') === 'true'

    if (!id) {
      return NextResponse.json(
        { error: 'Missing event ID' },
        { status: 400 }
      )
    }

    // Create Supabase client
    const supabase = await createClient()

    // Get current user (optional - events can be viewed without auth)
    const { data: { user } } = await supabase.auth.getUser()

    // Check if ID is in format "external_id:platform"
    let cachedEvent: CachedEvent | null = null
    let source: 'cache' | 'api' = 'cache'

    // Try to parse as external_id:platform
    const externalIdMatch = id.match(/^(.+):(eventbrite|meetup)$/)

    if (externalIdMatch) {
      // Lookup by external_id and platform
      const [, externalId, platform] = externalIdMatch
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('external_id', externalId)
        .eq('platform', platform)
        .single()

      cachedEvent = data as CachedEvent | null

      // If not found or force refresh, try to fetch from API
      if (!cachedEvent || forceRefresh) {
        let accessToken: string | null = null
        if (user) {
          accessToken = await getUserToken(supabase, user.id, platform as 'eventbrite' | 'meetup')
        }

        const fetchedEvent = await fetchAndCacheEvent(
          supabase,
          externalId,
          platform as 'eventbrite' | 'meetup',
          accessToken
        )

        if (fetchedEvent) {
          cachedEvent = fetchedEvent
          source = 'api'
        }
      }
    } else {
      // Try to lookup by database UUID
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single()

      cachedEvent = data as CachedEvent | null

      // If found and force refresh, try to refresh from API
      if (cachedEvent && forceRefresh) {
        let accessToken: string | null = null
        if (user) {
          accessToken = await getUserToken(supabase, user.id, cachedEvent.platform)
        }

        const fetchedEvent = await fetchAndCacheEvent(
          supabase,
          cachedEvent.external_id,
          cachedEvent.platform,
          accessToken
        )

        if (fetchedEvent) {
          cachedEvent = fetchedEvent
          source = 'api'
        }
      }
    }

    // Event not found
    if (!cachedEvent) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // Get post count
    const postCount = await getPostCount(supabase, cachedEvent.id)

    // Build response
    const response: EventDetailsResponse = {
      event: {
        ...cachedEvent,
        post_count: postCount,
        is_past: isEventPast(cachedEvent),
        has_ended: hasEventEnded(cachedEvent),
      },
      source,
    }

    return NextResponse.json(response)
  } catch (error) {
    // Log error for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

    return NextResponse.json(
      { error: 'Failed to fetch event details', details: errorMessage },
      { status: 500 }
    )
  }
}
