/**
 * RadarEncounters Component
 *
 * Displays recent proximity encounters from the walk-by radar feature.
 * Shows compact list of people who were nearby with distance, time, and location.
 *
 * Features:
 * - Encounter type icons (walkby, same_venue, repeated)
 * - Distance display in meters
 * - Time ago formatting
 * - Location name if available
 * - Dark theme glassmorphism styling
 * - Empty state
 *
 * @example
 * ```tsx
 * <RadarEncounters testID="home-radar-encounters" />
 * ```
 */

import React, { useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'

import { darkTheme } from '../constants/glassStyles'
import { spacing } from '../constants/theme'
import { selectionFeedback } from '../lib/haptics'
import type { ProximityEncounter } from '../hooks/useRadar'
import type { MainTabNavigationProp } from '../navigation/types'

// ============================================================================
// TYPES
// ============================================================================

export interface RadarEncountersProps {
  /** List of recent encounters to display */
  encounters: ProximityEncounter[]
  /** Test ID for component testing */
  testID?: string
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get icon name for encounter type
 */
function getEncounterIcon(type: ProximityEncounter['encounter_type']): string {
  switch (type) {
    case 'walkby':
      return 'walk-outline'
    case 'same_venue':
      return 'location-outline'
    case 'repeated':
      return 'repeat-outline'
    default:
      return 'person-outline'
  }
}

/**
 * Get label for encounter type
 */
function getEncounterLabel(type: ProximityEncounter['encounter_type']): string {
  switch (type) {
    case 'walkby':
      return 'Walked by'
    case 'same_venue':
      return 'Same venue'
    case 'repeated':
      return 'Repeated encounter'
    default:
      return 'Nearby'
  }
}

/**
 * Format distance in meters to human-readable string
 */
function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`
  } else {
    return `${(meters / 1000).toFixed(1)}km`
  }
}

/**
 * Format time ago from ISO timestamp
 */
function formatTimeAgo(isoString: string): string {
  const now = new Date()
  const then = new Date(isoString)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

  if (diffMins < 1) {
    return 'Just now'
  } else if (diffMins < 60) {
    return `${diffMins}m ago`
  } else if (diffHours < 24) {
    return `${diffHours}h ago`
  } else {
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export function RadarEncounters({
  encounters,
  testID,
}: RadarEncountersProps): React.ReactNode {
  const navigation = useNavigation<MainTabNavigationProp>()

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleEncounterPress = useCallback(
    async (encounter: ProximityEncounter) => {
      await selectionFeedback()

      // If encounter has a location, navigate to Ledger for that location
      if (encounter.location_id && encounter.location_name) {
        navigation.navigate('Ledger', {
          locationId: encounter.location_id,
          locationName: encounter.location_name,
        })
      }
    },
    [navigation]
  )

  // ---------------------------------------------------------------------------
  // Render Item
  // ---------------------------------------------------------------------------

  const renderEncounter = useCallback(
    ({ item, index }: { item: ProximityEncounter; index: number }) => {
      const iconName = getEncounterIcon(item.encounter_type)
      const label = getEncounterLabel(item.encounter_type)
      const distance = formatDistance(item.distance_meters)
      const timeAgo = formatTimeAgo(item.created_at)

      return (
        <TouchableOpacity
          style={styles.encounterCard}
          onPress={() => handleEncounterPress(item)}
          activeOpacity={0.7}
          testID={`${testID}-encounter-${index}`}
        >
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name={iconName as any} size={20} color={darkTheme.primary} />
          </View>

          {/* Content */}
          <View style={styles.encounterContent}>
            <View style={styles.encounterHeader}>
              <Text style={styles.encounterLabel}>{label}</Text>
              <Text style={styles.timeAgo}>{timeAgo}</Text>
            </View>

            <View style={styles.encounterDetails}>
              <View style={styles.distanceRow}>
                <Ionicons
                  name="navigate-outline"
                  size={14}
                  color={darkTheme.textMuted}
                />
                <Text style={styles.distanceText}>{distance} away</Text>
              </View>

              {item.location_name && (
                <View style={styles.locationRow}>
                  <Ionicons
                    name="location-outline"
                    size={14}
                    color={darkTheme.textMuted}
                  />
                  <Text style={styles.locationText} numberOfLines={1}>
                    {item.location_name}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Chevron */}
          {item.location_id && (
            <Ionicons
              name="chevron-forward"
              size={18}
              color={darkTheme.textMuted}
            />
          )}
        </TouchableOpacity>
      )
    },
    [handleEncounterPress, testID]
  )

  // ---------------------------------------------------------------------------
  // Render Empty State
  // ---------------------------------------------------------------------------

  if (encounters.length === 0) {
    return (
      <View style={styles.emptyContainer} testID={`${testID}-empty`}>
        <Ionicons name="radar-outline" size={40} color={darkTheme.textMuted} />
        <Text style={styles.emptyText}>No nearby encounters yet</Text>
        <Text style={styles.emptySubtext}>
          Keep exploring! You'll be notified when you pass near others.
        </Text>
      </View>
    )
  }

  // ---------------------------------------------------------------------------
  // Render List
  // ---------------------------------------------------------------------------

  return (
    <View style={styles.container} testID={testID}>
      <FlatList
        data={encounters}
        renderItem={renderEncounter}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false} // Disable scroll since we're in a parent ScrollView
      />
    </View>
  )
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    gap: spacing[2],
  },

  // Encounter card
  encounterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkTheme.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: darkTheme.cardBorder,
    padding: spacing[3],
    gap: spacing[3],
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

  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 107, 71, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 71, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  encounterContent: {
    flex: 1,
    gap: spacing[1],
  },

  encounterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  encounterLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: darkTheme.textPrimary,
  },

  timeAgo: {
    fontSize: 12,
    color: darkTheme.textMuted,
    fontWeight: '500',
  },

  encounterDetails: {
    gap: spacing[1],
  },

  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },

  distanceText: {
    fontSize: 13,
    color: darkTheme.textSecondary,
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },

  locationText: {
    fontSize: 13,
    color: darkTheme.textSecondary,
    flex: 1,
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[8],
    gap: spacing[2],
  },

  emptyText: {
    fontSize: 16,
    color: darkTheme.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
  },

  emptySubtext: {
    fontSize: 14,
    color: darkTheme.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing[6],
    lineHeight: 20,
  },
})
