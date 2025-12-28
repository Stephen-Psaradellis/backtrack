/**
 * EventSearch Component
 *
 * A comprehensive event search and discovery component for the Love Ledger app.
 * Allows users to search for events by location, category, date, and text query.
 *
 * Features:
 * - Text-based event search
 * - Location-based search with browser geolocation
 * - Category filter chips
 * - Date range filtering
 * - Radius selection
 * - Loading and error states
 * - Empty state handling
 * - Event selection with callback
 *
 * @example
 * ```tsx
 * // Basic usage
 * <EventSearch
 *   onEventSelect={(event) => router.push(`/events/${event.id}`)}
 * />
 *
 * @example
 * // With initial search params
 * <EventSearch
 *   initialParams={{ categories: ['music'] }}
 *   onEventSelect={handleEventSelect}
 *   showFilters
 * />
 *
 * @example
 * // Compact mode for modals
 * <EventSearch
 *   compact
 *   onEventSelect={(event) => setSelectedEvent(event)}
 *   placeholder="Search for an event..."
 * />
 * ```
 */

'use client'

import { memo, useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useEvents, type Event, type EventSearchParams, type EventPlatform } from '@/hooks/useEvents'
import { useUserLocation } from '@/hooks/useUserLocation'
import { EventCard, CompactEventCard } from './EventCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

// ============================================================================
// Types
// ============================================================================

/**
 * Category option for filter chips
 */
export interface CategoryOption {
  /** Unique identifier */
  id: string
  /** Display label */
  label: string
  /** Emoji icon */
  icon?: string
}

/**
 * Radius option for distance filter
 */
export interface RadiusOption {
  /** Value in km */
  value: string
  /** Display label */
  label: string
}

/**
 * Props for the EventSearch component
 */
export interface EventSearchProps {
  /**
   * Callback when an event is selected
   */
  onEventSelect?: (event: Event) => void

  /**
   * Initial search parameters
   */
  initialParams?: Partial<EventSearchParams>

  /**
   * Whether to show filter controls
   * @default true
   */
  showFilters?: boolean

  /**
   * Whether to show the location button
   * @default true
   */
  showLocationButton?: boolean

  /**
   * Whether to use compact mode for dense displays
   * @default false
   */
  compact?: boolean

  /**
   * Placeholder text for search input
   * @default "Search events..."
   */
  placeholder?: string

  /**
   * Empty state title
   * @default "No events found"
   */
  emptyTitle?: string

  /**
   * Empty state message
   * @default "Try adjusting your search filters or location."
   */
  emptyMessage?: string

  /**
   * Maximum number of results to show
   * @default 50
   */
  maxResults?: number

  /**
   * Whether to auto-focus the search input
   * @default false
   */
  autoFocus?: boolean

  /**
   * Whether to auto-fetch location on mount
   * @default true
   */
  autoFetchLocation?: boolean

  /**
   * Custom container className
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
 * Default category options for filtering
 */
const DEFAULT_CATEGORIES: CategoryOption[] = [
  { id: 'music', label: 'Music', icon: '🎵' },
  { id: 'tech', label: 'Tech', icon: '💻' },
  { id: 'arts', label: 'Arts', icon: '🎨' },
  { id: 'sports', label: 'Sports', icon: '⚽' },
  { id: 'food', label: 'Food', icon: '🍕' },
  { id: 'networking', label: 'Networking', icon: '🤝' },
  { id: 'outdoors', label: 'Outdoors', icon: '🏕️' },
  { id: 'nightlife', label: 'Nightlife', icon: '🌙' },
]

/**
 * Default radius options
 */
const DEFAULT_RADIUS_OPTIONS: RadiusOption[] = [
  { value: '5km', label: '5 km' },
  { value: '10km', label: '10 km' },
  { value: '25km', label: '25 km' },
  { value: '50km', label: '50 km' },
  { value: '100km', label: '100 km' },
]

/**
 * Platform filter options
 */
const PLATFORM_OPTIONS: { id: EventPlatform; label: string; icon: string }[] = [
  { id: 'eventbrite', label: 'Eventbrite', icon: '🎫' },
  { id: 'meetup', label: 'Meetup', icon: '👥' },
]

// ============================================================================
// Subcomponents
// ============================================================================

/**
 * Loading spinner inline component
 */
function LoadingSpinner({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`animate-spin h-5 w-5 ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

/**
 * Filter chip component for category/platform selection
 */
function FilterChip({
  label,
  icon,
  selected,
  onClick,
  testID,
}: {
  label: string
  icon?: string
  selected: boolean
  onClick: () => void
  testID?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium',
        'transition-colors duration-200',
        'focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2',
        selected
          ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-pressed={selected}
      data-testid={testID}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      <span>{label}</span>
    </button>
  )
}

/**
 * Location button component
 */
function LocationButton({
  onClick,
  isLoading,
  hasLocation,
  testID,
}: {
  onClick: () => void
  isLoading: boolean
  hasLocation: boolean
  testID?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      className={[
        'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
        'transition-colors duration-200',
        'focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        hasLocation
          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
          : 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={hasLocation ? 'Location acquired' : 'Get my location'}
      data-testid={testID}
    >
      {isLoading ? (
        <LoadingSpinner className="text-current" />
      ) : (
        <svg
          className="w-4 h-4"
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
      )}
      <span>{hasLocation ? 'Location set' : 'Use my location'}</span>
    </button>
  )
}

/**
 * Empty state component for no results
 */
function EmptyState({
  title,
  message,
  icon = '🔍',
  onRetry,
  testID,
}: {
  title: string
  message: string
  icon?: string
  onRetry?: () => void
  testID?: string
}) {
  return (
    <div
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
      data-testid={testID}
    >
      <span className="text-5xl mb-4" aria-hidden="true">
        {icon}
      </span>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
        {title}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-4">
        {message}
      </p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

/**
 * Error state component
 */
function ErrorState({
  message,
  onRetry,
  testID,
}: {
  message: string
  onRetry?: () => void
  testID?: string
}) {
  return (
    <div
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
      data-testid={testID}
    >
      <span className="text-5xl mb-4" aria-hidden="true">
        ⚠️
      </span>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
        Something went wrong
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-4">
        {message}
      </p>
      {onRetry && (
        <Button variant="primary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

/**
 * Radius selector component
 */
function RadiusSelector({
  value,
  options,
  onChange,
  testID,
}: {
  value: string
  options: RadiusOption[]
  onChange: (value: string) => void
  testID?: string
}) {
  return (
    <div className="flex items-center gap-2" data-testid={testID}>
      <label
        htmlFor="radius-select"
        className="text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        Radius:
      </label>
      <select
        id="radius-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={[
          'block rounded-lg px-3 py-1.5 text-sm',
          'border border-gray-300 dark:border-gray-600',
          'bg-white dark:bg-gray-800',
          'text-gray-900 dark:text-gray-100',
          'focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500',
        ].join(' ')}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * EventSearch - Event discovery and search component
 *
 * Features:
 * - Text search with debouncing
 * - Location-based search with geolocation
 * - Category and platform filtering
 * - Radius selection
 * - Loading, error, and empty states
 * - Event selection callback
 * - Compact mode for modals
 */
export const EventSearch = memo(function EventSearch({
  onEventSelect,
  initialParams = {},
  showFilters = true,
  showLocationButton = true,
  compact = false,
  placeholder = 'Search events...',
  emptyTitle = 'No events found',
  emptyMessage = 'Try adjusting your search filters or location.',
  maxResults = 50,
  autoFocus = false,
  autoFetchLocation = true,
  className = '',
  testID = 'event-search',
}: EventSearchProps) {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const [searchQuery, setSearchQuery] = useState(initialParams.query || '')
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initialParams.categories || []
  )
  const [selectedPlatforms, setSelectedPlatforms] = useState<EventPlatform[]>(
    initialParams.platforms || []
  )
  const [radius, setRadius] = useState(initialParams.radius || '25km')
  const [showPlatformFilters, setShowPlatformFilters] = useState(false)

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null)
  const initialFetchDoneRef = useRef(false)

  // ---------------------------------------------------------------------------
  // Hooks
  // ---------------------------------------------------------------------------

  // User location
  const {
    coordinates,
    isLoading: isLocationLoading,
    error: locationError,
    requestLocation,
  } = useUserLocation({
    enableOnMount: autoFetchLocation,
    enableHighAccuracy: true,
  })

  // Event search
  const {
    events,
    isLoading: isEventsLoading,
    error: eventsError,
    pagination,
    searchEvents,
    fetchNextPage,
    refresh,
  } = useEvents({
    initialParams: {
      ...initialParams,
      coordinates: initialParams.coordinates || coordinates || undefined,
      pageSize: maxResults,
    },
    autoFetch: false,
  })

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  // Search when coordinates become available for the first time
  useEffect(() => {
    if (coordinates && !initialFetchDoneRef.current) {
      initialFetchDoneRef.current = true
      searchEvents({
        coordinates,
        query: searchQuery || undefined,
        categories: selectedCategories.length > 0 ? selectedCategories : undefined,
        platforms: selectedPlatforms.length > 0 ? selectedPlatforms : undefined,
        radius,
      })
    }
  }, [coordinates, searchQuery, selectedCategories, selectedPlatforms, radius, searchEvents])

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  /**
   * Handle search input change
   */
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const query = e.target.value
      setSearchQuery(query)

      if (coordinates) {
        searchEvents({
          coordinates,
          query: query || undefined,
          categories: selectedCategories.length > 0 ? selectedCategories : undefined,
          platforms: selectedPlatforms.length > 0 ? selectedPlatforms : undefined,
          radius,
        })
      }
    },
    [coordinates, selectedCategories, selectedPlatforms, radius, searchEvents]
  )

  /**
   * Handle category toggle
   */
  const handleCategoryToggle = useCallback(
    (categoryId: string) => {
      setSelectedCategories((prev) => {
        const newCategories = prev.includes(categoryId)
          ? prev.filter((id) => id !== categoryId)
          : [...prev, categoryId]

        if (coordinates) {
          searchEvents({
            coordinates,
            query: searchQuery || undefined,
            categories: newCategories.length > 0 ? newCategories : undefined,
            platforms: selectedPlatforms.length > 0 ? selectedPlatforms : undefined,
            radius,
          })
        }

        return newCategories
      })
    },
    [coordinates, searchQuery, selectedPlatforms, radius, searchEvents]
  )

  /**
   * Handle platform toggle
   */
  const handlePlatformToggle = useCallback(
    (platformId: EventPlatform) => {
      setSelectedPlatforms((prev) => {
        const newPlatforms = prev.includes(platformId)
          ? prev.filter((id) => id !== platformId)
          : [...prev, platformId]

        if (coordinates) {
          searchEvents({
            coordinates,
            query: searchQuery || undefined,
            categories: selectedCategories.length > 0 ? selectedCategories : undefined,
            platforms: newPlatforms.length > 0 ? newPlatforms : undefined,
            radius,
          })
        }

        return newPlatforms
      })
    },
    [coordinates, searchQuery, selectedCategories, radius, searchEvents]
  )

  /**
   * Handle radius change
   */
  const handleRadiusChange = useCallback(
    (newRadius: string) => {
      setRadius(newRadius)

      if (coordinates) {
        searchEvents({
          coordinates,
          query: searchQuery || undefined,
          categories: selectedCategories.length > 0 ? selectedCategories : undefined,
          platforms: selectedPlatforms.length > 0 ? selectedPlatforms : undefined,
          radius: newRadius,
        })
      }
    },
    [coordinates, searchQuery, selectedCategories, selectedPlatforms, searchEvents]
  )

  /**
   * Handle location button click
   */
  const handleLocationClick = useCallback(() => {
    requestLocation()
  }, [requestLocation])

  /**
   * Handle event selection
   */
  const handleEventPress = useCallback(
    (event: Event) => {
      onEventSelect?.(event)
    },
    [onEventSelect]
  )

  /**
   * Handle clear search
   */
  const handleClearSearch = useCallback(() => {
    setSearchQuery('')
    setSelectedCategories([])
    setSelectedPlatforms([])
    setRadius('25km')
    searchInputRef.current?.focus()
  }, [])

  /**
   * Handle retry after error
   */
  const handleRetry = useCallback(() => {
    if (coordinates) {
      refresh()
    } else {
      requestLocation()
    }
  }, [coordinates, refresh, requestLocation])

  // ---------------------------------------------------------------------------
  // Computed Values
  // ---------------------------------------------------------------------------

  const isLoading = isLocationLoading || isEventsLoading
  const hasLocation = coordinates !== null
  const hasFiltersApplied =
    selectedCategories.length > 0 ||
    selectedPlatforms.length > 0 ||
    searchQuery.length > 0 ||
    radius !== '25km'

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const containerClasses = [
    'flex flex-col',
    compact ? 'gap-3' : 'gap-4',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={containerClasses} data-testid={testID}>
      {/* Search Input Section */}
      <div className="flex flex-col gap-3">
        {/* Search input with location button */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder={placeholder}
              autoFocus={autoFocus}
              fullWidth
              leftIcon={
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              }
              data-testid={`${testID}-input`}
            />
          </div>

          {showLocationButton && (
            <LocationButton
              onClick={handleLocationClick}
              isLoading={isLocationLoading}
              hasLocation={hasLocation}
              testID={`${testID}-location-btn`}
            />
          )}
        </div>

        {/* Location error message */}
        {locationError && (
          <p
            className="text-sm text-red-500 dark:text-red-400"
            role="alert"
            data-testid={`${testID}-location-error`}
          >
            {locationError.message}
          </p>
        )}
      </div>

      {/* Filters Section */}
      {showFilters && (
        <div className="flex flex-col gap-3">
          {/* Radius and Platform Toggle Row */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <RadiusSelector
              value={radius}
              options={DEFAULT_RADIUS_OPTIONS}
              onChange={handleRadiusChange}
              testID={`${testID}-radius`}
            />

            <button
              type="button"
              onClick={() => setShowPlatformFilters((prev) => !prev)}
              className="text-sm text-pink-600 hover:text-pink-700 dark:text-pink-400 dark:hover:text-pink-300 font-medium"
              data-testid={`${testID}-platform-toggle`}
            >
              {showPlatformFilters ? 'Hide platforms' : 'Filter by platform'}
            </button>
          </div>

          {/* Platform Filters (Collapsible) */}
          {showPlatformFilters && (
            <div
              className="flex flex-wrap gap-2"
              data-testid={`${testID}-platform-filters`}
            >
              {PLATFORM_OPTIONS.map((platform) => (
                <FilterChip
                  key={platform.id}
                  label={platform.label}
                  icon={platform.icon}
                  selected={selectedPlatforms.includes(platform.id)}
                  onClick={() => handlePlatformToggle(platform.id)}
                  testID={`${testID}-platform-${platform.id}`}
                />
              ))}
            </div>
          )}

          {/* Category Filters */}
          <div
            className="flex flex-wrap gap-2"
            data-testid={`${testID}-category-filters`}
          >
            {DEFAULT_CATEGORIES.map((category) => (
              <FilterChip
                key={category.id}
                label={category.label}
                icon={category.icon}
                selected={selectedCategories.includes(category.id)}
                onClick={() => handleCategoryToggle(category.id)}
                testID={`${testID}-category-${category.id}`}
              />
            ))}
          </div>

          {/* Clear Filters */}
          {hasFiltersApplied && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 self-start"
              data-testid={`${testID}-clear-filters`}
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Results Section */}
      <div className="flex flex-col" data-testid={`${testID}-results`}>
        {/* Loading State */}
        {isLoading && events.length === 0 && (
          <div
            className="flex items-center justify-center py-12"
            data-testid={`${testID}-loading`}
          >
            <LoadingSpinner className="text-pink-500" />
            <span className="ml-3 text-gray-500 dark:text-gray-400">
              {isLocationLoading ? 'Getting your location...' : 'Searching events...'}
            </span>
          </div>
        )}

        {/* Error State */}
        {eventsError && events.length === 0 && (
          <ErrorState
            message={eventsError.message}
            onRetry={handleRetry}
            testID={`${testID}-error`}
          />
        )}

        {/* No Location State */}
        {!isLoading && !hasLocation && !locationError && (
          <EmptyState
            title="Enable location to search"
            message="We need your location to find events near you. Click the location button to get started."
            icon="📍"
            testID={`${testID}-no-location`}
          />
        )}

        {/* Empty Results State */}
        {!isLoading &&
          hasLocation &&
          !eventsError &&
          events.length === 0 &&
          initialFetchDoneRef.current && (
            <EmptyState
              title={emptyTitle}
              message={emptyMessage}
              icon="🔍"
              onRetry={handleRetry}
              testID={`${testID}-empty`}
            />
          )}

        {/* Event List */}
        {events.length > 0 && (
          <div className="flex flex-col gap-3">
            {/* Results count */}
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {pagination?.totalCount
                ? `${pagination.totalCount} events found`
                : `${events.length} events`}
            </p>

            {/* Event cards */}
            <div className={compact ? 'flex flex-col gap-2' : 'flex flex-col gap-4'}>
              {events.map((event) =>
                compact ? (
                  <CompactEventCard
                    key={event.id}
                    event={event}
                    onPress={handleEventPress}
                    testID={`${testID}-event-${event.id}`}
                  />
                ) : (
                  <EventCard
                    key={event.id}
                    event={event}
                    onPress={handleEventPress}
                    testID={`${testID}-event-${event.id}`}
                  />
                )
              )}
            </div>

            {/* Load More Button */}
            {pagination?.hasNextPage && (
              <div className="flex justify-center mt-4">
                <Button
                  variant="secondary"
                  onClick={fetchNextPage}
                  isLoading={isEventsLoading}
                  data-testid={`${testID}-load-more`}
                >
                  Load more events
                </Button>
              </div>
            )}

            {/* Loading more indicator */}
            {isEventsLoading && events.length > 0 && (
              <div className="flex items-center justify-center py-4">
                <LoadingSpinner className="text-pink-500" />
                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                  Loading more...
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
})

// ============================================================================
// Preset Variants
// ============================================================================

/**
 * Compact EventSearch for modals and dense displays
 */
export const CompactEventSearch = memo(function CompactEventSearch(
  props: Omit<EventSearchProps, 'compact' | 'showFilters'>
) {
  return (
    <EventSearch
      {...props}
      compact={true}
      showFilters={false}
      testID={props.testID ?? 'event-search-compact'}
    />
  )
})

/**
 * EventSearch with full filter controls visible
 */
export const FullEventSearch = memo(function FullEventSearch(
  props: Omit<EventSearchProps, 'showFilters'>
) {
  return (
    <EventSearch
      {...props}
      showFilters={true}
      testID={props.testID ?? 'event-search-full'}
    />
  )
})

// ============================================================================
// Exports
// ============================================================================

export default EventSearch
