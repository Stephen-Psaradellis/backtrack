'use client'

import { memo, forwardRef, useRef, useCallback, useMemo, useEffect } from 'react'
import { AvatarOptionKey } from '@/types/avatar'
import { getCategoryLabel, PRIMARY_OPTION_KEYS } from '@/lib/utils/avatar'

// ============================================================================
// Types
// ============================================================================

export interface CategoryTabsProps {
  /** List of category keys to display as tabs */
  categories?: readonly AvatarOptionKey[]
  /** Currently selected category */
  selectedCategory: AvatarOptionKey
  /** Callback when a category is selected */
  onCategoryChange: (category: AvatarOptionKey) => void
  /** Additional CSS classes for the container */
  className?: string
}

// ============================================================================
// Component
// ============================================================================

/**
 * Horizontal scrollable tabs for switching between avatar attribute categories.
 *
 * Features:
 * - Horizontal scroll with smooth behavior
 * - Automatic scroll to selected tab
 * - Keyboard navigation support
 * - Visual indicator for selected tab
 *
 * @example
 * ```tsx
 * <CategoryTabs
 *   selectedCategory="topType"
 *   onCategoryChange={(category) => setSelectedCategory(category)}
 * />
 * ```
 */
function CategoryTabsComponent({
  categories = PRIMARY_OPTION_KEYS,
  selectedCategory,
  onCategoryChange,
  className = '',
}: CategoryTabsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const selectedTabRef = useRef<HTMLButtonElement>(null)

  // Scroll selected tab into view when it changes
  useEffect(() => {
    if (selectedTabRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current
      const tab = selectedTabRef.current

      // Calculate scroll position to center the tab
      const containerWidth = container.offsetWidth
      const tabLeft = tab.offsetLeft
      const tabWidth = tab.offsetWidth
      const scrollLeft = tabLeft - (containerWidth / 2) + (tabWidth / 2)

      container.scrollTo({
        left: Math.max(0, scrollLeft),
        behavior: 'smooth',
      })
    }
  }, [selectedCategory])

  // Handle tab click
  const handleTabClick = useCallback(
    (category: AvatarOptionKey) => {
      onCategoryChange(category)
    },
    [onCategoryChange]
  )

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, currentIndex: number) => {
      let newIndex: number | null = null

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault()
          newIndex = currentIndex > 0 ? currentIndex - 1 : categories.length - 1
          break
        case 'ArrowRight':
          event.preventDefault()
          newIndex = currentIndex < categories.length - 1 ? currentIndex + 1 : 0
          break
        case 'Home':
          event.preventDefault()
          newIndex = 0
          break
        case 'End':
          event.preventDefault()
          newIndex = categories.length - 1
          break
      }

      if (newIndex !== null) {
        onCategoryChange(categories[newIndex])
      }
    },
    [categories, onCategoryChange]
  )

  // Build container classes
  const containerClasses = useMemo(
    () =>
      [
        'relative',
        'w-full',
        'bg-card',
        'border-b border-border',
        className,
      ]
        .filter(Boolean)
        .join(' '),
    [className]
  )

  return (
    <div className={containerClasses} role="tablist" aria-label="Avatar categories">
      {/* Scroll container */}
      <div
        ref={scrollContainerRef}
        className="flex overflow-x-auto scrollbar-hide scroll-smooth"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {/* Tabs */}
        <div className="flex gap-1 p-2 min-w-max">
          {categories.map((category, index) => {
            const isSelected = category === selectedCategory
            const label = getCategoryLabel(category)

            return (
              <Tab
                key={category}
                ref={isSelected ? selectedTabRef : null}
                label={label}
                isSelected={isSelected}
                onClick={() => handleTabClick(category)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                tabIndex={isSelected ? 0 : -1}
              />
            )
          })}
        </div>
      </div>

      {/* Fade indicators for scroll */}
      <div
        className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-card to-transparent pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-card to-transparent pointer-events-none"
        aria-hidden="true"
      />
    </div>
  )
}

// ============================================================================
// Tab Button Component
// ============================================================================

interface TabProps {
  label: string
  isSelected: boolean
  onClick: () => void
  onKeyDown: (event: React.KeyboardEvent) => void
  tabIndex: number
}

/**
 * Individual tab button within the category tabs
 */
const TabBase = forwardRef<HTMLButtonElement, TabProps>(
  function Tab({ label, isSelected, onClick, onKeyDown, tabIndex }, ref) {
    // Build tab classes based on selection state
    const tabClasses = useMemo(
      () =>
        [
          'px-3 py-2',
          'text-sm font-medium',
          'rounded-md',
          'whitespace-nowrap',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-1',
          isSelected
            ? 'bg-pink-500 text-white'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted',
        ]
          .filter(Boolean)
          .join(' '),
      [isSelected]
    )

    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        aria-selected={isSelected}
        tabIndex={tabIndex}
        className={tabClasses}
        onClick={onClick}
        onKeyDown={onKeyDown}
      >
        {label}
      </button>
    )
  }
)

TabBase.displayName = 'Tab'

const Tab = memo(TabBase, (prevProps, nextProps) => {
  return (
    prevProps.label === nextProps.label &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.tabIndex === nextProps.tabIndex
  )
})

// ============================================================================
// Memoized Export
// ============================================================================

/**
 * Custom comparison function for React.memo
 */
function arePropsEqual(
  prevProps: CategoryTabsProps,
  nextProps: CategoryTabsProps
): boolean {
  // Check simple props
  if (prevProps.selectedCategory !== nextProps.selectedCategory) return false
  if (prevProps.className !== nextProps.className) return false

  // Check categories array
  const prevCategories = prevProps.categories ?? PRIMARY_OPTION_KEYS
  const nextCategories = nextProps.categories ?? PRIMARY_OPTION_KEYS

  if (prevCategories.length !== nextCategories.length) return false

  for (let i = 0; i < prevCategories.length; i++) {
    if (prevCategories[i] !== nextCategories[i]) return false
  }

  return true
}

/**
 * Memoized CategoryTabs component.
 * Provides horizontal scrollable tabs for switching between avatar categories.
 */
export const CategoryTabs = memo(CategoryTabsComponent, arePropsEqual)

// Set display name for debugging
CategoryTabs.displayName = 'CategoryTabs'

export default CategoryTabs
