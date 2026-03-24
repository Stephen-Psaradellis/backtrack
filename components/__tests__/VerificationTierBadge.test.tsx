import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'

// Mock Ionicons
vi.mock('@expo/vector-icons', () => ({
  Ionicons: (props: any) => (
    <div
      data-testid={`icon-${props.name}`}
      data-size={props.size}
      data-color={props.color}
    />
  ),
}))

// Mock tiers utility
vi.mock('../../lib/utils/tiers', () => ({
  getTierConfig: (tier: string) => {
    const configs: Record<string, any> = {
      verified_checkin: {
        label: 'Verified',
        description: 'GPS verified',
        color: '#10B981',
        bgColor: '#D1FAE5',
        icon: 'checkmark-shield',
      },
      regular_spot: {
        label: 'Regular',
        description: 'Favorite location',
        color: '#F59E0B',
        bgColor: '#FEF3C7',
        icon: 'heart',
      },
      unverified_claim: {
        label: 'Claimed',
        description: 'Unverified claim',
        color: '#6B7280',
        bgColor: '#F3F4F6',
        icon: 'help-circle',
      },
    }
    return configs[tier] || configs.unverified_claim
  },
}))

import { VerificationTierBadge, useTierColor, useTierBgColor } from '../VerificationTierBadge'

// Helper to query RN testID attribute (renders as "testid" not "data-testid")
const queryByTestId = (container: HTMLElement, id: string) =>
  container.querySelector(`[testid="${id}"]`)

describe('VerificationTierBadge', () => {
  it('renders with verified_checkin tier', () => {
    const { container } = render(<VerificationTierBadge tier="verified_checkin" testID="badge-test" />)
    expect(queryByTestId(container, 'badge-test')).toBeTruthy()
  })

  it('renders with regular_spot tier', () => {
    const { container } = render(<VerificationTierBadge tier="regular_spot" testID="badge-regular" />)
    expect(queryByTestId(container, 'badge-regular')).toBeTruthy()
  })

  it('renders with unverified_claim tier', () => {
    const { container } = render(<VerificationTierBadge tier="unverified_claim" testID="badge-unverified" />)
    expect(queryByTestId(container, 'badge-unverified')).toBeTruthy()
  })

  it('renders label when showLabel=true', () => {
    const { queryByText } = render(
      <VerificationTierBadge tier="verified_checkin" showLabel={true} />
    )
    expect(queryByText('Verified')).toBeTruthy()
  })

  it('hides label when compact=true', () => {
    const { queryByText } = render(
      <VerificationTierBadge tier="verified_checkin" compact={true} />
    )
    expect(queryByText('Verified')).toBeNull()
  })

  it('renders with small size', () => {
    const { container } = render(
      <VerificationTierBadge tier="verified_checkin" size="small" testID="badge-small" />
    )
    expect(queryByTestId(container, 'badge-small')).toBeTruthy()
  })

  it('renders with medium size', () => {
    const { container } = render(
      <VerificationTierBadge tier="verified_checkin" size="medium" testID="badge-medium" />
    )
    expect(queryByTestId(container, 'badge-medium')).toBeTruthy()
  })

  it('renders with large size', () => {
    const { container } = render(
      <VerificationTierBadge tier="verified_checkin" size="large" testID="badge-large" />
    )
    expect(queryByTestId(container, 'badge-large')).toBeTruthy()
  })

  it('has correct accessibility label', () => {
    const { container } = render(
      <VerificationTierBadge tier="verified_checkin" testID="badge-a11y" />
    )
    const badge = queryByTestId(container, 'badge-a11y')
    expect(badge?.getAttribute('accessibilitylabel')).toContain('Verified')
  })

  it('useTierColor returns correct color', () => {
    const color = useTierColor('verified_checkin')
    expect(color).toBe('#10B981')
  })

  it('useTierBgColor returns correct background color', () => {
    const bgColor = useTierBgColor('verified_checkin')
    expect(bgColor).toBe('#D1FAE5')
  })
})
