'use client'

import { memo, useMemo } from 'react'
import { createAvatarDataUri } from '@/lib/avatar/dicebear'
import {
  AvatarConfig,
  AvatarOptionKey,
  AvatarOptionValue,
  DEFAULT_AVATAR_CONFIG,
} from '@/types/avatar'
import { createPreviewConfig, formatOptionName } from '@/lib/utils/avatar'

// ============================================================================
// Types
// ============================================================================

export interface SmallAvatarPreviewProps<K extends AvatarOptionKey = AvatarOptionKey> {
  /** Base avatar configuration to apply the option to */
  baseConfig?: AvatarConfig
  /** The option key being previewed (e.g., 'topType', 'hairColor') */
  optionKey: K
  /** The option value to preview */
  optionValue: AvatarOptionValue<K>
  /** Whether this option is currently selected */
  isSelected?: boolean
  /** Callback when this option is clicked */
  onSelect?: (value: AvatarOptionValue<K>) => void
  /** Additional CSS classes for the container */
  className?: string
  /** Whether to show the option label below the preview */
  showLabel?: boolean
}

// ============================================================================
// Size Configuration
// ============================================================================

/**
 * Fixed dimension for small avatar previews
 * Optimized for option selection lists (48-64px range)
 */
const PREVIEW_DIMENSION = 56

/**
 * Container size class for consistent sizing
 */
const CONTAINER_SIZE_CLASS = 'w-14 h-14'

// ============================================================================
// Component
// ============================================================================

/**
 * A small, optimized avatar preview component for option selection lists.
 * Shows what the avatar would look like with a specific option applied.
 *
 * Highly optimized for rendering many instances:
 * - Uses React.memo with custom comparison
 * - Memoizes config computation
 * - Fixed size to avoid layout recalculations
 *
 * @example
 * ```tsx
 * // Show what a different hair style would look like
 * <SmallAvatarPreview
 *   baseConfig={currentConfig}
 *   optionKey="topType"
 *   optionValue="LongHairCurly"
 *   isSelected={currentConfig.topType === 'LongHairCurly'}
 *   onSelect={(value) => handleChange('topType', value)}
 * />
 * ```
 */
function SmallAvatarPreviewComponent<K extends AvatarOptionKey>({
  baseConfig,
  optionKey,
  optionValue,
  isSelected = false,
  onSelect,
  className = '',
  showLabel = false,
}: SmallAvatarPreviewProps<K>) {
  // Create the preview config by applying the option to the base config
  // Always use transparent style for small previews
  const previewConfig = useMemo((): AvatarConfig => {
    const base = { ...DEFAULT_AVATAR_CONFIG, ...baseConfig }
    const config = createPreviewConfig(base, optionKey, optionValue)
    return {
      ...config,
      avatarStyle: 'Transparent',
    }
  }, [baseConfig, optionKey, optionValue])

  // Generate avatar data URI using DiceBear adapter
  const avatarDataUri = useMemo(
    () => createAvatarDataUri(previewConfig, PREVIEW_DIMENSION),
    [previewConfig]
  )

  // Format the display label for the option value
  const displayLabel = useMemo(
    () => formatOptionName(optionValue as string),
    [optionValue]
  )

  // Handle click to select this option
  const handleClick = () => {
    onSelect?.(optionValue)
  }

  // Handle keyboard interaction for accessibility
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect?.(optionValue)
    }
  }

  // Build container classes
  const containerClasses = [
    'relative',
    'flex flex-col items-center',
    'cursor-pointer',
    'transition-all duration-150',
    'rounded-lg',
    'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
    isSelected
      ? 'ring-2 ring-primary bg-primary/10'
      : 'hover:bg-muted/50',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  // Build avatar container classes
  const avatarContainerClasses = [
    'inline-flex items-center justify-center',
    'overflow-hidden',
    'flex-shrink-0',
    'rounded-full',
    'bg-muted/30',
    CONTAINER_SIZE_CLASS,
  ].join(' ')

  return (
    <div
      className={containerClasses}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Select ${displayLabel}`}
      aria-pressed={isSelected}
    >
      <div className={avatarContainerClasses}>
        <img
          src={avatarDataUri}
          alt="Avatar option preview"
          width={PREVIEW_DIMENSION}
          height={PREVIEW_DIMENSION}
          style={{ width: PREVIEW_DIMENSION, height: PREVIEW_DIMENSION }}
        />
      </div>
      {showLabel && (
        <span className="mt-1 text-xs text-muted-foreground text-center truncate max-w-16">
          {displayLabel}
        </span>
      )}
    </div>
  )
}

/**
 * Custom comparison function for React.memo
 * Only re-render if props that affect the visual output change
 */
function arePropsEqual<K extends AvatarOptionKey>(
  prevProps: SmallAvatarPreviewProps<K>,
  nextProps: SmallAvatarPreviewProps<K>
): boolean {
  // Check simple props first (most likely to change)
  if (prevProps.isSelected !== nextProps.isSelected) return false
  if (prevProps.optionKey !== nextProps.optionKey) return false
  if (prevProps.optionValue !== nextProps.optionValue) return false
  if (prevProps.className !== nextProps.className) return false
  if (prevProps.showLabel !== nextProps.showLabel) return false

  // Check function reference (callback identity doesn't affect rendering)
  // We skip onSelect comparison as it doesn't affect visual output

  // Check baseConfig equality
  const prevConfig = prevProps.baseConfig
  const nextConfig = nextProps.baseConfig

  // Both undefined or same reference
  if (prevConfig === nextConfig) return true

  // One is undefined
  if (!prevConfig || !nextConfig) return false

  // Compare config properties that affect visual output
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
    // Skip the key being previewed since optionValue determines that
    if (key === prevProps.optionKey) continue
    if (prevConfig[key] !== nextConfig[key]) return false
  }

  return true
}

/**
 * Memoized SmallAvatarPreview component for option selection lists.
 * Optimized for rendering many instances with minimal re-renders.
 */
export const SmallAvatarPreview = memo(
  SmallAvatarPreviewComponent,
  arePropsEqual
) as <K extends AvatarOptionKey>(props: SmallAvatarPreviewProps<K>) => JSX.Element

// Set display name for debugging
;(SmallAvatarPreview as React.FC).displayName = 'SmallAvatarPreview'

export default SmallAvatarPreview
