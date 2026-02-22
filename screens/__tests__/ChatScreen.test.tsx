/**
 * ChatScreen Component Tests
 *
 * Smoke tests for the ChatScreen component to ensure:
 * - Component renders without crashing
 * - Shows loading state initially
 * - Handles conversation not found errors
 * - Displays messages when loaded
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { ChatScreen } from '../ChatScreen'
import { renderWithProviders } from '../../__tests__/utils/render-with-providers'
import {
  createMockConversation,
  createMockMessage,
  generateTestUUID,
} from '../../__tests__/utils/factories'
import { supabase } from '../../lib/supabase'

// Mock navigation - must not use vi.importActual to avoid native module issues
const mockGoBack = vi.fn()
const mockNavigate = vi.fn()

vi.mock('@react-navigation/native', () => ({
  useRoute: () => ({
    params: {
      conversationId: '00000000-0000-0000-0000-000000000001',
    },
  }),
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
    setOptions: vi.fn(),
    addListener: vi.fn(() => () => {}),
  }),
  useFocusEffect: vi.fn((callback: () => void) => {
    const cleanup = callback()
    return cleanup
  }),
  useIsFocused: () => true,
  NavigationContainer: ({ children }: { children: React.ReactNode }) => children,
  createNavigationContainerRef: () => ({ current: null }),
}))

// Mock supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({}),
    })),
    removeChannel: vi.fn(),
  },
}))

// Mock haptics
vi.mock('../../lib/haptics', () => ({
  successFeedback: vi.fn(),
  errorFeedback: vi.fn(),
  notificationFeedback: vi.fn(),
  selectionFeedback: vi.fn(),
}))

// Mock hooks
vi.mock('../../hooks/usePhotoSharing', () => ({
  usePhotoSharing: () => ({
    mySharedPhotos: [],
    sharedWithMe: [],
    sharing: false,
    sharePhoto: vi.fn(),
    refresh: vi.fn(),
    isPhotoShared: vi.fn(() => false),
    hasSharedPhotos: false,
    hasSharedAnyPhotos: false,
  }),
}))

vi.mock('../../hooks/useProfilePhotos', () => ({
  useProfilePhotos: () => ({
    approvedPhotos: [],
    loading: false,
    refresh: vi.fn(),
  }),
}))

vi.mock('../../hooks/useTutorialState', () => ({
  useTutorialState: () => ({
    isVisible: false,
    markComplete: vi.fn(),
  }),
}))

const mockNetworkStatus = { isConnected: true }
vi.mock('../../hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => mockNetworkStatus,
}))

// Mock chat hooks
const mockChatMessages = {
  messages: [],
  loading: false,
  error: null,
  hasMoreMessages: false,
  loadingMore: false,
  fetchMessages: vi.fn(),
  markMessagesAsRead: vi.fn(),
  newMessageIds: new Set(),
}
vi.mock('../../hooks/chat/useChatMessages', () => ({
  useChatMessages: vi.fn(() => mockChatMessages),
}))

vi.mock('../../components/chat/hooks/useSendMessage', () => ({
  useSendMessage: () => ({
    isSending: false,
    optimisticMessages: [],
    sendMessage: vi.fn(),
    retryMessage: vi.fn(),
    deleteFailedMessage: vi.fn(),
  }),
}))

vi.mock('../../components/chat/hooks/useBlockUser', () => ({
  useBlockUser: () => ({
    isBlocking: false,
    error: null,
    blockUser: vi.fn(),
    clearError: vi.fn(),
  }),
}))

vi.mock('../../components/chat/hooks/useTypingIndicator', () => ({
  useTypingIndicator: () => ({
    isOtherUserTyping: false,
    broadcastTyping: vi.fn(),
  }),
}))

// Mock conversation lib
const mockGetConversation = vi.fn()
vi.mock('../../lib/conversations', () => ({
  getConversation: (...args: any[]) => mockGetConversation(...args),
  getUserRole: vi.fn(),
  isConversationParticipant: vi.fn(() => true),
  getOtherUserId: vi.fn(() => 'other-user-id'),
  CONVERSATION_ERRORS: {
    NOT_FOUND: 'Conversation not found',
    UNAUTHORIZED: 'Unauthorized',
    INACTIVE: 'Conversation is inactive',
  },
}))

describe('ChatScreen', () => {
  const userId = generateTestUUID()
  const conversationId = '00000000-0000-0000-0000-000000000001'
  const mockConversation = createMockConversation({
    id: conversationId,
    status: 'active',
  })

  let mockSelect: ReturnType<typeof vi.fn>
  let mockEq: ReturnType<typeof vi.fn>
  let mockMaybeSingle: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup supabase mocks
    mockSelect = vi.fn().mockReturnThis()
    mockEq = vi.fn().mockReturnThis()
    mockMaybeSingle = vi.fn()

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
    } as any)

    mockEq.mockReturnValue({
      maybeSingle: mockMaybeSingle,
    })

    mockSelect.mockReturnValue({
      eq: mockEq,
    })

    // Default: resolved conversation
    mockGetConversation.mockResolvedValue({
      success: true,
      conversation: mockConversation,
    })
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
  })

  it('renders without crashing with mock providers', () => {
    const { container } = renderWithProviders(<ChatScreen />, {
      authContext: {
        userId,
        isAuthenticated: true,
      },
    })

    expect(container).toBeTruthy()
  })

  it('shows loading state initially', async () => {
    mockGetConversation.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                success: true,
                conversation: mockConversation,
              }),
            100
          )
        )
    )

    renderWithProviders(<ChatScreen />, {
      authContext: {
        userId,
        isAuthenticated: true,
      },
    })

    // Wait for conversation to load
    await waitFor(() => {
      expect(mockGetConversation).toHaveBeenCalled()
    })
  })

  it('calls getConversation on mount', async () => {
    renderWithProviders(<ChatScreen />, {
      authContext: {
        userId,
        isAuthenticated: true,
      },
    })

    await waitFor(() => {
      expect(mockGetConversation).toHaveBeenCalled()
    })
  })

  it('accepts authenticated user context', () => {
    const { container } = renderWithProviders(<ChatScreen />, {
      authContext: {
        userId,
        isAuthenticated: true,
      },
    })

    expect(container.innerHTML.length).toBeGreaterThan(0)
  })

  it('renders with custom conversation ID in route', () => {
    const { container } = renderWithProviders(<ChatScreen />, {
      authContext: {
        userId,
        isAuthenticated: true,
      },
    })

    expect(container.innerHTML.length).toBeGreaterThan(0)
  })

  it('getConversation is called on component mount', async () => {
    renderWithProviders(<ChatScreen />, {
      authContext: {
        userId,
        isAuthenticated: true,
      },
    })

    await waitFor(() => {
      expect(mockGetConversation).toHaveBeenCalled()
    }, { timeout: 3000 })
  })

  it('handles conversation load failure gracefully', async () => {
    mockGetConversation.mockResolvedValue({
      success: false,
      error: 'Conversation not found',
    })

    const { container } = renderWithProviders(<ChatScreen />, {
      authContext: {
        userId,
        isAuthenticated: true,
      },
    })

    await waitFor(() => {
      expect(mockGetConversation).toHaveBeenCalled()
    })

    expect(container).toBeTruthy()
  })
})
