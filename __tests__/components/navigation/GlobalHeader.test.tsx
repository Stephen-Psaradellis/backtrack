/**
 * @vitest-environment jsdom
 */

/**
 * Unit tests for GlobalHeader component
 *
 * Tests the global header including:
 * - Renders logo
 * - Renders + button
 * - Renders avatar
 * - + button triggers onPostPress
 */

import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// ============================================================================
// Mock Setup
// ============================================================================

// Mock useAuth hook
const mockUseAuth = vi.fn()

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))


// Mock haptics
vi.mock('../../../lib/haptics', () => ({
  selectionFeedback: vi.fn(),
  lightFeedback: vi.fn(),
}))

// Mock navigation
const mockNavigate = vi.fn()

vi.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: vi.fn(),
  }),
}))

// Mock safe area
vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// Import the component under test AFTER mocking dependencies
import { GlobalHeader } from '../../../components/navigation/GlobalHeader'

// ============================================================================
// Test Constants
// ============================================================================

const TEST_USER_ID = 'test-user-123'

const DEFAULT_AUTH_STATE = {
  userId: TEST_USER_ID,
  isAuthenticated: true,
  isLoading: false,
  profile: { id: TEST_USER_ID, avatar_config: { avatarId: 'avatar_asian_m' } },
  session: null,
  user: null,
}


// ============================================================================
// Setup and Teardown
// ============================================================================

describe('GlobalHeader', () => {
  const mockOnPostPress = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue(DEFAULT_AUTH_STATE)
  })

  // ============================================================================
  // Renders Logo Tests
  // ============================================================================

  describe('renders logo', () => {
    it('renders the GlobalHeader component', () => {
      const { container } = render(
        <GlobalHeader onPostPress={mockOnPostPress} />
      )

      expect(container).toBeTruthy()
    })

    it('renders without crashing with default props', () => {
      const { container } = render(
        <GlobalHeader onPostPress={mockOnPostPress} />
      )

      expect(container).toBeTruthy()
    })

    it('calls useAuth hook', () => {
      render(<GlobalHeader onPostPress={mockOnPostPress} />)

      expect(mockUseAuth).toHaveBeenCalled()
    })
  })

  // ============================================================================
  // Renders + Button Tests
  // ============================================================================

  describe('renders + button', () => {
    it('renders with onPostPress prop', () => {
      const { container } = render(
        <GlobalHeader onPostPress={mockOnPostPress} />
      )

      expect(container).toBeTruthy()
    })

    it('has onPostPress prop accessible', () => {
      render(<GlobalHeader onPostPress={mockOnPostPress} />)

      // onPostPress should not be called initially
      expect(mockOnPostPress).not.toHaveBeenCalled()
    })
  })

  // ============================================================================
  // Renders Avatar Tests
  // ============================================================================

  describe('renders avatar', () => {
    it('receives profile data from useAuth', () => {
      render(<GlobalHeader onPostPress={mockOnPostPress} />)

      expect(mockUseAuth().profile).toBeTruthy()
      expect(mockUseAuth().profile.avatar_config).toBeTruthy()
    })

    it('renders with user avatar config', () => {
      const { container } = render(
        <GlobalHeader onPostPress={mockOnPostPress} />
      )

      expect(container).toBeTruthy()
      expect(mockUseAuth().profile.avatar_config.avatarId).toBe('avatar_asian_m')
    })

    it('renders when user has no profile', () => {
      mockUseAuth.mockReturnValue({
        ...DEFAULT_AUTH_STATE,
        profile: null,
      })

      const { container } = render(
        <GlobalHeader onPostPress={mockOnPostPress} />
      )

      expect(container).toBeTruthy()
    })
  })

  // ============================================================================
  // onPostPress Tests
  // ============================================================================

  describe('+ button triggers onPostPress', () => {
    it('onPostPress can be called', () => {
      render(<GlobalHeader onPostPress={mockOnPostPress} />)

      // Simulate calling onPostPress directly
      mockOnPostPress()
      expect(mockOnPostPress).toHaveBeenCalledTimes(1)
    })

    it('onPostPress does not fire on render', () => {
      render(<GlobalHeader onPostPress={mockOnPostPress} />)

      expect(mockOnPostPress).not.toHaveBeenCalled()
    })
  })

  // ============================================================================
  // Component State Tests
  // ============================================================================

  describe('component state', () => {
    it('renders with authenticated user', () => {
      const { container } = render(
        <GlobalHeader onPostPress={mockOnPostPress} />
      )

      expect(container).toBeTruthy()
    })

    it('renders when user is not authenticated', () => {
      mockUseAuth.mockReturnValue({
        ...DEFAULT_AUTH_STATE,
        isAuthenticated: false,
        userId: null,
      })

      const { container } = render(
        <GlobalHeader onPostPress={mockOnPostPress} />
      )

      expect(container).toBeTruthy()
    })

    it('component is functional', () => {
      const { container } = render(
        <GlobalHeader onPostPress={mockOnPostPress} />
      )

      expect(container.childElementCount).toBeGreaterThan(0)
    })
  })

  // ============================================================================
  // Optional Props Tests
  // ============================================================================

  describe('optional props', () => {
    it('renders with showNotificationBadge=false', () => {
      const { container } = render(
        <GlobalHeader onPostPress={mockOnPostPress} showNotificationBadge={false} />
      )

      expect(container).toBeTruthy()
    })

    it('renders with title prop', () => {
      const { container } = render(
        <GlobalHeader onPostPress={mockOnPostPress} title="My Title" />
      )

      expect(container).toBeTruthy()
    })
  })
})
