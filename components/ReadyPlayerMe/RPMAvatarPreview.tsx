/**
 * RPMAvatarPreview Component
 *
 * Displays a Ready Player Me avatar as a 2D rendered image.
 * Supports various sizes and render options.
 */

import React, { memo, useMemo, useState } from 'react'
import {
  View,
  Image,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  ImageStyle,
} from 'react-native'
import { getRenderUrl, getPresetRenderUrl, RENDER_PRESETS } from './utils'
import { RPMRenderOptions } from './types'

// ============================================================================
// Types
// ============================================================================

export interface RPMAvatarPreviewProps {
  /** Avatar ID or full model URL */
  avatarId: string
  /** Size in pixels (width and height) */
  size?: number
  /** Use full body view instead of portrait */
  fullBody?: boolean
  /** Custom render options (overrides size/fullBody) */
  renderOptions?: RPMRenderOptions
  /** Additional container style */
  style?: ViewStyle
  /** Image style */
  imageStyle?: ImageStyle
  /** Show loading indicator */
  showLoading?: boolean
  /** Fallback component when no avatar */
  fallback?: React.ReactNode
  /** Test ID for testing */
  testID?: string
}

// ============================================================================
// Size Presets
// ============================================================================

export const AVATAR_SIZES = {
  xs: 32,
  sm: 48,
  md: 80,
  lg: 120,
  xl: 200,
} as const

export type AvatarSizePreset = keyof typeof AVATAR_SIZES

// ============================================================================
// Component
// ============================================================================

/**
 * RPMAvatarPreview - Displays a Ready Player Me avatar image
 *
 * Features:
 * - Portrait or full-body views
 * - Multiple size presets
 * - Loading state with spinner
 * - Fallback for missing avatars
 * - Optimized with React.memo
 */
function RPMAvatarPreviewComponent({
  avatarId,
  size = AVATAR_SIZES.md,
  fullBody = false,
  renderOptions,
  style,
  imageStyle,
  showLoading = true,
  fallback,
  testID = 'rpm-avatar-preview',
}: RPMAvatarPreviewProps): JSX.Element {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  // Generate render URL
  const imageUrl = useMemo(() => {
    if (!avatarId) return ''

    if (renderOptions) {
      return getRenderUrl(avatarId, renderOptions)
    }

    return getRenderUrl(avatarId, {
      camera: fullBody ? 'fullbody' : 'portrait',
      size: Math.min(size * 2, 1024), // Request 2x for retina, max 1024
    })
  }, [avatarId, size, fullBody, renderOptions])

  // Handle image load
  const handleLoad = () => {
    setIsLoading(false)
    setHasError(false)
  }

  // Handle image error
  const handleError = () => {
    setIsLoading(false)
    setHasError(true)
  }

  // Container style with size
  const containerStyle = useMemo(
    () => [
      styles.container,
      { width: size, height: size },
      style,
    ],
    [size, style]
  )

  // If no avatar ID, show fallback
  if (!avatarId) {
    return (
      <View style={containerStyle} testID={testID}>
        {fallback || <DefaultFallback size={size} />}
      </View>
    )
  }

  // If error loading, show fallback
  if (hasError) {
    return (
      <View style={containerStyle} testID={testID}>
        {fallback || <DefaultFallback size={size} />}
      </View>
    )
  }

  return (
    <View style={containerStyle} testID={testID}>
      {showLoading && isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size={size > 60 ? 'large' : 'small'}
            color="#007AFF"
          />
        </View>
      )}

      <Image
        source={{ uri: imageUrl }}
        style={[
          styles.image,
          { width: size, height: size },
          imageStyle,
        ]}
        onLoad={handleLoad}
        onError={handleError}
        resizeMode="cover"
        testID={`${testID}-image`}
      />
    </View>
  )
}

/**
 * Default fallback when no avatar is available
 */
function DefaultFallback({ size }: { size: number }): JSX.Element {
  const iconSize = Math.max(size * 0.4, 16)

  return (
    <View style={[styles.fallback, { width: size, height: size }]}>
      <View
        style={[
          styles.fallbackIcon,
          { width: iconSize, height: iconSize, borderRadius: iconSize / 2 },
        ]}
      />
    </View>
  )
}

// ============================================================================
// Memoized Export
// ============================================================================

export const RPMAvatarPreview = memo(RPMAvatarPreviewComponent)

// ============================================================================
// Preset Variants
// ============================================================================

/**
 * Extra small avatar (32px) - for inline text
 */
export const XSAvatarPreview = memo(function XSAvatarPreview(
  props: Omit<RPMAvatarPreviewProps, 'size'>
) {
  return <RPMAvatarPreview {...props} size={AVATAR_SIZES.xs} />
})

/**
 * Small avatar (48px) - for lists
 */
export const SmallAvatarPreview = memo(function SmallAvatarPreview(
  props: Omit<RPMAvatarPreviewProps, 'size'>
) {
  return <RPMAvatarPreview {...props} size={AVATAR_SIZES.sm} />
})

/**
 * Medium avatar (80px) - for cards
 */
export const MediumAvatarPreview = memo(function MediumAvatarPreview(
  props: Omit<RPMAvatarPreviewProps, 'size'>
) {
  return <RPMAvatarPreview {...props} size={AVATAR_SIZES.md} />
})

/**
 * Large avatar (120px) - for profiles
 */
export const LargeAvatarPreview = memo(function LargeAvatarPreview(
  props: Omit<RPMAvatarPreviewProps, 'size'>
) {
  return <RPMAvatarPreview {...props} size={AVATAR_SIZES.lg} />
})

/**
 * Extra large avatar (200px) - for avatar builder preview
 */
export const XLAvatarPreview = memo(function XLAvatarPreview(
  props: Omit<RPMAvatarPreviewProps, 'size'>
) {
  return <RPMAvatarPreview {...props} size={AVATAR_SIZES.xl} />
})

/**
 * Full body avatar preview
 */
export const FullBodyAvatarPreview = memo(function FullBodyAvatarPreview(
  props: Omit<RPMAvatarPreviewProps, 'fullBody'>
) {
  return <RPMAvatarPreview {...props} fullBody={true} />
})

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  image: {
    borderRadius: 8,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    zIndex: 1,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
  },
  fallbackIcon: {
    backgroundColor: '#ccc',
  },
})

export default RPMAvatarPreview
