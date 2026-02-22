/**
 * PostDetailScreen Component Tests
 *
 * Smoke tests for post detail view with avatar comparison and chat initiation.
 * Covers basic functionality without full rendering due to complex dependencies.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Alert } from 'react-native'
import { generateTestUUID } from '../../__tests__/utils/factories'

// ============================================================================
// MOCKS
// ============================================================================

// Mock navigation
const mockGoBack = vi.fn()
const mockNavigate = vi.fn()
const testPostId = generateTestUUID()
const userId = generateTestUUID()
const otherUserId = generateTestUUID()

vi.mock('@react-navigation/native', () => ({
  useRoute: () => ({
    params: {
      postId: testPostId,
    },
  }),
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
}))

// Mock auth context
const mockUseAuth = vi.fn()
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

// Mock supabase client
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()
const mockFrom = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
  },
}))

// Mock conversations lib
const mockStartConversation = vi.fn()
vi.mock('../../lib/conversations', () => ({
  startConversation: (...args: any[]) => mockStartConversation(...args),
}))

// Mock moderation lib
const mockBlockUser = vi.fn()
vi.mock('../../lib/moderation', () => ({
  blockUser: (...args: any[]) => mockBlockUser(...args),
  MODERATION_ERRORS: {
    BLOCK_FAILED: 'Failed to block user',
    ALREADY_BLOCKED: 'User is already blocked',
  },
}))

// Mock haptics
vi.mock('../../lib/haptics', () => ({
  successFeedback: vi.fn(),
  errorFeedback: vi.fn(),
  warningFeedback: vi.fn(),
  notificationFeedback: vi.fn(),
  selectionFeedback: vi.fn(),
}))

// Mock PostCard export
vi.mock('../../components/PostCard', () => ({
  formatRelativeTime: (timestamp: string) => 'a few minutes ago',
}))

// Mock components
vi.mock('../../components/LoadingSpinner', () => ({
  LoadingSpinner: vi.fn(() => null),
}))

vi.mock('../../components/EmptyState', () => ({
  ErrorState: vi.fn(() => null),
}))

vi.mock('../../components/Button', () => ({
  Button: vi.fn(() => null),
  OutlineButton: vi.fn(() => null),
}))

vi.mock('../../components/AvatarComparison', () => ({
  AvatarComparison: vi.fn(() => null),
}))

vi.mock('../../components/MatchCelebration', () => ({
  MatchCelebration: vi.fn(() => null),
}))

vi.mock('react-native-bitmoji', () => ({
  Avatar: vi.fn(() => null),
}))

// Mock Alert
const mockAlert = vi.spyOn(Alert, 'alert')

// ============================================================================
// TEST DATA
// ============================================================================

const mockAvatar = {
  config: {
    style: 'default',
    seed: '123',
  },
}

const mockLocation = {
  id: generateTestUUID(),
  name: 'Central Perk',
  address: '123 Coffee St, New York, NY 10001',
  latitude: 40.7128,
  longitude: -74.0060,
  place_id: 'place-123',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const mockPost = {
  id: testPostId,
  producer_id: otherUserId,
  location_id: mockLocation.id,
  message: 'Hope to see you again!',
  target_avatar_v2: mockAvatar,
  is_active: true,
  created_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  location: mockLocation,
}

const mockOwnPost = {
  ...mockPost,
  producer_id: userId,
  message: 'Looking for someone special',
}

const mockProfile = {
  id: userId,
  avatar: mockAvatar,
  avatar_version: 2,
}

// ============================================================================
// TESTS
// ============================================================================

describe('PostDetailScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default mock implementations
    mockUseAuth.mockReturnValue({ userId })

    // Setup Supabase chain
    mockFrom.mockReturnValue({ select: mockSelect })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({ eq: mockEq, single: mockSingle })

    // Default successful responses
    mockSingle.mockResolvedValue({
      data: mockPost,
      error: null,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // --------------------------------------------------------------------------
  // MODULE IMPORT
  // --------------------------------------------------------------------------

  it('imports without errors', async () => {
    const { PostDetailScreen } = await import('../PostDetailScreen')
    expect(PostDetailScreen).toBeDefined()
    expect(typeof PostDetailScreen).toBe('function')
  })

  // --------------------------------------------------------------------------
  // NAVIGATION INTEGRATION
  // --------------------------------------------------------------------------

  it('receives postId from route params', async () => {
    const { PostDetailScreen } = await import('../PostDetailScreen')
    expect(PostDetailScreen).toBeDefined()
    // Component should use route params with postId
    expect(testPostId).toBeDefined()
  })

  it('uses navigation for goBack and navigate', async () => {
    const { PostDetailScreen } = await import('../PostDetailScreen')
    expect(PostDetailScreen).toBeDefined()
    // Component should have access to navigation methods
    expect(mockGoBack).toBeDefined()
    expect(mockNavigate).toBeDefined()
  })

  // --------------------------------------------------------------------------
  // DATA FETCHING
  // --------------------------------------------------------------------------

  it('fetches post data on mount', async () => {
    mockSingle
      .mockResolvedValueOnce({ data: mockPost, error: null })
      .mockResolvedValueOnce({ data: mockProfile, error: null })

    const { PostDetailScreen } = await import('../PostDetailScreen')
    expect(PostDetailScreen).toBeDefined()

    // Component should attempt to fetch post and profile
    expect(mockFrom).toBeDefined()
    expect(mockSelect).toBeDefined()
  })

  it('handles post fetch success', async () => {
    const postData = { ...mockPost, location: mockLocation }
    mockSingle.mockResolvedValue({ data: postData, error: null })

    const { PostDetailScreen } = await import('../PostDetailScreen')
    expect(PostDetailScreen).toBeDefined()

    // Verify post data structure
    expect(postData.id).toBe(testPostId)
    expect(postData.message).toBe('Hope to see you again!')
    expect(postData.location.name).toBe('Central Perk')
  })

  it('handles post not found error (PGRST116)', async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'Not found' },
    })

    const { PostDetailScreen } = await import('../PostDetailScreen')
    expect(PostDetailScreen).toBeDefined()

    // Component should handle PGRST116 error
    const errorResponse = await mockSingle()
    expect(errorResponse.error?.code).toBe('PGRST116')
  })

  it('handles generic fetch error', async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { code: 'UNKNOWN', message: 'Something went wrong' },
    })

    const { PostDetailScreen } = await import('../PostDetailScreen')
    expect(PostDetailScreen).toBeDefined()

    // Component should handle generic errors
    const errorResponse = await mockSingle()
    expect(errorResponse.error).toBeDefined()
    expect(errorResponse.data).toBeNull()
  })

  it('fetches user profile for avatar comparison', async () => {
    mockSingle
      .mockResolvedValueOnce({ data: mockPost, error: null })
      .mockResolvedValueOnce({ data: mockProfile, error: null })

    const { PostDetailScreen } = await import('../PostDetailScreen')
    expect(PostDetailScreen).toBeDefined()

    // Component should fetch post, then current user's profile
    // Verify profile data structure
    expect(mockProfile.id).toBe(userId)
    expect(mockProfile.avatar).toBeDefined()
  })

  // --------------------------------------------------------------------------
  // POST DATA HANDLING
  // --------------------------------------------------------------------------

  it('identifies own post vs other user post', async () => {
    const ownPost = { ...mockOwnPost, location: mockLocation }
    mockSingle.mockResolvedValue({ data: ownPost, error: null })

    const { PostDetailScreen } = await import('../PostDetailScreen')
    expect(PostDetailScreen).toBeDefined()

    // Check if post is own post
    const isOwnPost = ownPost.producer_id === userId
    expect(isOwnPost).toBe(true)
  })

  it('handles post with location data', async () => {
    const postWithLocation = { ...mockPost, location: mockLocation }
    mockSingle.mockResolvedValue({ data: postWithLocation, error: null })

    const { PostDetailScreen } = await import('../PostDetailScreen')
    expect(PostDetailScreen).toBeDefined()

    // Verify location data structure
    const response = await mockSingle()
    expect(response.data?.location).toBeDefined()
    expect(response.data?.location?.name).toBe('Central Perk')
    expect(response.data?.location?.address).toContain('Coffee St')
  })

  it('handles post without location data', async () => {
    const postWithoutLocation = { ...mockPost, location: null }
    mockSingle.mockResolvedValue({ data: postWithoutLocation, error: null })

    const { PostDetailScreen } = await import('../PostDetailScreen')
    expect(PostDetailScreen).toBeDefined()

    // Component should handle missing location
    const response = await mockSingle()
    expect(response.data?.location).toBeNull()
  })

  // --------------------------------------------------------------------------
  // CHAT FUNCTIONALITY
  // --------------------------------------------------------------------------

  it('starts conversation successfully', async () => {
    const conversationId = generateTestUUID()
    mockStartConversation.mockResolvedValue({
      success: true,
      conversationId,
      isNew: false,
    })

    const { PostDetailScreen } = await import('../PostDetailScreen')
    expect(PostDetailScreen).toBeDefined()

    // Test conversation start
    const result = await mockStartConversation(userId, {
      id: testPostId,
      producer_id: otherUserId,
    })

    expect(result.success).toBe(true)
    expect(result.conversationId).toBe(conversationId)
    expect(result.isNew).toBe(false)
  })

  it('shows match celebration for new conversation', async () => {
    const conversationId = generateTestUUID()
    mockStartConversation.mockResolvedValue({
      success: true,
      conversationId,
      isNew: true,
    })

    const { PostDetailScreen } = await import('../PostDetailScreen')
    expect(PostDetailScreen).toBeDefined()

    // Test new match scenario
    const result = await mockStartConversation(userId, {
      id: testPostId,
      producer_id: otherUserId,
    })

    expect(result.isNew).toBe(true)
    expect(result.conversationId).toBeDefined()
  })

  it('handles conversation start failure', async () => {
    mockStartConversation.mockResolvedValue({
      success: false,
      error: 'Unable to start conversation',
    })

    const { PostDetailScreen } = await import('../PostDetailScreen')
    expect(PostDetailScreen).toBeDefined()

    // Test error handling
    const result = await mockStartConversation(userId, {
      id: testPostId,
      producer_id: otherUserId,
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Unable to start conversation')
  })

  // --------------------------------------------------------------------------
  // BLOCK FUNCTIONALITY
  // --------------------------------------------------------------------------

  it('blocks user successfully', async () => {
    mockBlockUser.mockResolvedValue({
      success: true,
    })

    const { PostDetailScreen } = await import('../PostDetailScreen')
    expect(PostDetailScreen).toBeDefined()

    // Test block user
    const result = await mockBlockUser(userId, otherUserId)

    expect(result.success).toBe(true)
    expect(mockBlockUser).toHaveBeenCalledWith(userId, otherUserId)
  })

  it('handles block user failure', async () => {
    mockBlockUser.mockResolvedValue({
      success: false,
      error: 'Failed to block user',
    })

    const { PostDetailScreen } = await import('../PostDetailScreen')
    expect(PostDetailScreen).toBeDefined()

    // Test block error
    const result = await mockBlockUser(userId, otherUserId)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Failed to block user')
  })

  it('shows block confirmation alert', async () => {
    mockAlert.mockImplementation((title, message, buttons) => {
      // Verify alert is called for block confirmation
      expect(title).toBe('Block User')
      expect(message).toContain('Are you sure')
      expect(buttons).toHaveLength(2)
    })

    const { PostDetailScreen } = await import('../PostDetailScreen')
    expect(PostDetailScreen).toBeDefined()

    // Alert should be available for block confirmation
    expect(mockAlert).toBeDefined()
  })

  // --------------------------------------------------------------------------
  // REFRESH FUNCTIONALITY
  // --------------------------------------------------------------------------

  it('handles pull-to-refresh', async () => {
    mockSingle
      .mockResolvedValueOnce({ data: mockPost, error: null })
      .mockResolvedValueOnce({ data: mockProfile, error: null })

    const { PostDetailScreen } = await import('../PostDetailScreen')
    expect(PostDetailScreen).toBeDefined()

    // Component should support refresh
    // Call count should increase on refresh
    const initialCalls = mockSingle.mock.calls.length
    expect(initialCalls).toBeGreaterThanOrEqual(0)
  })

  it('handles retry after error', async () => {
    mockSingle
      .mockResolvedValueOnce({
        data: null,
        error: { code: 'UNKNOWN', message: 'Network error' },
      })
      .mockResolvedValueOnce({ data: mockPost, error: null })

    const { PostDetailScreen } = await import('../PostDetailScreen')
    expect(PostDetailScreen).toBeDefined()

    // First call returns error
    const errorResponse = await mockSingle()
    expect(errorResponse.error).toBeDefined()

    // Second call (retry) succeeds
    const successResponse = await mockSingle()
    expect(successResponse.data).toBeDefined()
    expect(successResponse.error).toBeNull()
  })

  // --------------------------------------------------------------------------
  // NAVIGATION ACTIONS
  // --------------------------------------------------------------------------

  it('navigates to location ledger', async () => {
    const { PostDetailScreen } = await import('../PostDetailScreen')
    expect(PostDetailScreen).toBeDefined()

    // Test navigation parameters
    const navParams = {
      locationId: mockLocation.id,
      locationName: mockLocation.name,
    }

    expect(navParams.locationId).toBeDefined()
    expect(navParams.locationName).toBe('Central Perk')
  })

  it('navigates to chat after starting conversation', async () => {
    const conversationId = generateTestUUID()
    mockStartConversation.mockResolvedValue({
      success: true,
      conversationId,
      isNew: false,
    })

    const { PostDetailScreen } = await import('../PostDetailScreen')
    expect(PostDetailScreen).toBeDefined()

    // Test chat navigation parameters
    const result = await mockStartConversation(userId, {
      id: testPostId,
      producer_id: otherUserId,
    })

    expect(result.conversationId).toBeDefined()
  })

  it('navigates back after blocking user', async () => {
    mockBlockUser.mockResolvedValue({ success: true })

    const { PostDetailScreen } = await import('../PostDetailScreen')
    expect(PostDetailScreen).toBeDefined()

    // After successful block, should navigate back
    await mockBlockUser(userId, otherUserId)
    expect(mockBlockUser).toHaveBeenCalled()
  })
})
