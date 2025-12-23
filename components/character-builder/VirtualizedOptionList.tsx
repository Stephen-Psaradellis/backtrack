'use client'

import { memo, useRef, useCallback, useMemo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  AvatarConfig,
  AvatarOptionKey,
  AvatarOptionValue,
} from '@/types/avatar'
import { SmallAvatarPreview } from './SmallAvatarPreview'

// ============================================================================
// Types
// ============================================================================

export interface VirtualizedOptionListProps<K extends AvatarOptionKey = AvatarOptionKey> {
  /** The option key being displayed (e.g., 'topType', 'hairColor') */
  optionKey: K
  /** Array of option values to display */
  options: readonly AvatarOptionValue<K>[]
  /** Current base avatar configuration */
  baseConfig?: AvatarConfig
  /** Currently selected option value */
  selectedValue?: AvatarOptionValue<K>
  /** Callback when an option is selected */
  onSelect?: (value: AvatarOptionValue<K>) => void
  /** Whether to show labels below previews */
  showLabels?: boolean
  /** Additional CSS classes for the container */
  className?: string
  /** Height of the list container in pixels */
  height?: number
}

// ============================================================================
// Size Configuration
// ============================================================================

/**
 * Default height for the virtualized list container
 */
const DEFAULT_HEIGHT = 80

/**
 * Width of each option item including padding
 * Based on SmallAvatarPreview size (56px) + padding
 */
const ITEM_WIDTH = 72

/**
 * Gap between items in pixels
 */
const ITEM_GAP = 8

/**
 * Total size of each item including gap
 */
const ITEM_SIZE = ITEM_WIDTH + ITEM_GAP

/**
 * Number of items to render outside the visible area
 * Helps with smooth scrolling
 */
const OVERSCAN = 3

// ============================================================================
// Component
// ============================================================================

/**
 * A virtualized horizontal list for displaying avatar option previews.
 * Only renders options that are currently visible in the viewport,
 * significantly reducing render load for large option sets.
 *
 * Uses @tanstack/react-virtual for efficient virtualization.
 *
 * @example
 * ```tsx
 * <VirtualizedOptionList
 *   optionKey="topType"
 *   options={AVATAR_OPTIONS.topType}
 *   baseConfig={currentConfig}
 *   selectedValue={currentConfig.topType}
 *   onSelect={(value) => handleChange('topType', value)}
 * />
 * ```
 */
function VirtualizedOptionListComponent<K extends AvatarOptionKey>({
  optionKey,
  options,
  baseConfig,
  selectedValue,
  onSelect,
  showLabels = false,
  className = '',
  height = DEFAULT_HEIGHT,
}: VirtualizedOptionListProps<K>) {
  // Ref for the scrollable container
  const parentRef = useRef<HTMLDivElement>(null)

  // Create the virtualizer for horizontal scrolling
  const virtualizer = useVirtualizer({
    horizontal: true,
    count: options.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_SIZE,
    overscan: OVERSCAN,
  })

  // Memoize the handle select callback
  const handleSelect = useCallback(
    (value: AvatarOptionValue<K>) => {
      onSelect?.(value)
    },
    [onSelect]
  )

  // Build container classes
  const containerClasses = useMemo(
    () =>
      [
        'relative',
        'w-full',
        'overflow-x-auto',
        'overflow-y-hidden',
        'scrollbar-thin',
        'scrollbar-thumb-muted',
        'scrollbar-track-transparent',
        className,
      ]
        .filter(Boolean)
        .join(' '),
    [className]
  )

  // Get virtual items
  const virtualItems = virtualizer.getVirtualItems()

  return (
    <div
      ref={parentRef}
      className={containerClasses}
      style={{ height }}
      role="listbox"
      aria-label={`Select ${optionKey} option`}
      aria-orientation="horizontal"
    >
      {/* Inner container with total width for scrolling */}
      <div
        className="relative h-full"
        style={{
          width: `${virtualizer.getTotalSize()}px`,
        }}
      >
        {/* Render only visible items */}
        {virtualItems.map((virtualItem) => {
          const optionValue = options[virtualItem.index]
          const isSelected = optionValue === selectedValue

          return (
            <div
              key={virtualItem.key}
              className="absolute top-0 left-0 h-full flex items-center"
              style={{
                width: `${ITEM_WIDTH}px`,
                transform: `translateX(${virtualItem.start}px)`,
              }}
              role="option"
              aria-selected={isSelected}
            >
              <SmallAvatarPreview
                baseConfig={baseConfig}
                optionKey={optionKey}
                optionValue={optionValue}
                isSelected={isSelected}
                onSelect={handleSelect}
                showLabel={showLabels}
                className="p-1"
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Custom comparison function for React.memo
 * Only re-render if props that affect the visual output change
 */
function arePropsEqual<K extends AvatarOptionKey>(
  prevProps: VirtualizedOptionListProps<K>,
  nextProps: VirtualizedOptionListProps<K>
): boolean {
  // Check simple props first
  if (prevProps.optionKey !== nextProps.optionKey) return false
  if (prevProps.selectedValue !== nextProps.selectedValue) return false
  if (prevProps.showLabels !== nextProps.showLabels) return false
  if (prevProps.className !== nextProps.className) return false
  if (prevProps.height !== nextProps.height) return false

  // Check options array (reference or length change)
  if (prevProps.options !== nextProps.options) {
    if (prevProps.options.length !== nextProps.options.length) return false
    // For same-length arrays, assume content is stable
  }

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
    // Skip the key being displayed since it varies per item
    if (key === prevProps.optionKey) continue
    if (prevConfig[key] !== nextConfig[key]) return false
  }

  return true
}

/**
 * Memoized VirtualizedOptionList component.
 * Optimized for rendering large option sets with minimal re-renders.
 */
export const VirtualizedOptionList = memo(
  VirtualizedOptionListComponent,
  arePropsEqual
) as <K extends AvatarOptionKey>(props: VirtualizedOptionListProps<K>) => JSX.Element

// Set display name for debugging
;(VirtualizedOptionList as React.FC).displayName = 'VirtualizedOptionList'

export default VirtualizedOptionList
