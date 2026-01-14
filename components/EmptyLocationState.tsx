/**
 * EmptyLocationState Component
 *
 * A soft empty state for locations with no posts.
 * Encourages users to be the first to post at a location.
 *
 * @example
 * ```tsx
 * <EmptyLocationState
 *   onCreatePost={() => navigation.navigate('CreatePost')}
 * />
 * ```
 */

import React, { memo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { Button } from './Button'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Props for the EmptyLocationState component
 */
export interface EmptyLocationStateProps {
  /**
   * Custom title text
   * @default "No stories here yet"
   */
  title?: string

  /**
   * Custom message text
   * @default "Be the first to leave a note for someone you noticed."
   */
  message?: string

  /**
   * Custom CTA button text
   * @default "Start a Story"
   */
  ctaText?: string

  /**
   * Callback when CTA button is pressed
   */
  onCreatePost?: () => void

  /**
   * Whether to show the CTA button
   * @default true
   */
  showCta?: boolean

  /**
   * Test ID prefix
   */
  testID?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const COLORS = {
  primary: '#FF6B47',
  background: '#FFFFFF',
  backgroundSecondary: '#F2F2F7',
  textPrimary: '#1C1917',
  textSecondary: '#8E8E93',
  iconMuted: '#C7C7CC',
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * EmptyLocationState - Friendly empty state for locations without posts
 *
 * Features:
 * - Soft illustration placeholder (icon)
 * - Encouraging message
 * - CTA button to start posting
 */
export const EmptyLocationState = memo(function EmptyLocationState({
  title = 'No stories here yet',
  message = 'Be the first to leave a note for someone you noticed.',
  ctaText = 'Start a Story',
  onCreatePost,
  showCta = true,
  testID = 'empty-location-state',
}: EmptyLocationStateProps): JSX.Element {
  return (
    <View style={styles.container} testID={testID}>
      {/* Illustration/Icon */}
      <View style={styles.illustrationContainer}>
        <View style={styles.iconCircle}>
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={48}
            color={COLORS.iconMuted}
          />
        </View>
        <View style={styles.sparkle1}>
          <Ionicons name="sparkles" size={16} color={COLORS.primary} />
        </View>
        <View style={styles.sparkle2}>
          <Ionicons name="heart-outline" size={14} color={COLORS.primary} />
        </View>
      </View>

      {/* Text Content */}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>

      {/* CTA Button */}
      {showCta && onCreatePost && (
        <View style={styles.ctaContainer}>
          <Button
            title={ctaText}
            onPress={onCreatePost}
            testID={`${testID}-cta`}
          />
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },

  illustrationContainer: {
    position: 'relative',
    marginBottom: 24,
  },

  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.iconMuted,
    borderStyle: 'dashed',
  },

  sparkle1: {
    position: 'absolute',
    top: -4,
    right: -4,
  },

  sparkle2: {
    position: 'absolute',
    bottom: 8,
    left: -8,
  },

  title: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },

  message: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },

  ctaContainer: {
    width: '100%',
    maxWidth: 200,
  },
})

// ============================================================================
// EXPORTS
// ============================================================================

export default EmptyLocationState
