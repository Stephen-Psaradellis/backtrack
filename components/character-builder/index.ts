/**
 * Character Builder Components
 *
 * This module provides a comprehensive avatar builder system with performance
 * optimizations including virtualization and lazy loading.
 *
 * @module character-builder
 */

// ============================================================================
// Public Components
// ============================================================================

/**
 * Main avatar builder component with live preview and virtualized selectors.
 * This is the primary component for creating and customizing avatars.
 */
export { AvatarBuilder } from './AvatarBuilder'
export type { AvatarBuilderProps } from './AvatarBuilder'

/**
 * Standalone avatar preview component with multiple size variants.
 * Use this for displaying avatars outside the builder context.
 */
export { AvatarPreview } from './AvatarPreview'
export type { AvatarPreviewProps, AvatarPreviewSize } from './AvatarPreview'

/**
 * Small avatar preview optimized for option selection lists.
 * Shows a single avatar option variation with selection state.
 */
export { SmallAvatarPreview } from './SmallAvatarPreview'
export type { SmallAvatarPreviewProps } from './SmallAvatarPreview'

// ============================================================================
// Internal Components (re-exported for advanced use cases)
// ============================================================================

/**
 * Category tabs for switching between avatar attribute categories.
 * Used internally by AvatarBuilder but exported for custom implementations.
 */
export { CategoryTabs } from './CategoryTabs'
export type { CategoryTabsProps } from './CategoryTabs'

/**
 * Option selector with category label and virtualized list.
 * Used internally by AvatarBuilder but exported for custom implementations.
 */
export { OptionSelector } from './OptionSelector'
export type { OptionSelectorProps } from './OptionSelector'

/**
 * Virtualized horizontal list for avatar option selection.
 * Used internally by OptionSelector but exported for custom implementations.
 */
export { VirtualizedOptionList } from './VirtualizedOptionList'
export type { VirtualizedOptionListProps } from './VirtualizedOptionList'

/**
 * Lazy-loaded avatar preview using intersection observer.
 * Renders a placeholder until the element enters the viewport.
 */
export { LazyAvatarPreview } from './LazyAvatarPreview'
export type { LazyAvatarPreviewProps } from './LazyAvatarPreview'
