/**
 * LocationMarker Component
 *
 * A styled map marker that shows post activity status through visual states.
 * Uses animated pulse effects for "hot" locations with recent posts.
 *
 * States:
 * - Hot: < 2 hours ago - Animated pulse + amber glow
 * - Active: < 24 hours - Soft static glow
 * - Historical: Has posts but older - Muted marker
 * - Virgin: No posts - Faint dot
 *
 * @example
 * ```tsx
 * <LocationMarker
 *   postCount={5}
 *   latestPostAt={new Date()}
 *   onPress={() => handleMarkerPress(location)}
 * />
 * ```
 */

import React, { memo, useEffect, useRef } from 'react'
import { View, Animated, StyleSheet, Easing } from 'react-native'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Activity state of a location based on post recency
 */
export type LocationActivityState = 'hot' | 'active' | 'historical' | 'virgin'

/**
 * Props for the LocationMarker component
 */
export interface LocationMarkerProps {
  /**
   * Number of posts at this location
   */
  postCount: number

  /**
   * Timestamp of the most recent post (null if no posts)
   */
  latestPostAt: Date | null

  /**
   * Callback when marker is pressed
   */
  onPress?: () => void

  /**
   * Size of the marker (small, medium, large)
   * @default 'medium'
   */
  size?: 'small' | 'medium' | 'large'

  /**
   * Whether the marker is selected
   */
  selected?: boolean
}

// ============================================================================
// CONSTANTS
// ============================================================================

const COLORS = {
  hot: '#F4A261',        // Amber glow for hot locations
  hotGlow: '#F4A261',
  active: '#FF6B47',     // Primary orange for active
  activeGlow: 'rgba(255, 107, 71, 0.3)',
  historical: '#8E8E93', // Muted gray for old posts
  virgin: '#C7C7CC',     // Faint for no posts
  selected: '#FF6B47',
}

const SIZES = {
  small: { outer: 24, inner: 12, glow: 36 },
  medium: { outer: 32, inner: 16, glow: 48 },
  large: { outer: 40, inner: 20, glow: 60 },
}

// Time thresholds in milliseconds
const TWO_HOURS_MS = 2 * 60 * 60 * 1000
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Determine the activity state based on post count and recency
 */
export function getActivityState(postCount: number, latestPostAt: Date | null): LocationActivityState {
  if (postCount === 0 || !latestPostAt) {
    return 'virgin'
  }

  const now = Date.now()
  const postTime = latestPostAt.getTime()
  const timeSincePost = now - postTime

  if (timeSincePost < TWO_HOURS_MS) {
    return 'hot'
  }

  if (timeSincePost < TWENTY_FOUR_HOURS_MS) {
    return 'active'
  }

  return 'historical'
}

/**
 * Get color based on activity state
 */
function getMarkerColor(state: LocationActivityState): string {
  switch (state) {
    case 'hot':
      return COLORS.hot
    case 'active':
      return COLORS.active
    case 'historical':
      return COLORS.historical
    case 'virgin':
    default:
      return COLORS.virgin
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * LocationMarker - Visual indicator for map locations with post activity
 *
 * Displays a marker with visual states based on post recency:
 * - Hot locations pulse with an animated glow
 * - Active locations have a static soft glow
 * - Historical locations are muted
 * - Virgin locations are faint
 */
export const LocationMarker = memo(function LocationMarker({
  postCount,
  latestPostAt,
  onPress,
  size = 'medium',
  selected = false,
}: LocationMarkerProps): JSX.Element {
  // ---------------------------------------------------------------------------
  // ANIMATION
  // ---------------------------------------------------------------------------

  const pulseAnim = useRef(new Animated.Value(0)).current
  const glowAnim = useRef(new Animated.Value(0.4)).current

  const activityState = getActivityState(postCount, latestPostAt)
  const isHot = activityState === 'hot'

  // Start pulse animation for hot locations
  useEffect(() => {
    if (isHot) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      )

      const glowAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 0.8,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.4,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      )

      pulseAnimation.start()
      glowAnimation.start()

      return () => {
        pulseAnimation.stop()
        glowAnimation.stop()
      }
    } else {
      // Reset animations for non-hot states
      pulseAnim.setValue(0)
      glowAnim.setValue(0.4)
    }
  }, [isHot, pulseAnim, glowAnim])

  // ---------------------------------------------------------------------------
  // COMPUTED VALUES
  // ---------------------------------------------------------------------------

  const sizeConfig = SIZES[size]
  const markerColor = selected ? COLORS.selected : getMarkerColor(activityState)

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.3],
  })

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <View style={styles.container}>
      {/* Glow effect for hot and active locations */}
      {(isHot || activityState === 'active') && (
        <Animated.View
          style={[
            styles.glow,
            {
              width: sizeConfig.glow,
              height: sizeConfig.glow,
              borderRadius: sizeConfig.glow / 2,
              backgroundColor: isHot ? COLORS.hotGlow : COLORS.activeGlow,
              opacity: isHot ? glowAnim : 0.3,
              transform: isHot ? [{ scale: pulseScale }] : [],
            },
          ]}
        />
      )}

      {/* Outer circle */}
      <View
        style={[
          styles.outer,
          {
            width: sizeConfig.outer,
            height: sizeConfig.outer,
            borderRadius: sizeConfig.outer / 2,
            backgroundColor: markerColor,
          },
          selected && styles.selectedOuter,
        ]}
      >
        {/* Inner circle */}
        <View
          style={[
            styles.inner,
            {
              width: sizeConfig.inner,
              height: sizeConfig.inner,
              borderRadius: sizeConfig.inner / 2,
            },
          ]}
        />
      </View>

      {/* Post count badge for active locations */}
      {postCount > 0 && (activityState === 'hot' || activityState === 'active') && (
        <View style={[styles.countBadge, { backgroundColor: markerColor }]}>
          <Animated.Text
            style={[
              styles.countText,
              isHot && { transform: [{ scale: pulseScale }] },
            ]}
          >
            {postCount > 99 ? '99+' : postCount}
          </Animated.Text>
        </View>
      )}
    </View>
  )
})

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  glow: {
    position: 'absolute',
  },

  outer: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },

  selectedOuter: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },

  inner: {
    backgroundColor: '#FFFFFF',
  },

  countBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  countText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
})

// ============================================================================
// EXPORTS
// ============================================================================

export default LocationMarker
