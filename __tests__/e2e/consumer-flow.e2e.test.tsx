/**
 * End-to-End Test: Complete Consumer Flow
 *
 * Tests the complete Consumer flow from browsing to chat:
 * 1. Consumer creates own avatar in profile
 * 2. Consumer browses location on map
 * 3. Consumer views ledger for that location
 * 4. Consumer sees match indicator on matching posts
 * 5. Consumer initiates chat with post creator
 * 6. Producer receives message notification
 * 7. Both users can exchange messages
 *
 * This is an integration test that verifies all components work together.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react-native'
import { NavigationContainer } from '@react-navigation/native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { Alert } from 'react-native'

// Import components
import { AuthProvider } from '../../contexts/AuthContext'
import { ProfileScreen } from '../../screens/ProfileScreen'
import { HomeScreen } from '../../screens/HomeScreen'
import { LedgerScreen } from '../../screens/LedgerScreen'
import { PostDetailScreen } from '../../screens/PostDetailScreen'
import { ChatScreen } from '../../screens/ChatScreen'

// Import mocks
import {
  mockSupabase,
  mockAuth,
  mockUser,
  mockSession,
  mockProfile,
  mockLocation,
  mockPost,
  resetSupabaseMocks,
  createMockQueryBuilder,
  mockChannel,
} from '../mocks/supabase'

// Note: Old avatar types removed - using plain objects for mock data

// ============================================================================
// MOCK SETUP
// ============================================================================

// Mock the Supabase client
vi.mock('../../lib/supabase', () => ({
  supabase: require('../mocks/supabase').mockSupabase,
  supabaseUrl: 'https://mock.supabase.co',
}))

// Mock storage module
vi.mock('../../lib/storage', () => ({
  uploadSelfie: vi.fn().mockResolvedValue({
    success: true,
    path: 'mock-user-id/mock-post-id.jpg',
    error: null,
  }),
  getSelfieUrl: vi.fn().mockResolvedValue({
    success: true,
    signedUrl: 'https://example.com/signed-selfie.jpg',
    error: null,
  }),
  deleteSelfie: vi.fn().mockResolvedValue({
    success: true,
    error: null,
  }),
}))

// Mock moderation module
vi.mock('../../lib/moderation', () => ({
  getHiddenUserIds: vi.fn().mockResolvedValue({
    success: true,
    hiddenUserIds: [],
  }),
  blockUser: vi.fn().mockResolvedValue({
    success: true,
    error: null,
  }),
  submitReport: vi.fn().mockResolvedValue({
    success: true,
    error: null,
  }),
  MODERATION_ERRORS: {
    BLOCK_FAILED: 'Failed to block user',
  },
}))

// Mock conversations module
vi.mock('../../lib/conversations', () => ({
  startConversation: vi.fn().mockResolvedValue({
    success: true,
    conversationId: 'mock-conversation-id',
    isNew: true,
  }),
  getConversation: vi.fn().mockResolvedValue({
    success: true,
    conversation: {
      id: 'mock-conversation-id',
      post_id: 'test-post-123',
      producer_id: 'producer-user-123',
      consumer_id: 'test-user-123',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  }),
  getUserRole: vi.fn().mockReturnValue('consumer'),
  isConversationParticipant: vi.fn().mockReturnValue(true),
  getOtherUserId: vi.fn().mockReturnValue('producer-user-123'),
  CONVERSATION_ERRORS: {
    NOT_FOUND: 'Conversation not found',
    UNAUTHORIZED: 'Unauthorized',
    INACTIVE: 'Conversation is inactive',
  },
}))

// Mock matching module
vi.mock('../../lib/matching', () => ({
  compareAvatars: vi.fn().mockReturnValue({
    score: 75,
    isMatch: true,
    matchedAttributes: ['skinColor', 'topType', 'hairColor'],
    unmatchedAttributes: ['clotheType'],
  }),
  calculateBatchMatches: vi.fn().mockReturnValue([
    {
      postId: 'test-post-123',
      score: 75,
      isMatch: true,
    },
  ]),
  isValidForMatching: vi.fn().mockReturnValue(true),
  getMatchSummary: vi.fn().mockReturnValue({
    matchCount: 3,
    total: 4,
    percentage: 75,
  }),
  getPrimaryMatchCount: vi.fn().mockReturnValue({
    matchCount: 3,
    total: 4,
  }),
  DEFAULT_MATCH_THRESHOLD: 50,
}))

// Mock navigation
const mockNavigate = vi.fn()
const mockGoBack = vi.fn()
const mockReplace = vi.fn()
const mockSetOptions = vi.fn()

vi.mock('@react-navigation/native', async () => {
  const actualNav = await vi.importActual('@react-navigation/native')
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      replace: mockReplace,
      reset: vi.fn(),
      setOptions: mockSetOptions,
    }),
    useRoute: vi.fn(() => ({
      params: {
        locationId: 'test-location-123',
        locationName: 'Coffee Shop on Main St',
        postId: 'test-post-123',
        conversationId: 'mock-conversation-id',
      },
    })),
    useFocusEffect: vi.fn((callback) => {
      React.useEffect(() => {
        callback()
      }, [callback])
    }),
  }
})

// Mock expo-location
vi.mock('../../hooks/useLocation', () => ({
  useLocation: () => ({
    latitude: 37.7749,
    longitude: -122.4194,
    loading: false,
    error: null,
    permissionStatus: 'granted',
    refresh: vi.fn(),
    requestPermission: vi.fn().mockResolvedValue(true),
    startWatching: vi.fn(),
    stopWatching: vi.fn(),
    isWatching: false,
    timestamp: Date.now(),
    accuracy: 10,
    altitude: null,
    heading: null,
    speed: null,
    checkLocationServices: vi.fn(),
  }),
  calculateDistance: vi.fn().mockReturnValue(100),
  isWithinRadius: vi.fn().mockReturnValue(true),
  formatCoordinates: vi.fn().mockReturnValue('37.7749, -122.4194'),
}))

// Mock MapView component
vi.mock('../../components/MapView', () => ({
  MapView: vi.fn(({ testID, children, onMapReady, onMapPress }) => {
    const { View, TouchableOpacity, Text } = require('react-native')
    React.useEffect(() => {
      if (onMapReady) onMapReady()
    }, [onMapReady])
    return (
      <View testID={testID}>
        <TouchableOpacity
          testID="mock-map-tap"
          onPress={() => onMapPress?.({ latitude: 37.7749, longitude: -122.4194 })}
        >
          <Text>Map</Text>
        </TouchableOpacity>
        {children}
      </View>
    )
  }),
  createRegion: vi.fn(),
  createMarker: vi.fn(),
  getCenterCoordinates: vi.fn(),
  getRegionForCoordinates: vi.fn(),
}))

// Mock Alert
vi.spyOn(Alert, 'alert')

// ============================================================================
// MOCK DATA
// ============================================================================

/**
 * Mock consumer user (different from mockUser in mocks/supabase)
 */
const mockConsumerUser = {
  ...mockUser,
  id: 'consumer-user-123',
  email: 'consumer@example.com',
}

/**
 * Mock consumer session
 */
const mockConsumerSession = {
  ...mockSession,
  user: mockConsumerUser,
}

/**
 * Mock consumer profile with avatar
 */
const mockConsumerProfile = {
  ...mockProfile,
  id: mockConsumerUser.id,
  display_name: 'Consumer User',
  own_avatar: null,
  rpm_avatar_id: 'mock-rpm-avatar-123',
}

/**
 * Mock producer profile
 */
const mockProducerProfile = {
  id: 'producer-user-123',
  display_name: 'Producer User',
  own_avatar: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

/**
 * Mock post with matching target avatar
 */
const mockMatchingPost = {
  ...mockPost,
  producer_id: 'producer-user-123',
  target_avatar: {
    skinColor: 'Light',
    topType: 'ShortHairShortFlat',
    hairColor: 'Brown',
    accessoriesType: 'Blank',
    facialHairType: 'Blank',
    facialHairColor: 'Brown',
    clotheType: 'BlazerShirt',
    clotheColor: 'Blue03',
    eyeType: 'Default',
    eyebrowType: 'Default',
    mouthType: 'Smile',
  } as unknown as Record<string, unknown>,
  note: 'I saw you at the coffee shop today!',
}

/**
 * Mock conversation between producer and consumer
 */
const mockConversation = {
  id: 'mock-conversation-id',
  post_id: mockMatchingPost.id,
  producer_id: 'producer-user-123',
  consumer_id: mockConsumerUser.id,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

/**
 * Mock messages in conversation
 */
const mockMessages = [
  {
    id: 'message-1',
    conversation_id: mockConversation.id,
    sender_id: mockConsumerUser.id,
    content: 'Hi! I think I saw you at the coffee shop!',
    is_read: false,
    created_at: new Date(Date.now() - 60000).toISOString(),
  },
  {
    id: 'message-2',
    conversation_id: mockConversation.id,
    sender_id: 'producer-user-123',
    content: 'Yes! I remember seeing you there!',
    is_read: false,
    created_at: new Date().toISOString(),
  },
]

// ============================================================================
// TEST WRAPPER
// ============================================================================

/**
 * Wrapper component that provides all necessary context for testing
 */
interface TestWrapperProps {
  children: React.ReactNode
}

function TestWrapper({ children }: TestWrapperProps): React.ReactNode {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 375, height: 812 },
          insets: { top: 44, left: 0, right: 0, bottom: 34 },
        }}
      >
        <NavigationContainer>
          <AuthProvider>
            {children}
          </AuthProvider>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

// ============================================================================
// TEST SUITE: CONSUMER FLOW
// ============================================================================

describe('E2E: Complete Consumer Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetSupabaseMocks()

    // Configure auth as consumer user signed in
    mockAuth.getSession.mockResolvedValue({
      data: { session: mockConsumerSession },
      error: null,
    })
    mockAuth.onAuthStateChange.mockImplementation((callback) => {
      callback('SIGNED_IN', mockConsumerSession)
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // --------------------------------------------------------------------------
  // STEP 1: CONSUMER CREATES OWN AVATAR IN PROFILE
  // --------------------------------------------------------------------------

  describe('Step 1: Consumer Creates Own Avatar', () => {
    beforeEach(() => {
      // Mock profile without avatar initially
      const profileWithoutAvatar = { ...mockConsumerProfile, own_avatar: null }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            ...createMockQueryBuilder([profileWithoutAvatar]),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: profileWithoutAvatar,
              error: null,
            }),
            update: vi.fn().mockReturnThis(),
          }
        }
        return createMockQueryBuilder([])
      })
    })

    it('should display ProfileScreen with empty avatar section', async () => {
      render(
        <TestWrapper>
          <ProfileScreen />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('profile-screen')).toBeTruthy()
      })

      // Verify avatar empty state is shown
      await waitFor(() => {
        expect(screen.getByTestId('profile-avatar-empty')).toBeTruthy()
      })

      expect(screen.getByTestId('profile-create-avatar-button')).toBeTruthy()
    })

    it('should open avatar builder modal when Create Avatar is pressed', async () => {
      render(
        <TestWrapper>
          <ProfileScreen />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('profile-screen')).toBeTruthy()
      })

      await waitFor(() => {
        expect(screen.getByTestId('profile-create-avatar-button')).toBeTruthy()
      })

      // Press Create Avatar button
      fireEvent.press(screen.getByTestId('profile-create-avatar-button'))

      // Verify modal opens
      await waitFor(() => {
        expect(screen.getByTestId('profile-avatar-modal')).toBeTruthy()
      })
    })

    it('should display avatar preview after creation', async () => {
      // Mock profile with avatar after save
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            ...createMockQueryBuilder([mockConsumerProfile]),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: mockConsumerProfile,
              error: null,
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: mockConsumerProfile,
                error: null,
              }),
            }),
          }
        }
        return createMockQueryBuilder([])
      })

      render(
        <TestWrapper>
          <ProfileScreen />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('profile-screen')).toBeTruthy()
      })

      // Avatar preview should be shown when profile has avatar
      await waitFor(() => {
        expect(screen.getByTestId('profile-avatar-preview')).toBeTruthy()
      })

      expect(screen.getByTestId('profile-edit-avatar-button')).toBeTruthy()
    })
  })

  // --------------------------------------------------------------------------
  // STEP 2: CONSUMER BROWSES LOCATION ON MAP
  // --------------------------------------------------------------------------

  describe('Step 2: Consumer Browses Location on Map', () => {
    beforeEach(() => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            ...createMockQueryBuilder([mockConsumerProfile]),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: mockConsumerProfile,
              error: null,
            }),
          }
        }
        if (table === 'locations') {
          return {
            ...createMockQueryBuilder([mockLocation]),
            select: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
          }
        }
        return createMockQueryBuilder([])
      })
    })

    it('should display HomeScreen with map', async () => {
      render(
        <TestWrapper>
          <HomeScreen />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('home-screen')).toBeTruthy()
      })

      expect(screen.getByTestId('home-map')).toBeTruthy()
    })

    it('should load nearby locations on map load', async () => {
      render(
        <TestWrapper>
          <HomeScreen />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('home-map')).toBeTruthy()
      })

      // Trigger map ready
      fireEvent.press(screen.getByTestId('mock-map-tap'))

      // Verify locations are fetched
      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('locations')
      })
    })

    it('should display location pins on map', async () => {
      render(
        <TestWrapper>
          <HomeScreen />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('home-map')).toBeTruthy()
      })

      // Verify location pin is rendered
      await waitFor(() => {
        expect(screen.getByTestId('location-pin-test-location-123')).toBeTruthy()
      })
    })

    it('should navigate to LedgerScreen when location is tapped', async () => {
      render(
        <TestWrapper>
          <HomeScreen />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('location-pin-test-location-123')).toBeTruthy()
      })

      fireEvent.press(screen.getByTestId('location-pin-test-location-123'))

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('Ledger', {
          locationId: 'test-location-123',
          locationName: mockLocation.name,
        })
      })
    })
  })

  // --------------------------------------------------------------------------
  // STEP 3: CONSUMER VIEWS LEDGER FOR LOCATION
  // --------------------------------------------------------------------------

  describe('Step 3: Consumer Views Ledger for Location', () => {
    beforeEach(() => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            ...createMockQueryBuilder([mockConsumerProfile]),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: mockConsumerProfile,
              error: null,
            }),
          }
        }
        if (table === 'posts') {
          return {
            ...createMockQueryBuilder([mockMatchingPost]),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: vi.fn().mockImplementation((resolve) => {
              resolve({ data: [mockMatchingPost], error: null })
            }),
          }
        }
        return createMockQueryBuilder([])
      })
    })

    it('should display LedgerScreen with posts for location', async () => {
      render(
        <TestWrapper>
          <LedgerScreen />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('ledger-screen')).toBeTruthy()
      })

      // Verify location name is displayed
      expect(screen.getByTestId('ledger-location-name')).toBeTruthy()
    })

    it('should load posts for selected location', async () => {
      render(
        <TestWrapper>
          <LedgerScreen />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('ledger-screen')).toBeTruthy()
      })

      // Verify posts are fetched
      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('posts')
      })
    })

    it('should display post cards in list', async () => {
      render(
        <TestWrapper>
          <LedgerScreen />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('post-card-test-post-123')).toBeTruthy()
      })

      // Verify post content is shown
      expect(screen.getByText(mockMatchingPost.note)).toBeTruthy()
    })

    it('should navigate to PostDetailScreen when post is tapped', async () => {
      render(
        <TestWrapper>
          <LedgerScreen />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('post-card-test-post-123')).toBeTruthy()
      })

      fireEvent.press(screen.getByTestId('post-card-test-post-123'))

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('PostDetail', {
          postId: 'test-post-123',
        })
      })
    })
  })

  // --------------------------------------------------------------------------
  // STEP 4: CONSUMER SEES MATCH INDICATOR ON MATCHING POSTS
  // --------------------------------------------------------------------------

  describe('Step 4: Consumer Sees Match Indicator', () => {
    beforeEach(() => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            ...createMockQueryBuilder([mockConsumerProfile]),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: mockConsumerProfile,
              error: null,
            }),
          }
        }
        if (table === 'posts') {
          return {
            ...createMockQueryBuilder([mockMatchingPost]),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: vi.fn().mockImplementation((resolve) => {
              resolve({ data: [mockMatchingPost], error: null })
            }),
          }
        }
        return createMockQueryBuilder([])
      })
    })

    it('should display match indicator badge on matching post', async () => {
      render(
        <TestWrapper>
          <LedgerScreen />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('post-match-badge-test-post-123')).toBeTruthy()
      })

      // Verify match percentage is shown
      expect(screen.getByText('75%')).toBeTruthy()
    })

    it('should show match details on badge tap', async () => {
      render(
        <TestWrapper>
          <LedgerScreen />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('post-match-badge-test-post-123')).toBeTruthy()
      })

      fireEvent.press(screen.getByTestId('post-match-badge-test-post-123'))

      // Verify match details modal opens
      await waitFor(() => {
        expect(screen.getByTestId('match-details-modal')).toBeTruthy()
      })

      // Verify matched and unmatched attributes are shown
      expect(screen.getByText('Matched Attributes')).toBeTruthy()
      expect(screen.getByText('Unmatched Attributes')).toBeTruthy()
    })

    it('should not show match indicator for non-matching posts', async () => {
      const nonMatchingPost = {
        ...mockPost,
        producer_id: 'producer-user-456',
        target_avatar: {
          skinColor: 'Dark',
          topType: 'LongHairBigHair',
          hairColor: 'Blonde',
        } as unknown as Record<string, unknown>,
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            ...createMockQueryBuilder([mockConsumerProfile]),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: mockConsumerProfile,
              error: null,
            }),
          }
        }
        if (table === 'posts') {
          return {
            ...createMockQueryBuilder([nonMatchingPost]),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: vi.fn().mockImplementation((resolve) => {
              resolve({ data: [nonMatchingPost], error: null })
            }),
          }
        }
        return createMockQueryBuilder([])
      })

      render(
        <TestWrapper>
          <LedgerScreen />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.queryByTestId('post-match-badge-test-post-456')).toBeFalsy()
      })
    })
  })

  // --------------------------------------------------------------------------
  // STEP 5: CONSUMER INITIATES CHAT WITH POST CREATOR
  // --------------------------------------------------------------------------

  describe('Step 5: Consumer Initiates Chat', () => {
    beforeEach(() => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            ...createMockQueryBuilder([mockConsumerProfile]),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: mockConsumerProfile,
              error: null,
            }),
          }
        }
        if (table === 'posts') {
          return {
            ...createMockQueryBuilder([mockMatchingPost]),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: mockMatchingPost,
              error: null,
            }),
          }
        }
        if (table === 'conversations') {
          return {
            ...createMockQueryBuilder([mockConversation]),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: mockConversation,
              error: null,
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockConversation,
                  error: null,
                }),
              }),
            }),
          }
        }
        return createMockQueryBuilder([])
      })
    })

    it('should display PostDetailScreen with chat button', async () => {
      render(
        <TestWrapper>
          <PostDetailScreen />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('post-detail-screen')).toBeTruthy()
      })

      // Verify message button is shown
      expect(screen.getByTestId('post-detail-message-button')).toBeTruthy()
    })

    it('should display producer profile on post detail', async () => {
      render(
        <TestWrapper>
          <PostDetailScreen />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('post-detail-screen')).toBeTruthy()
      })

      // Verify producer name is shown
      expect(screen.getByText(mockProducerProfile.display_name)).toBeTruthy()
    })

    it('should create or fetch conversation when message button is pressed', async () => {
      render(
        <TestWrapper>
          <PostDetailScreen />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('post-detail-message-button')).toBeTruthy()
      })

      fireEvent.press(screen.getByTestId('post-detail-message-button'))

      // Verify conversation is created/fetched
      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('conversations')
      })
    })

    it('should navigate to ChatScreen after creating conversation', async () => {
      render(
        <TestWrapper>
          <PostDetailScreen />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('post-detail-message-button')).toBeTruthy()
      })

      fireEvent.press(screen.getByTestId('post-detail-message-button'))

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('Chat', {
          conversationId: 'mock-conversation-id',
        })
      })
    })
  })

  // --------------------------------------------------------------------------
  // STEP 6: PRODUCER RECEIVES MESSAGE NOTIFICATION
  // --------------------------------------------------------------------------

  describe('Step 6: Producer Receives Notification', () => {
    it('should subscribe to conversation messages', async () => {
      const mockSubscribe = vi.fn()
      mockChannel.on.mockReturnValue({
        subscribe: mockSubscribe,
      })

      render(
        <TestWrapper>
          <ChatScreen />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('chat-screen')).toBeTruthy()
      })

      // Verify subscription is set up
      expect(mockChannel.on).toHaveBeenCalled()
    })

    it('should display received messages in real-time', async () => {
      mockChannel.on.mockImplementation(
        (event: string, callback: (payload: unknown) => void) => {
          if (event === 'postgres_changes') {
            setTimeout(() => {
              callback({
                new: {
                  ...mockMessages[1],
                  is_read: false,
                },
              })
            }, 100)
          }
          return {
            subscribe: vi.fn(),
          }
        }
      )

      render(
        <TestWrapper>
          <ChatScreen />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(mockMessages[1].content)).toBeTruthy()
      })
    })
  })

  // --------------------------------------------------------------------------
  // STEP 7: BOTH USERS CAN EXCHANGE MESSAGES
  // --------------------------------------------------------------------------

  describe('Step 7: Users Exchange Messages', () => {
    beforeEach(() => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'conversations') {
          return {
            ...createMockQueryBuilder([mockConversation]),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: mockConversation,
              error: null,
            }),
          }
        }
        if (table === 'messages') {
          return {
            ...createMockQueryBuilder(mockMessages),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    ...mockMessages[0],
                    created_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
          }
        }
        return createMockQueryBuilder([])
      })
    })

    it('should display ChatScreen with message list', async () => {
      render(
        <TestWrapper>
          <ChatScreen />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('chat-screen')).toBeTruthy()
      })

      // Verify messages are displayed
      expect(screen.getByText(mockMessages[0].content)).toBeTruthy()
      expect(screen.getByText(mockMessages[1].content)).toBeTruthy()
    })

    it('should have message input field', async () => {
      render(
        <TestWrapper>
          <ChatScreen />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('chat-message-input')).toBeTruthy()
      })

      expect(screen.getByTestId('chat-send-button')).toBeTruthy()
    })

    it('should send message when send button is pressed', async () => {
      render(
        <TestWrapper>
          <ChatScreen />
        </TestWrapper>
      )

      await waitFor(() =>{
        expect(screen.getByTestId('chat-message-input')).toBeTruthy()
      })

      const input = screen.getByTestId('chat-message-input')
      fireEvent.changeText(input, 'Hello, producer!')
      fireEvent.press(screen.getByTestId('chat-send-button'))

      // Verify message is inserted
      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('messages')
      })
    })

    it('should display sent message in chat', async () => {
      render(
        <TestWrapper>
          <ChatScreen />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('chat-message-input')).toBeTruthy()
      })

      const input = screen.getByTestId('chat-message-input')
      fireEvent.changeText(input, 'Hello, producer!')
      fireEvent.press(screen.getByTestId('chat-send-button'))

      // Verify sent message is shown
      await waitFor(() => {
        expect(screen.getByText('Hello, producer!')).toBeTruthy()
      })

      // Verify input is cleared
      expect(input.props.value).toBe('')
    })

    it('should display producer message in chat', async () => {
      render(
        <TestWrapper>
          <ChatScreen />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(mockMessages[1].content)).toBeTruthy()
      })

      // Verify producer message is shown with different styling
      const producerMessage = screen.getByTestId('message-producer-user-123')
      expect(producerMessage).toBeTruthy()
      expect(producerMessage.props.testID).toContain('producer-user-123')
    })

    it('should mark messages as read', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'messages') {
          return {
            ...createMockQueryBuilder(mockMessages),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  {
                    ...mockMessages[1],
                    is_read: true,
                  },
                ],
                error: null,
              }),
            }),
          }
        }
        return createMockQueryBuilder([])
      })

      render(
        <TestWrapper>
          <ChatScreen />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('chat-screen')).toBeTruthy()
      })

      // Verify mark as read is called
      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('messages')
      })
    })
  })
})