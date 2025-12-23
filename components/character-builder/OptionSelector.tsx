'use client'

import { memo, useState, useCallback, useMemo } from 'react'
import {
  AvatarConfig,
  AvatarOptionKey,
  AvatarOptionValue,
} from '@/types/avatar'
import { getCategoryLabel, getOptionValues, formatOptionName } from '@/lib/utils/avatar'
import { VirtualizedOptionList } from './VirtualizedOptionList'

// ============================================================================
// Icons
// ============================================================================

/**
 * Chevron down icon for collapsed state
 */
function ChevronDownIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 9l-7 7-7-7"
      />
    </svg>
  )
}

/**
 * Chevron up icon for expanded state
 */
function ChevronUpIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 15l7-7 7 7"
      />
    </svg>
  )
}

// ============================================================================
// Types
// ============================================================================

export interface OptionSelectorProps<K extends AvatarOptionKey = AvatarOptionKey> {
  /** The option key to select from (e.g., 'topType', 'hairColor') */
  optionKey: K
  /** Current base avatar configuration */
  baseConfig?: AvatarConfig
  /** Currently selected value for this option */
  selectedValue?: AvatarOptionValue<K>
  /** Callback when an option is selected */
  onChange?: (optionKey: K, value: AvatarOptionValue<K>) => void
  /** Whether the selector is initially expanded */
  defaultExpanded?: boolean
  /** Whether to show labels below previews */
  showLabels?: boolean
  /** Additional CSS classes for the container */
  className?: string
  /** Height of the option list in pixels */
  listHeight?: number
  /** Whether the selector can be collapsed */
  collapsible?: boolean
}

// ============================================================================
// Size Configuration
// ============================================================================

/**
 * Default height for the option list
 */
const DEFAULT_LIST_HEIGHT = 80

/**
 * Height when labels are shown
 */
const LIST_HEIGHT_WITH_LABELS = 100

// ============================================================================
// Component
// ============================================================================

/**
 * A complete option selector component combining category label,
 * expand/collapse functionality, and virtualized option list.
 *
 * Provides a cohesive UI for selecting avatar options within a category.
 *
 * @example
 * ```tsx
 * <OptionSelector
 *   optionKey="topType"
 *   baseConfig={currentConfig}
 *   selectedValue={currentConfig.topType}
 *   onChange={(key, value) => handleChange(key, value)}
 * />
 * ```
 */
function OptionSelectorComponent<K extends AvatarOptionKey>({
  optionKey,
  baseConfig,
  selectedValue,
  onChange,
  defaultExpanded = true,
  showLabels = false,
  className = '',
  listHeight,
  collapsible = true,
}: OptionSelectorProps<K>) {
  // Expand/collapse state
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  // Get the category label for display
  const categoryLabel = useMemo(() => getCategoryLabel(optionKey), [optionKey])

  // Get options for this category
  const options = useMemo(
    () => getOptionValues(optionKey),
    [optionKey]
  )

  // Get the display name of the selected value
  const selectedDisplayName = useMemo(() => {
    if (!selectedValue) return 'None'
    return formatOptionName(selectedValue as string)
  }, [selectedValue])

  // Calculate effective list height
  const effectiveListHeight = useMemo(() => {
    if (listHeight !== undefined) return listHeight
    return showLabels ? LIST_HEIGHT_WITH_LABELS : DEFAULT_LIST_HEIGHT
  }, [listHeight, showLabels])

  // Handle option selection
  const handleSelect = useCallback(
    (value: AvatarOptionValue<K>) => {
      onChange?.(optionKey, value)
    },
    [onChange, optionKey]
  )

  // Toggle expand/collapse
  const handleToggle = useCallback(() => {
    if (collapsible) {
      setIsExpanded((prev) => !prev)
    }
  }, [collapsible])

  // Handle keyboard interaction for accessibility
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (collapsible && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault()
        handleToggle()
      }
    },
    [collapsible, handleToggle]
  )

  // Build container classes
  const containerClasses = useMemo(
    () =>
      [
        'relative',
        'w-full',
        'rounded-lg',
        'bg-card',
        'border border-border',
        className,
      ]
        .filter(Boolean)
        .join(' '),
    [className]
  )

  // Build header classes
  const headerClasses = useMemo(
    () =>
      [
        'flex items-center justify-between',
        'px-3 py-2',
        'rounded-t-lg',
        collapsible ? 'cursor-pointer hover:bg-muted/50' : '',
        'transition-colors duration-150',
        !isExpanded ? 'rounded-b-lg' : 'border-b border-border',
      ]
        .filter(Boolean)
        .join(' '),
    [collapsible, isExpanded]
  )

  return (
    <div className={containerClasses}>
      {/* Header with label and toggle */}
      <div
        className={headerClasses}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        role={collapsible ? 'button' : undefined}
        tabIndex={collapsible ? 0 : undefined}
        aria-expanded={collapsible ? isExpanded : undefined}
        aria-controls={`option-list-${optionKey}`}
      >
        <div className="flex flex-col">
          <span className="text-sm font-medium text-foreground">
            {categoryLabel}
          </span>
          <span className="text-xs text-muted-foreground">
            {selectedDisplayName}
          </span>
        </div>

        {/* Expand/collapse indicator */}
        {collapsible && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {options.length} options
            </span>
            {isExpanded ? (
              <ChevronUpIcon className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        )}
      </div>

      {/* Option list (collapsible content) */}
      {isExpanded && (
        <div
          id={`option-list-${optionKey}`}
          className="p-2"
        >
          <VirtualizedOptionList
            optionKey={optionKey}
            options={options}
            baseConfig={baseConfig}
            selectedValue={selectedValue}
            onSelect={handleSelect}
            showLabels={showLabels}
            height={effectiveListHeight}
          />
        </div>
      )}
    </div>
  )
}

/**
 * Custom comparison function for React.memo
 * Only re-render if props that affect the visual output change
 */
function arePropsEqual<K extends AvatarOptionKey>(
  prevProps: OptionSelectorProps<K>,
  nextProps: OptionSelectorProps<K>
): boolean {
  // Check simple props first
  if (prevProps.optionKey !== nextProps.optionKey) return false
  if (prevProps.selectedValue !== nextProps.selectedValue) return false
  if (prevProps.showLabels !== nextProps.showLabels) return false
  if (prevProps.className !== nextProps.className) return false
  if (prevProps.listHeight !== nextProps.listHeight) return false
  if (prevProps.defaultExpanded !== nextProps.defaultExpanded) return false
  if (prevProps.collapsible !== nextProps.collapsible) return false

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
 * Memoized OptionSelector component.
 * Provides a complete UI for selecting avatar options with category labels.
 */
export const OptionSelector = memo(
  OptionSelectorComponent,
  arePropsEqual
) as <K extends AvatarOptionKey>(props: OptionSelectorProps<K>) => JSX.Element

// Set display name for debugging
;(OptionSelector as React.FC).displayName = 'OptionSelector'

export default OptionSelector
