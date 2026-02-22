/**
 * Tests for components/AvatarComparison.tsx
 *
 * Tests the AvatarComparison component that displays side-by-side avatar comparison
 * with match scoring.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders } from '../../__tests__/utils'
import { AvatarComparison } from '../AvatarComparison'
import type { StoredAvatar } from '../../types/avatar'

// Mock react-native-bitmoji
vi.mock('react-native-bitmoji', () => ({
  Avatar: ({ testID }: { testID?: string }) => <div data-testid={testID}>Mock Avatar</div>,
  DEFAULT_MALE_CONFIG: { style: 'adventurer', seed: 'default-male' },
  DEFAULT_FEMALE_CONFIG: { style: 'adventurer', seed: 'default-female' },
  AVATAR_SIZE_MAP: { sm: 64, md: 96, lg: 128 },
}))

describe('AvatarComparison', () => {
  const mockTargetAvatar: StoredAvatar = {
    config: {
      style: 'adventurer',
      seed: 'test-seed-1',
    },
    url: 'https://example.com/avatar1.svg',
  }

  const mockMyAvatar: StoredAvatar = {
    config: {
      style: 'adventurer',
      seed: 'test-seed-2',
    },
    url: 'https://example.com/avatar2.svg',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render without crashing', () => {
      const { container } = renderWithProviders(
        <AvatarComparison targetAvatar={mockTargetAvatar} myAvatar={mockMyAvatar} />
      )

      expect(container.querySelector('[testid="avatar-comparison"]')).toBeInTheDocument()
    })

    it('should render with custom testID', () => {
      const { container } = renderWithProviders(
        <AvatarComparison
          targetAvatar={mockTargetAvatar}
          myAvatar={mockMyAvatar}
          testID="custom-comparison"
        />
      )

      expect(container.querySelector('[testid="custom-comparison"]')).toBeInTheDocument()
    })

    it('should render target avatar section', () => {
      const { container, getByText } = renderWithProviders(
        <AvatarComparison targetAvatar={mockTargetAvatar} myAvatar={mockMyAvatar} />
      )

      expect(container.querySelector('[testid="avatar-comparison-target"]')).toBeInTheDocument()
      expect(getByText('Their Description')).toBeInTheDocument()
    })

    it('should render my avatar section', () => {
      const { container, getByText } = renderWithProviders(
        <AvatarComparison targetAvatar={mockTargetAvatar} myAvatar={mockMyAvatar} />
      )

      expect(container.querySelector('[testid="avatar-comparison-mine"]')).toBeInTheDocument()
      expect(getByText('You')).toBeInTheDocument()
    })

    it('should render VS indicator', () => {
      const { getByText } = renderWithProviders(
        <AvatarComparison targetAvatar={mockTargetAvatar} myAvatar={mockMyAvatar} />
      )

      expect(getByText('VS')).toBeInTheDocument()
    })
  })

  describe('avatars', () => {
    it('should render both avatars when provided', () => {
      const { container } = renderWithProviders(
        <AvatarComparison targetAvatar={mockTargetAvatar} myAvatar={mockMyAvatar} />
      )

      expect(container.querySelector('[data-testid="avatar-comparison-target-avatar"]')).toBeInTheDocument()
      expect(container.querySelector('[data-testid="avatar-comparison-my-avatar"]')).toBeInTheDocument()
    })

    it('should show placeholder when target avatar is missing', () => {
      const { container } = renderWithProviders(
        <AvatarComparison targetAvatar={null} myAvatar={mockMyAvatar} />
      )

      expect(container.querySelector('[testid="avatar-comparison-target-placeholder"]')).toBeInTheDocument()
      expect(container.querySelector('[data-testid="avatar-comparison-target-avatar"]')).toBeNull()
    })

    it('should show placeholder when my avatar is missing', () => {
      const { container } = renderWithProviders(
        <AvatarComparison targetAvatar={mockTargetAvatar} myAvatar={null} />
      )

      expect(container.querySelector('[testid="avatar-comparison-my-placeholder"]')).toBeInTheDocument()
      expect(container.querySelector('[data-testid="avatar-comparison-my-avatar"]')).toBeNull()
    })

    it('should show placeholders when both avatars are missing', () => {
      const { container } = renderWithProviders(
        <AvatarComparison targetAvatar={null} myAvatar={null} />
      )

      expect(container.querySelector('[testid="avatar-comparison-target-placeholder"]')).toBeInTheDocument()
      expect(container.querySelector('[testid="avatar-comparison-my-placeholder"]')).toBeInTheDocument()
    })
  })

  describe('match score', () => {
    it('should not show match indicator when score is undefined', () => {
      const { container } = renderWithProviders(
        <AvatarComparison targetAvatar={mockTargetAvatar} myAvatar={mockMyAvatar} />
      )

      expect(container.querySelector('[testid="avatar-comparison-match-indicator"]')).toBeNull()
    })

    it('should show match indicator when score is provided', () => {
      const { container } = renderWithProviders(
        <AvatarComparison
          targetAvatar={mockTargetAvatar}
          myAvatar={mockMyAvatar}
          matchScore={85}
        />
      )

      expect(container.querySelector('[testid="avatar-comparison-match-indicator"]')).toBeInTheDocument()
    })

    it('should display excellent match label for score >= 90', () => {
      const { getByText } = renderWithProviders(
        <AvatarComparison
          targetAvatar={mockTargetAvatar}
          myAvatar={mockMyAvatar}
          matchScore={92}
        />
      )

      expect(getByText('Excellent match!')).toBeInTheDocument()
    })

    it('should display strong match label for score 75-89', () => {
      const { getByText } = renderWithProviders(
        <AvatarComparison
          targetAvatar={mockTargetAvatar}
          myAvatar={mockMyAvatar}
          matchScore={80}
        />
      )

      expect(getByText('Strong match')).toBeInTheDocument()
    })

    it('should display good match label for score 60-74', () => {
      const { getByText } = renderWithProviders(
        <AvatarComparison
          targetAvatar={mockTargetAvatar}
          myAvatar={mockMyAvatar}
          matchScore={65}
        />
      )

      expect(getByText('Good match')).toBeInTheDocument()
    })

    it('should display could be you label for score 40-59', () => {
      const { getByText } = renderWithProviders(
        <AvatarComparison
          targetAvatar={mockTargetAvatar}
          myAvatar={mockMyAvatar}
          matchScore={50}
        />
      )

      expect(getByText('Could be you?')).toBeInTheDocument()
    })

    it('should display possible match label for score < 40', () => {
      const { getByText } = renderWithProviders(
        <AvatarComparison
          targetAvatar={mockTargetAvatar}
          myAvatar={mockMyAvatar}
          matchScore={30}
        />
      )

      expect(getByText('Possible match')).toBeInTheDocument()
    })

    it('should show percentage for scores >= 60', () => {
      const { getByText } = renderWithProviders(
        <AvatarComparison
          targetAvatar={mockTargetAvatar}
          myAvatar={mockMyAvatar}
          matchScore={75}
        />
      )

      expect(getByText('75%')).toBeInTheDocument()
    })

    it('should not show percentage for scores < 60', () => {
      const { queryByText } = renderWithProviders(
        <AvatarComparison
          targetAvatar={mockTargetAvatar}
          myAvatar={mockMyAvatar}
          matchScore={50}
        />
      )

      expect(queryByText('50%')).not.toBeInTheDocument()
    })
  })

  describe('no avatar notice', () => {
    it('should show notice when user has no avatar', () => {
      const { container, getByText } = renderWithProviders(
        <AvatarComparison targetAvatar={mockTargetAvatar} myAvatar={null} />
      )

      expect(container.querySelector('[testid="avatar-comparison-no-avatar-notice"]')).toBeInTheDocument()
      expect(
        getByText('Create your avatar to see how well you match')
      ).toBeInTheDocument()
    })

    it('should not show notice when user has an avatar', () => {
      const { container } = renderWithProviders(
        <AvatarComparison targetAvatar={mockTargetAvatar} myAvatar={mockMyAvatar} />
      )

      expect(container.querySelector('[testid="avatar-comparison-no-avatar-notice"]')).toBeNull()
    })
  })

  describe('accessibility', () => {
    it('should have accessible label', () => {
      const { container } = renderWithProviders(
        <AvatarComparison
          targetAvatar={mockTargetAvatar}
          myAvatar={mockMyAvatar}
          matchScore={85}
        />
      )

      const element = container.querySelector('[testid="avatar-comparison"]')
      expect(element).toHaveAttribute('accessibilitylabel')
    })
  })
})
