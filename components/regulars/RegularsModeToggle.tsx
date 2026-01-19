/**
 * RegularsModeToggle Component
 *
 * Settings component for managing Regulars Mode preferences.
 * Includes enable/disable toggle and visibility settings.
 *
 * @example
 * ```tsx
 * <RegularsModeToggle />
 * ```
 */

import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRegularsMode, RegularsVisibility } from '../../hooks/useRegulars'
import { darkTheme } from '../../constants/glassStyles'
import { colors } from '../../constants/theme'

// ============================================================================
// Types
// ============================================================================

interface RegularsModeToggleProps {
  /** Custom styles for container */
  style?: object
}

interface VisibilityOption {
  value: RegularsVisibility
  label: string
  description: string
  icon: keyof typeof Ionicons.glyphMap
}

// ============================================================================
// Constants
// ============================================================================

const VISIBILITY_OPTIONS: VisibilityOption[] = [
  {
    value: 'public',
    label: 'Public',
    description: 'Visible to all regulars at your locations',
    icon: 'globe-outline',
  },
  {
    value: 'mutual',
    label: 'Mutual Only',
    description: 'Only visible to other regulars (recommended)',
    icon: 'people-outline',
  },
  {
    value: 'hidden',
    label: 'Hidden',
    description: 'Your profile won\'t appear in regulars lists',
    icon: 'eye-off-outline',
  },
]

// ============================================================================
// Component
// ============================================================================

export function RegularsModeToggle({ style }: RegularsModeToggleProps) {
  const {
    isEnabled,
    visibility,
    toggleMode,
    setVisibility,
    isLoading,
    isUpdating,
    error,
  } = useRegularsMode()

  const [showVisibilityOptions, setShowVisibilityOptions] = useState(false)

  const handleToggle = async () => {
    await toggleMode()
  }

  const handleVisibilityChange = async (newVisibility: RegularsVisibility) => {
    await setVisibility(newVisibility)
    setShowVisibilityOptions(false)
  }

  const currentVisibilityOption = VISIBILITY_OPTIONS.find(
    (opt) => opt.value === visibility
  )

  if (isLoading) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#6366F1" />
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="people" size={24} color="#6366F1" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Regulars Mode</Text>
          <Text style={styles.subtitle}>
            Connect with others who visit the same spots
          </Text>
        </View>
      </View>

      {/* Enable Toggle */}
      <View style={styles.toggleRow}>
        <View style={styles.toggleInfo}>
          <Text style={styles.toggleLabel}>Enable Regulars Mode</Text>
          <Text style={styles.toggleDescription}>
            See and be seen by fellow regulars at your favorite locations
          </Text>
        </View>
        <Switch
          value={isEnabled}
          onValueChange={handleToggle}
          disabled={isUpdating}
          trackColor={{ false: 'rgba(255, 255, 255, 0.2)', true: 'rgba(99, 102, 241, 0.6)' }}
          thumbColor={isEnabled ? '#6366F1' : darkTheme.textMuted}
        />
      </View>

      {/* Visibility Settings */}
      {isEnabled && (
        <View style={styles.visibilitySection}>
          <Text style={styles.sectionLabel}>Visibility</Text>

          <TouchableOpacity
            style={styles.visibilitySelector}
            onPress={() => setShowVisibilityOptions(!showVisibilityOptions)}
            disabled={isUpdating}
          >
            <View style={styles.visibilityCurrent}>
              <Ionicons
                name={currentVisibilityOption?.icon || 'help-outline'}
                size={20}
                color="#6366F1"
              />
              <View style={styles.visibilityCurrentText}>
                <Text style={styles.visibilityCurrentLabel}>
                  {currentVisibilityOption?.label}
                </Text>
                <Text style={styles.visibilityCurrentDescription}>
                  {currentVisibilityOption?.description}
                </Text>
              </View>
            </View>
            <Ionicons
              name={showVisibilityOptions ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#9CA3AF"
            />
          </TouchableOpacity>

          {/* Visibility Options */}
          {showVisibilityOptions && (
            <View style={styles.visibilityOptions}>
              {VISIBILITY_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.visibilityOption,
                    visibility === option.value && styles.visibilityOptionSelected,
                  ]}
                  onPress={() => handleVisibilityChange(option.value)}
                  disabled={isUpdating}
                >
                  <Ionicons
                    name={option.icon}
                    size={20}
                    color={visibility === option.value ? '#6366F1' : '#6B7280'}
                  />
                  <View style={styles.visibilityOptionText}>
                    <Text
                      style={[
                        styles.visibilityOptionLabel,
                        visibility === option.value &&
                          styles.visibilityOptionLabelSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                    <Text style={styles.visibilityOptionDescription}>
                      {option.description}
                    </Text>
                  </View>
                  {visibility === option.value && (
                    <Ionicons name="checkmark-circle" size={20} color="#6366F1" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Info Box */}
      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={18} color="#6B7280" />
        <Text style={styles.infoText}>
          You become a &quot;regular&quot; at a location after visiting 2+ weeks in the
          past month. Regulars can see each other based on visibility settings.
        </Text>
      </View>

      {/* Error */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={16} color="#EF4444" />
          <Text style={styles.errorText}>{error.message}</Text>
        </View>
      )}

      {/* Updating Indicator */}
      {isUpdating && (
        <View style={styles.updatingOverlay}>
          <ActivityIndicator size="small" color="#6366F1" />
        </View>
      )}
    </View>
  )
}

// ============================================================================
// Compact Toggle (for settings lists)
// ============================================================================

interface RegularsModeCompactToggleProps {
  onPress?: () => void
}

export function RegularsModeCompactToggle({
  onPress,
}: RegularsModeCompactToggleProps) {
  const { isEnabled, toggleMode, isLoading, isUpdating } = useRegularsMode()

  if (isLoading) {
    return (
      <View style={styles.compactContainer}>
        <ActivityIndicator size="small" color="#6366F1" />
      </View>
    )
  }

  return (
    <TouchableOpacity
      style={styles.compactContainer}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.compactIcon}>
        <Ionicons name="people" size={20} color="#6366F1" />
      </View>
      <View style={styles.compactText}>
        <Text style={styles.compactLabel}>Regulars Mode</Text>
        <Text style={styles.compactDescription}>
          {isEnabled ? 'Enabled' : 'Disabled'}
        </Text>
      </View>
      <Switch
        value={isEnabled}
        onValueChange={() => { toggleMode() }}
        disabled={isUpdating}
        trackColor={{ false: 'rgba(255, 255, 255, 0.2)', true: 'rgba(99, 102, 241, 0.6)' }}
        thumbColor={isEnabled ? '#6366F1' : darkTheme.textMuted}
      />
    </TouchableOpacity>
  )
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 0,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: darkTheme.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: darkTheme.textMuted,
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  toggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: darkTheme.textPrimary,
  },
  toggleDescription: {
    fontSize: 13,
    color: darkTheme.textMuted,
    marginTop: 2,
  },
  visibilitySection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: darkTheme.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  visibilitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  visibilityCurrent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  visibilityCurrentText: {
    flex: 1,
  },
  visibilityCurrentLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: darkTheme.textPrimary,
  },
  visibilityCurrentDescription: {
    fontSize: 12,
    color: darkTheme.textMuted,
    marginTop: 1,
  },
  visibilityOptions: {
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  visibilityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  visibilityOptionSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  visibilityOptionText: {
    flex: 1,
  },
  visibilityOptionLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: darkTheme.textSecondary,
  },
  visibilityOptionLabelSelected: {
    color: '#6366F1',
    fontWeight: '600',
  },
  visibilityOptionDescription: {
    fontSize: 12,
    color: darkTheme.textMuted,
    marginTop: 1,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: darkTheme.textMuted,
    lineHeight: 18,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#EF4444',
  },
  updatingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 15, 19, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  compactIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  compactText: {
    flex: 1,
  },
  compactLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: darkTheme.textPrimary,
  },
  compactDescription: {
    fontSize: 13,
    color: darkTheme.textMuted,
    marginTop: 1,
  },
})

export default RegularsModeToggle
