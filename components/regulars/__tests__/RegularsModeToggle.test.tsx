import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'

const mockRegularsMode = {
  isEnabled: true,
  visibility: 'mutual' as const,
  toggleMode: vi.fn(),
  setVisibility: vi.fn(),
  isLoading: false,
  isUpdating: false,
  error: null,
}

vi.mock('react-native', () => ({
  View: ({ children, style, ...props }: any) => <div style={style} {...props}>{children}</div>,
  Text: ({ children, style, ...props }: any) => <span style={style} {...props}>{children}</span>,
  StyleSheet: { create: (s: any) => s },
  Switch: ({ value, onValueChange, disabled, ...props }: any) => (
    <input type="checkbox" checked={value} onChange={() => onValueChange?.(!value)} disabled={disabled} data-testid="switch" {...props} />
  ),
  TouchableOpacity: ({ children, onPress, disabled, ...props }: any) => (
    <button onClick={disabled ? undefined : onPress} disabled={disabled} {...props}>{children}</button>
  ),
  ActivityIndicator: () => <div data-testid="loading" />,
}))

vi.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name, ...props }: any) => <span data-testid={`icon-${name}`} {...props} />,
}))

vi.mock('../../../hooks/useRegulars', () => ({
  useRegularsMode: () => mockRegularsMode,
}))

vi.mock('../../../constants/glassStyles', () => ({
  darkTheme: { background: '#000', textPrimary: '#fff', textSecondary: '#aaa', textMuted: '#666' },
}))

vi.mock('../../../constants/theme', () => ({
  colors: { primary: { 500: '#ff6b47' }, white: '#fff' },
}))

import { RegularsModeToggle, RegularsModeCompactToggle } from '../RegularsModeToggle'

describe('RegularsModeToggle', () => {
  it('shows loading state', () => {
    mockRegularsMode.isLoading = true
    const { getByTestId } = render(<RegularsModeToggle />)
    expect(getByTestId('loading')).toBeInTheDocument()
    mockRegularsMode.isLoading = false
  })

  it('renders title and subtitle', () => {
    const { getByText } = render(<RegularsModeToggle />)
    expect(getByText('Regulars Mode')).toBeInTheDocument()
    expect(getByText('Connect with others who visit the same spots')).toBeInTheDocument()
  })

  it('renders enable toggle', () => {
    const { getByText } = render(<RegularsModeToggle />)
    expect(getByText('Enable Regulars Mode')).toBeInTheDocument()
  })

  it('shows visibility section when enabled', () => {
    mockRegularsMode.isEnabled = true
    const { getByText } = render(<RegularsModeToggle />)
    expect(getByText('Visibility')).toBeInTheDocument()
  })

  it('hides visibility section when disabled', () => {
    mockRegularsMode.isEnabled = false
    const { queryByText } = render(<RegularsModeToggle />)
    expect(queryByText('Visibility')).not.toBeInTheDocument()
    mockRegularsMode.isEnabled = true
  })

  it('shows current visibility option', () => {
    const { getByText } = render(<RegularsModeToggle />)
    expect(getByText('Mutual Only')).toBeInTheDocument()
  })

  it('renders info box', () => {
    const { getByText } = render(<RegularsModeToggle />)
    expect(getByText(/regular.*at a location after visiting/)).toBeInTheDocument()
  })

  it('shows error when present', () => {
    mockRegularsMode.error = { code: 'FETCH_ERROR' as const, message: 'Something went wrong' }
    const { getByText } = render(<RegularsModeToggle />)
    expect(getByText('Something went wrong')).toBeInTheDocument()
    mockRegularsMode.error = null
  })
})

describe('RegularsModeCompactToggle', () => {
  it('renders compact view', () => {
    const { getByText } = render(<RegularsModeCompactToggle />)
    expect(getByText('Regulars Mode')).toBeInTheDocument()
    expect(getByText('Enabled')).toBeInTheDocument()
  })

  it('shows Disabled when not enabled', () => {
    mockRegularsMode.isEnabled = false
    const { getByText } = render(<RegularsModeCompactToggle />)
    expect(getByText('Disabled')).toBeInTheDocument()
    mockRegularsMode.isEnabled = true
  })
})
