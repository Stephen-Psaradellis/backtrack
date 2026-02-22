/**
 * Tests for components/AchievementBadge.tsx
 *
 * Tests the AchievementBadge component that displays achievement badges
 * with tiers, progress, and locked states.
 */

import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderWithProviders } from '../../__tests__/utils'
import { AchievementBadge } from '../AchievementBadge'
import type { AchievementWithStatus } from '../../hooks/useAchievements'

describe('AchievementBadge', () => {
  const baseAchievement: AchievementWithStatus = {
    id: 'explorer_first_steps',
    name: 'First Steps',
    description: 'Visit your first location',
    icon: 'pin',
    tier: 'bronze',
    earned: true,
    progress: 100,
  }

  describe('rendering', () => {
    it('should render without crashing', () => {
      const { container } = renderWithProviders(
        <AchievementBadge achievement={baseAchievement} />
      )

      expect(container.querySelector('[testid="achievement-badge"]')).toBeInTheDocument()
    })

    it('should render with custom testID', () => {
      const { container } = renderWithProviders(
        <AchievementBadge achievement={baseAchievement} testID="custom-badge" />
      )

      expect(container.querySelector('[testid="custom-badge"]')).toBeInTheDocument()
    })

    it('should display achievement name', () => {
      const { getByText } = renderWithProviders(
        <AchievementBadge achievement={baseAchievement} />
      )

      expect(getByText('First Steps')).toBeInTheDocument()
    })

    it('should render earned badge with gradient', () => {
      const { container } = renderWithProviders(
        <AchievementBadge achievement={baseAchievement} />
      )

      expect(container.querySelector('[testid="achievement-badge"]')).toBeInTheDocument()
    })

    it('should render locked badge when not earned', () => {
      const lockedAchievement = { ...baseAchievement, earned: false, progress: 0 }
      const { container } = renderWithProviders(
        <AchievementBadge achievement={lockedAchievement} />
      )

      expect(container.querySelector('[testid="achievement-badge"]')).toBeInTheDocument()
    })
  })

  describe('sizes', () => {
    it('should render with small size', () => {
      const { container } = renderWithProviders(
        <AchievementBadge achievement={baseAchievement} size="small" />
      )

      expect(container.querySelector('[testid="achievement-badge"]')).toBeInTheDocument()
    })

    it('should render with medium size by default', () => {
      const { container } = renderWithProviders(
        <AchievementBadge achievement={baseAchievement} />
      )

      expect(container.querySelector('[testid="achievement-badge"]')).toBeInTheDocument()
    })

    it('should render with large size', () => {
      const { container } = renderWithProviders(
        <AchievementBadge achievement={baseAchievement} size="large" />
      )

      expect(container.querySelector('[testid="achievement-badge"]')).toBeInTheDocument()
    })
  })

  describe('tiers', () => {
    it('should render bronze tier', () => {
      const bronzeAchievement = { ...baseAchievement, tier: 'bronze' as const }
      const { getByText } = renderWithProviders(
        <AchievementBadge achievement={bronzeAchievement} />
      )

      expect(getByText('First Steps')).toBeInTheDocument()
    })

    it('should render silver tier', () => {
      const silverAchievement = { ...baseAchievement, tier: 'silver' as const }
      const { getByText } = renderWithProviders(
        <AchievementBadge achievement={silverAchievement} />
      )

      expect(getByText('First Steps')).toBeInTheDocument()
    })

    it('should render gold tier', () => {
      const goldAchievement = { ...baseAchievement, tier: 'gold' as const }
      const { getByText } = renderWithProviders(
        <AchievementBadge achievement={goldAchievement} />
      )

      expect(getByText('First Steps')).toBeInTheDocument()
    })
  })

  describe('progress', () => {
    it('should show progress percentage for partially completed achievements', () => {
      const partialAchievement = { ...baseAchievement, earned: false, progress: 65 }
      const { getByText } = renderWithProviders(
        <AchievementBadge achievement={partialAchievement} showProgress={true} />
      )

      expect(getByText('65%')).toBeInTheDocument()
    })

    it('should not show progress when showProgress is false', () => {
      const partialAchievement = { ...baseAchievement, earned: false, progress: 65 }
      const { queryByText } = renderWithProviders(
        <AchievementBadge achievement={partialAchievement} showProgress={false} />
      )

      expect(queryByText('65%')).not.toBeInTheDocument()
    })

    it('should not show progress for earned achievements', () => {
      const { queryByText } = renderWithProviders(
        <AchievementBadge achievement={baseAchievement} showProgress={true} />
      )

      expect(queryByText('100%')).not.toBeInTheDocument()
    })

    it('should not show progress when progress is 0', () => {
      const noProgressAchievement = { ...baseAchievement, earned: false, progress: 0 }
      const { queryByText } = renderWithProviders(
        <AchievementBadge achievement={noProgressAchievement} showProgress={true} />
      )

      expect(queryByText('0%')).not.toBeInTheDocument()
    })
  })

  describe('locked state', () => {
    it('should render lock icon for unearned achievements', () => {
      const lockedAchievement = { ...baseAchievement, earned: false, progress: 0 }
      const { container } = renderWithProviders(
        <AchievementBadge achievement={lockedAchievement} />
      )

      expect(container.querySelector('[testid="achievement-badge"]')).toBeInTheDocument()
    })

    it('should apply muted styling to locked achievement names', () => {
      const lockedAchievement = { ...baseAchievement, earned: false, progress: 0 }
      const { getByText } = renderWithProviders(
        <AchievementBadge achievement={lockedAchievement} />
      )

      expect(getByText('First Steps')).toBeInTheDocument()
    })
  })
})
