/**
 * AvatarPreview Component
 *
 * Renders an avatar using DiceBear's avataaars style based on a given configuration.
 * Used throughout the app to display user avatars and target descriptions.
 *
 * @example
 * ```tsx
 * import { AvatarPreview } from 'components/AvatarPreview'
 * import { DEFAULT_AVATAR_CONFIG } from 'types/avatar'
 *
 * // Basic usage
 * <AvatarPreview config={DEFAULT_AVATAR_CONFIG} />
 *
 * // Custom size
 * <AvatarPreview config={avatarConfig} size={150} />
 *
 * // Transparent background
 * <AvatarPreview config={avatarConfig} avatarStyle="Transparent" />
 * ```
 */

import React, { memo, useMemo } from 'react'
import { View, StyleSheet, ViewStyle } from 'react-native'
import { SvgXml } from 'react-native-svg'
import { createAvatarSvg } from '@/lib/avatar/dicebear'
import {
  AvatarConfig,
  AvatarStyle,
  DEFAULT_AVATAR_CONFIG,
} from '../types/avatar'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Props for the AvatarPreview component
 */
export interface AvatarPreviewProps {
  /**
   * Avatar configuration containing all customization options
   * @default DEFAULT_AVATAR_CONFIG
   */
  config?: Partial<AvatarConfig>

  /**
   * Size of the avatar in pixels (width and height)
   * @default 120
   */
  size?: number

  /**
   * Avatar rendering style
   * - 'Circle': Avatar with circular background
   * - 'Transparent': Avatar without background
   * @default 'Circle'
   */
  avatarStyle?: AvatarStyle

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
 * Default avatar size in pixels
 */
export const DEFAULT_AVATAR_SIZE = 120

/**
 * Preset sizes for common use cases
 */
export const AVATAR_SIZES = {
  /** Small avatar for lists and compact views */
  small: 48,
  /** Medium avatar for cards and previews */
  medium: 80,
  /** Default/standard avatar size */
  default: 120,
  /** Large avatar for profile views */
  large: 160,
  /** Extra large avatar for full-screen views */
  xlarge: 200,
} as const

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * AvatarPreview displays an avatar using DiceBear's avataaars style.
 *
 * Features:
 * - Renders avatar based on configuration props
 * - Supports multiple sizes via preset or custom values
 * - Circle or transparent background styles
 * - Memoized for performance optimization
 * - Fallback to default config if props are incomplete
 */
export const AvatarPreview = memo(function AvatarPreview({
  config,
  size = DEFAULT_AVATAR_SIZE,
  avatarStyle = 'Circle',
  style,
  testID = 'avatar-preview',
}: AvatarPreviewProps) {
  // Create a stable key for config changes using JSON.stringify
  // This ensures useMemo only recalculates when actual values change,
  // not when a new object reference with the same values is passed
  const configKey = useMemo(() => JSON.stringify(config), [config])

  // Merge provided config with defaults and include avatarStyle
  const mergedConfig: AvatarConfig = useMemo(
    () => ({
      ...DEFAULT_AVATAR_CONFIG,
      ...config,
      avatarStyle,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [configKey, avatarStyle]
  )

  // Generate SVG string using DiceBear adapter
  const svgString = useMemo(
    () => createAvatarSvg(mergedConfig, size),
    [mergedConfig, size]
  )

  return (
    <View
      style={[styles.container, { width: size, height: size }, style]}
      testID={testID}
    >
      <SvgXml xml={svgString} width={size} height={size} />
    </View>
  )
})

// ============================================================================
// PRESET VARIANTS
// ============================================================================

/**
 * Small avatar preview for lists and compact views
 */
export const SmallAvatarPreview = memo(function SmallAvatarPreview(
  props: Omit<AvatarPreviewProps, 'size'>
) {
  return (
    <AvatarPreview
      {...props}
      size={AVATAR_SIZES.small}
      testID={props.testID ?? 'avatar-preview-small'}
    />
  )
})

/**
 * Medium avatar preview for cards and post displays
 */
export const MediumAvatarPreview = memo(function MediumAvatarPreview(
  props: Omit<AvatarPreviewProps, 'size'>
) {
  return (
    <AvatarPreview
      {...props}
      size={AVATAR_SIZES.medium}
      testID={props.testID ?? 'avatar-preview-medium'}
    />
  )
})

/**
 * Large avatar preview for profile screens
 */
export const LargeAvatarPreview = memo(function LargeAvatarPreview(
  props: Omit<AvatarPreviewProps, 'size'>
) {
  return (
    <AvatarPreview
      {...props}
      size={AVATAR_SIZES.large}
      testID={props.testID ?? 'avatar-preview-large'}
    />
  )
})

/**
 * Extra large avatar preview for avatar builder/editor
 */
export const XLargeAvatarPreview = memo(function XLargeAvatarPreview(
  props: Omit<AvatarPreviewProps, 'size'>
) {
  return (
    <AvatarPreview
      {...props}
      size={AVATAR_SIZES.xlarge}
      testID={props.testID ?? 'avatar-preview-xlarge'}
    />
  )
})

/**
 * Transparent avatar preview (no circle background)
 */
export const TransparentAvatarPreview = memo(function TransparentAvatarPreview(
  props: Omit<AvatarPreviewProps, 'avatarStyle'>
) {
  return (
    <AvatarPreview
      {...props}
      avatarStyle="Transparent"
      testID={props.testID ?? 'avatar-preview-transparent'}
    />
  )
})

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validates an avatar configuration object
 * Returns true if all required properties are present
 */
export function isValidAvatarConfig(config: unknown): config is AvatarConfig {
  if (!config || typeof config !== 'object') {
    return false
  }

  const requiredKeys: (keyof AvatarConfig)[] = [
    'topType',
    'hairColor',
    'accessoriesType',
    'facialHairType',
    'facialHairColor',
    'clotheType',
    'clotheColor',
    'eyeType',
    'eyebrowType',
    'mouthType',
    'skinColor',
  ]

  return requiredKeys.every(
    (key) => key in config && typeof (config as Record<string, unknown>)[key] === 'string'
  )
}

/**
 * Creates a complete AvatarConfig from partial config
 * Fills in missing properties with defaults
 */
export function createAvatarConfig(
  partial?: Partial<AvatarConfig>
): AvatarConfig {
  return {
    ...DEFAULT_AVATAR_CONFIG,
    ...partial,
  }
}

/**
 * Compares two avatar configs to check if they are equal
 */
export function areAvatarConfigsEqual(
  config1: AvatarConfig,
  config2: AvatarConfig
): boolean {
  const keys: (keyof AvatarConfig)[] = [
    'topType',
    'hairColor',
    'accessoriesType',
    'facialHairType',
    'facialHairColor',
    'clotheType',
    'clotheColor',
    'eyeType',
    'eyebrowType',
    'mouthType',
    'skinColor',
  ]

  return keys.every((key) => config1[key] === config2[key])
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
})
