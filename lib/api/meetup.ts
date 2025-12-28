/**
 * Meetup GraphQL API Client
 *
 * Provides OAuth authentication and event data fetching from Meetup GraphQL API.
 * Uses graphql-request library for lightweight GraphQL operations.
 *
 * In development mode with missing credentials, functions return mock data
 * to allow the app to run without a real Meetup connection.
 *
 * In production, credentials are required.
 */

import { GraphQLClient, gql } from 'graphql-request'
import { isDevMode, isProductionMode } from '@/lib/dev'

// Meetup API endpoints
const MEETUP_OAUTH_URL = 'https://secure.meetup.com/oauth2/authorize'
const MEETUP_TOKEN_URL = 'https://secure.meetup.com/oauth2/access'
const MEETUP_GRAPHQL_ENDPOINT = 'https://api.meetup.com/gql'

// ============================================================================
// Types
// ============================================================================

export interface MeetupVenue {
  id: string
  name: string
  address?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
  lat?: number
  lon?: number
}

export interface MeetupGroup {
  id: string
  name: string
  urlname: string
  description?: string
  city?: string
  state?: string
  country?: string
  logo?: {
    baseUrl: string
  }
  keyPhoto?: {
    baseUrl: string
  }
}

export interface MeetupEvent {
  id: string
  title: string
  description?: string
  eventUrl: string
  dateTime: string // ISO 8601 format
  endTime?: string // ISO 8601 format
  duration?: string // ISO 8601 duration
  timezone: string
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'PAST' | 'ACTIVE'
  going?: number
  maxTickets?: number
  isOnline: boolean
  venue?: MeetupVenue
  group: MeetupGroup
  images?: Array<{
    id: string
    baseUrl: string
  }>
  topics?: Array<{
    id: string
    name: string
  }>
  eventType?: 'PHYSICAL' | 'ONLINE' | 'HYBRID'
}

export interface MeetupSearchParams {
  latitude: number
  longitude: number
  radius?: number // in miles
  topicCategoryId?: string
  startDate?: string // ISO 8601 format
  endDate?: string // ISO 8601 format
  query?: string
  first?: number // pagination limit
  after?: string // cursor for pagination
}

export interface MeetupSearchResult {
  events: MeetupEvent[]
  pageInfo: {
    hasNextPage: boolean
    endCursor: string | null
  }
  totalCount: number
}

export interface MeetupTokens {
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
  tokenType: string
}

export interface MeetupError {
  status: number
  error: string
  errorDescription?: string
  isRateLimit?: boolean
  isTokenExpired?: boolean
  graphqlErrors?: Array<{ message: string; extensions?: Record<string, unknown> }>
}

export interface MeetupCategory {
  id: string
  name: string
  shortName: string
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Check if Meetup credentials are available
 */
function hasMeetupCredentials(): boolean {
  return !!(
    process.env.MEETUP_CLIENT_ID &&
    process.env.MEETUP_CLIENT_SECRET
  )
}

/**
 * Check if mock Meetup client should be used
 */
export function shouldUseMockMeetup(): boolean {
  return isDevMode() && !hasMeetupCredentials()
}

/**
 * Get Meetup configuration
 * Throws in production if credentials are missing
 */
function getConfig() {
  const clientId = process.env.MEETUP_CLIENT_ID
  const clientSecret = process.env.MEETUP_CLIENT_SECRET
  const redirectUri = process.env.MEETUP_REDIRECT_URI

  if (isProductionMode()) {
    if (!clientId) {
      throw new Error(
        'Missing MEETUP_CLIENT_ID environment variable. ' +
        'This is required in production.'
      )
    }
    if (!clientSecret) {
      throw new Error(
        'Missing MEETUP_CLIENT_SECRET environment variable. ' +
        'This is required in production.'
      )
    }
    if (!redirectUri) {
      throw new Error(
        'Missing MEETUP_REDIRECT_URI environment variable. ' +
        'This is required in production.'
      )
    }
  }

  return {
    clientId: clientId || '',
    clientSecret: clientSecret || '',
    redirectUri: redirectUri || 'http://localhost:3000/api/auth/meetup',
  }
}

/**
 * Create a GraphQL client with authentication
 */
function createGraphQLClient(accessToken: string): GraphQLClient {
  return new GraphQLClient(MEETUP_GRAPHQL_ENDPOINT, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
}

// ============================================================================
// GraphQL Queries
// ============================================================================

const SEARCH_EVENTS_QUERY = gql`
  query SearchEvents(
    $lat: Float!
    $lon: Float!
    $radius: Int
    $topicCategoryId: String
    $startDateRange: ZonedDateTime
    $endDateRange: ZonedDateTime
    $query: String
    $first: Int
    $after: String
  ) {
    rankedEvents(
      filter: {
        lat: $lat
        lon: $lon
        radius: $radius
        topicCategoryId: $topicCategoryId
        startDateRange: $startDateRange
        endDateRange: $endDateRange
        query: $query
      }
      first: $first
      after: $after
    ) {
      count
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          title
          description
          eventUrl
          dateTime
          endTime
          duration
          timezone
          status
          going
          maxTickets
          isOnline
          eventType
          venue {
            id
            name
            address
            city
            state
            country
            postalCode
            lat
            lon
          }
          group {
            id
            name
            urlname
            description
            city
            state
            country
            logo {
              baseUrl
            }
            keyPhoto {
              baseUrl
            }
          }
          images {
            id
            baseUrl
          }
          topics {
            id
            name
          }
        }
      }
    }
  }
`

const GET_EVENT_QUERY = gql`
  query GetEvent($id: ID!) {
    event(id: $id) {
      id
      title
      description
      eventUrl
      dateTime
      endTime
      duration
      timezone
      status
      going
      maxTickets
      isOnline
      eventType
      venue {
        id
        name
        address
        city
        state
        country
        postalCode
        lat
        lon
      }
      group {
        id
        name
        urlname
        description
        city
        state
        country
        logo {
          baseUrl
        }
        keyPhoto {
          baseUrl
        }
      }
      images {
        id
        baseUrl
      }
      topics {
        id
        name
      }
    }
  }
`

const GET_TOPIC_CATEGORIES_QUERY = gql`
  query GetTopicCategories {
    topicCategories {
      id
      name
      shortName
    }
  }
`

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
    scope: 'basic event_management',
  })

  if (state) {
    params.set('state', state)
  }

  return `${MEETUP_OAUTH_URL}?${params.toString()}`
}

/**
 * Exchange authorization code for access tokens
 */
export async function exchangeCodeForTokens(
  code: string
): Promise<MeetupTokens> {
  if (shouldUseMockMeetup()) {
    return getMockTokens()
  }

  const config = getConfig()

  const response = await fetch(MEETUP_TOKEN_URL, {
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
    throw new MeetupApiError(error)
  }

  const data = await response.json()

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    tokenType: data.token_type || 'Bearer',
    expiresAt: data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000)
      : undefined,
  }
}

/**
 * Refresh an expired access token
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<MeetupTokens> {
  if (shouldUseMockMeetup()) {
    return getMockTokens()
  }

  const config = getConfig()

  const response = await fetch(MEETUP_TOKEN_URL, {
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
    throw new MeetupApiError(error)
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
  params: MeetupSearchParams
): Promise<MeetupSearchResult> {
  if (shouldUseMockMeetup()) {
    return getMockSearchResults(params)
  }

  const client = createGraphQLClient(accessToken)

  const variables = {
    lat: params.latitude,
    lon: params.longitude,
    radius: params.radius,
    topicCategoryId: params.topicCategoryId,
    startDateRange: params.startDate,
    endDateRange: params.endDate,
    query: params.query,
    first: params.first || 20,
    after: params.after,
  }

  try {
    const data = await client.request<{
      rankedEvents: {
        count: number
        pageInfo: {
          hasNextPage: boolean
          endCursor: string | null
        }
        edges: Array<{
          node: MeetupEvent
        }>
      }
    }>(SEARCH_EVENTS_QUERY, variables)

    return {
      events: data.rankedEvents.edges.map((edge) => edge.node),
      pageInfo: data.rankedEvents.pageInfo,
      totalCount: data.rankedEvents.count,
    }
  } catch (error) {
    throw handleGraphQLError(error)
  }
}

/**
 * Get details for a specific event
 */
export async function getEventDetails(
  accessToken: string,
  eventId: string
): Promise<MeetupEvent> {
  if (shouldUseMockMeetup()) {
    return getMockEvent(eventId)
  }

  const client = createGraphQLClient(accessToken)

  try {
    const data = await client.request<{
      event: MeetupEvent
    }>(GET_EVENT_QUERY, { id: eventId })

    if (!data.event) {
      throw new MeetupApiError({
        status: 404,
        error: 'EVENT_NOT_FOUND',
        errorDescription: `Event with ID ${eventId} not found`,
      })
    }

    return data.event
  } catch (error) {
    throw handleGraphQLError(error)
  }
}

/**
 * Get available topic categories for filtering
 */
export async function getCategories(
  accessToken: string
): Promise<MeetupCategory[]> {
  if (shouldUseMockMeetup()) {
    return getMockCategories()
  }

  const client = createGraphQLClient(accessToken)

  try {
    const data = await client.request<{
      topicCategories: MeetupCategory[]
    }>(GET_TOPIC_CATEGORIES_QUERY)

    return data.topicCategories || []
  } catch (error) {
    throw handleGraphQLError(error)
  }
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Custom error class for Meetup API errors
 */
export class MeetupApiError extends Error {
  public status: number
  public errorCode: string
  public isRateLimit: boolean
  public isTokenExpired: boolean
  public graphqlErrors?: Array<{ message: string; extensions?: Record<string, unknown> }>

  constructor(error: MeetupError) {
    super(error.errorDescription || error.error)
    this.name = 'MeetupApiError'
    this.status = error.status
    this.errorCode = error.error
    this.isRateLimit = error.isRateLimit || false
    this.isTokenExpired = error.isTokenExpired || false
    this.graphqlErrors = error.graphqlErrors
  }
}

/**
 * Parse error response from Meetup OAuth endpoints
 */
async function parseErrorResponse(response: Response): Promise<MeetupError> {
  let errorData: Record<string, unknown> = {}

  try {
    errorData = await response.json()
  } catch {
    // Response might not be JSON
  }

  const isRateLimit = response.status === 429
  const isTokenExpired =
    response.status === 401 ||
    (errorData.error === 'invalid_grant') ||
    (errorData.error === 'invalid_token')

  return {
    status: response.status,
    error: (errorData.error as string) || `HTTP ${response.status}`,
    errorDescription: (errorData.error_description as string) || response.statusText,
    isRateLimit,
    isTokenExpired,
  }
}

/**
 * Handle GraphQL errors from Meetup API
 * Note: Meetup returns 200 status even when there are GraphQL errors
 */
function handleGraphQLError(error: unknown): MeetupApiError {
  // Check if it's already a MeetupApiError
  if (error instanceof MeetupApiError) {
    return error
  }

  // Check for graphql-request error format
  if (error && typeof error === 'object') {
    const gqlError = error as {
      response?: {
        status?: number
        errors?: Array<{ message: string; extensions?: Record<string, unknown> }>
      }
      message?: string
    }

    // Handle GraphQL errors in response
    if (gqlError.response?.errors && gqlError.response.errors.length > 0) {
      const firstError = gqlError.response.errors[0]
      const isTokenExpired = firstError.extensions?.code === 'UNAUTHENTICATED' ||
        firstError.message.toLowerCase().includes('unauthorized') ||
        firstError.message.toLowerCase().includes('authentication')
      const isRateLimit = firstError.extensions?.code === 'RATE_LIMITED' ||
        firstError.message.toLowerCase().includes('rate limit')

      return new MeetupApiError({
        status: gqlError.response.status || 400,
        error: (firstError.extensions?.code as string) || 'GRAPHQL_ERROR',
        errorDescription: firstError.message,
        isRateLimit,
        isTokenExpired,
        graphqlErrors: gqlError.response.errors,
      })
    }

    // Handle HTTP errors
    if (gqlError.response?.status) {
      return new MeetupApiError({
        status: gqlError.response.status,
        error: `HTTP_${gqlError.response.status}`,
        errorDescription: gqlError.message || 'An error occurred',
        isRateLimit: gqlError.response.status === 429,
        isTokenExpired: gqlError.response.status === 401,
      })
    }

    // Generic error with message
    if (gqlError.message) {
      return new MeetupApiError({
        status: 500,
        error: 'UNKNOWN_ERROR',
        errorDescription: gqlError.message,
      })
    }
  }

  // Fallback for unknown error types
  return new MeetupApiError({
    status: 500,
    error: 'UNKNOWN_ERROR',
    errorDescription: String(error),
  })
}

// ============================================================================
// Mock Data (Development Mode)
// ============================================================================

function getMockTokens(): MeetupTokens {
  return {
    accessToken: 'mock_meetup_access_token',
    refreshToken: 'mock_meetup_refresh_token',
    tokenType: 'Bearer',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
  }
}

function getMockEvent(eventId: string): MeetupEvent {
  return {
    id: eventId,
    title: 'Mock Meetup Event',
    description: 'This is a mock event for development purposes.',
    eventUrl: `https://www.meetup.com/mock-group/events/${eventId}`,
    dateTime: '2024-12-31T19:00:00-05:00',
    endTime: '2024-12-31T22:00:00-05:00',
    duration: 'PT3H',
    timezone: 'America/New_York',
    status: 'PUBLISHED',
    going: 42,
    maxTickets: 100,
    isOnline: false,
    eventType: 'PHYSICAL',
    venue: {
      id: 'venue_1',
      name: 'Mock Venue',
      address: '456 Tech Avenue',
      city: 'San Francisco',
      state: 'CA',
      country: 'US',
      postalCode: '94102',
      lat: 37.7749,
      lon: -122.4194,
    },
    group: {
      id: 'group_1',
      name: 'Mock Tech Meetup Group',
      urlname: 'mock-tech-meetup',
      description: 'A mock group for development.',
      city: 'San Francisco',
      state: 'CA',
      country: 'US',
    },
    topics: [
      { id: 'topic_1', name: 'Technology' },
      { id: 'topic_2', name: 'Networking' },
    ],
  }
}

function getMockSearchResults(params: MeetupSearchParams): MeetupSearchResult {
  const mockEvents: MeetupEvent[] = [
    getMockEvent('mock_meetup_1'),
    {
      ...getMockEvent('mock_meetup_2'),
      title: 'JavaScript Developers Meetup',
      group: {
        id: 'group_2',
        name: 'JS Enthusiasts',
        urlname: 'js-enthusiasts',
        city: 'San Francisco',
        state: 'CA',
        country: 'US',
      },
      topics: [
        { id: 'topic_js', name: 'JavaScript' },
        { id: 'topic_web', name: 'Web Development' },
      ],
    },
    {
      ...getMockEvent('mock_meetup_3'),
      title: 'Hiking Adventures',
      isOnline: false,
      eventType: 'PHYSICAL',
      group: {
        id: 'group_3',
        name: 'Bay Area Hikers',
        urlname: 'bay-area-hikers',
        city: 'Oakland',
        state: 'CA',
        country: 'US',
      },
      venue: {
        id: 'venue_2',
        name: 'Trailhead Parking',
        address: 'Mountain Trail Road',
        city: 'Oakland',
        state: 'CA',
        country: 'US',
        lat: 37.8044,
        lon: -122.2712,
      },
      topics: [
        { id: 'topic_hiking', name: 'Hiking' },
        { id: 'topic_outdoor', name: 'Outdoor Adventures' },
      ],
    },
    {
      ...getMockEvent('mock_meetup_4'),
      title: 'Virtual Book Club',
      isOnline: true,
      eventType: 'ONLINE',
      venue: undefined,
      group: {
        id: 'group_4',
        name: 'Online Readers',
        urlname: 'online-readers',
        city: 'San Francisco',
        state: 'CA',
        country: 'US',
      },
      topics: [
        { id: 'topic_books', name: 'Books' },
        { id: 'topic_literature', name: 'Literature' },
      ],
    },
  ]

  // Simple pagination simulation
  const first = params.first || 20
  const startIndex = params.after ? parseInt(params.after, 10) : 0
  const paginatedEvents = mockEvents.slice(startIndex, startIndex + first)
  const hasNextPage = startIndex + first < mockEvents.length

  return {
    events: paginatedEvents,
    pageInfo: {
      hasNextPage,
      endCursor: hasNextPage ? String(startIndex + first) : null,
    },
    totalCount: mockEvents.length,
  }
}

function getMockCategories(): MeetupCategory[] {
  return [
    { id: '546', name: 'Arts & Entertainment', shortName: 'arts' },
    { id: '553', name: 'Business & Professional', shortName: 'business' },
    { id: '562', name: 'Career & Business', shortName: 'career' },
    { id: '558', name: 'Community & Environment', shortName: 'community' },
    { id: '606', name: 'Dancing', shortName: 'dancing' },
    { id: '552', name: 'Education & Learning', shortName: 'education' },
    { id: '554', name: 'Fashion & Beauty', shortName: 'fashion' },
    { id: '555', name: 'Film', shortName: 'film' },
    { id: '556', name: 'Fitness', shortName: 'fitness' },
    { id: '557', name: 'Food & Drink', shortName: 'food' },
    { id: '559', name: 'Games', shortName: 'games' },
    { id: '560', name: 'Health & Wellbeing', shortName: 'health' },
    { id: '561', name: 'Hobbies & Crafts', shortName: 'hobbies' },
    { id: '563', name: 'Language & Ethnic Identity', shortName: 'language' },
    { id: '564', name: 'LGBTQ', shortName: 'lgbtq' },
    { id: '565', name: 'Lifestyle', shortName: 'lifestyle' },
    { id: '566', name: 'Literature & Writing', shortName: 'literature' },
    { id: '567', name: 'Movements & Politics', shortName: 'politics' },
    { id: '568', name: 'Music', shortName: 'music' },
    { id: '569', name: 'New Age & Spirituality', shortName: 'spirituality' },
    { id: '570', name: 'Outdoors & Adventure', shortName: 'outdoors' },
    { id: '571', name: 'Paranormal', shortName: 'paranormal' },
    { id: '572', name: 'Parents & Family', shortName: 'family' },
    { id: '573', name: 'Pets & Animals', shortName: 'pets' },
    { id: '574', name: 'Photography', shortName: 'photography' },
    { id: '575', name: 'Religion & Beliefs', shortName: 'religion' },
    { id: '576', name: 'Sci-Fi & Fantasy', shortName: 'scifi' },
    { id: '577', name: 'Singles', shortName: 'singles' },
    { id: '578', name: 'Socializing', shortName: 'social' },
    { id: '579', name: 'Sports & Recreation', shortName: 'sports' },
    { id: '580', name: 'Support', shortName: 'support' },
    { id: '546', name: 'Tech', shortName: 'tech' },
    { id: '582', name: 'Women', shortName: 'women' },
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
    // If no expiration date, assume token is valid
    // (caller should handle refresh on auth errors)
    return false
  }

  const bufferMs = bufferMinutes * 60 * 1000
  return new Date().getTime() >= expiresAt.getTime() - bufferMs
}

/**
 * Normalize a Meetup event to a common format for database storage
 */
export function normalizeEvent(event: MeetupEvent): {
  externalId: string
  platform: 'meetup'
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
  // Build full venue address
  let venueAddress: string | null = null
  if (event.venue) {
    const parts = [
      event.venue.address,
      event.venue.city,
      event.venue.state,
      event.venue.postalCode,
      event.venue.country,
    ].filter(Boolean)
    venueAddress = parts.length > 0 ? parts.join(', ') : null
  }

  return {
    externalId: event.id,
    platform: 'meetup',
    title: event.title,
    description: event.description || null,
    dateTime: event.dateTime,
    endTime: event.endTime || null,
    venueName: event.venue?.name || null,
    venueAddress,
    latitude: event.venue?.lat || null,
    longitude: event.venue?.lon || null,
    url: event.eventUrl,
  }
}
