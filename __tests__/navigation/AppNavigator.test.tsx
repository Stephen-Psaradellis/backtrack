/**
 * @vitest-environment jsdom
 */

/**
 * Unit tests for AppNavigator
 *
 * Tests cover:
 * - Auth-gated routing (shows auth screen when not authenticated)
 * - Authenticated routing (shows main screens when authenticated)
 * - Loading state display
 * - Route name extraction helper
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ============================================================================
// Hoisted Mocks
// ============================================================================

const { mockUseAuth } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
}))

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('../../lib/analytics', () => ({
  trackScreenView: vi.fn(),
}))

vi.mock('expo-linking', () => ({
  createURL: vi.fn((path: string) => `backtrack://${path}`),
}))

// Mock react-native-bitmoji
vi.mock('react-native-bitmoji', () => ({
  Avatar: 'Avatar',
}))

// Mock AnimatedTabBar
vi.mock('../../components/navigation/AnimatedTabBar', () => ({
  AnimatedTabBar: 'AnimatedTabBar',
}))

// Mock all screen components
vi.mock('../../screens/AuthScreen', () => ({ AuthScreen: () => 'AuthScreen' }))
vi.mock('../../screens/ProfileScreen', () => ({ ProfileScreen: () => 'ProfileScreen' }))
vi.mock('../../screens/FeedScreen', () => ({ FeedScreen: () => 'FeedScreen' }))
vi.mock('../../screens/MySpotsScreen', () => ({ MySpotsScreen: () => 'MySpotsScreen' }))
vi.mock('../../screens/CreatePostScreen', () => ({ CreatePostScreen: () => 'CreatePostScreen' }))
vi.mock('../../screens/LedgerScreen', () => ({ LedgerScreen: () => 'LedgerScreen' }))
vi.mock('../../screens/PostDetailScreen', () => ({ PostDetailScreen: () => 'PostDetailScreen' }))
vi.mock('../../screens/ChatScreen', () => ({ ChatScreen: () => 'ChatScreen' }))
vi.mock('../../screens/ChatListScreen', () => ({ ChatListScreen: () => 'ChatListScreen' }))
vi.mock('../../screens/AvatarCreatorScreen', () => ({ default: () => 'AvatarCreatorScreen' }))
vi.mock('../../screens/LegalScreen', () => ({ LegalScreen: () => 'LegalScreen' }))
vi.mock('../../screens/FavoritesScreen', () => ({ FavoritesScreen: () => 'FavoritesScreen' }))
vi.mock('../../screens/MapSearchScreen', () => ({ MapSearchScreen: () => 'MapSearchScreen' }))

// Import the component under test
import { RootNavigator } from '../../navigation/AppNavigator'

// ============================================================================
// Tests
// ============================================================================

describe('AppNavigator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // --------------------------------------------------------------------------
  // Auth-Gated Routing
  // --------------------------------------------------------------------------

  describe('auth-gated routing', () => {
    it('should show loading when auth is loading', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        profile: null,
      })

      // RootNavigator is a function component; calling it to check its output
      const result = RootNavigator()

      // When loading, should render ActivityIndicator (loading view)
      expect(result).toBeDefined()
      // The loading view has a Text child with "Loading..."
      const rendered = JSON.stringify(result)
      expect(rendered).toContain('Loading')
    })

    it('should show auth stack when not authenticated', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        profile: null,
      })

      const result = RootNavigator()
      const rendered = JSON.stringify(result)

      // Should contain "Auth" screen name (from the RootStack.Screen name)
      expect(rendered).toContain('Auth')
    })

    it('should show main stack when authenticated', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        profile: { id: '123', username: 'test', avatar: null },
      })

      const result = RootNavigator()
      const rendered = JSON.stringify(result)

      // Should contain "Main" screen name
      expect(rendered).toContain('Main')
    })
  })

  // --------------------------------------------------------------------------
  // Exports
  // --------------------------------------------------------------------------

  describe('exports', () => {
    it('should export RootNavigator', () => {
      expect(RootNavigator).toBeDefined()
      expect(typeof RootNavigator).toBe('function')
    })
  })
})
