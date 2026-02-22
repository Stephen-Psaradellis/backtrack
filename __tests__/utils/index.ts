/**
 * Test utilities index
 *
 * Re-exports all test utilities for convenient importing
 *
 * @example
 * ```tsx
 * import { renderWithProviders, mockSupabaseClient } from '@/__tests__/utils'
 * ```
 */

export * from './test-utils'
export * from '../mocks/supabase'

// ============================================================================
// NEW SHARED TEST UTILITIES (QA-006)
// ============================================================================

// Factories
export {
  // UUID utilities
  generateTestUUID,
  resetUUIDCounter,
  getCurrentTimestamp,
  getTimestampOffset,
  // Profile factories
  createMockAvatar,
  createMockProfile,
  // Location factories
  createMockLocation,
  createMockLocationVisit,
  createMockCheckin,
  createMockFavoriteLocation,
  // Post factories
  createMockPost,
  createMockPostResponse,
  // Conversation & Message factories
  createMockConversation,
  createMockMessage,
  // Notification factories
  createMockNotification,
  // Profile Photo factories
  createMockSafeSearchResult,
  createMockProfilePhoto,
  // Block factories
  createMockBlock,
  // Venue Story factories
  createMockVenueStory,
  // Report factories
  createMockReport,
  // Hangout factories
  createMockHangout,
  createMockHangoutAttendee,
} from './factories'

// Supabase Mock
export {
  createMockSupabaseClient,
  type MockSupabaseOptions,
  type MockSupabaseClient,
  type MockQueryBuilder,
  type MockRealtimeChannel,
  type MockStorageBucket,
} from './supabase-mock'

// Auth Mock
export {
  createMockAuthContext,
  createMockUnauthenticatedAuthContext,
  createMockLoadingAuthContext,
  type AuthContextType,
} from './auth-mock'

// Render Utilities
export {
  renderWithProviders,
  renderWithUnauthenticatedUser,
  renderWithLoadingAuth,
} from './render-with-providers'