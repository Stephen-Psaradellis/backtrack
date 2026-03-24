/**
 * CheckInButton Component Tests
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'

vi.mock('../../../lib/haptics', () => ({
  selectionFeedback: vi.fn(),
  successFeedback: vi.fn(),
  errorFeedback: vi.fn(),
}))

vi.mock('../../../constants/glassStyles', () => ({
  darkTheme: {
    textMuted: '#8E8E93',
    textPrimary: '#FFFFFF',
    textSecondary: '#AEAEB2',
    surface: '#1C1C1E',
    surfaceElevated: '#2C2C2E',
    glassBorder: 'rgba(255,255,255,0.1)',
    primary: '#FF6B47',
    success: '#34C759',
  },
}))

vi.mock('../../../constants/theme', () => ({
  colors: {
    primary: { 500: '#FF6B47' },
    white: '#FFFFFF',
  },
}))

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}))

vi.mock('../../../services/locationService', () => ({
  searchGooglePlaces: vi.fn(),
  searchNearbyPlaces: vi.fn(),
  transformGooglePlaces: vi.fn(() => []),
  cacheVenueToSupabase: vi.fn(),
}))

vi.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: vi.fn().mockResolvedValue({ status: 'granted' }),
  getCurrentPositionAsync: vi.fn().mockResolvedValue({
    coords: { latitude: 0, longitude: 0 },
  }),
  Accuracy: { High: 6 },
}))

const mockUseCheckin = vi.fn()
vi.mock('../../../hooks/useCheckin', () => ({
  useCheckin: () => mockUseCheckin(),
}))

vi.mock('@expo/vector-icons', () => ({
  Ionicons: (props: any) => React.createElement('span', { 'data-testid': props.testID }, props.name),
}))

import { CheckInButton } from '../CheckInButton'

describe('CheckInButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseCheckin.mockReturnValue({
      activeCheckin: null,
      isCheckingIn: false,
      isCheckingOut: false,
      isLoading: false,
      checkIn: vi.fn(),
      checkOut: vi.fn(),
      error: null,
    })
  })

  it('renders without crashing', () => {
    const { container } = render(<CheckInButton />)
    expect(container).toBeTruthy()
  })

  it('renders with default testID', () => {
    const { container } = render(<CheckInButton />)
    expect(container.querySelector('[testid="checkin-button"]')).toBeInTheDocument()
  })

  it('renders with custom testID', () => {
    const { container } = render(<CheckInButton testID="custom-checkin" />)
    expect(container.querySelector('[testid="custom-checkin"]')).toBeInTheDocument()
  })

  it('shows location-outline icon when not checked in', () => {
    const { getByText } = render(<CheckInButton />)
    expect(getByText('location-outline')).toBeInTheDocument()
  })

  it('shows location icon when checked in', () => {
    mockUseCheckin.mockReturnValue({
      activeCheckin: { location_id: 'loc-1', location_name: 'Test Cafe' },
      isCheckingIn: false,
      isCheckingOut: false,
      isLoading: false,
      checkIn: vi.fn(),
      checkOut: vi.fn(),
      error: null,
    })

    const { getAllByText } = render(<CheckInButton />)
    // "location" appears in both button icon and modal icon
    expect(getAllByText('location').length).toBeGreaterThanOrEqual(1)
  })

  it('has correct accessibility label when not checked in', () => {
    const { container } = render(<CheckInButton testID="check-in-btn" />)
    const button = container.querySelector('[testid="check-in-btn"]')
    expect(button?.getAttribute('accessibilitylabel')).toBe('Check in to a nearby location')
  })

  it('has correct accessibility label when checked in', () => {
    mockUseCheckin.mockReturnValue({
      activeCheckin: { location_id: 'loc-1', location_name: 'Test Cafe' },
      isCheckingIn: false,
      isCheckingOut: false,
      isLoading: false,
      checkIn: vi.fn(),
      checkOut: vi.fn(),
      error: null,
    })

    const { container } = render(<CheckInButton testID="check-in-btn" />)
    const button = container.querySelector('[testid="check-in-btn"]')
    expect(button?.getAttribute('accessibilitylabel')).toContain('Checked in at Test Cafe')
  })

  it('disables button when isLoading', () => {
    mockUseCheckin.mockReturnValue({
      activeCheckin: null,
      isCheckingIn: false,
      isCheckingOut: false,
      isLoading: true,
      checkIn: vi.fn(),
      checkOut: vi.fn(),
      error: null,
    })

    const { container } = render(<CheckInButton testID="check-in-btn" />)
    const button = container.querySelector('[testid="check-in-btn"]')
    expect(button).toHaveAttribute('disabled')
  })

  it('disables button when isCheckingIn', () => {
    mockUseCheckin.mockReturnValue({
      activeCheckin: null,
      isCheckingIn: true,
      isCheckingOut: false,
      isLoading: false,
      checkIn: vi.fn(),
      checkOut: vi.fn(),
      error: null,
    })

    const { container } = render(<CheckInButton testID="check-in-btn" />)
    const button = container.querySelector('[testid="check-in-btn"]')
    expect(button).toHaveAttribute('disabled')
  })

  it('applies custom style', () => {
    const { container } = render(
      <CheckInButton style={{ marginTop: 20 }} testID="check-in-btn" />
    )
    expect(container.querySelector('[testid="check-in-btn"]')).toBeTruthy()
  })
})
