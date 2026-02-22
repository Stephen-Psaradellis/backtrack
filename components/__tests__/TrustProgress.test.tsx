/**
 * Tests for components/TrustProgress.tsx
 *
 * Tests the TrustProgress component that displays user trust level progress.
 */

import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { TrustProgress } from '../TrustProgress'

// Mock TRUST_TIERS from useTrustLevel hook
vi.mock('../../hooks/useTrustLevel', () => ({
  TRUST_TIERS: [
    {
      level: 1,
      name: 'Newcomer',
      description: 'Just getting started',
      minPoints: 0,
      maxPoints: 99,
      color: '#6B7280',
      icon: 'shield-outline',
    },
    {
      level: 2,
      name: 'Regular',
      description: 'Building trust',
      minPoints: 100,
      maxPoints: 299,
      color: '#3B82F6',
      icon: 'shield-checkmark-outline',
    },
    {
      level: 3,
      name: 'Trusted',
      description: 'Well-established',
      minPoints: 300,
      maxPoints: 599,
      color: '#8B5CF6',
      icon: 'shield-checkmark',
    },
    {
      level: 4,
      name: 'Veteran',
      description: 'Highly trusted',
      minPoints: 600,
      maxPoints: 999,
      color: '#F59E0B',
      icon: 'ribbon-outline',
    },
    {
      level: 5,
      name: 'Legend',
      description: 'Maximum trust',
      minPoints: 1000,
      maxPoints: null,
      color: '#10B981',
      icon: 'trophy',
    },
  ],
}))

describe('TrustProgress', () => {
  describe('rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <TrustProgress trustLevel={1} trustPoints={50} />
      )

      expect(container.querySelector('[testid="trust-progress"]')).toBeInTheDocument()
    })

    it('should render with custom testID', () => {
      const { container } = render(
        <TrustProgress trustLevel={1} trustPoints={50} testID="custom-trust" />
      )

      expect(container.querySelector('[testid="custom-trust"]')).toBeInTheDocument()
    })
  })

  describe('tier display', () => {
    it('should display tier name for level 1', () => {
      const { getByText } = render(
        <TrustProgress trustLevel={1} trustPoints={50} />
      )

      expect(getByText('Newcomer')).toBeInTheDocument()
    })

    it('should display tier name for level 2', () => {
      const { getByText } = render(
        <TrustProgress trustLevel={2} trustPoints={150} />
      )

      expect(getByText('Regular')).toBeInTheDocument()
    })

    it('should display tier name for level 3', () => {
      const { getByText } = render(
        <TrustProgress trustLevel={3} trustPoints={400} />
      )

      expect(getByText('Trusted')).toBeInTheDocument()
    })

    it('should display tier name for level 4', () => {
      const { getByText } = render(
        <TrustProgress trustLevel={4} trustPoints={750} />
      )

      expect(getByText('Veteran')).toBeInTheDocument()
    })

    it('should display tier name for level 5', () => {
      const { getByText } = render(
        <TrustProgress trustLevel={5} trustPoints={1200} />
      )

      expect(getByText('Legend')).toBeInTheDocument()
    })

    it('should display tier description', () => {
      const { getByText } = render(
        <TrustProgress trustLevel={1} trustPoints={50} />
      )

      expect(getByText('Just getting started')).toBeInTheDocument()
    })

    it('should display level badge', () => {
      const { getByText } = render(
        <TrustProgress trustLevel={2} trustPoints={150} />
      )

      expect(getByText('Level 2')).toBeInTheDocument()
    })
  })

  describe('points display', () => {
    it('should show Trust Points label', () => {
      const { getByText } = render(
        <TrustProgress trustLevel={1} trustPoints={50} />
      )

      expect(getByText('Trust Points')).toBeInTheDocument()
    })

    it('should show current points', () => {
      const { getByText } = render(
        <TrustProgress trustLevel={1} trustPoints={50} />
      )

      expect(getByText('50')).toBeInTheDocument()
    })

    it('should show points to next tier', () => {
      const { getByText } = render(
        <TrustProgress trustLevel={1} trustPoints={50} />
      )

      // 100 - 50 = 50 points to next tier
      expect(getByText(/100/)).toBeInTheDocument()
    })

    it('should show to next tier label', () => {
      const { getByText } = render(
        <TrustProgress trustLevel={1} trustPoints={50} />
      )

      expect(getByText(/to Regular/)).toBeInTheDocument()
    })
  })

  describe('progress bar', () => {
    it('should show progress bar for non-max tiers', () => {
      const { container } = render(
        <TrustProgress trustLevel={1} trustPoints={50} />
      )

      expect(container).toBeInTheDocument()
    })

    it('should not show progress bar for max tier', () => {
      const { container } = render(
        <TrustProgress trustLevel={5} trustPoints={1200} />
      )

      expect(container).toBeInTheDocument()
    })

    it('should show progress percentage', () => {
      const { getByText } = render(
        <TrustProgress trustLevel={1} trustPoints={50} />
      )

      // 50 / 100 = 50%
      expect(getByText(/50%/)).toBeInTheDocument()
    })

    it('should calculate correct progress at tier start', () => {
      const { getByText } = render(
        <TrustProgress trustLevel={2} trustPoints={100} />
      )

      // At tier start (100), progress should be 0%
      expect(getByText(/0%/)).toBeInTheDocument()
    })

    it('should calculate correct progress at tier middle', () => {
      const { getByText } = render(
        <TrustProgress trustLevel={2} trustPoints={200} />
      )

      // Midpoint of tier 2 (100-299)
      // (200 - 100) / (299 - 100 + 1) * 100 = 50%
      expect(getByText(/50%/)).toBeInTheDocument()
    })

    it('should show points remaining to next tier', () => {
      const { getByText } = render(
        <TrustProgress trustLevel={1} trustPoints={50} />
      )

      expect(getByText('50 points to next tier')).toBeInTheDocument()
    })
  })

  describe('max tier display', () => {
    it('should show max tier message for level 5', () => {
      const { getByText } = render(
        <TrustProgress trustLevel={5} trustPoints={1200} />
      )

      expect(getByText('Maximum tier reached!')).toBeInTheDocument()
    })

    it('should show points count for max tier', () => {
      const { getByText } = render(
        <TrustProgress trustLevel={5} trustPoints={1200} />
      )

      expect(getByText('1200 points')).toBeInTheDocument()
    })

    it('should not show progress bar for max tier', () => {
      const { queryByText } = render(
        <TrustProgress trustLevel={5} trustPoints={1200} />
      )

      expect(queryByText(/points to next tier/)).not.toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('should handle 0 points', () => {
      const { getByText } = render(
        <TrustProgress trustLevel={1} trustPoints={0} />
      )

      expect(getByText('0')).toBeInTheDocument()
    })

    it('should handle points at tier boundary', () => {
      const { getByText } = render(
        <TrustProgress trustLevel={1} trustPoints={99} />
      )

      expect(getByText('99')).toBeInTheDocument()
    })

    it('should handle very high points at max tier', () => {
      const { getByText } = render(
        <TrustProgress trustLevel={5} trustPoints={99999} />
      )

      expect(getByText('99999 points')).toBeInTheDocument()
    })
  })
})
