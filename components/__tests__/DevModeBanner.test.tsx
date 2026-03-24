/**
 * Tests for components/DevModeBanner.tsx
 *
 * Note: DevModeBanner is a web ('use client') component using HTML/CSS,
 * not React Native. Tests use DOM queries via data-testid.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { DevModeBanner, TopDevModeBanner, WarningDevModeBanner, MinimalDevModeBanner } from '../DevModeBanner'

// Mock the dev utilities
let mockIsUsingMockServices = true
vi.mock('../../lib/dev', () => ({
  isUsingMockServices: () => mockIsUsingMockServices,
  getMockServicesSummary: () => ({
    mockSupabase: true,
    mockGoogleMaps: true,
  }),
}))

// Mock sessionStorage
const sessionStorageMock: Record<string, string> = {}
Object.defineProperty(window, 'sessionStorage', {
  value: {
    getItem: (key: string) => sessionStorageMock[key] ?? null,
    setItem: (key: string, value: string) => { sessionStorageMock[key] = value },
    removeItem: (key: string) => { delete sessionStorageMock[key] },
  },
})

describe('DevModeBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsUsingMockServices = true
    Object.keys(sessionStorageMock).forEach(key => delete sessionStorageMock[key])
  })

  it('should render the banner when mock services are active', () => {
    const { getByTestId } = render(<DevModeBanner />)
    expect(getByTestId('dev-mode-banner')).toBeTruthy()
  })

  it('should display the default message', () => {
    const { getByTestId } = render(<DevModeBanner />)
    expect(getByTestId('dev-mode-banner-message').textContent).toContain('Development Mode')
  })

  it('should display custom message', () => {
    const { getByTestId } = render(<DevModeBanner message="Custom dev message" />)
    expect(getByTestId('dev-mode-banner-message').textContent).toBe('Custom dev message')
  })

  it('should show mock service details', () => {
    const { getByTestId } = render(<DevModeBanner />)
    expect(getByTestId('dev-mode-banner-details').textContent).toContain('Supabase')
    expect(getByTestId('dev-mode-banner-details').textContent).toContain('Google Maps')
  })

  it('should hide mock details when showMockDetails is false', () => {
    const { queryByTestId } = render(<DevModeBanner showMockDetails={false} />)
    expect(queryByTestId('dev-mode-banner-details')).toBeNull()
  })

  it('should render dismiss button when dismissible', () => {
    const { getByTestId } = render(<DevModeBanner />)
    expect(getByTestId('dev-mode-banner-dismiss')).toBeTruthy()
  })

  it('should not render dismiss button when not dismissible', () => {
    const { queryByTestId } = render(<DevModeBanner dismissible={false} />)
    expect(queryByTestId('dev-mode-banner-dismiss')).toBeNull()
  })

  it('should not render when mock services are not active', () => {
    mockIsUsingMockServices = false
    const { queryByTestId } = render(<DevModeBanner />)
    expect(queryByTestId('dev-mode-banner')).toBeNull()
  })

  describe('preset variants', () => {
    it('should render TopDevModeBanner', () => {
      const { getByTestId } = render(<TopDevModeBanner />)
      expect(getByTestId('dev-mode-banner')).toBeTruthy()
    })

    it('should render WarningDevModeBanner', () => {
      const { getByTestId } = render(<WarningDevModeBanner />)
      expect(getByTestId('dev-mode-banner')).toBeTruthy()
    })

    it('should render MinimalDevModeBanner without details or dismiss', () => {
      const { queryByTestId, getByTestId } = render(<MinimalDevModeBanner />)
      expect(getByTestId('dev-mode-banner')).toBeTruthy()
      expect(queryByTestId('dev-mode-banner-dismiss')).toBeNull()
      expect(queryByTestId('dev-mode-banner-details')).toBeNull()
    })
  })
})
