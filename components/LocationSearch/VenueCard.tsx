'use client'

/**
 * VenueCard Component
 *
 * Displays a venue card with name, address, type, and post count badge.
 * Used in the Discover screen to show search results and popular venues.
 *
 * Features:
 * - Shows venue name prominently
 * - Displays formatted address
 * - Shows venue type with icon
 * - Post count badge for venues with active posts
 * - Optional distance display
 * - Skeleton loading state for async data
 * - iOS-style design matching the app theme
 * - Accessibility support with proper ARIA labels
 *
 * @example
 * ```tsx
 * // Basic usage
 * <VenueCard
 *   venue={venue}
 *   onPress={(venue) => navigation.navigate('VenueDetail', { venueId: venue.id })}
 * />
 *
 * // With compact mode
 * <VenueCard
 *   venue={venue}
 *   compact
 *   onPress={handlePress}
 * />
 *
 * // Skeleton loading state
 * <VenueCard.Skeleton />
 * ```
 */

import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  type StyleProp,
  type ViewStyle,
} from 'react-native'

import type { Venue, VenueCategory } from '../../types/location'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Props for the VenueCard component
 */
export interface VenueCardProps {
  /** Venue data to display */
  venue: Venue
  /** Callback when the card is pressed */
  onPress?: (venue: Venue) => void
  /** Callback when the card is long-pressed */
  onLongPress?: (venue: Venue) => void
  /** Whether to show compact layout */
  compact?: boolean
  /** Whether to show the post count badge */
  showPostCount?: boolean
  /** Whether to show the distance */
  showDistance?: boolean
  /** Whether to show the venue type */
  showType?: boolean
  /** Custom container style */
  style?: StyleProp<ViewStyle>
  /** Test ID for testing purposes */
  testID?: string
}

/**
 * Props for the VenueCard skeleton component
 */
export interface VenueCardSkeletonProps {
  /** Whether to show compact layout */
  compact?: boolean
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
  skeleton: '#E5E5EA',
  skeletonHighlight: '#F2F2F7',
} as const

/**
 * Venue type icon mapping
 */
const VENUE_TYPE_ICONS: Record<VenueCategory | string, string> = {
  cafe: '☕',
  gym: '💪',
  bar: '🍺',
  restaurant: '🍽️',
  bookstore: '📚',
  park: '🌳',
  museum: '🏛️',
  library: '📖',
  // Default fallback
  default: '📍',
} as const

/**
 * Venue type display labels
 */
const VENUE_TYPE_LABELS: Record<string, string> = {
  cafe: 'Cafe',
  coffee_shop: 'Cafe',
  gym: 'Gym',
  fitness_center: 'Gym',
  bar: 'Bar',
  night_club: 'Bar',
  restaurant: 'Restaurant',
  food: 'Restaurant',
  book_store: 'Bookstore',
  bookstore: 'Bookstore',
  library: 'Library',
  park: 'Park',
  hiking_area: 'Park',
  museum: 'Museum',
  art_gallery: 'Museum',
} as const

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get the icon for a venue type
 */
function getVenueTypeIcon(placeTypes: string[] | undefined): string {
  if (!placeTypes || placeTypes.length === 0) {
    return VENUE_TYPE_ICONS.default
  }

  for (const type of placeTypes) {
    const normalizedType = type.toLowerCase().replace(/_/g, '')
    for (const [key, icon] of Object.entries(VENUE_TYPE_ICONS)) {
      if (normalizedType.includes(key.replace(/_/g, '')) || key.includes(normalizedType)) {
        return icon
      }
    }
  }

  return VENUE_TYPE_ICONS.default
}

/**
 * Get the display label for a venue type
 */
function getVenueTypeLabel(placeTypes: string[] | undefined): string | null {
  if (!placeTypes || placeTypes.length === 0) {
    return null
  }

  for (const type of placeTypes) {
    const label = VENUE_TYPE_LABELS[type.toLowerCase()]
    if (label) {
      return label
    }
  }

  // If no matching label found, try to format the first type nicely
  const firstType = placeTypes[0]
  if (firstType) {
    return firstType
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  return null
}

/**
 * Format distance for display
 */
function formatDistance(meters: number | undefined): string | null {
  if (meters === undefined || meters < 0) {
    return null
  }

  if (meters < 1000) {
    return `${Math.round(meters)}m away`
  }

  const km = meters / 1000
  if (km < 10) {
    return `${km.toFixed(1)}km away`
  }

  return `${Math.round(km)}km away`
}

/**
 * Format post count for display
 */
function formatPostCount(count: number): string {
  if (count === 1) {
    return '1 post'
  }
  return `${count} posts`
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

/**
 * Venue type badge with icon and label
 */
const VenueTypeBadge = memo(function VenueTypeBadge({
  placeTypes,
  testID,
}: {
  placeTypes: string[] | undefined
  testID?: string
}): JSX.Element | null {
  const icon = getVenueTypeIcon(placeTypes)
  const label = getVenueTypeLabel(placeTypes)

  return (
    <View style={styles.typeBadge} testID={testID}>
      <Text style={styles.typeIcon}>{icon}</Text>
      {label && <Text style={styles.typeLabel}>{label}</Text>}
    </View>
  )
})

/**
 * Post count badge
 */
const PostCountBadge = memo(function PostCountBadge({
  post_count,
  testID,
}: {
  post_count: number
  testID?: string
}): JSX.Element | null {
  if (post_count <= 0) {
    return null
  }

  return (
    <View style={styles.postCountBadge} testID={testID}>
      <Text style={styles.postCountText}>{formatPostCount(post_count)}</Text>
    </View>
  )
})

/**
 * Distance display
 */
const DistanceDisplay = memo(function DistanceDisplay({
  distanceMeters,
  testID,
}: {
  distanceMeters: number | undefined
  testID?: string
}): JSX.Element | null {
  const formattedDistance = formatDistance(distanceMeters)

  if (!formattedDistance) {
    return null
  }

  return (
    <Text style={styles.distanceText} testID={testID}>
      {formattedDistance}
    </Text>
  )
})

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * VenueCard - Displays venue information with post count badge
 *
 * @param venue - Venue data to display
 * @param onPress - Callback when card is pressed
 * @param onLongPress - Callback when card is long-pressed
 * @param compact - Whether to show compact layout
 * @param showPostCount - Whether to show post count badge (default: true)
 * @param showDistance - Whether to show distance (default: true)
 * @param showType - Whether to show venue type (default: true)
 * @param style - Custom container style
 * @param testID - Test ID for testing
 */
function VenueCardComponent({
  venue,
  onPress,
  onLongPress,
  compact = false,
  showPostCount = true,
  showDistance = true,
  showType = true,
  style,
  testID = 'venue-card',
}: VenueCardProps): JSX.Element {
  // ---------------------------------------------------------------------------
  // Computed Values
  // ---------------------------------------------------------------------------

  const hasAddress = venue.address != null && venue.address.length > 0
  const hasPostCount = venue.post_count > 0
  const hasDistance = venue.distance_meters !== undefined

  // ---------------------------------------------------------------------------
  // Styles
  // ---------------------------------------------------------------------------

  const containerStyles = useMemo(() => {
    return [styles.container, compact && styles.containerCompact, style]
  }, [compact, style])

  const contentStyles = useMemo(() => {
    return [styles.content, compact && styles.contentCompact]
  }, [compact])

  // ---------------------------------------------------------------------------
  // Event Handlers
  // ---------------------------------------------------------------------------

  const handlePress = useCallback(() => {
    onPress?.(venue)
  }, [onPress, venue])

  const handleLongPress = useCallback(() => {
    onLongPress?.(venue)
  }, [onLongPress, venue])

  // ---------------------------------------------------------------------------
  // Accessibility
  // ---------------------------------------------------------------------------

  const accessibilityLabel = useMemo(() => {
    const parts = [venue.name]

    if (hasAddress) {
      parts.push(`at ${venue.address}`)
    }

    if (hasPostCount) {
      parts.push(`${formatPostCount(venue.post_count)}`)
    }

    if (hasDistance) {
      const distance = formatDistance(venue.distance_meters)
      if (distance) {
        parts.push(distance)
      }
    }

    return parts.join(', ')
  }, [venue, hasAddress, hasPostCount, hasDistance])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <TouchableOpacity
      style={containerStyles}
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
      disabled={!onPress && !onLongPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={onPress ? 'Double tap to view venue details' : undefined}
      testID={testID}
    >
      <View style={contentStyles}>
        {/* Header Row: Type Badge + Distance */}
        <View style={styles.headerRow}>
          {showType && (
            <VenueTypeBadge
              placeTypes={venue.place_types}
              testID={`${testID}-type`}
            />
          )}
          {showDistance && hasDistance && (
            <DistanceDisplay
              distanceMeters={venue.distance_meters}
              testID={`${testID}-distance`}
            />
          )}
        </View>

        {/* Venue Name */}
        <Text
          style={[styles.name, compact && styles.nameCompact]}
          numberOfLines={compact ? 1 : 2}
          testID={`${testID}-name`}
        >
          {venue.name}
        </Text>

        {/* Address */}
        {hasAddress && (
          <Text
            style={styles.address}
            numberOfLines={compact ? 1 : 2}
            testID={`${testID}-address`}
          >
            {venue.address}
          </Text>
        )}

        {/* Footer Row: Post Count Badge */}
        {showPostCount && hasPostCount && (
          <View style={styles.footerRow}>
            <PostCountBadge
              post_count={venue.post_count}
              testID={`${testID}-post-count`}
            />
          </View>
        )}
      </View>
    </TouchableOpacity>
  )
}

/**
 * Memoized VenueCard component for performance
 */
export const VenueCard = memo(VenueCardComponent)

// ============================================================================
// SKELETON COMPONENT
// ============================================================================

/**
 * Animated skeleton shimmer effect component
 * Provides a pulsing animation for loading states
 */
function SkeletonShimmer({
  style,
  children,
}: {
  style?: StyleProp<ViewStyle>
  children?: React.ReactNode
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
        styles.skeleton,
        style,
        { opacity: shimmerAnim },
      ]}
    >
      {children}
    </Animated.View>
  )
}

/**
 * VenueCard skeleton loading state
 *
 * Displays an animated skeleton placeholder while venue data is loading.
 * Features a smooth pulsing animation to indicate loading progress.
 */
function VenueCardSkeletonComponent({
  compact = false,
  style,
  testID = 'venue-card-skeleton',
}: VenueCardSkeletonProps): JSX.Element {
  const containerStyles = useMemo(() => {
    return [styles.container, compact && styles.containerCompact, style]
  }, [compact, style])

  return (
    <View
      style={containerStyles}
      testID={testID}
      accessibilityRole="none"
      accessibilityLabel="Loading venue"
    >
      <View style={[styles.content, compact && styles.contentCompact]}>
        {/* Header Skeleton */}
        <View style={styles.headerRow}>
          <SkeletonShimmer style={styles.skeletonTypeBadge} />
          <SkeletonShimmer style={styles.skeletonDistance} />
        </View>

        {/* Name Skeleton */}
        <SkeletonShimmer
          style={[
            styles.skeletonName,
            compact && styles.skeletonNameCompact,
          ]}
        />

        {/* Address Skeleton */}
        <SkeletonShimmer style={styles.skeletonAddress} />

        {/* Post Count Skeleton */}
        <View style={styles.footerRow}>
          <SkeletonShimmer style={styles.skeletonPostCount} />
        </View>
      </View>
    </View>
  )
}

/**
 * Memoized VenueCard skeleton component
 */
export const VenueCardSkeleton = memo(VenueCardSkeletonComponent)

// ============================================================================
// PRESET VARIANTS
// ============================================================================

/**
 * Compact VenueCard for dense list displays
 */
export const CompactVenueCard = memo(function CompactVenueCard(
  props: Omit<VenueCardProps, 'compact'>
): JSX.Element {
  return <VenueCard {...props} compact testID={props.testID ?? 'venue-card-compact'} />
})

/**
 * VenueCard without distance display
 */
export const VenueCardNoDistance = memo(function VenueCardNoDistance(
  props: Omit<VenueCardProps, 'showDistance'>
): JSX.Element {
  return (
    <VenueCard
      {...props}
      showDistance={false}
      testID={props.testID ?? 'venue-card-no-distance'}
    />
  )
})

// ============================================================================
// LIST ITEM COMPONENT
// ============================================================================

/**
 * Props for VenueCardListItem
 */
export interface VenueCardListItemProps extends VenueCardProps {
  /** Index in the list */
  index?: number
  /** Whether to show a separator below the item */
  showSeparator?: boolean
}

/**
 * VenueCard list item with optional separator
 */
export const VenueCardListItem = memo(function VenueCardListItem({
  index = 0,
  showSeparator = true,
  ...props
}: VenueCardListItemProps): JSX.Element {
  return (
    <View>
      <VenueCard {...props} />
      {showSeparator && <View style={styles.separator} />}
    </View>
  )
})

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Container
  container: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },

  containerCompact: {
    borderRadius: 8,
  },

  // Content
  content: {
    padding: 16,
  },

  contentCompact: {
    padding: 12,
  },

  // Header Row
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  // Type Badge
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },

  typeIcon: {
    fontSize: 12,
    marginRight: 4,
  },

  typeLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },

  // Distance
  distanceText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  // Name
  name: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },

  nameCompact: {
    fontSize: 15,
  },

  // Address
  address: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },

  // Footer Row
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },

  // Post Count Badge
  postCountBadge: {
    backgroundColor: COLORS.pink,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },

  postCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.cardBackground,
  },

  // Separator
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 16,
  },

  // Skeleton Styles
  skeleton: {
    backgroundColor: COLORS.skeleton,
    borderRadius: 4,
  },

  skeletonTypeBadge: {
    width: 70,
    height: 24,
    borderRadius: 6,
  },

  skeletonDistance: {
    width: 60,
    height: 14,
  },

  skeletonName: {
    width: '75%',
    height: 20,
    marginBottom: 4,
  },

  skeletonNameCompact: {
    height: 18,
  },

  skeletonAddress: {
    width: '90%',
    height: 16,
    marginBottom: 8,
  },

  skeletonPostCount: {
    width: 60,
    height: 24,
    borderRadius: 12,
  },
})

// ============================================================================
// EXPORTS
// ============================================================================

export default VenueCard
