'use client'

import { memo, useMemo } from 'react'
import { SmallAvatarPreview, SmallAvatarPreviewProps } from './SmallAvatarPreview'
import { useInViewport } from '@/hooks/useInViewport'
import { AvatarOptionKey } from '@/types/avatar'

// ============================================================================
// Types
// ============================================================================

export interface LazyAvatarPreviewProps<K extends AvatarOptionKey = AvatarOptionKey>
  extends SmallAvatarPreviewProps<K> {
  /**
   * Margin around the viewport for triggering lazy loading
   * Positive values load the preview before it enters the viewport
   * @default "100px"
   */
  rootMargin?: string

  /**
   * Custom placeholder component to show while loading
   * If not provided, a default skeleton placeholder is shown
   */
  placeholder?: React.ReactNode
}

// ============================================================================
// Size Configuration (matching SmallAvatarPreview)
// ============================================================================

/**
 * Container size class for consistent sizing
 * Matches SmallAvatarPreview's CONTAINER_SIZE_CLASS
 */
const CONTAINER_SIZE_CLASS = 'w-14 h-14'

// ============================================================================
// Placeholder Component
// ============================================================================

/**
 * Default placeholder shown while the avatar is not yet in viewport
 * Uses a pulsing animation to indicate loading state
 */
function DefaultPlaceholder() {
  const placeholderClasses = [
    'inline-flex items-center justify-center',
    'overflow-hidden',
    'flex-shrink-0',
    'rounded-full',
    'bg-muted/50',
    'animate-pulse',
    CONTAINER_SIZE_CLASS,
  ].join(' ')

  return <div className={placeholderClasses} />
}

// ============================================================================
// Component
// ============================================================================

/**
 * A lazy-loading wrapper around SmallAvatarPreview that only renders
 * the avatar when the element enters the viewport.
 *
 * Performance optimizations:
 * - Uses IntersectionObserver for efficient viewport detection
 * - Pre-loads content 100px before entering viewport (configurable)
 * - Once rendered, stays rendered (no unmount on scroll out)
 * - Memoized to prevent unnecessary re-renders
 *
 * @example
 * ```tsx
 * // Basic lazy loading
 * <LazyAvatarPreview
 *   baseConfig={currentConfig}
 *   optionKey="topType"
 *   optionValue="LongHairCurly"
 *   isSelected={currentConfig.topType === 'LongHairCurly'}
 *   onSelect={(value) => handleChange('topType', value)}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // With custom root margin and placeholder
 * <LazyAvatarPreview
 *   baseConfig={currentConfig}
 *   optionKey="hairColor"
 *   optionValue="Brown"
 *   rootMargin="200px"
 *   placeholder={<CustomSkeleton />}
 * />
 * ```
 */
function LazyAvatarPreviewComponent<K extends AvatarOptionKey>({
  rootMargin = '100px',
  placeholder,
  ...previewProps
}: LazyAvatarPreviewProps<K>) {
  // Use intersection observer to detect when element enters viewport
  const { ref, isInView } = useInViewport<HTMLDivElement>({
    rootMargin,
    triggerOnce: true, // Once rendered, keep rendered
    threshold: 0, // Trigger as soon as any part is visible
  })

  // Memoize the placeholder to avoid re-creating on each render
  const placeholderContent = useMemo(
    () => placeholder ?? <DefaultPlaceholder />,
    [placeholder]
  )

  // Build wrapper classes - maintains consistent sizing with SmallAvatarPreview
  const wrapperClasses = [
    'relative',
    'flex flex-col items-center',
    'cursor-pointer',
    'transition-all duration-150',
    'rounded-lg',
    'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
    previewProps.isSelected
      ? 'ring-2 ring-primary bg-primary/10'
      : 'hover:bg-muted/50',
    previewProps.className,
  ]
    .filter(Boolean)
    .join(' ')

  // If not in view, show placeholder with same structure
  if (!isInView) {
    return (
      <div ref={ref} className={wrapperClasses}>
        {placeholderContent}
        {previewProps.showLabel && (
          <span className="mt-1 text-xs text-muted-foreground text-center truncate max-w-16">
            &nbsp;
          </span>
        )}
      </div>
    )
  }

  // Once in view, render the actual SmallAvatarPreview
  // The SmallAvatarPreview handles its own styling, so we just pass props through
  return (
    <div ref={ref}>
      <SmallAvatarPreview {...previewProps} />
    </div>
  )
}

/**
 * Custom comparison function for React.memo
 * Only re-render if props that affect the visual output change
 */
function arePropsEqual<K extends AvatarOptionKey>(
  prevProps: LazyAvatarPreviewProps<K>,
  nextProps: LazyAvatarPreviewProps<K>
): boolean {
  // Check LazyAvatarPreview-specific props first
  if (prevProps.rootMargin !== nextProps.rootMargin) return false
  if (prevProps.placeholder !== nextProps.placeholder) return false

  // Check SmallAvatarPreview props (most likely to change)
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

  // Compare all config keys that affect visual output
  const configKeys = [
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
  ] as const

  for (const key of configKeys) {
    // Skip the key being previewed since optionValue determines that
    if (key === prevProps.optionKey) continue
    if (prevConfig[key] !== nextConfig[key]) return false
  }

  return true
}

/**
 * Memoized LazyAvatarPreview component for virtualized option lists.
 * Optimized for rendering many instances with lazy loading and minimal re-renders.
 */
export const LazyAvatarPreview = memo(
  LazyAvatarPreviewComponent,
  arePropsEqual
) as <K extends AvatarOptionKey>(props: LazyAvatarPreviewProps<K>) => JSX.Element

// Set display name for debugging
;(LazyAvatarPreview as React.FC).displayName = 'LazyAvatarPreview'

export default LazyAvatarPreview
