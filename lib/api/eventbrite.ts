/**
 * Eventbrite API Client
 *
 * Provides OAuth authentication and event data fetching from Eventbrite API v3.
 *
 * In development mode with missing credentials, functions return mock data
 * to allow the app to run without a real Eventbrite connection.
 *
 * In production, credentials are required.
 */

import { isDevMode, isProductionMode } from '@/lib/dev'

// Eventbrite API endpoints
const EVENTBRITE_OAUTH_URL = 'https://www.eventbrite.com/oauth/authorize'
const EVENTBRITE_TOKEN_URL = 'https://www.eventbrite.com/oauth/token'
const EVENTBRITE_API_BASE = 'https://www.eventbriteapi.com/v3'

// ============================================================================
// Types
// ============================================================================

export interface EventbriteVenue {
  id: string
  name: string
  address: {
    address_1?: string
    address_2?: string
    city?: string
    region?: string
    postal_code?: string
    country?: string
    localized_address_display?: string
    localized_area_display?: string
  }
  latitude?: string
  longitude?: string
}

export interface EventbriteOrganizer {
  id: string
  name: string
  description?: {
    text?: string
    html?: string
  }
  logo?: {
    url?: string
  }
}

export interface EventbriteCategory {
  id: string
  name: string
  short_name: string
}

export interface EventbriteEvent {
  id: string
  name: {
    text: string
    html: string
  }
  description?: {
    text?: string
    html?: string
  }
  url: string
  start: {
    timezone: string
    local: string
    utc: string
  }
  end: {
    timezone: string
    local: string
    utc: string
  }
  created: string
  changed: string
  published: string
  status: 'draft' | 'live' | 'started' | 'ended' | 'completed' | 'canceled'
  currency?: string
  online_event: boolean
  logo?: {
    id: string
    url: string
  }
  venue_id?: string
  venue?: EventbriteVenue
  organizer_id?: string
  organizer?: EventbriteOrganizer
  category_id?: string
  category?: EventbriteCategory
  is_free?: boolean
  capacity?: number
}

export interface EventbriteSearchParams {
  latitude: number
  longitude: number
  radius?: string // e.g., "10km", "25mi"
  categories?: string[] // Category IDs
  startDate?: string // ISO 8601 format
  endDate?: string // ISO 8601 format
  q?: string // Search query
  page?: number
  pageSize?: number
}

export interface EventbriteSearchResult {
  events: EventbriteEvent[]
  pagination: {
    pageNumber: number
    pageSize: number
    pageCount: number
    objectCount: number
    hasMoreItems: boolean
  }
}

export interface EventbriteTokens {
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
  tokenType: string
}

export interface EventbriteError {
  status: number
  error: string
  errorDescription?: string
  isRateLimit?: boolean
  isTokenExpired?: boolean
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Check if Eventbrite credentials are available
 */
function hasEventbriteCredentials(): boolean {
  return !!(
    process.env.EVENTBRITE_CLIENT_ID &&
    process.env.EVENTBRITE_CLIENT_SECRET
  )
}

/**
 * Check if mock Eventbrite client should be used
 */
export function shouldUseMockEventbrite(): boolean {
  return isDevMode() && !hasEventbriteCredentials()
}

/**
 * Get Eventbrite configuration
 * Throws in production if credentials are missing
 */
function getConfig() {
  const clientId = process.env.EVENTBRITE_CLIENT_ID
  const clientSecret = process.env.EVENTBRITE_CLIENT_SECRET
  const redirectUri = process.env.EVENTBRITE_REDIRECT_URI

  if (isProductionMode()) {
    if (!clientId) {
      throw new Error(
        'Missing EVENTBRITE_CLIENT_ID environment variable. ' +
        'This is required in production.'
      )
    }
    if (!clientSecret) {
      throw new Error(
        'Missing EVENTBRITE_CLIENT_SECRET environment variable. ' +
        'This is required in production.'
      )
    }
    if (!redirectUri) {
      throw new Error(
        'Missing EVENTBRITE_REDIRECT_URI environment variable. ' +
        'This is required in production.'
      )
    }
  }

  return {
    clientId: clientId || '',
    clientSecret: clientSecret || '',
    redirectUri: redirectUri || 'http://localhost:3000/api/auth/eventbrite',
  }
}

// ============================================================================
// OAuth Functions
// ============================================================================

/**
 * Generate the OAuth authorization URL
 * Users should be redirected to this URL to authorize the app
 */
export function getAuthorizationUrl(state?: string): string {
  const config = getConfig()

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
  })

  if (state) {
    params.set('state', state)
  }

  return `${EVENTBRITE_OAUTH_URL}?${params.toString()}`
}

/**
 * Exchange authorization code for access tokens
 */
export async function exchangeCodeForTokens(
  code: string
): Promise<EventbriteTokens> {
  if (shouldUseMockEventbrite()) {
    return getMockTokens()
  }

  const config = getConfig()

  const response = await fetch(EVENTBRITE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri,
    }),
  })

  if (!response.ok) {
    const error = await parseErrorResponse(response)
    throw new EventbriteApiError(error)
  }

  const data = await response.json()

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    tokenType: data.token_type || 'Bearer',
    // Eventbrite tokens don't typically expire, but we track it if provided
    expiresAt: data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000)
      : undefined,
  }
}

/**
 * Refresh an expired access token
 * Note: Eventbrite tokens typically don't expire, but this is implemented
 * for completeness and future compatibility
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<EventbriteTokens> {
  if (shouldUseMockEventbrite()) {
    return getMockTokens()
  }

  const config = getConfig()

  const response = await fetch(EVENTBRITE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) {
    const error = await parseErrorResponse(response)
    throw new EventbriteApiError(error)
  }

  const data = await response.json()

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    tokenType: data.token_type || 'Bearer',
    expiresAt: data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000)
      : undefined,
  }
}

// ============================================================================
// Event Search Functions
// ============================================================================

/**
 * Search for events by location and filters
 */
export async function searchEvents(
  accessToken: string,
  params: EventbriteSearchParams
): Promise<EventbriteSearchResult> {
  if (shouldUseMockEventbrite()) {
    return getMockSearchResults(params)
  }

  const queryParams = new URLSearchParams()

  // Location-based search
  queryParams.set('location.latitude', params.latitude.toString())
  queryParams.set('location.longitude', params.longitude.toString())

  if (params.radius) {
    queryParams.set('location.within', params.radius)
  }

  // Category filter
  if (params.categories && params.categories.length > 0) {
    queryParams.set('categories', params.categories.join(','))
  }

  // Date range filter
  if (params.startDate) {
    queryParams.set('start_date.range_start', params.startDate)
  }
  if (params.endDate) {
    queryParams.set('start_date.range_end', params.endDate)
  }

  // Search query
  if (params.q) {
    queryParams.set('q', params.q)
  }

  // Pagination
  queryParams.set('page', (params.page || 1).toString())
  if (params.pageSize) {
    queryParams.set('page_size', Math.min(params.pageSize, 50).toString())
  }

  // Expand related objects
  queryParams.set('expand', 'venue,organizer,category')

  const url = `${EVENTBRITE_API_BASE}/events/search/?${queryParams.toString()}`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await parseErrorResponse(response)
    throw new EventbriteApiError(error)
  }

  const data = await response.json()

  return {
    events: data.events || [],
    pagination: {
      pageNumber: data.pagination?.page_number || 1,
      pageSize: data.pagination?.page_size || 50,
      pageCount: data.pagination?.page_count || 1,
      objectCount: data.pagination?.object_count || 0,
      hasMoreItems: data.pagination?.has_more_items || false,
    },
  }
}

/**
 * Get details for a specific event
 */
export async function getEventDetails(
  accessToken: string,
  eventId: string
): Promise<EventbriteEvent> {
  if (shouldUseMockEventbrite()) {
    return getMockEvent(eventId)
  }

  const queryParams = new URLSearchParams({
    expand: 'venue,organizer,category',
  })

  const url = `${EVENTBRITE_API_BASE}/events/${eventId}/?${queryParams.toString()}`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await parseErrorResponse(response)
    throw new EventbriteApiError(error)
  }

  return await response.json()
}

/**
 * Get available event categories
 */
export async function getCategories(
  accessToken: string
): Promise<EventbriteCategory[]> {
  if (shouldUseMockEventbrite()) {
    return getMockCategories()
  }

  const url = `${EVENTBRITE_API_BASE}/categories/`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await parseErrorResponse(response)
    throw new EventbriteApiError(error)
  }

  const data = await response.json()
  return data.categories || []
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Custom error class for Eventbrite API errors
 */
export class EventbriteApiError extends Error {
  public status: number
  public errorCode: string
  public isRateLimit: boolean
  public isTokenExpired: boolean

  constructor(error: EventbriteError) {
    super(error.errorDescription || error.error)
    this.name = 'EventbriteApiError'
    this.status = error.status
    this.errorCode = error.error
    this.isRateLimit = error.isRateLimit || false
    this.isTokenExpired = error.isTokenExpired || false
  }
}

/**
 * Parse error response from Eventbrite API
 */
async function parseErrorResponse(response: Response): Promise<EventbriteError> {
  let errorData: Record<string, unknown> = {}

  try {
    errorData = await response.json()
  } catch {
    // Response might not be JSON
  }

  const isRateLimit = response.status === 429
  const isTokenExpired =
    response.status === 401 &&
    (errorData.error === 'INVALID_AUTH' || errorData.error === 'NOT_AUTHORIZED')

  return {
    status: response.status,
    error: (errorData.error as string) || `HTTP ${response.status}`,
    errorDescription: (errorData.error_description as string) || response.statusText,
    isRateLimit,
    isTokenExpired,
  }
}

// ============================================================================
// Mock Data (Development Mode)
// ============================================================================

function getMockTokens(): EventbriteTokens {
  return {
    accessToken: 'mock_eventbrite_access_token',
    refreshToken: 'mock_eventbrite_refresh_token',
    tokenType: 'Bearer',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  }
}

function getMockEvent(eventId: string): EventbriteEvent {
  return {
    id: eventId,
    name: {
      text: 'Mock Eventbrite Event',
      html: '<p>Mock Eventbrite Event</p>',
    },
    description: {
      text: 'This is a mock event for development purposes.',
      html: '<p>This is a mock event for development purposes.</p>',
    },
    url: `https://www.eventbrite.com/e/${eventId}`,
    start: {
      timezone: 'America/New_York',
      local: '2024-12-31T19:00:00',
      utc: '2024-12-31T00:00:00Z',
    },
    end: {
      timezone: 'America/New_York',
      local: '2024-12-31T23:00:00',
      utc: '2025-01-01T04:00:00Z',
    },
    created: '2024-01-01T00:00:00Z',
    changed: '2024-01-01T00:00:00Z',
    published: '2024-01-01T00:00:00Z',
    status: 'live',
    online_event: false,
    is_free: false,
    capacity: 500,
    venue: {
      id: 'venue_1',
      name: 'Mock Venue',
      address: {
        address_1: '123 Main Street',
        city: 'New York',
        region: 'NY',
        postal_code: '10001',
        country: 'US',
        localized_address_display: '123 Main Street, New York, NY 10001',
      },
      latitude: '40.7128',
      longitude: '-74.0060',
    },
    organizer: {
      id: 'organizer_1',
      name: 'Mock Organizer',
    },
    category: {
      id: '103',
      name: 'Music',
      short_name: 'music',
    },
  }
}

function getMockSearchResults(params: EventbriteSearchParams): EventbriteSearchResult {
  const mockEvents: EventbriteEvent[] = [
    getMockEvent('mock_event_1'),
    {
      ...getMockEvent('mock_event_2'),
      name: { text: 'Tech Meetup', html: '<p>Tech Meetup</p>' },
      category: { id: '102', name: 'Science & Technology', short_name: 'tech' },
    },
    {
      ...getMockEvent('mock_event_3'),
      name: { text: 'Art Exhibition', html: '<p>Art Exhibition</p>' },
      category: { id: '105', name: 'Performing & Visual Arts', short_name: 'arts' },
      is_free: true,
    },
  ]

  // Simple pagination simulation
  const page = params.page || 1
  const pageSize = params.pageSize || 10
  const startIndex = (page - 1) * pageSize
  const paginatedEvents = mockEvents.slice(startIndex, startIndex + pageSize)

  return {
    events: paginatedEvents,
    pagination: {
      pageNumber: page,
      pageSize,
      pageCount: Math.ceil(mockEvents.length / pageSize),
      objectCount: mockEvents.length,
      hasMoreItems: startIndex + pageSize < mockEvents.length,
    },
  }
}

function getMockCategories(): EventbriteCategory[] {
  return [
    { id: '103', name: 'Music', short_name: 'music' },
    { id: '101', name: 'Business & Professional', short_name: 'business' },
    { id: '110', name: 'Food & Drink', short_name: 'food' },
    { id: '113', name: 'Community & Culture', short_name: 'community' },
    { id: '105', name: 'Performing & Visual Arts', short_name: 'arts' },
    { id: '104', name: 'Film, Media & Entertainment', short_name: 'film' },
    { id: '108', name: 'Sports & Fitness', short_name: 'sports' },
    { id: '107', name: 'Health & Wellness', short_name: 'health' },
    { id: '102', name: 'Science & Technology', short_name: 'tech' },
    { id: '109', name: 'Travel & Outdoor', short_name: 'travel' },
    { id: '111', name: 'Charity & Causes', short_name: 'charity' },
    { id: '114', name: 'Religion & Spirituality', short_name: 'religion' },
    { id: '115', name: 'Family & Education', short_name: 'family' },
    { id: '116', name: 'Seasonal & Holiday', short_name: 'seasonal' },
    { id: '112', name: 'Government & Politics', short_name: 'government' },
    { id: '106', name: 'Fashion & Beauty', short_name: 'fashion' },
    { id: '117', name: 'Home & Lifestyle', short_name: 'home' },
    { id: '118', name: 'Auto, Boat & Air', short_name: 'auto' },
    { id: '119', name: 'Hobbies & Special Interest', short_name: 'hobbies' },
    { id: '199', name: 'Other', short_name: 'other' },
  ]
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if an access token is expired or about to expire
 * @param expiresAt The token expiration date
 * @param bufferMinutes Minutes before expiration to consider token expired (default: 5)
 */
export function isTokenExpired(expiresAt?: Date, bufferMinutes = 5): boolean {
  if (!expiresAt) {
    // Eventbrite tokens typically don't expire
    return false
  }

  const bufferMs = bufferMinutes * 60 * 1000
  return new Date().getTime() >= expiresAt.getTime() - bufferMs
}

/**
 * Normalize an Eventbrite event to a common format for database storage
 */
export function normalizeEvent(event: EventbriteEvent): {
  externalId: string
  platform: 'eventbrite'
  title: string
  description: string | null
  dateTime: string
  endTime: string | null
  venueName: string | null
  venueAddress: string | null
  latitude: number | null
  longitude: number | null
  url: string
} {
  return {
    externalId: event.id,
    platform: 'eventbrite',
    title: event.name.text,
    description: event.description?.text || null,
    dateTime: event.start.utc,
    endTime: event.end?.utc || null,
    venueName: event.venue?.name || null,
    venueAddress: event.venue?.address?.localized_address_display || null,
    latitude: event.venue?.latitude ? parseFloat(event.venue.latitude) : null,
    longitude: event.venue?.longitude ? parseFloat(event.venue.longitude) : null,
    url: event.url,
  }
}
