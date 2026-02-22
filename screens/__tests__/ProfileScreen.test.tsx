/**
 * ProfileScreen Tests
 *
 * Simplified tests for ProfileScreen component using JSDOM environment.
 * Tests focus on rendering and basic functionality.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../__tests__/utils/render-with-providers'
import { createMockProfile } from '../../__tests__/utils/factories'
import { ProfileScreen } from '../ProfileScreen'

// ============================================================================
// MOCKS
// ============================================================================

// Mock navigation
const mockNavigate = vi.fn()
const mockGoBack = vi.fn()

vi.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    replace: vi.fn(),
    reset: vi.fn(),
    setOptions: vi.fn(),
    addListener: vi.fn(() => () => {}),
  }),
  useRoute: () => ({ params: {} }),
  useFocusEffect: vi.fn(),
  useIsFocused: () => true,
  NavigationContainer: ({ children }: { children: React.ReactNode }) => children,
  createNavigationContainerRef: () => ({ current: null }),
}))

// Mock useAchievements hook
const mockUseAchievements = vi.fn()
vi.mock('../../hooks/useAchievements', () => ({
  useAchievements: () => mockUseAchievements(),
}))

// Mock useTrustLevel hook
const mockUseTrustLevel = vi.fn()
vi.mock('../../hooks/useTrustLevel', () => ({
  useTrustLevel: () => mockUseTrustLevel(),
}))

// Mock expo-linear-gradient
vi.mock('expo-linear-gradient', () => ({
  LinearGradient: vi.fn(() => null),
}))

// Mock ProfilePhotoGallery
vi.mock('../../components/ProfilePhotoGallery', () => ({
  ProfilePhotoGallery: vi.fn(() => null),
}))

// Mock AchievementBadge
vi.mock('../../components/AchievementBadge', () => ({
  AchievementBadge: vi.fn(() => null),
}))

// Mock TrustProgress
vi.mock('../../components/TrustProgress', () => ({
  TrustProgress: vi.fn(() => null),
}))

// Mock FloatingActionButtons
vi.mock('../../components/navigation/FloatingActionButtons', () => ({
  FloatingActionButtons: vi.fn(() => null),
}))

// Mock VerifiedBadge
vi.mock('../../components/VerifiedBadge', () => ({
  VerifiedBadge: vi.fn(() => null),
}))

// Mock VerificationPrompt
vi.mock('../../components/VerificationPrompt', () => ({
  VerificationPrompt: vi.fn(() => null),
}))

// Mock ToastContext
vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock LoadingSpinner
vi.mock('../../components/LoadingSpinner', () => ({
  LoadingSpinner: vi.fn(() => null),
}))

// Mock haptics
vi.mock('../../lib/haptics', () => ({
  successFeedback: vi.fn(),
  errorFeedback: vi.fn(),
}))

// ============================================================================
// HELPERS
// ============================================================================

const createMockUser = (profile: ReturnType<typeof createMockProfile>) => ({
  id: profile.id,
  email: 'test@example.com',
  aud: 'authenticated',
  role: 'authenticated',
  email_confirmed_at: new Date().toISOString(),
  phone: null,
  confirmed_at: new Date().toISOString(),
  last_sign_in_at: new Date().toISOString(),
  app_metadata: {},
  user_metadata: {},
  identities: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
})

// ============================================================================
// TESTS
// ============================================================================

describe('ProfileScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementations
    mockUseAchievements.mockReturnValue({
      earnedAchievements: [],
      totalCount: 10,
      earnedCount: 0,
      loading: false,
      leaderboard: [],
      leaderboardLoading: false,
      currentStreak: 0,
      loadLeaderboard: vi.fn().mockResolvedValue(undefined),
    })

    mockUseTrustLevel.mockReturnValue({
      trustLevel: 1,
      trustPoints: 0,
    })
  })

  // ---------------------------------------------------------------------------
  // RENDERING TESTS
  // ---------------------------------------------------------------------------

  it('renders without crashing with authenticated user', () => {
    const profile = createMockProfile({ display_name: 'John Doe' })

    const { container } = renderWithProviders(<ProfileScreen />, {
      authContext: {
        profile,
        user: createMockUser(profile),
        isLoading: false,
      },
    })

    expect(container).toBeTruthy()
  })

  it('renders without crashing in loading state', () => {
    const { container } = renderWithProviders(<ProfileScreen />, {
      authContext: {
        isLoading: true,
        isAuthenticated: false,
        user: null,
        profile: null,
      },
    })

    expect(container).toBeTruthy()
  })

  // ---------------------------------------------------------------------------
  // USER INFORMATION DISPLAY
  // ---------------------------------------------------------------------------

  it('displays user display name', () => {
    const profile = createMockProfile({ display_name: 'Jane Smith' })

    renderWithProviders(<ProfileScreen />, {
      authContext: {
        profile,
        user: createMockUser(profile),
      },
    })

    expect(screen.getByText('Jane Smith')).toBeTruthy()
  })

  it('displays "Not set" when display name is null', () => {
    const profile = createMockProfile({ display_name: null })

    renderWithProviders(<ProfileScreen />, {
      authContext: {
        profile,
        user: createMockUser(profile),
      },
    })

    expect(screen.getByText('Not set')).toBeTruthy()
  })

  // ---------------------------------------------------------------------------
  // AVATAR TESTS
  // ---------------------------------------------------------------------------

  it('renders profile with a display name', () => {
    const profile = createMockProfile({ display_name: 'Alice Wonder' })

    const { container } = renderWithProviders(<ProfileScreen />, {
      authContext: {
        profile,
        user: createMockUser(profile),
      },
    })

    expect(container.innerHTML.length).toBeGreaterThan(0)
    expect(screen.getByText('Alice Wonder')).toBeTruthy()
  })

  // ---------------------------------------------------------------------------
  // TRUST LEVEL & ACHIEVEMENTS
  // ---------------------------------------------------------------------------

  it('shows Trust Level section', () => {
    mockUseTrustLevel.mockReturnValue({
      trustLevel: 2,
      trustPoints: 75,
    })

    const profile = createMockProfile()

    renderWithProviders(<ProfileScreen />, {
      authContext: {
        profile,
        user: createMockUser(profile),
      },
    })

    expect(screen.getByText('Trust Level')).toBeTruthy()
  })

  it('shows achievements section', () => {
    mockUseAchievements.mockReturnValue({
      earnedAchievements: [
        {
          id: 'achievement-1',
          name: 'First Visit',
          description: 'Visit your first location',
          icon: 'trophy',
          earned: true,
        },
      ],
      totalCount: 10,
      earnedCount: 1,
      loading: false,
      leaderboard: [],
      leaderboardLoading: false,
      currentStreak: 0,
      loadLeaderboard: vi.fn().mockResolvedValue(undefined),
    })

    const profile = createMockProfile()

    renderWithProviders(<ProfileScreen />, {
      authContext: {
        profile,
        user: createMockUser(profile),
      },
    })

    expect(screen.getByText('Achievements')).toBeTruthy()
    expect(screen.getByText('1/10 Earned')).toBeTruthy()
  })

  it('shows empty state when no achievements earned', () => {
    mockUseAchievements.mockReturnValue({
      earnedAchievements: [],
      totalCount: 10,
      earnedCount: 0,
      loading: false,
      leaderboard: [],
      leaderboardLoading: false,
      currentStreak: 0,
      loadLeaderboard: vi.fn().mockResolvedValue(undefined),
    })

    const profile = createMockProfile()

    renderWithProviders(<ProfileScreen />, {
      authContext: {
        profile,
        user: createMockUser(profile),
      },
    })

    expect(screen.getByText('No achievements yet')).toBeTruthy()
  })

  // ---------------------------------------------------------------------------
  // AUTH CONTEXT TESTS
  // ---------------------------------------------------------------------------

  it('accepts custom updateProfile function from context', () => {
    const mockUpdateProfile = vi.fn().mockResolvedValue({ error: null })
    const profile = createMockProfile()

    renderWithProviders(<ProfileScreen />, {
      authContext: {
        profile,
        user: createMockUser(profile),
        updateProfile: mockUpdateProfile,
      },
    })

    expect(mockUpdateProfile).not.toHaveBeenCalled()
  })
})
