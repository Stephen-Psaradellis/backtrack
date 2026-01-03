'use client'

import { useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEvent } from '@/hooks/useEvents'
import { useEventPosts } from '@/hooks/useEventPosts'
import { useEventAttendance } from '@/hooks/useEventAttendance'
import {
  formatEventTime,
  formatEventDateRange,
  formatTimeDistance,
  getEventStatus,
  isEventPast,
} from '@/utils/date-helpers'
import type { EventPost } from '@/hooks/useEventPosts'
import { AttendanceSection } from './AttendanceSection'

// ============================================================================
// Types
// ============================================================================

/**
 * Platform configuration for badges
 */
const PLATFORM_CONFIG = {
  eventbrite: {
    label: 'Eventbrite',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    textColor: 'text-orange-700 dark:text-orange-300',
  },
  meetup: {
    label: 'Meetup',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-300',
  },
} as const

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Truncate text to a maximum length with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }
  const truncated = text.substring(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')
  if (lastSpace > maxLength * 0.7) {
    return truncated.substring(0, lastSpace) + '...'
  }
  return truncated + '...'
}

/**
 * Format relative time for posts
 */
function formatRelativePostTime(timestamp: string): string {
  const now = new Date()
  const then = new Date(timestamp)
  const diffMs = now.getTime() - then.getTime()

  if (diffMs < 0 || isNaN(diffMs)) {
    return 'Just now'
  }

  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)
  const diffWeeks = Math.floor(diffDays / 7)

  if (diffSeconds < 60) {
    return 'Just now'
  }
  if (diffMinutes < 60) {
    return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`
  }
  if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`
  }
  if (diffDays < 7) {
    return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`
  }
  if (diffWeeks < 4) {
    return diffWeeks === 1 ? '1 week ago' : `${diffWeeks} weeks ago`
  }

  return then.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Loading skeleton for event details
 */
function EventDetailsSkeleton() {
  return (
    <div className="animate-pulse" data-testid="event-details-skeleton">
      {/* Header skeleton */}
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-3/4 mb-4" />
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2" />
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-6" />

      {/* Description skeleton */}
      <div className="space-y-2 mb-6">
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
      </div>

      {/* Posts skeleton */}
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4" />
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Error state component
 */
function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-12 px-4"
      data-testid="event-error-state"
    >
      <div className="w-16 h-16 mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
        <svg
          className="w-8 h-8 text-red-600 dark:text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
        Something went wrong
      </h3>
      <p className="text-gray-600 dark:text-gray-400 text-center mb-4">
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  )
}

/**
 * Empty posts state component
 */
function EmptyPostsState({ eventTitle }: { eventTitle: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-12 px-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700"
      data-testid="empty-posts-state"
    >
      <div className="w-16 h-16 mb-4 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
        <svg
          className="w-8 h-8 text-primary-600 dark:text-primary-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
        No missed connections yet
      </h3>
      <p className="text-gray-600 dark:text-gray-400 text-center max-w-sm">
        Be the first to create a missed connection post for {truncateText(eventTitle, 30)}.
      </p>
    </div>
  )
}

/**
 * Post card component for displaying event posts (web version)
 */
function EventPostCard({ post }: { post: EventPost }) {
  const timeAgo = formatRelativePostTime(post.created_at)

  return (
    <div
      className="flex gap-4 p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary-300 dark:hover:border-primary-600 transition-colors"
      data-testid={`post-card-${post.id}`}
    >
      {/* Avatar placeholder */}
      <div className="flex-shrink-0">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-purple-500 flex items-center justify-center">
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </div>
      </div>

      {/* Post content */}
      <div className="flex-1 min-w-0">
        {/* Message */}
        <p className="text-gray-900 dark:text-gray-100 mb-2 line-clamp-3">
          {post.message}
        </p>

        {/* Target description */}
        {post.target_description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
            Looking for: {post.target_description}
          </p>
        )}

        {/* Meta info */}
        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          {/* Location */}
          {post.location && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="truncate max-w-[150px]">{post.location.name}</span>
            </span>
          )}

          {/* Time */}
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {timeAgo}
          </span>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Event Details Page
 *
 * Displays event metadata and associated missed connection posts.
 * Uses useEvent hook to fetch event details and useEventPosts for posts.
 *
 * Features:
 * - Event metadata display (title, date/time, venue, description)
 * - Event status indicator (upcoming/ongoing/ended)
 * - Platform badge (Eventbrite/Meetup)
 * - Posts list with pagination
 * - Empty state when no posts
 * - Loading and error states
 * - Timezone-corrected event times
 */
export default function EventDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = typeof params.id === 'string' ? params.id : undefined

  // Fetch event details
  const { event, isLoading: eventLoading, error: eventError, fetchEvent } = useEvent(eventId)

  // Fetch event posts
  const {
    posts,
    isLoading: postsLoading,
    error: postsError,
    pagination,
    fetchNextPage,
    fetchPosts,
  } = useEventPosts(eventId)

  // Event attendance
  const {
    userStatus: attendanceStatus,
    goingCount, interestedCount,
    setAttendance,
    isLoading: attendanceLoading,
  } = useEventAttendance(eventId || "")

  // Combined loading state
  const isLoading = eventLoading || (postsLoading && posts.length === 0)

  // Handle retry
  const handleRetry = useCallback(() => {
    fetchEvent()
    fetchPosts()
  }, [fetchEvent, fetchPosts])

  // Handle back navigation
  const handleBack = useCallback(() => {
    router.push('/events')
  }, [router])

  // ---------------------------------------------------------------------------
  // Loading State
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-6 md:py-8">
          {/* Back button */}
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Events
          </button>

          <EventDetailsSkeleton />
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Error State
  // ---------------------------------------------------------------------------

  if (eventError) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-6 md:py-8">
          {/* Back button */}
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Events
          </button>

          <ErrorState
            message={eventError.message || 'Failed to load event details'}
            onRetry={handleRetry}
          />
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Not Found State
  // ---------------------------------------------------------------------------

  if (!event) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-6 md:py-8">
          {/* Back button */}
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Events
          </button>

          <ErrorState message="Event not found" />
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Computed Values
  // ---------------------------------------------------------------------------

  const platformConfig = PLATFORM_CONFIG[event.platform]
  const isPast = isEventPast(event.end_time || event.date_time)
  const eventStatus = getEventStatus({
    start: { utc: event.date_time },
    end: event.end_time ? { utc: event.end_time } : undefined,
  })

  // Format date/time
  const formattedDateTime = formatEventDateRange(
    event.date_time,
    event.end_time || undefined
  )

  // Get relative time for upcoming events
  const timeUntil = eventStatus === 'upcoming'
    ? formatTimeDistance(event.date_time, { addSuffix: true })
    : null

  // Status badge config
  const statusBadge = eventStatus === 'ongoing'
    ? { label: 'Happening now', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' }
    : eventStatus === 'ended'
    ? { label: 'Ended', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' }
    : null

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-6 md:py-8">
        {/* Back button */}
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6 transition-colors"
          data-testid="back-button"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Events
        </button>

        {/* Event Header */}
        <header className="mb-8" data-testid="event-header">
          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {/* Platform badge */}
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${platformConfig.bgColor} ${platformConfig.textColor}`}
              data-testid="platform-badge"
            >
              {platformConfig.label}
            </span>

            {/* Status badge */}
            {statusBadge && (
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusBadge.className}`}
                data-testid="status-badge"
              >
                {statusBadge.label}
              </span>
            )}

            {/* Post count badge */}
            {pagination && pagination.totalCount > 0 && (
              <span
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                data-testid="post-count-badge"
              >
                {pagination.totalCount} {pagination.totalCount === 1 ? 'post' : 'posts'}
              </span>
            )}
          </div>

          {/* Event title */}
          <h1
            className={`text-2xl md:text-3xl font-bold mb-4 ${isPast ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}
            data-testid="event-title"
          >
            {event.title}
          </h1>

          {/* Event image */}
          {event.image_url && (
            <div className="relative w-full h-48 md:h-64 rounded-xl overflow-hidden mb-6 bg-gray-100 dark:bg-gray-800">
              <img
                src={event.image_url}
                alt={event.title}
                className={`w-full h-full object-cover ${isPast ? 'opacity-60' : ''}`}
                data-testid="event-image"
              />
            </div>
          )}

          {/* Event meta info */}
          <div className="space-y-3">
            {/* Date/Time */}
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <div>
                <p
                  className={`font-medium ${isPast ? 'text-gray-500 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}
                  data-testid="event-datetime"
                >
                  {formattedDateTime}
                </p>
                {timeUntil && (
                  <p className="text-sm text-primary-600 dark:text-primary-400" data-testid="event-time-until">
                    Starts {timeUntil}
                  </p>
                )}
              </div>
            </div>

            {/* Venue */}
            {event.venue_name && (
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <div>
                  <p
                    className={`font-medium ${isPast ? 'text-gray-500 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}
                    data-testid="event-venue-name"
                  >
                    {event.venue_name}
                  </p>
                  {event.venue_address && (
                    <p
                      className="text-sm text-gray-500 dark:text-gray-400"
                      data-testid="event-venue-address"
                    >
                      {event.venue_address}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Category */}
            {event.category && (
              <div className="flex items-center gap-3">
                <svg
                  className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
                <p
                  className="text-gray-600 dark:text-gray-400 capitalize"
                  data-testid="event-category"
                >
                  {event.category}
                </p>
              </div>
            )}

            {/* External link */}
            {event.url && (
              <div className="flex items-center gap-3">
                <svg
                  className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
                <a
                  href={event.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 dark:text-primary-400 hover:underline"
                  data-testid="event-url"
                >
                  View on {platformConfig.label}
                </a>
              </div>
            )}
          </div>

          {/* Description */}
          {event.description && (
            <div className="mt-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                About this event
              </h2>
              <p
                className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap"
                data-testid="event-description"
              >
                {event.description}
              </p>
            </div>
          )}
        </header>

        {/* Attendance Section */}
        <AttendanceSection
          eventId={eventId || ""}
          status={attendanceStatus}
          stats={{ interested: interestedCount, going: goingCount, went: 0 }}
          onSetAttendance={setAttendance}
          isLoading={attendanceLoading}
        />

        {/* Divider */}
        <div className="h-px bg-gray-200 dark:bg-gray-700 mb-8" />

        {/* Posts Section */}
        <section data-testid="posts-section">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Missed Connections
            {pagination && pagination.totalCount > 0 && (
              <span className="ml-2 text-gray-500 dark:text-gray-400 font-normal">
                ({pagination.totalCount})
              </span>
            )}
          </h2>

          {/* Posts loading */}
          {postsLoading && posts.length === 0 && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="animate-pulse p-4 border border-gray-200 dark:border-gray-700 rounded-xl"
                >
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Posts error */}
          {postsError && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <p className="text-red-600 dark:text-red-400">
                Failed to load posts: {postsError.message}
              </p>
              <button
                onClick={fetchPosts}
                className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
              >
                Try again
              </button>
            </div>
          )}

          {/* Empty state */}
          {!postsLoading && !postsError && posts.length === 0 && (
            <EmptyPostsState eventTitle={event.title} />
          )}

          {/* Posts list */}
          {posts.length > 0 && (
            <div className="space-y-4" data-testid="posts-list">
              {posts.map((post) => (
                <EventPostCard key={post.id} post={post} />
              ))}
            </div>
          )}

          {/* Load more button */}
          {pagination?.hasNextPage && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={fetchNextPage}
                disabled={postsLoading}
                className="px-6 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
                data-testid="load-more-button"
              >
                {postsLoading ? 'Loading...' : 'Load more posts'}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
