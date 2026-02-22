/**
 * SafetyPrompt Component
 *
 * Displays a one-time safety reminder at the start of new conversations.
 * Warns users about sharing personal information and meeting safely.
 *
 * Features:
 * - Shown once when conversation has < 3 messages total
 * - Shield icon for visual prominence
 * - Dismissible card with "Got it" button
 * - Dark theme styling consistent with app
 * - Accessible with testID props
 *
 * @example
 * ```tsx
 * <SafetyPrompt
 *   visible={messageCount < 3 && !dismissed}
 *   onDismiss={() => setDismissed(true)}
 * />
 * ```
 */

import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { darkTheme } from '../../constants/glassStyles'

// ============================================================================
// TYPES
// ============================================================================

export interface SafetyPromptProps {
  /**
   * Controls visibility of the prompt
   */
  visible: boolean

  /**
   * Callback when user dismisses the prompt
   */
  onDismiss: () => void

  /**
   * Test ID for testing
   */
  testID?: string
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SafetyPrompt({
  visible,
  onDismiss,
  testID = 'safety-prompt',
}: SafetyPromptProps): React.ReactNode {
  if (!visible) {
    return null
  }

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.card}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="shield-checkmark" size={28} color={darkTheme.accent} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title}>Stay Safe</Text>
          <Text style={styles.message}>
            Remember: Never share personal info like your address, phone number, or financial
            details. Meet in public places.
          </Text>
        </View>

        {/* Dismiss Button */}
        <TouchableOpacity
          style={styles.button}
          onPress={onDismiss}
          testID={`${testID}-dismiss`}
          accessibilityLabel="Dismiss safety prompt"
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>Got it</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  card: {
    backgroundColor: darkTheme.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: darkTheme.cardBorder,
    padding: 16,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: darkTheme.textPrimary,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: darkTheme.textSecondary,
  },
  button: {
    backgroundColor: darkTheme.accent,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
})
