/**
 * TrendingVenues Component
 *
 * Displays a horizontal scrollable list of trending venues with buzz scores.
 * Each card shows the venue name, buzz score badge, and post count.
 * Cards are tappable to navigate to the Ledger screen for that location.
 *
 * Features:
 * - Horizontal ScrollView of compact venue cards
 * - Buzz score badge with fire emoji
 * - Post count display
 * - Dark theme glassmorphism styling
 * - Empty state for no trending venues
 * - Navigation to Ledger screen on press
 */

import React, { useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'

import { darkTheme } from '../constants/glassStyles'
import { spacing } from '../constants/theme'
import { selectionFeedback } from '../lib/haptics'
import type { MainTabNavigationProp } from '../navigation/types'
import type { TrendingVenue } from '../hooks/useTrendingVenues'

// ============================================================================
// TYPES
// ============================================================================

export interface TrendingVenuesProps {
  /** List of trending venues to display */
  venues: TrendingVenue[]
  /** Test ID for component testing */
  testID?: string
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TrendingVenues({ venues, testID }: TrendingVenuesProps): React.ReactNode {
  const navigation = useNavigation<MainTabNavigationProp>()

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleVenuePress = useCallback(
    async (venue: TrendingVenue) => {
      await selectionFeedback()
      navigation.navigate('Ledger', {
        locationId: venue.location_id,
        locationName: venue.location_name,
      })
    },
    [navigation]
  )

  // ---------------------------------------------------------------------------
  // Render Empty State
  // ---------------------------------------------------------------------------

  if (venues.length === 0) {
    return (
      <View style={styles.emptyContainer} testID={`${testID}-empty`}>
        <Ionicons name="cafe-outline" size={32} color={darkTheme.textMuted} />
        <Text style={styles.emptyText}>No trending spots nearby</Text>
      </View>
    )
  }

  // ---------------------------------------------------------------------------
  // Render Venue Cards
  // ---------------------------------------------------------------------------

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      testID={testID}
    >
      {venues.map((venue) => (
        <TouchableOpacity
          key={venue.location_id}
          style={styles.card}
          onPress={() => handleVenuePress(venue)}
          activeOpacity={0.7}
          testID={`${testID}-venue-${venue.location_id}`}
        >
          {/* Buzz Score Badge */}
          <View style={styles.buzzBadge}>
            <Text style={styles.fireEmoji}>🔥</Text>
            <Text style={styles.buzzScore}>{venue.buzz_score}</Text>
          </View>

          {/* Venue Info */}
          <View style={styles.venueInfo}>
            <Text style={styles.venueName} numberOfLines={2}>
              {venue.location_name}
            </Text>
            <View style={styles.statsRow}>
              <Ionicons name="document-text-outline" size={14} color={darkTheme.textMuted} />
              <Text style={styles.postCount}>
                {venue.post_count_24h} {venue.post_count_24h === 1 ? 'post' : 'posts'}
              </Text>
            </View>
          </View>

          {/* Trending Label */}
          <View style={styles.trendingLabel}>
            <Text style={styles.trendingText}>Trending</Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  )
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  scrollContent: {
    paddingVertical: spacing[2],
    gap: spacing[3],
  },
  card: {
    width: 160,
    backgroundColor: darkTheme.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: darkTheme.cardBorder,
    padding: spacing[3.5],
    ...Platform.select({
      ios: {
        shadowColor: darkTheme.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  buzzBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 107, 71, 0.15)',
    borderRadius: 12,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    marginBottom: spacing[2.5],
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 71, 0.3)',
  },
  fireEmoji: {
    fontSize: 16,
    marginRight: spacing[1],
  },
  buzzScore: {
    fontSize: 14,
    fontWeight: '700',
    color: darkTheme.primary,
  },
  venueInfo: {
    flex: 1,
    gap: spacing[1.5],
  },
  venueName: {
    fontSize: 15,
    fontWeight: '600',
    color: darkTheme.textPrimary,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  postCount: {
    fontSize: 12,
    color: darkTheme.textMuted,
    fontWeight: '500',
  },
  trendingLabel: {
    marginTop: spacing[2],
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderRadius: 8,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  trendingText: {
    fontSize: 11,
    fontWeight: '600',
    color: darkTheme.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[6],
    gap: spacing[2],
  },
  emptyText: {
    fontSize: 14,
    color: darkTheme.textMuted,
    fontWeight: '500',
  },
})
