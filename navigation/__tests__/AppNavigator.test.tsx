import React from 'react'
import { render } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks - must be before import
// ---------------------------------------------------------------------------

const mockUseAuth = vi.fn()
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('../../lib/analytics', () => ({
  trackScreenView: vi.fn(),
}))

vi.mock('@sentry/react-native', () => ({
  reactNavigationIntegration: () => ({
    registerNavigationContainer: vi.fn(),
  }),
}))

vi.mock('expo-linking', () => ({
  createURL: (path: string) => `backtrack://${path}`,
}))

// Mock all screen components to simple stubs
vi.mock('../../screens/AuthScreen', () => ({ AuthScreen: () => <div data-testid="auth-screen" /> }))
vi.mock('../../screens/ProfileScreen', () => ({ ProfileScreen: () => <div data-testid="profile-screen" /> }))
vi.mock('../../screens/FeedScreen', () => ({ FeedScreen: () => <div data-testid="feed-screen" /> }))
vi.mock('../../screens/MySpotsScreen', () => ({ MySpotsScreen: () => <div data-testid="myspots-screen" /> }))
vi.mock('../../screens/LedgerScreen', () => ({ LedgerScreen: () => <div data-testid="ledger-screen" /> }))
vi.mock('../../screens/PostDetailScreen', () => ({ PostDetailScreen: () => <div data-testid="post-detail-screen" /> }))
vi.mock('../../screens/ChatScreen', () => ({ ChatScreen: () => <div data-testid="chat-screen" /> }))
vi.mock('../../screens/ChatListScreen', () => ({ ChatListScreen: () => <div data-testid="chatlist-screen" /> }))
vi.mock('../../screens/FavoritesScreen', () => ({ FavoritesScreen: () => <div data-testid="favorites-screen" /> }))
vi.mock('../../screens/MapSearchScreen', () => ({ MapSearchScreen: () => <div data-testid="map-screen" /> }))
vi.mock('../../screens/CreatePostScreen', () => ({ __esModule: true, default: () => <div data-testid="create-post-screen" /> }))
vi.mock('../../screens/AvatarCreatorScreen', () => ({ __esModule: true, default: () => <div data-testid="avatar-creator-screen" /> }))
vi.mock('../../screens/LegalScreen', () => ({ __esModule: true, default: () => <div data-testid="legal-screen" /> }))
vi.mock('../../screens/SettingsScreen', () => ({ __esModule: true, default: () => <div data-testid="settings-screen" /> }))
vi.mock('react-native-bitmoji', () => ({ Avatar: () => <div data-testid="avatar" /> }))
vi.mock('../../components/navigation/AnimatedTabBar', () => ({
  AnimatedTabBar: ({ state }: any) => (
    <div data-testid="tab-bar">
      {state.routes.map((r: any) => (
        <button key={r.key} data-testid={`tab-${r.name}`}>{r.name}</button>
      ))}
    </div>
  ),
}))

// Mock navigation libraries - fully mock to avoid native module resolution
const mockNavigate = vi.fn()

vi.mock('@react-navigation/native', () => {
  const React = require('react')
  return {
    NavigationContainer: ({ children }: any) => React.createElement('div', { 'data-testid': 'nav-container' }, children),
    useNavigation: () => ({ navigate: mockNavigate, goBack: vi.fn() }),
    useRoute: () => ({ params: {} }),
    useFocusEffect: vi.fn(),
    useIsFocused: () => true,
    createNavigationContainerRef: () => ({ current: null }),
  }
})

// Create simple navigator mocks that render their children
vi.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children, screenOptions }: any) => <div data-testid="stack-navigator">{children}</div>,
    Screen: ({ children, component: C, name }: any) => {
      if (children) {
        return <div data-testid={`screen-${name}`}>{typeof children === 'function' ? children({ route: { params: {} }, navigation: { goBack: vi.fn() } }) : children}</div>
      }
      return C ? <div data-testid={`screen-${name}`}><C /></div> : <div data-testid={`screen-${name}`} />
    },
    Group: ({ children }: any) => <div>{children}</div>,
  }),
}))

vi.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({ children, tabBar }: any) => {
      const routes = React.Children.toArray(children).map((child: any, i: number) => ({
        key: child.props.name,
        name: child.props.name,
      }))
      const state = { routes, index: 0 }
      const descriptors = Object.fromEntries(
        routes.map((r: any) => [r.key, { options: {} }])
      )
      return (
        <div data-testid="tabs-navigator">
          {children}
          {tabBar?.({ state, descriptors, navigation: { navigate: mockNavigate } })}
        </div>
      )
    },
    Screen: ({ component: C, name }: any) => C ? <div data-testid={`screen-${name}`}><C /></div> : <div data-testid={`screen-${name}`} />,
  }),
}))

// Import after all mocks
import { AppNavigator } from '../AppNavigator'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const authenticatedAuth = {
  isAuthenticated: true,
  isLoading: false,
  userId: 'user-1',
  profile: {
    avatar: {
      config: { skinTone: 'light', hairStyle: 'short' },
    },
  },
}

const unauthenticatedAuth = {
  isAuthenticated: false,
  isLoading: false,
  userId: null,
  profile: null,
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AppNavigator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading indicator while auth state is resolving', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: true, userId: null, profile: null })
    const { getByText } = render(<AppNavigator />)
    expect(getByText('Loading...')).toBeTruthy()
  })

  it('renders auth screen when user is not authenticated', () => {
    mockUseAuth.mockReturnValue(unauthenticatedAuth)
    const { getByTestId } = render(<AppNavigator />)
    expect(getByTestId('auth-screen')).toBeTruthy()
  })

  it('renders tab bar when user is authenticated with avatar', () => {
    mockUseAuth.mockReturnValue(authenticatedAuth)
    const { getByTestId } = render(<AppNavigator />)
    expect(getByTestId('tab-bar')).toBeTruthy()
  })

  it('displays all 5 tab buttons', () => {
    mockUseAuth.mockReturnValue(authenticatedAuth)
    const { getByTestId } = render(<AppNavigator />)
    expect(getByTestId('tab-FeedTab')).toBeTruthy()
    expect(getByTestId('tab-MySpotsTab')).toBeTruthy()
    expect(getByTestId('tab-MapTab')).toBeTruthy()
    expect(getByTestId('tab-ChatsTab')).toBeTruthy()
    expect(getByTestId('tab-ProfileTab')).toBeTruthy()
  })

  it('forces avatar creation screen when user has no avatar', () => {
    mockUseAuth.mockReturnValue({
      ...authenticatedAuth,
      profile: { avatar: null },
    })
    const { getByTestId } = render(<AppNavigator />)
    // AvatarCreator is lazy-loaded with Suspense, so the screen wrapper should exist
    expect(getByTestId('screen-AvatarCreator')).toBeTruthy()
    // Should NOT show the tab bar since avatar is required first
    expect(() => getByTestId('tab-bar')).toThrow()
  })

  it('shows loading when profile is null (still loading from DB)', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      userId: 'user-1',
      profile: null,
    })
    const { getByText } = render(<AppNavigator />)
    expect(getByText('Loading...')).toBeTruthy()
  })
})
