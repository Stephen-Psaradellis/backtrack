/**
 * CoPresenceBadge
 *
 * Feature 4.3 — Time-stamped co-presence proof.
 *
 * Renders a trust badge surfacing that two parties had verified check-ins
 * overlapping at the same location. Used in two places:
 *   - Conversation header (post-match): "Verified co-presence: 47m at [Venue]"
 *   - Post detail / expanded card (viewer's own overlap with the post window)
 *
 * The "verified" treatment (green checkmark, accent border) only renders when
 * both check-ins were GPS-verified. Non-verified overlaps render in a muted
 * state to signal "claimed but not proven".
 */

import React, { memo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { darkTheme } from '../constants/glassStyles'

export interface CoPresenceBadgeProps {
  overlapMinutes: number
  bothVerified: boolean
  locationName?: string
  /**
   * Variant controls the visual weight.
   * - 'inline' is for embedding inside a post card (low-key, no border)
   * - 'banner' is for a chat header (more prominent, full-width)
   */
  variant?: 'inline' | 'banner'
  testID?: string
}

function formatMinutes(minutes: number): string {
  if (minutes < 1) return 'less than a minute'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  return remaining === 0 ? `${hours} hr` : `${hours}h ${remaining}m`
}

export const CoPresenceBadge = memo(function CoPresenceBadge({
  overlapMinutes,
  bothVerified,
  locationName,
  variant = 'inline',
  testID = 'co-presence-badge',
}: CoPresenceBadgeProps) {
  const isBanner = variant === 'banner'
  const tint = bothVerified ? darkTheme.success : darkTheme.textMuted
  const headline = bothVerified ? 'Verified co-presence' : 'Claimed co-presence'
  const detail = locationName
    ? `${formatMinutes(overlapMinutes)} together at ${locationName}`
    : `${formatMinutes(overlapMinutes)} together`

  return (
    <View
      style={[
        styles.container,
        isBanner ? styles.banner : styles.inline,
        bothVerified ? { borderColor: `${tint}40` } : null,
      ]}
      testID={testID}
      accessible
      accessibilityLabel={`${headline}. ${detail}.`}
    >
      <Ionicons
        name={bothVerified ? 'shield-checkmark' : 'shield-outline'}
        size={isBanner ? 16 : 13}
        color={tint}
      />
      <View style={styles.textColumn}>
        <Text style={[styles.headline, isBanner && styles.headlineBanner, { color: tint }]} numberOfLines={1}>
          {headline}
        </Text>
        <Text style={[styles.detail, isBanner && styles.detailBanner]} numberOfLines={1}>
          {detail}
        </Text>
      </View>
    </View>
  )
})

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    backgroundColor: darkTheme.surfaceElevated,
  },
  inline: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  banner: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  textColumn: {
    flexShrink: 1,
  },
  headline: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headlineBanner: {
    fontSize: 12,
  },
  detail: {
    fontSize: 12,
    color: darkTheme.textPrimary,
    fontWeight: '500',
  },
  detailBanner: {
    fontSize: 13,
  },
})

export default CoPresenceBadge
