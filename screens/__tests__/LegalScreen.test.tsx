/**
 * LegalScreen Tests
 *
 * Tests for LegalScreen component covering:
 * - Rendering privacy policy
 * - Rendering terms of service
 * - Back navigation
 * - Contact button functionality
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react-native'
import { Linking } from 'react-native'
import { renderWithProviders } from '../../__tests__/utils/render-with-providers'
import { createMockProfile } from '../../__tests__/utils/factories'
import { LegalScreen } from '../LegalScreen'

// ============================================================================
// MOCKS
// ============================================================================

// Mock navigation
const mockNavigate = vi.fn()
const mockGoBack = vi.fn()

// Mock useRoute to return params
const mockUseRoute = vi.fn()

vi.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    replace: vi.fn(),
    reset: vi.fn(),
    setOptions: vi.fn(),
    addListener: vi.fn(() => () => {}),
  }),
  useRoute: () => mockUseRoute(),
  useFocusEffect: (callback: () => void) => {
    const cleanup = callback()
    return cleanup
  },
  useIsFocused: () => true,
  NavigationContainer: ({ children }: { children: React.ReactNode }) => children,
  createNavigationContainerRef: () => ({ current: null }),
}))

// Mock Linking.openURL
vi.spyOn(Linking, 'openURL').mockResolvedValue(true)

// Mock Ionicons
vi.mock('@expo/vector-icons', () => ({
  Ionicons: vi.fn(() => null),
}))

// ============================================================================
// TESTS
// ============================================================================

describe('LegalScreen', () => {
  // ---------------------------------------------------------------------------
  // SETUP
  // ---------------------------------------------------------------------------

  beforeEach(() => {
    vi.clearAllMocks()

    // Default route params - privacy policy
    mockUseRoute.mockReturnValue({
      params: { type: 'privacy' },
    })
  })

  // ---------------------------------------------------------------------------
  // RENDERING TESTS - PRIVACY POLICY
  // ---------------------------------------------------------------------------

  it('renders without crashing with privacy policy', () => {
    const profile = createMockProfile()

    renderWithProviders(<LegalScreen />, {
      authContext: { profile },
    })

    expect(screen.getByText('Privacy Policy')).toBeDefined()
  })

  it('displays privacy policy content', () => {
    const profile = createMockProfile()

    renderWithProviders(<LegalScreen />, {
      authContext: { profile },
    })

    // Check for key privacy policy sections
    expect(screen.getByText('Privacy Policy for Backtrack')).toBeDefined()
    expect(screen.getByText('Introduction')).toBeDefined()
    expect(screen.getByText('Information We Collect')).toBeDefined()
    expect(screen.getByText('How We Use Your Information')).toBeDefined()
    expect(screen.getByText('Data Sharing')).toBeDefined()
  })

  it('displays privacy contact information', () => {
    const profile = createMockProfile()

    renderWithProviders(<LegalScreen />, {
      authContext: { profile },
    })

    expect(screen.getByText(/privacy@backtrack\.social/)).toBeDefined()
  })

  // ---------------------------------------------------------------------------
  // RENDERING TESTS - TERMS OF SERVICE
  // ---------------------------------------------------------------------------

  it('renders terms of service when type is terms', () => {
    mockUseRoute.mockReturnValue({
      params: { type: 'terms' },
    })

    const profile = createMockProfile()

    renderWithProviders(<LegalScreen />, {
      authContext: { profile },
    })

    expect(screen.getByText('Terms of Service')).toBeDefined()
  })

  it('displays terms of service content', () => {
    mockUseRoute.mockReturnValue({
      params: { type: 'terms' },
    })

    const profile = createMockProfile()

    renderWithProviders(<LegalScreen />, {
      authContext: { profile },
    })

    // Check for key ToS sections
    expect(screen.getByText('Terms of Service for Backtrack')).toBeDefined()
    expect(screen.getByText('Agreement to Terms')).toBeDefined()
    expect(screen.getByText('User Conduct')).toBeDefined()
    expect(screen.getByText('Prohibited Activities')).toBeDefined()
  })

  it('displays legal contact information in terms of service', () => {
    mockUseRoute.mockReturnValue({
      params: { type: 'terms' },
    })

    const profile = createMockProfile()

    renderWithProviders(<LegalScreen />, {
      authContext: { profile },
    })

    expect(screen.getByText(/legal@backtrack\.social/)).toBeDefined()
  })

  // ---------------------------------------------------------------------------
  // NAVIGATION TESTS
  // ---------------------------------------------------------------------------

  it('back button is present', () => {
    const profile = createMockProfile()

    const { container } = renderWithProviders(<LegalScreen />, {
      authContext: { profile },
    })

    // Back button exists in the rendered output
    expect(container.innerHTML).toContain('legal-back-button')
  })

  // ---------------------------------------------------------------------------
  // CONTENT TESTS
  // ---------------------------------------------------------------------------

  it('displays last updated date', () => {
    const profile = createMockProfile()

    renderWithProviders(<LegalScreen />, {
      authContext: { profile },
    })

    const lastUpdated = screen.getAllByText('Last Updated: December 31, 2024')
    expect(lastUpdated.length).toBeGreaterThan(0)
  })

  it('displays contact us button', () => {
    const profile = createMockProfile()

    renderWithProviders(<LegalScreen />, {
      authContext: { profile },
    })

    // "Contact Us" appears twice - once as heading, once as button
    const contactElements = screen.getAllByText('Contact Us')
    expect(contactElements.length).toBeGreaterThan(0)
  })

  it('displays data retention information in privacy policy', () => {
    const profile = createMockProfile()

    renderWithProviders(<LegalScreen />, {
      authContext: { profile },
    })

    expect(screen.getByText('Data Retention')).toBeDefined()
    expect(screen.getByText(/Posts expire after 7 days/)).toBeDefined()
  })

  it('displays children privacy notice in privacy policy', () => {
    const profile = createMockProfile()

    renderWithProviders(<LegalScreen />, {
      authContext: { profile },
    })

    expect(screen.getByText("Children's Privacy")).toBeDefined()
    expect(screen.getByText(/not intended for users under 18/)).toBeDefined()
  })

  it('displays security information in privacy policy', () => {
    const profile = createMockProfile()

    renderWithProviders(<LegalScreen />, {
      authContext: { profile },
    })

    expect(screen.getByText('Security')).toBeDefined()
    expect(screen.getByText(/industry-standard security measures/)).toBeDefined()
  })

  it('displays your rights section in privacy policy', () => {
    const profile = createMockProfile()

    renderWithProviders(<LegalScreen />, {
      authContext: { profile },
    })

    expect(screen.getByText('Your Rights')).toBeDefined()
  })

  it('displays eligibility information in terms of service', () => {
    mockUseRoute.mockReturnValue({
      params: { type: 'terms' },
    })

    const profile = createMockProfile()

    renderWithProviders(<LegalScreen />, {
      authContext: { profile },
    })

    expect(screen.getByText('Eligibility')).toBeDefined()
    expect(screen.getByText(/at least 18 years old/)).toBeDefined()
  })

  it('displays safety guidelines in terms of service', () => {
    mockUseRoute.mockReturnValue({
      params: { type: 'terms' },
    })

    const profile = createMockProfile()

    renderWithProviders(<LegalScreen />, {
      authContext: { profile },
    })

    expect(screen.getByText('Safety')).toBeDefined()
    expect(screen.getByText('Reporting')).toBeDefined()
    expect(screen.getByText('Blocking')).toBeDefined()
  })

  it('displays disclaimers in terms of service', () => {
    mockUseRoute.mockReturnValue({
      params: { type: 'terms' },
    })

    const profile = createMockProfile()

    renderWithProviders(<LegalScreen />, {
      authContext: { profile },
    })

    expect(screen.getByText('Disclaimers')).toBeDefined()
    expect(screen.getByText(/PROVIDED "AS IS"/)).toBeDefined()
  })

  it('displays termination information in terms of service', () => {
    mockUseRoute.mockReturnValue({
      params: { type: 'terms' },
    })

    const profile = createMockProfile()

    renderWithProviders(<LegalScreen />, {
      authContext: { profile },
    })

    expect(screen.getByText('Termination')).toBeDefined()
    expect(screen.getByText('By You')).toBeDefined()
    expect(screen.getByText('By Us')).toBeDefined()
  })

  // ---------------------------------------------------------------------------
  // DEFAULT PARAMS TESTS
  // ---------------------------------------------------------------------------

  it('defaults to privacy policy when no params provided', () => {
    mockUseRoute.mockReturnValue({
      params: undefined,
    })

    const profile = createMockProfile()

    renderWithProviders(<LegalScreen />, {
      authContext: { profile },
    })

    expect(screen.getByText('Privacy Policy')).toBeDefined()
    expect(screen.getByText('Privacy Policy for Backtrack')).toBeDefined()
  })
})
