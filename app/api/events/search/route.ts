/**
 * Event Search API Route
 *
 * Searches for events from both Eventbrite and Meetup APIs based on
 * location and filter parameters. Results are cached in the database
 * to minimize external API calls.
 *
 * Query Parameters:
 * - latitude: (required) Center point latitude
 * - longitude: (required) Center point longitude
 * - radius: Search radius (e.g., "10km", "25mi") - default: "50km"
 * - categories: Comma-separated category IDs
 * - startDate: ISO 8601 date string for start of date range
 * - endDate: ISO 8601 date string for end of date range
 * - q: Search query string
 * - page: Page number (default: 1)
 * - pageSize: Results per page (default: 20, max: 50)
 * - platforms: Comma-separated platforms to search (default: "eventbrite,meetup")
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  searchEvents as searchEventbrite,
  normalizeEvent as normalizeEventbriteEvent,
  EventbriteApiError,
  shouldUseMockEventbrite,
  type EventbriteSearchParams,
  type EventbriteEvent,
} from '@/lib/api/eventbrite'
import {
  searchEvents as searchMeetup,
  normalizeEvent as normalizeMeetupEvent,
  MeetupApiError,
  shouldUseMockMeetup,
  type MeetupSearchParams,
  type MeetupEvent,
} from '@/lib/api/meetup'

// ============================================================================
// Types
// ============================================================================

interface NormalizedEvent {
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
  post_count?: number
}

interface SearchResponse {
  events: CachedEvent[]
  pagination: {
    page: number
    pageSize: number
    totalCount: number
    hasNextPage: boolean
  }
  sources: {
    eventbrite: { searched: boolean; count: number; error?: string }
    meetup: { searched: boolean; count: number; error?: string }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse radius string to kilometers
 * Supports formats: "10km", "25mi", "10" (assumes km)
 */
function parseRadius(radius: string): number {
  const match = radius.match(/^(\d+(?:\.\d+)?)(km|mi)?$/i)
  if (!match) return 50 // Default 50km

  const value = parseFloat(match[1])
  const unit = (match[2] || 'km').toLowerCase()

  return unit === 'mi' ? value * 1.60934 : value
}

/**
 * Cache events in the database
 * Uses upsert to handle duplicates
 */
async function cacheEvents(
  supabase: Awaited<ReturnType<typeof createClient>>,
  events: NormalizedEvent[]
): Promise<CachedEvent[]> {
  if (events.length === 0) return []

  const eventsToCache = events.map((event) => ({
    external_id: event.externalId,
    platform: event.platform,
    title: event.title,
    description: event.description,
    date_time: event.dateTime,
    end_time: event.endTime,
    venue_name: event.venueName,
    venue_address: event.venueAddress,
    latitude: event.latitude,
    longitude: event.longitude,
    url: event.url,
    synced_at: new Date().toISOString(),
  }))

  const { data, error } = await supabase
    .from('events')
    .upsert(eventsToCache, {
      onConflict: 'external_id,platform',
      ignoreDuplicates: false,
    })
    .select()

  if (error) {
    // Log error but don't fail - we can still return events without caching
    return []
  }

  return (data || []) as CachedEvent[]
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
      // Token is expired - caller should handle refresh
      return null
    }
  }

  return data.access_token
}

/**
 * Search Eventbrite API
 */
async function searchEventbriteApi(
  accessToken: string | null,
  params: EventbriteSearchParams
): Promise<{ events: NormalizedEvent[]; count: number; error?: string }> {
  // In dev mode with mock, we don't need a token
  if (shouldUseMockEventbrite()) {
    try {
      const result = await searchEventbrite('mock_token', params)
      return {
        events: result.events.map((event: EventbriteEvent) => normalizeEventbriteEvent(event)),
        count: result.events.length,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return { events: [], count: 0, error: message }
    }
  }

  if (!accessToken) {
    return { events: [], count: 0, error: 'No Eventbrite token' }
  }

  try {
    const result = await searchEventbrite(accessToken, params)
    return {
      events: result.events.map((event: EventbriteEvent) => normalizeEventbriteEvent(event)),
      count: result.events.length,
    }
  } catch (err) {
    if (err instanceof EventbriteApiError) {
      return { events: [], count: 0, error: err.message }
    }
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { events: [], count: 0, error: message }
  }
}

/**
 * Search Meetup API
 */
async function searchMeetupApi(
  accessToken: string | null,
  params: MeetupSearchParams
): Promise<{ events: NormalizedEvent[]; count: number; error?: string }> {
  // In dev mode with mock, we don't need a token
  if (shouldUseMockMeetup()) {
    try {
      const result = await searchMeetup('mock_token', params)
      return {
        events: result.events.map((event: MeetupEvent) => normalizeMeetupEvent(event)),
        count: result.events.length,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return { events: [], count: 0, error: message }
    }
  }

  if (!accessToken) {
    return { events: [], count: 0, error: 'No Meetup token' }
  }

  try {
    const result = await searchMeetup(accessToken, params)
    return {
      events: result.events.map((event: MeetupEvent) => normalizeMeetupEvent(event)),
      count: result.events.length,
    }
  } catch (err) {
    if (err instanceof MeetupApiError) {
      return { events: [], count: 0, error: err.message }
    }
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { events: [], count: 0, error: message }
  }
}

// ============================================================================
// Route Handler
// ============================================================================

/**
 * GET /api/events/search
 *
 * Search for events from external APIs and cached database
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    // Parse required parameters
    const latitudeStr = searchParams.get('latitude')
    const longitudeStr = searchParams.get('longitude')

    if (!latitudeStr || !longitudeStr) {
      return NextResponse.json(
        { error: 'Missing required parameters: latitude and longitude' },
        { status: 400 }
      )
    }

    const latitude = parseFloat(latitudeStr)
    const longitude = parseFloat(longitudeStr)

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { error: 'Invalid latitude or longitude values' },
        { status: 400 }
      )
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { error: 'Latitude must be -90 to 90, longitude must be -180 to 180' },
        { status: 400 }
      )
    }

    // Parse optional parameters
    const radiusStr = searchParams.get('radius') || '50km'
    const radiusKm = parseRadius(radiusStr)
    const categories = searchParams.get('categories')?.split(',').filter(Boolean) || []
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined
    const query = searchParams.get('q') || undefined
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)))
    const platformsParam = searchParams.get('platforms') || 'eventbrite,meetup'
    const platforms = platformsParam.split(',').filter((p) => ['eventbrite', 'meetup'].includes(p))

    // Create Supabase client
    const supabase = await createClient()

    // Get current user (optional - events can be searched without auth)
    const { data: { user } } = await supabase.auth.getUser()

    // Get OAuth tokens if user is authenticated
    let eventbriteToken: string | null = null
    let meetupToken: string | null = null

    if (user) {
      const [ebToken, mtToken] = await Promise.all([
        platforms.includes('eventbrite') ? getUserToken(supabase, user.id, 'eventbrite') : null,
        platforms.includes('meetup') ? getUserToken(supabase, user.id, 'meetup') : null,
      ])
      eventbriteToken = ebToken
      meetupToken = mtToken
    }

    // Prepare search parameters for each API
    const eventbriteParams: EventbriteSearchParams = {
      latitude,
      longitude,
      radius: `${radiusKm}km`,
      categories: categories.length > 0 ? categories : undefined,
      startDate,
      endDate,
      q: query,
      page,
      pageSize,
    }

    const meetupParams: MeetupSearchParams = {
      latitude,
      longitude,
      radius: Math.round(radiusKm * 0.621371), // Convert km to miles for Meetup
      topicCategoryId: categories[0], // Meetup only supports single category
      startDate,
      endDate,
      query,
      first: pageSize,
    }

    // Search APIs in parallel
    const searchPromises: Promise<{ events: NormalizedEvent[]; count: number; error?: string }>[] = []

    const searchEventbrite = platforms.includes('eventbrite')
    const searchMeetupFlag = platforms.includes('meetup')

    if (searchEventbrite) {
      searchPromises.push(searchEventbriteApi(eventbriteToken, eventbriteParams))
    }

    if (searchMeetupFlag) {
      searchPromises.push(searchMeetupApi(meetupToken, meetupParams))
    }

    const searchResults = await Promise.all(searchPromises)

    // Extract results based on which platforms were searched
    let resultIndex = 0
    const eventbriteResult = searchEventbrite ? searchResults[resultIndex++] : { events: [], count: 0, error: 'Platform not requested' }
    const meetupResult = searchMeetupFlag ? searchResults[resultIndex++] : { events: [], count: 0, error: 'Platform not requested' }

    // Combine all events
    const allNormalizedEvents: NormalizedEvent[] = [
      ...eventbriteResult.events,
      ...meetupResult.events,
    ]

    // Cache events in database
    await cacheEvents(supabase, allNormalizedEvents)

    // Query cached events from database for consistent response
    // This ensures we have IDs and any additional fields from the cache
    let cachedEvents: CachedEvent[] = []

    if (allNormalizedEvents.length > 0) {
      const externalIds = allNormalizedEvents.map((e) => e.externalId)

      const { data: cached } = await supabase
        .from('events')
        .select('*')
        .in('external_id', externalIds)
        .order('date_time', { ascending: true })
        .range((page - 1) * pageSize, page * pageSize - 1)

      cachedEvents = (cached || []) as CachedEvent[]

      // Add post counts
      if (cachedEvents.length > 0) {
        const eventIds = cachedEvents.map((e) => e.id)
        const { data: postCounts } = await supabase
          .from('event_posts')
          .select('event_id')
          .in('event_id', eventIds)

        const countMap = new Map<string, number>()
        postCounts?.forEach((pc: { event_id: string }) => {
          countMap.set(pc.event_id, (countMap.get(pc.event_id) || 0) + 1)
        })

        cachedEvents = cachedEvents.map((event) => ({
          ...event,
          post_count: countMap.get(event.id) || 0,
        }))
      }
    }

    // Build response
    const response: SearchResponse = {
      events: cachedEvents,
      pagination: {
        page,
        pageSize,
        totalCount: eventbriteResult.count + meetupResult.count,
        hasNextPage: cachedEvents.length === pageSize,
      },
      sources: {
        eventbrite: {
          searched: searchEventbrite,
          count: eventbriteResult.count,
          error: eventbriteResult.error,
        },
        meetup: {
          searched: searchMeetupFlag,
          count: meetupResult.count,
          error: meetupResult.error,
        },
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    // Log error for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

    return NextResponse.json(
      { error: 'Failed to search events', details: errorMessage },
      { status: 500 }
    )
  }
}
