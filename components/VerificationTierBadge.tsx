/**
 * VerificationTierBadge Component
 *
 * Displays a badge indicating the verification tier of a post response.
 * - Tier 1 (verified_checkin): Green badge with checkmark - GPS verified
 * - Tier 2 (regular_spot): Orange/amber badge with heart - Favorite location
 * - Tier 3 (unverified_claim): Gray badge - Unverified claim
 *
 * @example
 * ```tsx
 * <VerificationTierBadge tier="verified_checkin" />
 * <VerificationTierBadge tier="regular_spot" size="small" showLabel={false} />
 * ```
 */

import React, { memo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import type { VerificationTier } from '../types/database'
import { getTierConfig, type TierConfig } from '../lib/utils/tiers'

// ============================================================================
// TYPES
// ============================================================================

export interface VerificationTierBadgeProps {
  /** The verification tier to display */
  tier: VerificationTier
  /** Size variant */
  size?: 'small' | 'medium' | 'large'
  /** Whether to show the label text */
  showLabel?: boolean
  /** Whether to show in compact mode (icon only) */
  compact?: boolean
  /** Test ID for testing */
  testID?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SIZES = {
  small: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 10,
    iconSize: 12,
    borderRadius: 4,
    gap: 4,
  },
  medium: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    iconSize: 14,
    borderRadius: 6,
    gap: 4,
  },
  large: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    iconSize: 16,
    borderRadius: 8,
    gap: 6,
  },
} as const

// ============================================================================
// COMPONENT
// ============================================================================

function VerificationTierBadgeComponent({
  tier,
  size = 'medium',
  showLabel = true,
  compact = false,
  testID,
}: VerificationTierBadgeProps) {
  const config = getTierConfig(tier)
  const sizeConfig = SIZES[size]

  // In compact mode, only show icon
  const displayLabel = showLabel && !compact

  return (
    <View
      testID={testID}
      accessibilityRole="text"
      accessibilityLabel={`${config.label}: ${config.description}`}
      style={[
        styles.container,
        {
          backgroundColor: config.bgColor,
          paddingHorizontal: compact ? sizeConfig.paddingVertical : sizeConfig.paddingHorizontal,
          paddingVertical: sizeConfig.paddingVertical,
          borderRadius: sizeConfig.borderRadius,
          gap: sizeConfig.gap,
        },
      ]}
    >
      <Ionicons
        name={config.icon as keyof typeof Ionicons.glyphMap}
        size={sizeConfig.iconSize}
        color={config.color}
      />
      {displayLabel && (
        <Text
          style={[
            styles.label,
            {
              color: config.color,
              fontSize: sizeConfig.fontSize,
            },
          ]}
        >
          {config.label}
        </Text>
      )}
    </View>
  )
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontWeight: '500',
  },
})

// ============================================================================
// EXPORTS
// ============================================================================

export const VerificationTierBadge = memo(VerificationTierBadgeComponent)

/**
 * Helper component to get just the tier color for custom styling
 */
export function useTierColor(tier: VerificationTier): string {
  return getTierConfig(tier).color
}

/**
 * Helper component to get just the tier background color
 */
export function useTierBgColor(tier: VerificationTier): string {
  return getTierConfig(tier).bgColor
}
