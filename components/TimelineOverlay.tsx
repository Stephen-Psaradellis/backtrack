/**
 * TimelineOverlay
 *
 * Feature 2.1 — "I was there" timeline overlay.
 *
 * Renders a horizontal time bar representing a post's sighting window with
 * the viewing user's overlapping check-in highlighted as an inset stripe.
 * The component renders nothing when there is no overlap (lets the parent
 * remain layout-stable without conditional wrappers).
 */

import React, { memo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { darkTheme } from '../constants/glassStyles'
import type { PostOverlap } from '../hooks/useMyOverlappingCheckins'

export interface TimelineOverlayProps {
  overlap: PostOverlap | undefined
  testID?: string
}

function formatOverlapMinutes(minutes: number): string {
  if (minutes < 1) return 'less than a minute'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  return remaining === 0 ? `${hours}h` : `${hours}h ${remaining}m`
}

function formatClockTime(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const h = d.getHours()
  const m = d.getMinutes()
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  const ampm = h < 12 ? 'a' : 'p'
  return m === 0 ? `${hour12}${ampm}` : `${hour12}:${m.toString().padStart(2, '0')}${ampm}`
}

function clamp01(n: number): number {
  if (n < 0) return 0
  if (n > 1) return 1
  return n
}

export const TimelineOverlay = memo(function TimelineOverlay({
  overlap,
  testID = 'timeline-overlay',
}: TimelineOverlayProps) {
  if (!overlap) return null

  const winStart = new Date(overlap.post_window_start).getTime()
  const winEnd = new Date(overlap.post_window_end).getTime()
  const ovStart = new Date(overlap.overlap_start).getTime()
  const ovEnd = new Date(overlap.overlap_end).getTime()

  const winSpan = winEnd - winStart
  if (!isFinite(winSpan) || winSpan <= 0) return null

  // Compute overlap stripe position as percentages of the post window.
  const leftPct = clamp01((ovStart - winStart) / winSpan) * 100
  const widthPct = clamp01((ovEnd - ovStart) / winSpan) * 100
  const safeWidthPct = Math.max(widthPct, 4) // ensure stripe is visible even for tiny overlaps

  const verifiedColor = overlap.checkin_verified ? darkTheme.success : darkTheme.warning
  const caption = overlap.checkin_verified
    ? `You were here for ${formatOverlapMinutes(overlap.overlap_minutes)} (${formatClockTime(overlap.overlap_start)}–${formatClockTime(overlap.overlap_end)})`
    : `You may have been here ${formatClockTime(overlap.overlap_start)}–${formatClockTime(overlap.overlap_end)}`

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.header}>
        <Ionicons
          name={overlap.checkin_verified ? 'checkmark-circle' : 'help-circle-outline'}
          size={13}
          color={verifiedColor}
        />
        <Text style={styles.caption} numberOfLines={1}>
          {caption}
        </Text>
      </View>
      <View style={styles.track} accessible accessibilityLabel={caption}>
        <View
          style={[
            styles.stripe,
            { left: `${leftPct}%`, width: `${safeWidthPct}%`, backgroundColor: verifiedColor },
          ]}
          testID={`${testID}-stripe`}
        />
      </View>
    </View>
  )
})

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
    backgroundColor: darkTheme.surfaceElevated,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  caption: {
    fontSize: 12,
    color: darkTheme.textPrimary,
    fontWeight: '500',
    flexShrink: 1,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    position: 'relative',
  },
  stripe: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 3,
  },
})

export default TimelineOverlay
