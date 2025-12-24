'use client'

import { memo, useMemo } from 'react'
import { createAvatarDataUri } from '@/lib/avatar/dicebear'
import { AvatarConfig, DEFAULT_AVATAR_CONFIG } from '@/types/avatar'

// ============================================================================
// Types
// ============================================================================

export type AvatarPreviewSize = 'sm' | 'md' | 'lg' | 'xl'

export interface AvatarPreviewProps {
  /** Avatar configuration options */
  config?: AvatarConfig
  /** Size variant of the avatar preview */
  size?: AvatarPreviewSize
  /** Additional CSS classes to apply to the container */
  className?: string
  /** Whether to use transparent background instead of circle */
  transparent?: boolean
}

// ============================================================================
// Size Configurations
// ============================================================================

/**
 * Size mappings for avatar preview dimensions
 * Maps size variants to pixel dimensions
 */
const SIZE_DIMENSIONS: Record<AvatarPreviewSize, number> = {
  sm: 48,
  md: 80,
  lg: 120,
  xl: 200,
}

/**
 * CSS class mappings for container sizing
 */
const SIZE_CLASSES: Record<AvatarPreviewSize, string> = {
  sm: 'w-12 h-12',
  md: 'w-20 h-20',
  lg: 'w-[120px] h-[120px]',
  xl: 'w-[200px] h-[200px]',
}

// ============================================================================
// Component
// ============================================================================

/**
 * A memoized avatar preview component that renders an avatar using DiceBear.
 * Supports multiple size variants and accepts a partial or complete avatar configuration.
 *
 * @example
 * ```tsx
 * // Basic usage with default config
 * <AvatarPreview size="lg" />
 *
 * // With custom config
 * <AvatarPreview
 *   size="md"
 *   config={{
 *     topType: 'LongHairCurly',
 *     hairColor: 'Brown',
 *     skinColor: 'Light',
 *   }}
 * />
 * ```
 */
function AvatarPreviewComponent({
  config,
  size = 'md',
  className = '',
  transparent = false,
}: AvatarPreviewProps) {
  // Merge provided config with defaults and apply transparent override
  const mergedConfig = useMemo(
    (): AvatarConfig => ({
      ...DEFAULT_AVATAR_CONFIG,
      ...config,
      // Override avatarStyle based on transparent prop
      avatarStyle: transparent ? 'Transparent' : (config?.avatarStyle ?? DEFAULT_AVATAR_CONFIG.avatarStyle),
    }),
    [config, transparent]
  )

  const dimension = SIZE_DIMENSIONS[size]
  const containerClass = SIZE_CLASSES[size]

  // Generate avatar data URI using DiceBear adapter
  const avatarDataUri = useMemo(
    () => createAvatarDataUri(mergedConfig, dimension),
    [mergedConfig, dimension]
  )

  const baseClasses = [
    'inline-flex items-center justify-center',
    'overflow-hidden',
    'flex-shrink-0',
    containerClass,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={baseClasses} aria-label="Avatar preview">
      <img
        src={avatarDataUri}
        alt="Avatar"
        width={dimension}
        height={dimension}
        style={{ width: dimension, height: dimension }}
      />
    </div>
  )
}

/**
 * Custom comparison function for React.memo
 * Only re-render if config or size actually changed
 */
function arePropsEqual(
  prevProps: AvatarPreviewProps,
  nextProps: AvatarPreviewProps
): boolean {
  // Check simple props first
  if (prevProps.size !== nextProps.size) return false
  if (prevProps.className !== nextProps.className) return false
  if (prevProps.transparent !== nextProps.transparent) return false

  // Check config equality
  const prevConfig = prevProps.config
  const nextConfig = nextProps.config

  // Both undefined or same reference
  if (prevConfig === nextConfig) return true

  // One is undefined
  if (!prevConfig || !nextConfig) return false

  // Compare config properties
  const configKeys: (keyof AvatarConfig)[] = [
    'avatarStyle',
    'topType',
    'accessoriesType',
    'hairColor',
    'facialHairType',
    'facialHairColor',
    'clotheType',
    'clotheColor',
    'graphicType',
    'eyeType',
    'eyebrowType',
    'mouthType',
    'skinColor',
  ]

  for (const key of configKeys) {
    if (prevConfig[key] !== nextConfig[key]) return false
  }

  return true
}

/**
 * Memoized AvatarPreview component to prevent unnecessary re-renders.
 * Uses a custom comparison function to deeply compare avatar configurations.
 */
export const AvatarPreview = memo(AvatarPreviewComponent, arePropsEqual)

AvatarPreview.displayName = 'AvatarPreview'

export default AvatarPreview
