/**
 * FavoritesScreen Tests
 *
 * Tests for FavoritesScreen component covering:
 * - Rendering without crashing
 * - Integration with hooks
 * - Navigation behavior
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react-native'
import { renderWithProviders } from '../../__tests__/utils/render-with-providers'
import { createMockProfile, createMockFavoriteLocation } from '../../__tests__/utils/factories'
import { FavoritesScreen } from '../FavoritesScreen'

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
  useFocusEffect: (callback: () => void) => {
    const cleanup = callback()
    return cleanup
  },
  useIsFocused: () => true,
  NavigationContainer: ({ children }: { children: React.ReactNode }) => children,
  createNavigationContainerRef: () => ({ current: null }),
}))

// Mock useLocation hook
const mockUseLocation = vi.fn()
vi.mock('../../hooks/useLocation', () => ({
  useLocation: () => mockUseLocation(),
}))

// Mock useFavoriteLocations hook
const mockUseFavoriteLocations = vi.fn()
vi.mock('../../hooks/useFavoriteLocations', () => ({
  useFavoriteLocations: () => mockUseFavoriteLocations(),
}))

// Mock haptics
vi.mock('../../lib/haptics', () => ({
  selectionFeedback: vi.fn(),
  successFeedback: vi.fn(),
  errorFeedback: vi.fn(),
}))

// Mock FavoritesList component
vi.mock('../../components/favorites/FavoritesList', () => ({
  FavoritesList: vi.fn(() => null),
}))

// Mock AddFavoriteModal component
vi.mock('../../components/favorites/AddFavoriteModal', () => ({
  AddFavoriteModal: vi.fn(() => null),
}))

// ============================================================================
// TESTS
// ============================================================================

describe('FavoritesScreen', () => {
  // ---------------------------------------------------------------------------
  // SETUP
  // ---------------------------------------------------------------------------

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementations
    mockUseLocation.mockReturnValue({
      latitude: 40.7128,
      longitude: -74.006,
      accuracy: 10,
      timestamp: Date.now(),
      isLoading: false,
      error: null,
    })

    mockUseFavoriteLocations.mockReturnValue({
      favorites: [],
      isLoading: false,
      error: null,
      addFavorite: vi.fn().mockResolvedValue({ success: true }),
      removeFavorite: vi.fn().mockResolvedValue({ success: true }),
      updateFavorite: vi.fn().mockResolvedValue({ success: true }),
      refetch: vi.fn(),
    })
  })

  // ---------------------------------------------------------------------------
  // RENDERING TESTS
  // ---------------------------------------------------------------------------

  it('renders without crashing', () => {
    const profile = createMockProfile()

    const { container } = renderWithProviders(<FavoritesScreen />, {
      authContext: {
        profile,
        user: {
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
        },
        isLoading: false,
      },
    })

    // Screen renders successfully
    expect(container).toBeDefined()
  })

  it('calls useFavoriteLocations hook', () => {
    const profile = createMockProfile()

    renderWithProviders(<FavoritesScreen />, {
      authContext: { profile },
    })

    // Hook should be called when component renders
    expect(mockUseFavoriteLocations).toHaveBeenCalled()
  })

  it('renders with favorites data from hook', () => {
    const favorite = createMockFavoriteLocation()
    mockUseFavoriteLocations.mockReturnValue({
      favorites: [favorite],
      isLoading: false,
      error: null,
      addFavorite: vi.fn(),
      removeFavorite: vi.fn(),
      updateFavorite: vi.fn(),
      refetch: vi.fn(),
    })

    const profile = createMockProfile()
    const { container } = renderWithProviders(<FavoritesScreen />, {
      authContext: { profile },
    })

    // Component renders successfully with favorites data
    expect(container).toBeDefined()
    expect(mockUseFavoriteLocations).toHaveBeenCalled()
  })

  it('renders with loading state from hook', () => {
    mockUseFavoriteLocations.mockReturnValue({
      favorites: [],
      isLoading: true,
      error: null,
      addFavorite: vi.fn(),
      removeFavorite: vi.fn(),
      updateFavorite: vi.fn(),
      refetch: vi.fn(),
    })

    const profile = createMockProfile()
    const { container } = renderWithProviders(<FavoritesScreen />, {
      authContext: { profile },
    })

    // Component renders successfully with loading state
    expect(container).toBeDefined()
    expect(mockUseFavoriteLocations).toHaveBeenCalled()
  })

  it('renders with error from hook', () => {
    mockUseFavoriteLocations.mockReturnValue({
      favorites: [],
      isLoading: false,
      error: { message: 'Test error' },
      addFavorite: vi.fn(),
      removeFavorite: vi.fn(),
      updateFavorite: vi.fn(),
      refetch: vi.fn(),
    })

    const profile = createMockProfile()
    const { container } = renderWithProviders(<FavoritesScreen />, {
      authContext: { profile },
    })

    // Component renders successfully with error state
    expect(container).toBeDefined()
    expect(mockUseFavoriteLocations).toHaveBeenCalled()
  })

  it('renders when location is not available', () => {
    mockUseLocation.mockReturnValue({
      latitude: null,
      longitude: null,
      accuracy: null,
      timestamp: null,
      isLoading: false,
      error: null,
    })

    const profile = createMockProfile()
    const { container } = renderWithProviders(<FavoritesScreen />, {
      authContext: { profile },
    })

    // Component should still render when location is null
    expect(container).toBeDefined()
    expect(mockUseFavoriteLocations).toHaveBeenCalled()
  })

  it('calls refetch on focus', () => {
    const mockRefetch = vi.fn()
    mockUseFavoriteLocations.mockReturnValue({
      favorites: [],
      isLoading: false,
      error: null,
      addFavorite: vi.fn(),
      removeFavorite: vi.fn(),
      updateFavorite: vi.fn(),
      refetch: mockRefetch,
    })

    const profile = createMockProfile()
    renderWithProviders(<FavoritesScreen />, {
      authContext: { profile },
    })

    // useFocusEffect should have called refetch
    expect(mockRefetch).toHaveBeenCalled()
  })
})
