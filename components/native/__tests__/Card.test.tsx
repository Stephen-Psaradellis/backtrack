import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('react-native', () => ({
  View: ({ children, style, ...props }: any) => <div data-style={JSON.stringify(style)} {...props}>{children}</div>,
  Pressable: ({ children, onPress, style, ...props }: any) => (
    <button onClick={onPress} data-testid="card-pressable" {...props}>
      {typeof children === 'function' ? children({ pressed: false }) : children}
    </button>
  ),
  Animated: {
    View: ({ children, style, ...props }: any) => <div data-style={JSON.stringify(style)} {...props}>{children}</div>,
    Value: class { constructor(v: number) {} setValue() {} interpolate() { return this } },
    spring: () => ({ start: vi.fn() }),
  },
  StyleSheet: { create: <T extends Record<string, unknown>>(s: T): T => s },
  Platform: { OS: 'ios', select: (obj: any) => obj.ios ?? obj.default },
}))

vi.mock('expo-haptics', () => ({
  impactAsync: vi.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}))

vi.mock('../../constants/theme', () => ({
  colors: {
    primary: { 500: '#FF6B47' },
    transparent: 'transparent',
    black: '#000',
    surface: { card: '#1a1a1a', border: '#333', cardElevated: '#222', overlay: '#444' },
    neutral: { 900: '#111' },
    glass: { background: 'rgba(0,0,0,0.5)', border: 'rgba(255,255,255,0.1)' },
  },
  spacing: { 3: 12, 4: 16 },
  borderRadius: { xl: 24, full: 9999 },
  shadows: {},
}))

import { Card, CardHeader, CardContent, CardFooter } from '../Card'

describe('Card', () => {
  it('renders children', () => {
    render(<Card><span>Content</span></Card>)
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('renders as static View when no onPress', () => {
    render(<Card><span>Static</span></Card>)
    expect(screen.queryByTestId('card-pressable')).not.toBeInTheDocument()
  })

  it('renders as Pressable when onPress is provided', () => {
    const onPress = vi.fn()
    render(<Card onPress={onPress}><span>Interactive</span></Card>)
    expect(screen.getByTestId('card-pressable')).toBeInTheDocument()
  })

  it('calls onPress when clicked', () => {
    const onPress = vi.fn()
    render(<Card onPress={onPress}><span>Click</span></Card>)
    fireEvent.click(screen.getByTestId('card-pressable'))
    expect(onPress).toHaveBeenCalledOnce()
  })
})

describe('CardHeader', () => {
  it('renders children', () => {
    render(<CardHeader><span>Header</span></CardHeader>)
    expect(screen.getByText('Header')).toBeInTheDocument()
  })
})

describe('CardContent', () => {
  it('renders children', () => {
    render(<CardContent><span>Body</span></CardContent>)
    expect(screen.getByText('Body')).toBeInTheDocument()
  })
})

describe('CardFooter', () => {
  it('renders children', () => {
    render(<CardFooter><span>Footer</span></CardFooter>)
    expect(screen.getByText('Footer')).toBeInTheDocument()
  })
})
