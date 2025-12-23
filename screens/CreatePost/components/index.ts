/**
 * CreatePost Components Barrel Export
 *
 * Exports all shared UI components used across the CreatePost wizard.
 * These components are used to build the wizard shell (header, progress bar)
 * while step-specific components are in the ./steps directory.
 */

// ============================================================================
// COMPONENT EXPORTS
// ============================================================================

/**
 * StepHeader - Header with back button and step indicator
 */
export { StepHeader } from './StepHeader'
export type { StepHeaderProps } from './StepHeader'

/**
 * ProgressBar - Animated progress indicator with step counter
 */
export { ProgressBar } from './ProgressBar'
export type { ProgressBarProps } from './ProgressBar'
