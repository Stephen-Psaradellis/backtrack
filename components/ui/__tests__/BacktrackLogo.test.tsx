import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'

// Mock glassStyles
vi.mock('../../../constants/glassStyles', () => ({
  darkTheme: {
    textPrimary: '#ffffff',
    textSecondary: '#e0e0e0',
  },
}))

import { BacktrackLogo } from '../BacktrackLogo'

// Helper to query RN testID attribute (renders as "testid" not "data-testid")
const queryByTestId = (container: HTMLElement, id: string) =>
  container.querySelector(`[testid="${id}"]`)

describe('BacktrackLogo', () => {
  it('renders with default props', () => {
    const { container } = render(<BacktrackLogo />)
    expect(queryByTestId(container, 'backtrack-logo')).toBeTruthy()
  })

  it('displays BACKTRACK text', () => {
    const { queryAllByText } = render(<BacktrackLogo />)
    const backtrackElements = queryAllByText('BACKTRACK')
    expect(backtrackElements.length).toBeGreaterThan(0)
  })

  it('renders with custom testID', () => {
    const { container } = render(<BacktrackLogo testID="custom-logo" />)
    expect(queryByTestId(container, 'custom-logo')).toBeTruthy()
  })

  it('renders without background when showBackground=false', () => {
    const { queryAllByText } = render(<BacktrackLogo showBackground={false} />)
    expect(queryAllByText('BACKTRACK').length).toBeGreaterThan(0)
  })

  it('renders with background when showBackground=true', () => {
    const { container } = render(<BacktrackLogo showBackground={true} />)
    expect(container).toBeDefined()
  })

  it('renders with small size', () => {
    const { container } = render(<BacktrackLogo size="small" testID="logo-small" />)
    expect(queryByTestId(container, 'logo-small')).toBeTruthy()
  })

  it('renders with medium size', () => {
    const { container } = render(<BacktrackLogo size="medium" testID="logo-medium" />)
    expect(queryByTestId(container, 'logo-medium')).toBeTruthy()
  })

  it('renders with large size', () => {
    const { container } = render(<BacktrackLogo size="large" testID="logo-large" />)
    expect(queryByTestId(container, 'logo-large')).toBeTruthy()
  })

  it('renders with custom color', () => {
    const { container } = render(<BacktrackLogo color="#FF0000" testID="logo-color" />)
    expect(queryByTestId(container, 'logo-color')).toBeTruthy()
  })

  it('has correct accessibility role', () => {
    const { container } = render(<BacktrackLogo testID="logo-a11y" />)
    const logo = queryByTestId(container, 'logo-a11y')
    expect(logo?.getAttribute('accessibilityrole')).toBe('text')
  })
})
