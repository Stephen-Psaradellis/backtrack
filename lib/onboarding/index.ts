/**
 * Onboarding Library Module
 *
 * This module provides configuration, utilities, and mock data for the
 * Backtrack onboarding flow. It includes:
 * - Step configuration and metadata
 * - Progress calculation utilities
 * - Navigation helpers
 * - Mock data for demo screens
 *
 * @module lib/onboarding
 *
 * @example
 * ```tsx
 * import {
 *   ONBOARDING_STEPS,
 *   getStepById,
 *   calculateProgress,
 *   PRODUCER_DEMO_POST,
 *   CONSUMER_DEMO_POSTS,
 * } from './'
 *
 * // Get step config
 * const welcomeStep = getStepById('welcome')
 * console.log(welcomeStep?.title) // "Welcome to Backtrack"
 *
 * // Calculate progress
 * const progress = calculateProgress(2) // 50%
 *
 * // Use mock data in demos
 * <PostCard message={PRODUCER_DEMO_POST.message} />
 * ```
 */

// ============================================================================
// Configuration & Types
// ============================================================================

export {
  // Types
  type OnboardingStepId,
  type OnboardingStep,
  type OnboardingFeature,
  // Constants
  TOTAL_ONBOARDING_STEPS,
  TARGET_COMPLETION_MINUTES,
  ONBOARDING_STEPS,
  WELCOME_FEATURES,
  // Step lookup functions
  getStepById,
  getStepByIndex,
  getStepIndex,
  // Progress calculation
  calculateProgress,
  calculateRemainingTime,
  formatEstimatedTime,
  // Validation
  isValidStepIndex,
  isValidStepId,
  // Navigation helpers
  getNextStepId,
  getPreviousStepId,
  isFirstStep,
  isLastStep,
} from './onboardingConfig'

// ============================================================================
// Mock Data for Demo Screens
// ============================================================================

export {
  // Types
  type DemoProducerPost,
  type DemoConsumerPost,
  type DemoLocation,
  // Avatar presets
  AVATAR_PRESET_READER,
  AVATAR_PRESET_PROFESSIONAL,
  AVATAR_PRESET_CURLY,
  AVATAR_PRESET_COZY,
  AVATAR_PRESET_MUSIC,
  AVATAR_PRESET_VINTAGE,
  AVATAR_PRESET_FRIENDLY,
  AVATAR_PRESET_RELAXED,
  AVATAR_PRESETS,
  // Location data
  DEMO_LOCATIONS,
  // Producer demo data
  PRODUCER_DEMO_POST,
  PRODUCER_DEMO_POSTS_ALT,
  // Consumer demo data
  CONSUMER_DEMO_POSTS,
  CONSUMER_DEMO_POSTS_EXTENDED,
  // Message collections
  DEMO_MESSAGES,
  // Helper functions
  getRandomAvatarPreset,
  getRandomDemoLocation,
  getRandomMessage,
  formatTimeAgo,
  createMockConsumerPost,
  createMockProducerPost,
} from './mockData'
