/**
 * IcebreakerChips - Contextual message suggestions for chat
 *
 * Displays horizontal chips with icebreaker messages that users can tap
 * to quickly send common first messages. Chips animate out when selected.
 *
 * Features:
 * - 3 contextual chip buttons with emojis
 * - Haptic feedback on selection
 * - Smooth fade-out animation when chip is selected
 * - Dark theme styling
 */

import React, { useCallback, useRef, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Platform,
} from 'react-native'

import { darkTheme } from '../../constants/glassStyles'
import { spacing } from '../../constants/theme'
import { selectionFeedback } from '../../lib/haptics'

// ============================================================================
// TYPES
// ============================================================================

export interface IcebreakerChipsProps {
  /** Callback when a chip is selected, receives the chip text */
  onSelect: (text: string) => void
  /** Controls visibility of the chip bar */
  visible: boolean
  /** Test ID for testing */
  testID?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ICEBREAKER_CHIPS = [
  { id: 'was-that-you', text: 'Was that you? 👋' },
  { id: 'crossed-paths', text: 'I think we crossed paths! 🔄' },
  { id: 'tell-me-more', text: 'Tell me more! 💬' },
] as const

// ============================================================================
// COMPONENT
// ============================================================================

export function IcebreakerChips({
  onSelect,
  visible,
  testID = 'icebreaker-chips',
}: IcebreakerChipsProps): React.ReactNode {
  const fadeAnim = useRef(new Animated.Value(visible ? 1 : 0)).current
  const heightAnim = useRef(new Animated.Value(visible ? 1 : 0)).current

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (visible) {
      // Fade in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(heightAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start()
    } else {
      // Fade out
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(heightAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start()
    }
  }, [visible, fadeAnim, heightAnim])

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleChipPress = useCallback(
    async (text: string) => {
      await selectionFeedback()
      onSelect(text)
    },
    [onSelect]
  )

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!visible && fadeAnim.__getValue() === 0) {
    return null
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          maxHeight: heightAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 80],
          }),
        },
      ]}
      testID={testID}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        testID={`${testID}-scroll`}
      >
        {ICEBREAKER_CHIPS.map((chip) => (
          <TouchableOpacity
            key={chip.id}
            style={styles.chip}
            onPress={() => handleChipPress(chip.text)}
            activeOpacity={0.7}
            testID={`${testID}-${chip.id}`}
          >
            <Text style={styles.chipText}>{chip.text}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </Animated.View>
  )
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: darkTheme.background,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.cardBorder,
  },
  scrollContent: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  chip: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2.5],
    borderRadius: 20,
    backgroundColor: darkTheme.surface,
    borderWidth: 1,
    borderColor: darkTheme.glassBorder,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: darkTheme.textPrimary,
  },
})
