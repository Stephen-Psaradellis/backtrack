/**
 * AvatarComparison Component
 *
 * Side-by-side comparison view of two avatars (target avatar from post vs viewer's avatar).
 * Shows visual matching indicator and highlights potential matches.
 *
 * Features:
 * - Side-by-side avatar display with labels
 * - Visual matching indicator
 * - Animated entrance (fade + scale)
 * - Dark theme with glass card background
 * - Accessibility support
 *
 * @example
 * ```tsx
 * import { AvatarComparison } from 'components/AvatarComparison'
 *
 * // Basic usage in PostDetailScreen
 * <AvatarComparison
 *   targetAvatar={post.target_avatar_v2}
 *   myAvatar={profile.avatar}
 *   matchScore={85}
 *   testID="post-detail-avatar-comparison"
 * />
 * ```
 */

import React, { useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ViewStyle,
} from 'react-native'
import { darkTheme } from '../constants/glassStyles'
import { AvatarDisplay } from './AvatarDisplay'
import type { StoredAvatar } from '../types/avatar'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Props for the AvatarComparison component
 */
export interface AvatarComparisonProps {
  /**
   * Target avatar from the post (the person they're looking for)
   */
  targetAvatar?: StoredAvatar | null

  /**
   * Viewer's avatar (the current user's avatar)
   */
  myAvatar?: StoredAvatar | null

  /**
   * Match score (0-100) if available
   * Shows visual indicator when provided
   */
  matchScore?: number

  /**
   * Additional container style
   */
  style?: ViewStyle

  /**
   * Test ID for testing purposes
   */
  testID?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Colors for match score indicators
 */
const MATCH_COLORS = {
  excellent: '#34C759', // Green - 90+
  strong: '#5AC8FA',    // Light blue - 75-89
  good: '#FF6B9D',      // Coral - 60-74
  partial: '#FF9500',   // Orange - 40-59
  low: '#8E8E93',       // Gray - <40
} as const

/**
 * Animation durations
 */
const ANIMATION_DURATION = 600

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get the color for a match score
 *
 * @param score - Match score (0-100)
 * @returns Color string for the match indicator
 */
function getMatchColor(score: number): string {
  if (score >= 90) return MATCH_COLORS.excellent
  if (score >= 75) return MATCH_COLORS.strong
  if (score >= 60) return MATCH_COLORS.good
  if (score >= 40) return MATCH_COLORS.partial
  return MATCH_COLORS.low
}

/**
 * Get match label text for a score
 *
 * @param score - Match score (0-100)
 * @returns Human-readable match description
 */
function getMatchLabel(score: number): string {
  if (score >= 90) return 'Excellent match!'
  if (score >= 75) return 'Strong match'
  if (score >= 60) return 'Good match'
  if (score >= 40) return 'Could be you?'
  return 'Possible match'
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * AvatarComparison displays two avatars side-by-side with a matching indicator.
 *
 * Features:
 * - Animated entrance for visual appeal
 * - Clear labeling for target vs viewer avatar
 * - Match score visualization
 * - Glass-morphism styling consistent with app theme
 */
export function AvatarComparison({
  targetAvatar,
  myAvatar,
  matchScore,
  style,
  testID = 'avatar-comparison',
}: AvatarComparisonProps): React.ReactElement {
  // ---------------------------------------------------------------------------
  // ANIMATION
  // ---------------------------------------------------------------------------

  const fadeAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(0.8)).current

  useEffect(() => {
    // Entrance animation: fade in + scale up
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start()
  }, [fadeAnim, scaleAnim])

  // ---------------------------------------------------------------------------
  // COMPUTED
  // ---------------------------------------------------------------------------

  const showMatchIndicator = matchScore !== undefined
  const matchColor = showMatchIndicator ? getMatchColor(matchScore) : undefined
  const matchLabel = showMatchIndicator ? getMatchLabel(matchScore) : undefined

  // Build accessibility label
  const accessibilityLabel = `Avatar comparison. Their description on the left${
    myAvatar ? ', your avatar on the right' : ', no avatar set'
  }${showMatchIndicator ? `, ${matchLabel}` : ''}`

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
        style,
      ]}
      testID={testID}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
    >
      {/* Glass card background */}
      <View style={styles.card}>
        {/* Avatars section */}
        <View style={styles.avatarsContainer}>
          {/* Target Avatar (from post) */}
          <View style={styles.avatarColumn} testID={`${testID}-target`}>
            <Text style={styles.avatarLabel} accessible={false}>
              Their Description
            </Text>
            <View style={styles.avatarWrapper}>
              {targetAvatar ? (
                <AvatarDisplay
                  avatar={targetAvatar}
                  size="lg"
                  testID={`${testID}-target-avatar`}
                />
              ) : (
                <View style={styles.placeholderAvatar} testID={`${testID}-target-placeholder`}>
                  <Text style={styles.placeholderText}>?</Text>
                </View>
              )}
            </View>
          </View>

          {/* VS Indicator */}
          <View style={styles.vsContainer} accessible={false}>
            <View style={styles.vsCircle}>
              <Text style={styles.vsText}>VS</Text>
            </View>
            {showMatchIndicator && (
              <View style={styles.connectionLine} />
            )}
          </View>

          {/* My Avatar (viewer) */}
          <View style={styles.avatarColumn} testID={`${testID}-mine`}>
            <Text style={styles.avatarLabel} accessible={false}>
              You
            </Text>
            <View style={styles.avatarWrapper}>
              {myAvatar ? (
                <AvatarDisplay
                  avatar={myAvatar}
                  size="lg"
                  testID={`${testID}-my-avatar`}
                />
              ) : (
                <View style={styles.placeholderAvatar} testID={`${testID}-my-placeholder`}>
                  <Text style={styles.placeholderText}>?</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Match Indicator */}
        {showMatchIndicator && matchColor && matchLabel && (
          <View
            style={[
              styles.matchIndicatorContainer,
              { backgroundColor: `${matchColor}15` },
            ]}
            testID={`${testID}-match-indicator`}
          >
            <View
              style={[styles.matchDot, { backgroundColor: matchColor }]}
              accessible={false}
            />
            <Text
              style={[styles.matchText, { color: matchColor }]}
              accessible={false}
            >
              {matchLabel}
            </Text>
            {matchScore >= 60 && (
              <Text style={styles.matchScore} accessible={false}>
                {matchScore}%
              </Text>
            )}
          </View>
        )}

        {/* No avatar notice */}
        {!myAvatar && (
          <View style={styles.noticeContainer} testID={`${testID}-no-avatar-notice`}>
            <Text style={styles.noticeText}>
              Create your avatar to see how well you match
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  )
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  card: {
    backgroundColor: darkTheme.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: darkTheme.cardBorder,
    padding: 20,
    // Glass effect (subtle)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },

  // Avatars layout
  avatarsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarColumn: {
    flex: 1,
    alignItems: 'center',
  },
  avatarLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: darkTheme.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  avatarWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: darkTheme.surface,
    overflow: 'hidden',
  },
  placeholderAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: darkTheme.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: darkTheme.cardBorder,
    borderStyle: 'dashed',
  },
  placeholderText: {
    fontSize: 32,
    fontWeight: '700',
    color: darkTheme.textMuted,
  },

  // VS indicator
  vsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    position: 'relative',
  },
  vsCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: darkTheme.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: darkTheme.cardBackground,
    zIndex: 1,
  },
  vsText: {
    fontSize: 12,
    fontWeight: '700',
    color: darkTheme.textPrimary,
    letterSpacing: 1,
  },
  connectionLine: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: darkTheme.cardBorder,
    opacity: 0.3,
    zIndex: 0,
  },

  // Match indicator
  matchIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  matchDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  matchText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  matchScore: {
    fontSize: 16,
    fontWeight: '700',
    color: darkTheme.textPrimary,
  },

  // Notice section
  noticeContainer: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: darkTheme.surfaceElevated,
    borderRadius: 8,
    alignItems: 'center',
  },
  noticeText: {
    fontSize: 12,
    color: darkTheme.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
})
