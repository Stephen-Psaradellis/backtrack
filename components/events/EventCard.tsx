/**
 * EventCard Component
 *
 * Displays an event with title, date/time, venue, category, and platform badge.
 * Used in the event discovery page to show search results.
 *
 * Features:
 * - Shows event title with truncation for long names
 * - Displays formatted date/time using date-helpers utilities
 * - Shows venue name and address
 * - Platform badge (Eventbrite/Meetup)
 * - Optional post count indicator
 * - Past event indicator with visual styling
 * - Compact mode for denser list displays
 *
 * @example
 * ```tsx
 * import { EventCard } from './EventCard'
 *
 * // Basic usage
 * <EventCard
 *   event={event}
 *   onPress={(event) => router.push(`/events/${event.id}`)}
 * />
 *
 * // Compact mode for lists
 * <EventCard
 *   event={event}
 *   compact
 *   onPress={handlePress}
 * />
 * ```
 */

import { memo, useCallback } from 'react'
import type { Event, EventPlatform } from '../../hooks/useEvents'
import {
  formatEventTime,
  formatEventDateRange,
  isEventPast,
  getEventStatus,
} from '../../utils/date-helpers'

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the EventCard component
 */
export interface EventCardProps {
  /**
   * Event data to display
   */
  event: Event

  /**
   * Callback when the card is pressed
   * Receives the event data for navigation
   */
  onPress?: (event: Event) => void

  /**
   * Whether the card is in compact mode for lists
   * @default false
   */
  compact?: boolean

  /**
   * Whether to show the post count badge
   * @default true
   */
  showPostCount?: boolean

  /**
   * Additional CSS classes for the container
   */
  className?: string

  /**
   * Test ID for testing purposes
   */
  testID?: string
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Platform badge colors and labels
 */
const PLATFORM_CONFIG: Record<
  EventPlatform,
  { label: string; bgColor: string; textColor: string }
> = {
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
}

/**
 * Maximum number of characters to show in event title
 */
const TITLE_MAX_LENGTH = 80

/**
 * Maximum number of characters in compact mode
 */
const TITLE_MAX_LENGTH_COMPACT = 50

/**
 * Maximum number of characters for venue address
 */
const ADDRESS_MAX_LENGTH = 60

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Truncate text to a maximum length with ellipsis
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with "..." if needed
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }
  // Find the last space before maxLength to avoid cutting words
  const truncated = text.substring(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')
  if (lastSpace > maxLength * 0.7) {
    return truncated.substring(0, lastSpace) + '...'
  }
  return truncated + '...'
}

/**
 * Get status badge configuration based on event status
 */
function getStatusBadge(event: Event): {
  show: boolean
  label: string
  className: string
} | null {
  const status = getEventStatus({
    start: { utc: event.date_time },
    end: event.end_time ? { utc: event.end_time } : undefined,
  })

  switch (status) {
    case 'ongoing':
      return {
        show: true,
        label: 'Happening now',
        className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      }
    case 'ended':
      return {
        show: true,
        label: 'Ended',
        className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
      }
    default:
      return null
  }
}

// ============================================================================
// Component
// ============================================================================

/**
 * EventCard displays an event with title, date/time, venue, and platform badge.
 *
 * Features:
 * - Shows event title with truncation
 * - Displays formatted date/time range
 * - Shows venue name and address
 * - Platform badge (Eventbrite/Meetup)
 * - Optional post count indicator
 * - Status badge for ongoing/ended events
 * - Compact mode for denser displays
 * - Memoized for performance in lists
 */
export const EventCard = memo(function EventCard({
  event,
  onPress,
  compact = false,
  showPostCount = true,
  className = '',
  testID = 'event-card',
}: EventCardProps) {
  // ---------------------------------------------------------------------------
  // Computed Values
  // ---------------------------------------------------------------------------

  // Truncate title based on mode
  const maxLength = compact ? TITLE_MAX_LENGTH_COMPACT : TITLE_MAX_LENGTH
  const displayTitle = truncateText(event.title, maxLength)

  // Format date/time
  const formattedDateTime = formatEventDateRange(
    event.date_time,
    event.end_time || undefined
  )

  // Get platform config
  const platformConfig = PLATFORM_CONFIG[event.platform]

  // Check if event is past
  const isPast = isEventPast(event.end_time || event.date_time)

  // Get status badge
  const statusBadge = getStatusBadge(event)

  // Format address
  const displayAddress = event.venue_address
    ? truncateText(event.venue_address, ADDRESS_MAX_LENGTH)
    : null

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleClick = useCallback(() => {
    onPress?.(event)
  }, [onPress, event])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onPress?.(event)
      }
    },
    [onPress, event]
  )

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const containerClasses = [
    // Base styles
    'relative flex flex-col rounded-xl border transition-all duration-200',
    // Interactive styles
    onPress
      ? 'cursor-pointer hover:border-primary-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2'
      : '',
    // Size variants
    compact ? 'p-3 gap-2' : 'p-4 gap-3',
    // Past event styling
    isPast ? 'bg-gray-50 border-gray-200 dark:bg-gray-900/50 dark:border-gray-700' : 'bg-white border-gray-200 dark:bg-gray-900 dark:border-gray-700',
    // Custom classes
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={containerClasses}
      onClick={onPress ? handleClick : undefined}
      onKeyDown={onPress ? handleKeyDown : undefined}
      role={onPress ? 'button' : undefined}
      tabIndex={onPress ? 0 : undefined}
      aria-label={`Event: ${event.title} on ${formattedDateTime}${event.venue_name ? ` at ${event.venue_name}` : ''}`}
      data-testid={testID}
    >
      {/* Header: Platform Badge & Post Count */}
      <div className="flex items-center justify-between gap-2">
        {/* Platform Badge */}
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${platformConfig.bgColor} ${platformConfig.textColor}`}
          data-testid={`${testID}-platform`}
        >
          {platformConfig.label}
        </span>

        {/* Status Badge or Post Count */}
        <div className="flex items-center gap-2">
          {statusBadge?.show && (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.className}`}
              data-testid={`${testID}-status`}
            >
              {statusBadge.label}
            </span>
          )}

          {showPostCount && event.post_count !== undefined && event.post_count > 0 && (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
              data-testid={`${testID}-post-count`}
            >
              {event.post_count} {event.post_count === 1 ? 'post' : 'posts'}
            </span>
          )}
        </div>
      </div>

      {/* Event Image (if available and not compact) */}
      {!compact && event.image_url && (
        <div
          className="relative w-full h-32 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800"
          data-testid={`${testID}-image`}
        >
          <img
            src={event.image_url}
            alt={event.title}
            className={`w-full h-full object-cover ${isPast ? 'opacity-60' : ''}`}
            loading="lazy"
          />
        </div>
      )}

      {/* Event Title */}
      <h3
        className={`font-semibold leading-tight ${compact ? 'text-sm' : 'text-base'} ${isPast ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}
        data-testid={`${testID}-title`}
      >
        {displayTitle}
      </h3>

      {/* Date/Time */}
      <div className="flex items-center gap-2 text-sm">
        <svg
          className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <span
          className={isPast ? 'text-gray-500 dark:text-gray-500' : 'text-gray-600 dark:text-gray-300'}
          data-testid={`${testID}-datetime`}
        >
          {formattedDateTime}
        </span>
      </div>

      {/* Venue */}
      {event.venue_name && (
        <div className="flex items-start gap-2 text-sm">
          <svg
            className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
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
          <div className="flex flex-col min-w-0">
            <span
              className={`font-medium truncate ${isPast ? 'text-gray-500 dark:text-gray-500' : 'text-gray-700 dark:text-gray-200'}`}
              data-testid={`${testID}-venue-name`}
            >
              {event.venue_name}
            </span>
            {!compact && displayAddress && (
              <span
                className="text-gray-500 dark:text-gray-400 text-xs truncate"
                data-testid={`${testID}-venue-address`}
              >
                {displayAddress}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Category (if available and not compact) */}
      {!compact && event.category && (
        <div className="flex items-center gap-2 text-sm">
          <svg
            className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"
            />
          </svg>
          <span
            className="text-gray-500 dark:text-gray-400 capitalize"
            data-testid={`${testID}-category`}
          >
            {event.category}
          </span>
        </div>
      )}
    </div>
  )
})

// ============================================================================
// Preset Variants
// ============================================================================

/**
 * Compact EventCard for dense list displays
 */
export const CompactEventCard = memo(function CompactEventCard(
  props: Omit<EventCardProps, 'compact'>
) {
  return (
    <EventCard
      {...props}
      compact={true}
      testID={props.testID ?? 'event-card-compact'}
    />
  )
})

/**
 * EventCard for featured/highlighted events
 */
export const FeaturedEventCard = memo(function FeaturedEventCard(
  props: EventCardProps
) {
  return (
    <EventCard
      {...props}
      className={`ring-2 ring-primary-500 ring-offset-2 ${props.className ?? ''}`}
      testID={props.testID ?? 'event-card-featured'}
    />
  )
})

// ============================================================================
// List Item Component
// ============================================================================

/**
 * Props for EventCardListItem
 */
export interface EventCardListItemProps extends EventCardProps {
  /**
   * Index in the list (for alternating backgrounds or separators)
   */
  index?: number

  /**
   * Whether to show a separator below the item
   * @default true
   */
  showSeparator?: boolean
}

/**
 * EventCard wrapped for use in lists with separator
 */
export const EventCardListItem = memo(function EventCardListItem({
  index,
  showSeparator = true,
  ...props
}: EventCardListItemProps) {
  return (
    <div data-testid={`${props.testID ?? 'event-card-list-item'}-${index ?? 0}`}>
      <EventCard {...props} />
      {showSeparator && (
        <div className="h-px bg-gray-200 dark:bg-gray-700 my-3 mx-4" />
      )}
    </div>
  )
})

// ============================================================================
// Render Item Helper
// ============================================================================

/**
 * Create a renderItem function for lists
 *
 * @param onPress - Callback when an event is pressed
 * @returns A function suitable for map/renderItem
 *
 * @example
 * ```tsx
 * const renderItem = createEventCardRenderer(
 *   (event) => router.push(`/events/${event.id}`)
 * )
 *
 * {events.map((event, index) => renderItem({ item: event, index }))}
 * ```
 */
export function createEventCardRenderer(onPress: (event: Event) => void) {
  return ({ item, index }: { item: Event; index: number }) => {
    return (
      <EventCardListItem
        event={item}
        onPress={onPress}
        index={index}
        testID={`event-card-${item.id}`}
      />
    )
  }
}

export default EventCard
