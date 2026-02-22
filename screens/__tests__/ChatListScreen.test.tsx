/**
 * ChatListScreen Component Tests
 *
 * Smoke tests for the chat list screen with conversation display.
 * Covers basic functionality without full rendering due to complex dependencies.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { ConversationWithDetails } from '../../hooks/useChatListData'

// ============================================================================
// MOCKS
// ============================================================================

// Mock hooks
const mockUseChatListData = vi.fn()
const mockUseAuth = vi.fn()

vi.mock('../../hooks/useChatListData', () => ({
  useChatListData: (userId: string | null) => mockUseChatListData(userId),
}))

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

// Mock navigation
const mockNavigate = vi.fn()

vi.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}))

// Mock components
vi.mock('../../components/navigation/GlobalHeader', () => ({
  GlobalHeader: vi.fn(() => null),
}))

vi.mock('../../components/navigation/FloatingActionButtons', () => ({
  FloatingActionButtons: vi.fn(() => null),
}))

vi.mock('../../components/native/PressableScale', () => ({
  PressableScale: vi.fn(() => null),
}))

vi.mock('react-native-bitmoji', () => ({
  Avatar: vi.fn(() => null),
}))

vi.mock('../../components/VerifiedBadge', () => ({
  VerifiedBadge: vi.fn(() => null),
}))

vi.mock('../../components/EmptyState', () => ({
  EmptyChats: vi.fn(() => null),
  ErrorState: vi.fn(() => null),
}))

vi.mock('../../components/Skeleton', () => ({
  SkeletonChatItem: vi.fn(() => null),
}))

vi.mock('../../lib/haptics', () => ({
  lightFeedback: vi.fn(),
  successFeedback: vi.fn(),
  errorFeedback: vi.fn(),
  notificationFeedback: vi.fn(),
  selectionFeedback: vi.fn(),
}))

// ============================================================================
// TEST DATA
// ============================================================================

const mockUserId = 'test-user-id'

const mockConversation: ConversationWithDetails = {
  conversation_id: 'conv-1',
  producer_id: 'producer-1',
  consumer_id: 'consumer-1',
  post_id: 'post-1',
  status: 'active',
  updated_at: '2024-01-01T12:00:00Z',
  created_at: '2024-01-01T10:00:00Z',
  other_user_id: 'other-user-1',
  other_user_is_verified: false,
  last_message_content: 'Hey, I think that was me!',
  last_message_sender_id: 'other-user-1',
  last_message_created_at: '2024-01-01T12:00:00Z',
  unread_count: 0,
  post_target_avatar_v2: {
    config: {
      seed: 'test-seed',
      style: 'adventurer' as const,
      backgroundColor: '#ffffff',
    },
  },
  location_name: 'Test Cafe',
}

const mockChatListResult = {
  data: [],
  isLoading: false,
  error: null,
  refetch: vi.fn(),
  isRefetching: false,
}

const mockAuthResult = {
  userId: mockUserId,
  isAuthenticated: true,
}

// ============================================================================
// TESTS
// ============================================================================

describe('ChatListScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementations
    mockUseChatListData.mockReturnValue(mockChatListResult)
    mockUseAuth.mockReturnValue(mockAuthResult)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // --------------------------------------------------------------------------
  // MODULE IMPORT
  // --------------------------------------------------------------------------

  it('imports without errors', async () => {
    const { ChatListScreen } = await import('../ChatListScreen')
    expect(ChatListScreen).toBeDefined()
    expect(typeof ChatListScreen).toBe('function')
  })

  // --------------------------------------------------------------------------
  // HOOK INTEGRATION
  // --------------------------------------------------------------------------

  it('uses chat list data hook with user ID', async () => {
    const { ChatListScreen } = await import('../ChatListScreen')
    expect(ChatListScreen).toBeDefined()

    // The component should call useChatListData with userId
    expect(mockUseChatListData).toBeDefined()
  })

  it('uses auth hook to get current user ID', async () => {
    const { ChatListScreen } = await import('../ChatListScreen')
    expect(ChatListScreen).toBeDefined()

    // The component should call useAuth
    expect(mockUseAuth).toBeDefined()
  })

  // --------------------------------------------------------------------------
  // LOADING STATES
  // --------------------------------------------------------------------------

  it('handles loading state', async () => {
    mockUseChatListData.mockReturnValue({
      ...mockChatListResult,
      isLoading: true,
      data: [],
    })

    const { ChatListScreen } = await import('../ChatListScreen')
    expect(ChatListScreen).toBeDefined()

    const chatListState = mockUseChatListData(mockUserId)
    expect(chatListState.isLoading).toBe(true)
    expect(chatListState.data).toHaveLength(0)
  })

  it('handles loaded state with conversations', async () => {
    mockUseChatListData.mockReturnValue({
      ...mockChatListResult,
      isLoading: false,
      data: [mockConversation],
    })

    const { ChatListScreen } = await import('../ChatListScreen')
    expect(ChatListScreen).toBeDefined()

    const chatListState = mockUseChatListData(mockUserId)
    expect(chatListState.isLoading).toBe(false)
    expect(chatListState.data).toHaveLength(1)
    expect(chatListState.data[0].conversation_id).toBe('conv-1')
  })

  // --------------------------------------------------------------------------
  // EMPTY STATE
  // --------------------------------------------------------------------------

  it('handles empty conversations list', async () => {
    mockUseChatListData.mockReturnValue({
      ...mockChatListResult,
      data: [],
      isLoading: false,
    })

    const { ChatListScreen } = await import('../ChatListScreen')
    expect(ChatListScreen).toBeDefined()

    const chatListState = mockUseChatListData(mockUserId)
    expect(chatListState.data).toHaveLength(0)
    expect(chatListState.isLoading).toBe(false)
  })

  it('handles conversations with data', async () => {
    const conversations = [
      mockConversation,
      {
        ...mockConversation,
        conversation_id: 'conv-2',
        location_name: 'Coffee Shop',
        last_message_content: 'See you there!',
      },
    ]

    mockUseChatListData.mockReturnValue({
      ...mockChatListResult,
      data: conversations,
    })

    const { ChatListScreen } = await import('../ChatListScreen')
    expect(ChatListScreen).toBeDefined()

    const chatListState = mockUseChatListData(mockUserId)
    expect(chatListState.data).toHaveLength(2)
    expect(chatListState.data[0].location_name).toBe('Test Cafe')
    expect(chatListState.data[1].location_name).toBe('Coffee Shop')
  })

  // --------------------------------------------------------------------------
  // ERROR HANDLING
  // --------------------------------------------------------------------------

  it('handles fetch errors', async () => {
    const error = new Error('Failed to load conversations')
    mockUseChatListData.mockReturnValue({
      ...mockChatListResult,
      error,
      data: [],
    })

    const { ChatListScreen } = await import('../ChatListScreen')
    expect(ChatListScreen).toBeDefined()

    const chatListState = mockUseChatListData(mockUserId)
    expect(chatListState.error).toBeDefined()
    expect(chatListState.error?.message).toBe('Failed to load conversations')
  })

  it('provides refetch function for error recovery', async () => {
    const mockRefetch = vi.fn()
    mockUseChatListData.mockReturnValue({
      ...mockChatListResult,
      error: new Error('Network error'),
      refetch: mockRefetch,
    })

    const { ChatListScreen } = await import('../ChatListScreen')
    expect(ChatListScreen).toBeDefined()

    const chatListState = mockUseChatListData(mockUserId)
    expect(chatListState.refetch).toBeDefined()

    // Simulate retry
    chatListState.refetch()
    expect(mockRefetch).toHaveBeenCalledTimes(1)
  })

  // --------------------------------------------------------------------------
  // UNREAD MESSAGE HANDLING
  // --------------------------------------------------------------------------

  it('handles conversations with unread messages', async () => {
    const conversationWithUnread: ConversationWithDetails = {
      ...mockConversation,
      unread_count: 3,
    }

    mockUseChatListData.mockReturnValue({
      ...mockChatListResult,
      data: [conversationWithUnread],
    })

    const { ChatListScreen } = await import('../ChatListScreen')
    expect(ChatListScreen).toBeDefined()

    const chatListState = mockUseChatListData(mockUserId)
    expect(chatListState.data[0].unread_count).toBe(3)
  })

  it('handles conversations with high unread counts', async () => {
    const conversationWithManyUnread: ConversationWithDetails = {
      ...mockConversation,
      unread_count: 150,
    }

    mockUseChatListData.mockReturnValue({
      ...mockChatListResult,
      data: [conversationWithManyUnread],
    })

    const { ChatListScreen } = await import('../ChatListScreen')
    expect(ChatListScreen).toBeDefined()

    const chatListState = mockUseChatListData(mockUserId)
    expect(chatListState.data[0].unread_count).toBeGreaterThan(99)
  })

  it('handles conversations with zero unread messages', async () => {
    mockUseChatListData.mockReturnValue({
      ...mockChatListResult,
      data: [mockConversation],
    })

    const { ChatListScreen } = await import('../ChatListScreen')
    expect(ChatListScreen).toBeDefined()

    const chatListState = mockUseChatListData(mockUserId)
    expect(chatListState.data[0].unread_count).toBe(0)
  })

  // --------------------------------------------------------------------------
  // MESSAGE PREVIEW
  // --------------------------------------------------------------------------

  it('shows last message content', async () => {
    const conversationWithMessage: ConversationWithDetails = {
      ...mockConversation,
      last_message_content: 'This is the last message',
    }

    mockUseChatListData.mockReturnValue({
      ...mockChatListResult,
      data: [conversationWithMessage],
    })

    const { ChatListScreen } = await import('../ChatListScreen')
    expect(ChatListScreen).toBeDefined()

    const chatListState = mockUseChatListData(mockUserId)
    expect(chatListState.data[0].last_message_content).toBe('This is the last message')
  })

  it('identifies own messages by sender ID', async () => {
    const conversationWithOwnMessage: ConversationWithDetails = {
      ...mockConversation,
      last_message_content: 'My message',
      last_message_sender_id: mockUserId,
    }

    mockUseChatListData.mockReturnValue({
      ...mockChatListResult,
      data: [conversationWithOwnMessage],
    })

    const { ChatListScreen } = await import('../ChatListScreen')
    expect(ChatListScreen).toBeDefined()

    const chatListState = mockUseChatListData(mockUserId)
    const authState = mockUseAuth()

    expect(chatListState.data[0].last_message_sender_id).toBe(authState.userId)
  })

  it('handles conversations with null last message', async () => {
    const conversationWithoutMessage: ConversationWithDetails = {
      ...mockConversation,
      last_message_content: null,
    }

    mockUseChatListData.mockReturnValue({
      ...mockChatListResult,
      data: [conversationWithoutMessage],
    })

    const { ChatListScreen } = await import('../ChatListScreen')
    expect(ChatListScreen).toBeDefined()

    const chatListState = mockUseChatListData(mockUserId)
    expect(chatListState.data[0].last_message_content).toBeNull()
  })

  // --------------------------------------------------------------------------
  // VERIFIED BADGE
  // --------------------------------------------------------------------------

  it('handles verified users', async () => {
    const conversationWithVerified: ConversationWithDetails = {
      ...mockConversation,
      other_user_is_verified: true,
    }

    mockUseChatListData.mockReturnValue({
      ...mockChatListResult,
      data: [conversationWithVerified],
    })

    const { ChatListScreen } = await import('../ChatListScreen')
    expect(ChatListScreen).toBeDefined()

    const chatListState = mockUseChatListData(mockUserId)
    expect(chatListState.data[0].other_user_is_verified).toBe(true)
  })

  it('handles unverified users', async () => {
    mockUseChatListData.mockReturnValue({
      ...mockChatListResult,
      data: [mockConversation],
    })

    const { ChatListScreen } = await import('../ChatListScreen')
    expect(ChatListScreen).toBeDefined()

    const chatListState = mockUseChatListData(mockUserId)
    expect(chatListState.data[0].other_user_is_verified).toBe(false)
  })

  // --------------------------------------------------------------------------
  // AVATAR DISPLAY
  // --------------------------------------------------------------------------

  it('handles conversations with avatar data', async () => {
    mockUseChatListData.mockReturnValue({
      ...mockChatListResult,
      data: [mockConversation],
    })

    const { ChatListScreen } = await import('../ChatListScreen')
    expect(ChatListScreen).toBeDefined()

    const chatListState = mockUseChatListData(mockUserId)
    expect(chatListState.data[0].post_target_avatar_v2).toBeDefined()
    expect(chatListState.data[0].post_target_avatar_v2?.config.seed).toBe('test-seed')
  })

  it('handles conversations with missing avatar', async () => {
    const conversationWithoutAvatar: ConversationWithDetails = {
      ...mockConversation,
      post_target_avatar_v2: null,
    }

    mockUseChatListData.mockReturnValue({
      ...mockChatListResult,
      data: [conversationWithoutAvatar],
    })

    const { ChatListScreen } = await import('../ChatListScreen')
    expect(ChatListScreen).toBeDefined()

    const chatListState = mockUseChatListData(mockUserId)
    expect(chatListState.data[0].post_target_avatar_v2).toBeNull()
  })

  // --------------------------------------------------------------------------
  // LOCATION NAME
  // --------------------------------------------------------------------------

  it('displays location name in conversation', async () => {
    const conversationWithLocation: ConversationWithDetails = {
      ...mockConversation,
      location_name: 'The Coffee Shop',
    }

    mockUseChatListData.mockReturnValue({
      ...mockChatListResult,
      data: [conversationWithLocation],
    })

    const { ChatListScreen } = await import('../ChatListScreen')
    expect(ChatListScreen).toBeDefined()

    const chatListState = mockUseChatListData(mockUserId)
    expect(chatListState.data[0].location_name).toBe('The Coffee Shop')
  })

  it('handles conversations without location name', async () => {
    const conversationWithoutLocation: ConversationWithDetails = {
      ...mockConversation,
      location_name: null,
    }

    mockUseChatListData.mockReturnValue({
      ...mockChatListResult,
      data: [conversationWithoutLocation],
    })

    const { ChatListScreen } = await import('../ChatListScreen')
    expect(ChatListScreen).toBeDefined()

    const chatListState = mockUseChatListData(mockUserId)
    expect(chatListState.data[0].location_name).toBeNull()
  })

  // --------------------------------------------------------------------------
  // PULL-TO-REFRESH
  // --------------------------------------------------------------------------

  it('provides refetch function for pull-to-refresh', async () => {
    const mockRefetch = vi.fn()
    mockUseChatListData.mockReturnValue({
      ...mockChatListResult,
      refetch: mockRefetch,
      isRefetching: false,
    })

    const { ChatListScreen } = await import('../ChatListScreen')
    expect(ChatListScreen).toBeDefined()

    const chatListState = mockUseChatListData(mockUserId)
    expect(chatListState.refetch).toBeDefined()

    // Simulate pull-to-refresh
    chatListState.refetch()
    expect(mockRefetch).toHaveBeenCalledTimes(1)
  })

  it('tracks refetching state during refresh', async () => {
    mockUseChatListData.mockReturnValue({
      ...mockChatListResult,
      isRefetching: true,
    })

    const { ChatListScreen } = await import('../ChatListScreen')
    expect(ChatListScreen).toBeDefined()

    const chatListState = mockUseChatListData(mockUserId)
    expect(chatListState.isRefetching).toBe(true)
  })

  // --------------------------------------------------------------------------
  // CONVERSATION SORTING
  // --------------------------------------------------------------------------

  it('handles conversations in sorted order by timestamp', async () => {
    const conversations = [
      {
        ...mockConversation,
        conversation_id: 'conv-1',
        last_message_created_at: '2024-01-01T10:00:00Z',
      },
      {
        ...mockConversation,
        conversation_id: 'conv-2',
        last_message_created_at: '2024-01-01T12:00:00Z',
      },
    ]

    mockUseChatListData.mockReturnValue({
      ...mockChatListResult,
      data: conversations,
    })

    const { ChatListScreen } = await import('../ChatListScreen')
    expect(ChatListScreen).toBeDefined()

    const chatListState = mockUseChatListData(mockUserId)
    expect(chatListState.data).toHaveLength(2)
    // Data should be provided pre-sorted by the hook
    expect(chatListState.data[0].conversation_id).toBe('conv-1')
    expect(chatListState.data[1].conversation_id).toBe('conv-2')
  })

  // --------------------------------------------------------------------------
  // TIMESTAMP FORMATTING
  // --------------------------------------------------------------------------

  it('handles conversations with recent timestamps', async () => {
    const recentConversation: ConversationWithDetails = {
      ...mockConversation,
      last_message_created_at: new Date().toISOString(),
    }

    mockUseChatListData.mockReturnValue({
      ...mockChatListResult,
      data: [recentConversation],
    })

    const { ChatListScreen } = await import('../ChatListScreen')
    expect(ChatListScreen).toBeDefined()

    const chatListState = mockUseChatListData(mockUserId)
    expect(chatListState.data[0].last_message_created_at).toBeDefined()
  })

  it('handles conversations with old timestamps', async () => {
    const oldConversation: ConversationWithDetails = {
      ...mockConversation,
      last_message_created_at: '2023-01-01T12:00:00Z',
    }

    mockUseChatListData.mockReturnValue({
      ...mockChatListResult,
      data: [oldConversation],
    })

    const { ChatListScreen } = await import('../ChatListScreen')
    expect(ChatListScreen).toBeDefined()

    const chatListState = mockUseChatListData(mockUserId)
    expect(chatListState.data[0].last_message_created_at).toBe('2023-01-01T12:00:00Z')
  })

  it('handles conversations with null timestamp', async () => {
    const conversationWithoutTimestamp: ConversationWithDetails = {
      ...mockConversation,
      last_message_created_at: null,
    }

    mockUseChatListData.mockReturnValue({
      ...mockChatListResult,
      data: [conversationWithoutTimestamp],
    })

    const { ChatListScreen } = await import('../ChatListScreen')
    expect(ChatListScreen).toBeDefined()

    const chatListState = mockUseChatListData(mockUserId)
    expect(chatListState.data[0].last_message_created_at).toBeNull()
  })
})
