import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('react-native', () => ({
  View: ({ children, style, ...props }: any) => <div data-style={JSON.stringify(style)} {...props}>{children}</div>,
  Text: ({ children, style, ...props }: any) => <span data-style={JSON.stringify(style)} {...props}>{children}</span>,
  Pressable: ({ children, onPress, onPressIn, onPressOut, disabled, accessibilityRole, accessibilityState, accessibilityLabel, style, ...props }: any) => {
    const resolvedStyle = typeof style === 'function' ? style({ pressed: false }) : style
    return (
      <button
        onClick={disabled ? undefined : onPress}
        disabled={disabled}
        aria-label={accessibilityLabel}
        aria-disabled={accessibilityState?.disabled}
        aria-busy={accessibilityState?.busy}
        role={accessibilityRole}
        data-style={JSON.stringify(resolvedStyle)}
        {...props}
      >
        {typeof children === 'function' ? children({ pressed: false }) : children}
      </button>
    )
  },
  ActivityIndicator: ({ color, size, ...props }: any) => <div data-testid="activity-indicator" data-color={color} data-size={size} {...props} />,
  Animated: {
    View: ({ children, style, ...props }: any) => <div data-style={JSON.stringify(style)} {...props}>{children}</div>,
    Value: class { _value: number; constructor(v: number) { this._value = v } setValue() {} interpolate() { return this } },
    spring: () => ({ start: vi.fn() }),
    timing: () => ({ start: vi.fn() }),
  },
  StyleSheet: {
    create: <T extends Record<string, unknown>>(s: T): T => s,
  },
  Platform: {
    OS: 'ios',
    select: (obj: any) => obj.ios ?? obj.default,
  },
}))

vi.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name, size, color, style, ...props }: any) => (
    <span data-testid={`icon-${name}`} data-size={size} data-color={color} {...props} />
  ),
}))

vi.mock('expo-haptics', () => ({
  selectionAsync: vi.fn(),
  impactAsync: vi.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}))

vi.mock('../../constants/theme', () => ({
  colors: {
    primary: { 500: '#FF6B47' },
    white: '#fff',
    black: '#000',
    transparent: 'transparent',
    text: { primary: '#fff', secondary: '#aaa', muted: '#666' },
    surface: { card: '#1a1a1a', border: '#333', cardElevated: '#222' },
    error: { main: '#FF3B30' },
    success: { main: '#34C759' },
    neutral: { 900: '#111' },
    glass: { background: 'rgba(0,0,0,0.5)', border: 'rgba(255,255,255,0.1)' },
  },
  spacing: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20 },
  borderRadius: { lg: 20, xl: 24, full: 9999, DEFAULT: 12 },
  shadows: {},
}))

import { Button } from '../Button'

describe('Button', () => {
  it('renders with children text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('renders with primary variant by default', () => {
    render(<Button>Primary</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
  })

  it('calls onPress when clicked', () => {
    const onPress = vi.fn()
    render(<Button onPress={onPress}>Press</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(onPress).toHaveBeenCalledOnce()
  })

  it('does not call onPress when disabled', () => {
    const onPress = vi.fn()
    render(<Button onPress={onPress} disabled>Disabled</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(onPress).not.toHaveBeenCalled()
  })

  it('does not call onPress when loading', () => {
    const onPress = vi.fn()
    render(<Button onPress={onPress} loading>Loading</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(onPress).not.toHaveBeenCalled()
  })

  it('shows ActivityIndicator when loading', () => {
    render(<Button loading>Loading</Button>)
    expect(screen.getByTestId('activity-indicator')).toBeInTheDocument()
    expect(screen.queryByText('Loading')).not.toBeInTheDocument()
  })

  it('renders left icon when provided', () => {
    render(<Button leftIcon="add-outline">Add</Button>)
    expect(screen.getByTestId('icon-add-outline')).toBeInTheDocument()
  })

  it('renders right icon when provided', () => {
    render(<Button rightIcon="chevron-forward">Next</Button>)
    expect(screen.getByTestId('icon-chevron-forward')).toBeInTheDocument()
  })

  it('sets accessibility attributes', () => {
    render(<Button>Accessible</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-label', 'Accessible')
  })

  it('marks as aria-busy when loading', () => {
    render(<Button loading>Busy</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-busy', 'true')
  })
})
