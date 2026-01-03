'use client'

/**
 * PopularVenues Component
 *
 * Displays a discovery feed of the top 10 popular venues by post_count
 * within the user's area. Uses PostGIS proximity queries to find nearby
 * venues with active missed connection posts.
 *
 * Features:
 * - Top 10 venues sorted by post_count (most popular first)
 * - Pull-to-refresh for updating the list
 * - Skeleton loading states
 * - Empty state when no popular venues found
 * - Error handling with retry option
 * - Venue type filtering support
 * - iOS-style design matching the app theme
 *
 * @example
 * ```tsx
 * // Basic usage with user coordinates
 * <PopularVenues
 *   latitude={37.7749}
 *   longitude={-122.4194}
 *   onVenuePress={(venue) => navigation.navigate('VenueDetail', { venueId: venue.id })}
 * />
 *
 * // With type filtering
 * <PopularVenues
 *   latitude={37.7749}
 *   longitude={-122.4194}
 *   placeTypes={['cafe', 'coffee_shop']}
 *   onVenuePress={handleVenuePress}
 * />
 *
 * // Loading state
 * <PopularVenues.Skeleton />
 * ```
 */

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
  type StyleProp,
  type ViewStyle,
  type ListRenderItem,
} from 'react-native'

import { supabase } from '../../lib/supabase'
import { fetchPopularVenues } from '../../services/locationService'
import type { Venue } from '../../types/location'
import type { Location } from '../../types/database'
import { VenueCard, VenueCardSkeleton } from './VenueCard'
import { LOCATION_CONSTANTS } from '../../types/location'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Props for the PopularVenues component
 */
export interface PopularVenuesProps {
  /** User's current latitude coordinate */
  latitude: number
  /** User's current longitude coordinate */
  longitude: number
  /** Search radius in meters (default: 5000 = 5km) */
  radiusMeters?: number
  /** Maximum number of venues to display (default: 10) */
  maxResults?: number
  /** Filter by venue types (optional) */
  placeTypes?: string[]
  /** Callback when a venue is pressed */
  onVenuePress?: (venue: Venue) => void
  /** Callback when a venue is long-pressed */
  onVenueLongPress?: (venue: Venue) => void
  /** Custom header component above the list */
  headerComponent?: React.ReactElement
  /** Custom footer component below the list */
  footerComponent?: React.ReactElement
  /** Custom container style */
  style?: StyleProp<ViewStyle>
  /** Test ID for testing purposes */
  testID?: string
  /** Whether to show the section header */
  showHeader?: boolean
  /** Custom header title */
  headerTitle?: string
}

/**
 * Props for the PopularVenues skeleton component
 */
export interface PopularVenuesSkeletonProps {
  /** Number of skeleton items to show (default: 3) */
  count?: number
  /** Custom container style */
  style?: StyleProp<ViewStyle>
  /** Test ID for testing purposes */
  testID?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * iOS-style colors matching the app theme
 */
const COLORS = {
  primary: '#FF6B47',
  secondary: '#8E8E93',
  background: '#F2F2F7',
  cardBackground: '#FFFFFF',
  border: '#E5E5EA',
  text: '#000000',
  textSecondary: '#8E8E93',
  pink: '#FF6B47',
  error: '#FF3B30',
} as const

/**
 * Default number of popular venues to fetch
 */
const DEFAULT_MAX_RESULTS = LOCATION_CONSTANTS.DEFAULT_POPULAR_VENUES_COUNT

/**
 * Default search radius in meters
 */
const DEFAULT_RADIUS_METERS = LOCATION_CONSTANTS.DEFAULT_RADIUS_METERS

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

/**
 * Section header for the popular venues list
 */
const SectionHeader = memo(function SectionHeader({
  title,
  testID,
}: {
  title: string
  testID?: string
}): JSX.Element {
  return (
    <View style={styles.sectionHeader} testID={testID}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>Venues with active posts near you</Text>
    </View>
  )
})

/**
 * Empty state when no popular venues are found
 */
const EmptyState = memo(function EmptyState({
  message,
  onRetry,
  testID,
}: {
  message?: string
  onRetry?: () => void
  testID?: string
}): JSX.Element {
  return (
    <View style={styles.emptyContainer} testID={testID}>
      <Text style={styles.emptyIcon}>📍</Text>
      <Text style={styles.emptyTitle}>No Popular Venues</Text>
      <Text style={styles.emptyMessage}>
        {message || "We couldn't find any venues with active posts in your area. Check back later!"}
      </Text>
      {onRetry && (
        <TouchableOpacity
          style={styles.retryButton}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Retry loading popular venues"
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  )
})

/**
 * Error state with retry option
 */
const ErrorState = memo(function ErrorState({
  error,
  onRetry,
  testID,
}: {
  error: string
  onRetry?: () => void
  testID?: string
}): JSX.Element {
  return (
    <View style={styles.errorContainer} testID={testID}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.errorTitle}>Unable to Load</Text>
      <Text style={styles.errorMessage}>{error}</Text>
      {onRetry && (
        <TouchableOpacity
          style={styles.retryButton}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Retry loading popular venues"
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  )
})

/**
 * Loading indicator for initial load
 */
const LoadingState = memo(function LoadingState({
  testID,
}: {
  testID?: string
}): JSX.Element {
  return (
    <View style={styles.loadingContainer} testID={testID}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.loadingText}>Finding popular venues...</Text>
    </View>
  )
})

/**
 * Separator between venue cards
 */
const ItemSeparator = memo(function ItemSeparator(): JSX.Element {
  return <View style={styles.separator} />
})

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert Location from database to Venue for display
 */
function locationToVenue(location: Location): Venue {
  return {
    ...location,
    source: 'supabase' as const,
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * PopularVenues - Discovery feed showing top venues by post count
 *
 * This component fetches and displays popular venues near the user's location.
 * Venues are sorted by post_count (most popular first), showing the top 10
 * venues with active missed connection posts.
 *
 * @param latitude - User's latitude coordinate
 * @param longitude - User's longitude coordinate
 * @param radiusMeters - Search radius in meters (default: 5000)
 * @param maxResults - Max venues to show (default: 10)
 * @param placeTypes - Optional venue type filter
 * @param onVenuePress - Callback when venue is pressed
 * @param onVenueLongPress - Callback when venue is long-pressed
 * @param headerComponent - Custom header above list
 * @param footerComponent - Custom footer below list
 * @param style - Custom container style
 * @param testID - Test ID for testing
 * @param showHeader - Whether to show section header (default: true)
 * @param headerTitle - Custom header title
 */
function PopularVenuesComponent({
  latitude,
  longitude,
  radiusMeters = DEFAULT_RADIUS_METERS,
  maxResults = DEFAULT_MAX_RESULTS,
  placeTypes,
  onVenuePress,
  onVenueLongPress,
  headerComponent,
  footerComponent,
  style,
  testID = 'popular-venues',
  showHeader = true,
  headerTitle = 'Popular Venues',
}: PopularVenuesProps): JSX.Element {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const [venues, setVenues] = useState<Venue[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ---------------------------------------------------------------------------
  // Data Fetching
  // ---------------------------------------------------------------------------

  /**
   * Fetch popular venues from the service
   */
  const loadPopularVenues = useCallback(async (showLoadingState = true) => {
    if (showLoadingState) {
      setIsLoading(true)
    }
    setError(null)

    try {
      const result = await fetchPopularVenues(supabase, {
        latitude,
        longitude,
        radius_meters: radiusMeters,
        max_results: maxResults,
        min_post_count: 1, // Only show venues with at least 1 post
        place_types: placeTypes,
      })

      if (result.success) {
        // Convert Location[] to Venue[]
        const venueData = result.venues.map(locationToVenue)
        setVenues(venueData)
        setError(null)
      } else {
        setError(result.error?.message || 'Failed to load popular venues')
        setVenues([])
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(message)
      setVenues([])
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [latitude, longitude, radiusMeters, maxResults, placeTypes])

  /**
   * Handle pull-to-refresh
   */
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true)
    loadPopularVenues(false)
  }, [loadPopularVenues])

  /**
   * Handle retry after error
   */
  const handleRetry = useCallback(() => {
    loadPopularVenues(true)
  }, [loadPopularVenues])

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  /**
   * Load venues on mount and when params change
   */
  useEffect(() => {
    loadPopularVenues(true)
  }, [loadPopularVenues])

  // ---------------------------------------------------------------------------
  // Render Helpers
  // ---------------------------------------------------------------------------

  /**
   * Render a single venue item
   */
  const renderVenueItem: ListRenderItem<Venue> = useCallback(({ item, index }) => {
    return (
      <VenueCard
        venue={item}
        onPress={onVenuePress}
        onLongPress={onVenueLongPress}
        showDistance={false}
        testID={`${testID}-item-${index}`}
      />
    )
  }, [onVenuePress, onVenueLongPress, testID])

  /**
   * Extract key for venue item
   */
  const keyExtractor = useCallback((item: Venue) => {
    return item.id || item.google_place_id
  }, [])

  /**
   * Render list header with optional custom header
   */
  const ListHeaderComponent = useMemo(() => {
    return (
      <>
        {headerComponent}
        {showHeader && (
          <SectionHeader
            title={headerTitle}
            testID={`${testID}-header`}
          />
        )}
      </>
    )
  }, [headerComponent, showHeader, headerTitle, testID])

  /**
   * Render list footer with optional custom footer
   */
  const ListFooterComponent = useMemo(() => {
    return footerComponent ?? null
  }, [footerComponent])

  /**
   * Render empty list component
   */
  const ListEmptyComponent = useMemo(() => {
    if (isLoading) {
      return null // Don't show empty state while loading
    }
    return <EmptyState onRetry={handleRetry} testID={`${testID}-empty`} />
  }, [isLoading, handleRetry, testID])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  // Show loading state on initial load
  if (isLoading && venues.length === 0) {
    return (
      <View style={[styles.container, style]} testID={testID}>
        {ListHeaderComponent}
        <PopularVenuesSkeleton testID={`${testID}-skeleton`} />
      </View>
    )
  }

  // Show error state
  if (error && venues.length === 0) {
    return (
      <View style={[styles.container, style]} testID={testID}>
        {ListHeaderComponent}
        <ErrorState
          error={error}
          onRetry={handleRetry}
          testID={`${testID}-error`}
        />
      </View>
    )
  }

  return (
    <FlatList
      data={venues}
      renderItem={renderVenueItem}
      keyExtractor={keyExtractor}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={ListFooterComponent}
      ListEmptyComponent={ListEmptyComponent}
      ItemSeparatorComponent={ItemSeparator}
      contentContainerStyle={[styles.listContent, style]}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={COLORS.primary}
          colors={[COLORS.primary]}
        />
      }
      showsVerticalScrollIndicator={false}
      testID={testID}
      accessibilityRole="list"
      accessibilityLabel={`${headerTitle} list with ${venues.length} venues`}
    />
  )
}

/**
 * Memoized PopularVenues component for performance
 */
export const PopularVenues = memo(PopularVenuesComponent)

// ============================================================================
// SKELETON COMPONENT
// ============================================================================

/**
 * Animated skeleton shimmer effect component for PopularVenues
 * Provides a pulsing animation for loading states
 */
function SkeletonShimmer({
  style,
}: {
  style?: StyleProp<ViewStyle>
}): JSX.Element {
  const shimmerAnim = useRef(new Animated.Value(0.3)).current

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    )
    animation.start()

    return () => {
      animation.stop()
    }
  }, [shimmerAnim])

  return (
    <Animated.View
      style={[
        styles.skeletonBar,
        style,
        { opacity: shimmerAnim },
      ]}
    />
  )
}

/**
 * Skeleton header component for loading state
 */
const SkeletonHeader = memo(function SkeletonHeader({
  testID,
}: {
  testID?: string
}): JSX.Element {
  return (
    <View style={styles.sectionHeader} testID={testID}>
      <SkeletonShimmer style={styles.skeletonTitle} />
      <SkeletonShimmer style={styles.skeletonSubtitle} />
    </View>
  )
})

/**
 * PopularVenues skeleton loading state
 *
 * Displays animated skeleton placeholders for the section header
 * and venue cards while data is loading.
 */
function PopularVenuesSkeletonComponent({
  count = 3,
  style,
  testID = 'popular-venues-skeleton',
}: PopularVenuesSkeletonProps): JSX.Element {
  const skeletonItems = useMemo(() => {
    return Array.from({ length: count }, (_, index) => index)
  }, [count])

  return (
    <View
      style={[styles.skeletonContainer, style]}
      testID={testID}
      accessibilityRole="none"
      accessibilityLabel="Loading popular venues"
    >
      <SkeletonHeader testID={`${testID}-header`} />
      {skeletonItems.map((index) => (
        <View key={index} style={styles.skeletonItem}>
          <VenueCardSkeleton testID={`${testID}-item-${index}`} />
        </View>
      ))}
    </View>
  )
}

/**
 * Memoized skeleton component
 */
export const PopularVenuesSkeleton = memo(PopularVenuesSkeletonComponent)

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Container
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },

  // Section Header
  sectionHeader: {
    paddingVertical: 16,
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },

  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },

  // Separator
  separator: {
    height: 12,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },

  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },

  emptyMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Error State
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },

  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },

  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.error,
    marginBottom: 8,
    textAlign: 'center',
  },

  errorMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },

  // Retry Button
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },

  retryButtonText: {
    color: COLORS.cardBackground,
    fontSize: 16,
    fontWeight: '600',
  },

  // Loading State
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },

  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 12,
  },

  // Skeleton
  skeletonContainer: {
    paddingHorizontal: 16,
  },

  skeletonItem: {
    marginBottom: 12,
  },

  skeletonBar: {
    backgroundColor: '#E5E5EA',
    borderRadius: 4,
  },

  skeletonTitle: {
    width: 160,
    height: 24,
    borderRadius: 4,
    marginBottom: 8,
  },

  skeletonSubtitle: {
    width: 220,
    height: 16,
    borderRadius: 4,
  },
})

// ============================================================================
// EXPORTS
// ============================================================================

export default PopularVenues
