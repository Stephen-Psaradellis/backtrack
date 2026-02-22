/**
 * Tests for components/VenueStory.tsx
 *
 * Tests the VenueStory component that displays individual venue stories.
 */

import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { VenueStory, type VenueStoryData } from '../VenueStory'

// Mock VerifiedBadge component
vi.mock('../VerifiedBadge', () => ({
  VerifiedBadge: ({ testID }: { testID?: string }) => (
    <div testid={testID}>Verified</div>
  ),
}))

describe('VenueStory', () => {
  const baseStory: VenueStoryData = {
    id: 'story-1',
    content: 'Great live music tonight!',
    created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
    expires_at: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(), // 3 hours from now
    display_name: 'Alice',
    is_verified: false,
  }

  describe('rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(<VenueStory story={baseStory} />)

      expect(container.querySelector('[testid="venue-story"]')).toBeInTheDocument()
    })

    it('should render with custom testID', () => {
      const { container } = render(
        <VenueStory story={baseStory} testID="custom-story" />
      )

      expect(container.querySelector('[testid="custom-story"]')).toBeInTheDocument()
    })

    it('should display story content', () => {
      const { getByText } = render(<VenueStory story={baseStory} />)

      expect(getByText('Great live music tonight!')).toBeInTheDocument()
    })

    it('should display user display name', () => {
      const { getByText } = render(<VenueStory story={baseStory} />)

      expect(getByText('Alice')).toBeInTheDocument()
    })

    it('should show Anonymous when display name is null', () => {
      const anonymousStory = { ...baseStory, display_name: null }
      const { getByText } = render(<VenueStory story={anonymousStory} />)

      expect(getByText('Anonymous')).toBeInTheDocument()
    })
  })

  describe('avatar initial', () => {
    it('should display first letter of display name', () => {
      const { getByText } = render(<VenueStory story={baseStory} />)

      expect(getByText('A')).toBeInTheDocument()
    })

    it('should show A for null display name', () => {
      const anonymousStory = { ...baseStory, display_name: null }
      const { getByText } = render(<VenueStory story={anonymousStory} />)

      expect(getByText('A')).toBeInTheDocument()
    })

    it('should show A for empty display name', () => {
      const emptyNameStory = { ...baseStory, display_name: '' }
      const { getByText } = render(<VenueStory story={emptyNameStory} />)

      expect(getByText('A')).toBeInTheDocument()
    })

    it('should uppercase the initial', () => {
      const lowercaseStory = { ...baseStory, display_name: 'bob' }
      const { getByText } = render(<VenueStory story={lowercaseStory} />)

      expect(getByText('B')).toBeInTheDocument()
    })
  })

  describe('verified badge', () => {
    it('should show verified badge when user is verified', () => {
      const verifiedStory = { ...baseStory, is_verified: true }
      const { container } = render(<VenueStory story={verifiedStory} />)

      expect(container.querySelector('[testid="venue-story-verified"]')).toBeInTheDocument()
    })

    it('should not show verified badge when user is not verified', () => {
      const { container } = render(<VenueStory story={baseStory} />)

      expect(container.querySelector('[testid="venue-story-verified"]')).toBeNull()
    })
  })

  describe('time display', () => {
    it('should show time ago', () => {
      const { container } = render(<VenueStory story={baseStory} />)

      expect(container).toBeInTheDocument()
    })

    it('should show expiry countdown', () => {
      const { getByText } = render(<VenueStory story={baseStory} />)

      // Should show "Xh Ym left" or similar
      expect(getByText(/left/)).toBeInTheDocument()
    })

    it('should show expired when past expiry', () => {
      const expiredStory = {
        ...baseStory,
        expires_at: new Date(Date.now() - 1000).toISOString(), // 1 second ago
      }
      const { getByText } = render(<VenueStory story={expiredStory} />)

      expect(getByText('expired')).toBeInTheDocument()
    })

    it('should show minutes only when less than 1 hour left', () => {
      const soonStory = {
        ...baseStory,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min from now
      }
      const { getByText } = render(<VenueStory story={soonStory} />)

      expect(getByText(/m left/)).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have accessible label', () => {
      const { container } = render(<VenueStory story={baseStory} />)

      const element = container.querySelector('[testid="venue-story"]')
      expect(element).toHaveAttribute('accessibilitylabel')
    })

    it('should include content in accessibility label', () => {
      const { container } = render(<VenueStory story={baseStory} />)

      const element = container.querySelector('[testid="venue-story"]')
      const label = element?.getAttribute('accessibilitylabel')
      expect(label).toContain('Great live music tonight!')
    })

    it('should include display name in accessibility label when provided', () => {
      const { container } = render(<VenueStory story={baseStory} />)

      const element = container.querySelector('[testid="venue-story"]')
      const label = element?.getAttribute('accessibilitylabel')
      expect(label).toContain('Alice')
    })

    it('should mention verified status in accessibility label', () => {
      const verifiedStory = { ...baseStory, is_verified: true }
      const { container } = render(<VenueStory story={verifiedStory} />)

      const element = container.querySelector('[testid="venue-story"]')
      const label = element?.getAttribute('accessibilitylabel')
      expect(label).toContain('verified')
    })
  })
})
