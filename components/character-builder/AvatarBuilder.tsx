'use client'

import { memo, useState, useCallback, useMemo } from 'react'
import {
  AvatarConfig,
  AvatarOptionKey,
  AvatarOptionValue,
  DEFAULT_AVATAR_CONFIG,
} from '@/types/avatar'
import { PRIMARY_OPTION_KEYS, getOptionValue } from '@/lib/utils/avatar'
import { AvatarPreview } from './AvatarPreview'
import { CategoryTabs } from './CategoryTabs'
import { OptionSelector } from './OptionSelector'

// ============================================================================
// Types
// ============================================================================

export interface AvatarBuilderProps {
  /** Initial avatar configuration */
  initialConfig?: AvatarConfig
  /** Callback when avatar configuration changes */
  onChange?: (config: AvatarConfig) => void
  /** Categories to show in the builder */
  categories?: readonly AvatarOptionKey[]
  /** Whether to show option labels below previews */
  showOptionLabels?: boolean
  /** Height of the option selector list in pixels */
  optionListHeight?: number
  /** Additional CSS classes for the container */
  className?: string
}

// ============================================================================
// Component
// ============================================================================

/**
 * A comprehensive avatar builder component that combines a live preview,
 * category tabs, and virtualized option selectors for efficient rendering.
 *
 * Features:
 * - Large live preview at the top showing current avatar
 * - Horizontal category tabs for switching between options
 * - Virtualized option list for the selected category (only renders visible items)
 * - Real-time updates as options are selected
 * - Fully accessible with keyboard navigation
 *
 * @example
 * ```tsx
 * // Basic usage
 * <AvatarBuilder
 *   onChange={(config) => setAvatarConfig(config)}
 * />
 *
 * // With initial config
 * <AvatarBuilder
 *   initialConfig={{
 *     topType: 'LongHairCurly',
 *     hairColor: 'Brown',
 *     skinColor: 'Light',
 *   }}
 *   onChange={(config) => saveAvatar(config)}
 * />
 * ```
 */
function AvatarBuilderComponent({
  initialConfig,
  onChange,
  categories = PRIMARY_OPTION_KEYS,
  showOptionLabels = false,
  optionListHeight,
  className = '',
}: AvatarBuilderProps) {
  // Current avatar configuration state
  const [config, setConfig] = useState<AvatarConfig>(() => ({
    ...DEFAULT_AVATAR_CONFIG,
    ...initialConfig,
  }))

  // Currently selected category for the option selector
  const [selectedCategory, setSelectedCategory] = useState<AvatarOptionKey>(
    categories[0] ?? 'topType'
  )

  // Handle category tab change
  const handleCategoryChange = useCallback((category: AvatarOptionKey) => {
    setSelectedCategory(category)
  }, [])

  // Handle option selection within a category
  const handleOptionChange = useCallback(
    <K extends AvatarOptionKey>(optionKey: K, value: AvatarOptionValue<K>) => {
      setConfig((prevConfig) => {
        const newConfig = {
          ...prevConfig,
          [optionKey]: value,
        }
        // Notify parent of the change
        onChange?.(newConfig)
        return newConfig
      })
    },
    [onChange]
  )

  // Get the current selected value for the active category
  const selectedValue = useMemo(
    () => getOptionValue(config, selectedCategory),
    [config, selectedCategory]
  )

  // Build container classes
  const containerClasses = useMemo(
    () =>
      [
        'flex flex-col',
        'w-full',
        'rounded-lg',
        'bg-card',
        'border border-border',
        'overflow-hidden',
        className,
      ]
        .filter(Boolean)
        .join(' '),
    [className]
  )

  return (
    <div className={containerClasses} role="region" aria-label="Avatar builder">
      {/* Live Preview Section */}
      <div className="flex flex-col items-center gap-2 p-4 bg-muted/30">
        <AvatarPreview config={config} size="xl" />
        <p className="text-sm text-muted-foreground">Your Avatar</p>
      </div>

      {/* Category Tabs */}
      <CategoryTabs
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={handleCategoryChange}
      />

      {/* Option Selector for Selected Category */}
      <div className="p-4">
        <OptionSelector
          key={selectedCategory}
          optionKey={selectedCategory}
          baseConfig={config}
          selectedValue={selectedValue}
          onChange={handleOptionChange}
          showLabels={showOptionLabels}
          listHeight={optionListHeight}
          collapsible={false}
          defaultExpanded={true}
        />
      </div>
    </div>
  )
}

/**
 * Custom comparison function for React.memo
 * Only re-render if props actually changed
 */
function arePropsEqual(
  prevProps: AvatarBuilderProps,
  nextProps: AvatarBuilderProps
): boolean {
  // Check simple props first
  if (prevProps.className !== nextProps.className) return false
  if (prevProps.showOptionLabels !== nextProps.showOptionLabels) return false
  if (prevProps.optionListHeight !== nextProps.optionListHeight) return false
  if (prevProps.onChange !== nextProps.onChange) return false

  // Check categories array
  const prevCategories = prevProps.categories
  const nextCategories = nextProps.categories

  if (prevCategories !== nextCategories) {
    if (!prevCategories || !nextCategories) return false
    if (prevCategories.length !== nextCategories.length) return false
    for (let i = 0; i < prevCategories.length; i++) {
      if (prevCategories[i] !== nextCategories[i]) return false
    }
  }

  // Check initialConfig
  const prevConfig = prevProps.initialConfig
  const nextConfig = nextProps.initialConfig

  if (prevConfig !== nextConfig) {
    if (!prevConfig || !nextConfig) return false

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
  }

  return true
}

/**
 * Memoized AvatarBuilder component to prevent unnecessary re-renders.
 * Uses a custom comparison function to deeply compare configurations and categories.
 */
export const AvatarBuilder = memo(AvatarBuilderComponent, arePropsEqual)

AvatarBuilder.displayName = 'AvatarBuilder'

export default AvatarBuilder
