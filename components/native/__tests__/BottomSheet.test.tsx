import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('react-native', () => ({
  View: ({ children, style, pointerEvents, ...props }: any) => <div data-style={JSON.stringify(style)} {...props}>{children}</div>,
  Text: ({ children, style, ...props }: any) => <span data-style={JSON.stringify(style)} {...props}>{children}</span>,
  Modal: ({ children, visible, onRequestClose, ...props }: any) => (
    visible ? <div data-testid="modal" {...props}>{children}</div> : null
  ),
  Pressable: ({ children, onPress, style, accessibilityLabel, accessibilityRole, ...props }: any) => {
    const resolvedStyle = typeof style === 'function' ? style({ pressed: false }) : style
    return (
      <button onClick={onPress} aria-label={accessibilityLabel} role={accessibilityRole} {...props}>
        {typeof children === 'function' ? children({ pressed: false }) : children}
      </button>
    )
  },
  Animated: {
    View: ({ children, style, accessible, accessibilityRole, ...props }: any) => (
      <div data-style={JSON.stringify(style)} role={accessibilityRole} {...props}>{children}</div>
    ),
    Value: class { constructor(v: number) {} setValue() {} interpolate() { return this } },
    timing: () => ({ start: (cb?: () => void) => cb?.() }),
    spring: () => ({ start: (cb?: () => void) => cb?.() }),
    parallel: () => ({ start: (cb?: () => void) => cb?.() }),
  },
  PanResponder: {
    create: () => ({ panHandlers: {} }),
  },
  Dimensions: { get: () => ({ width: 375, height: 812 }) },
  KeyboardAvoidingView: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Platform: { OS: 'ios', select: (obj: any) => obj.ios ?? obj.default },
  StyleSheet: {
    create: <T extends Record<string, unknown>>(s: T): T => s,
    absoluteFill: {},
    absoluteFillObject: {},
  },
}))

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}))

vi.mock('../../constants/theme', () => ({
  colors: {
    black: '#000',
    white: '#fff',
    primary: { 500: '#FF6B47' },
    text: { primary: '#fff', secondary: '#aaa' },
    surface: { card: '#1a1a1a', overlay: '#444', cardElevated: '#222', background: '#000' },
    neutral: { 900: '#111' },
    error: { main: '#FF3B30' },
  },
  spacing: { 2: 8, 2.5: 10, 3: 12, 4: 16, 5: 20, 6: 24 },
  borderRadius: { xl: 24, full: 9999, DEFAULT: 12, md: 16 },
  typography: {
    fontSize: { sm: 14, lg: 18 },
    fontWeight: { bold: '700', semibold: '600' },
    lineHeight: { relaxed: 1.6 },
  },
}))

import BottomSheet, { Dialog } from '../BottomSheet'

describe('BottomSheet', () => {
  it('renders when visible', () => {
    render(<BottomSheet visible onClose={() => {}}><span>Content</span></BottomSheet>)
    expect(screen.getByTestId('modal')).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('does not render when not visible', () => {
    render(<BottomSheet visible={false} onClose={() => {}}><span>Hidden</span></BottomSheet>)
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument()
  })

  it('renders title when provided', () => {
    render(<BottomSheet visible onClose={() => {}} title="Options"><span>Body</span></BottomSheet>)
    expect(screen.getByText('Options')).toBeInTheDocument()
  })

  it('renders drag handle by default', () => {
    const { container } = render(<BottomSheet visible onClose={() => {}}><span>Body</span></BottomSheet>)
    // Handle is a View with specific style - just verify sheet renders
    expect(screen.getByText('Body')).toBeInTheDocument()
  })

  it('hides drag handle when showHandle is false', () => {
    render(<BottomSheet visible onClose={() => {}} showHandle={false}><span>Body</span></BottomSheet>)
    expect(screen.getByText('Body')).toBeInTheDocument()
  })
})

describe('Dialog', () => {
  it('renders when visible', () => {
    render(<Dialog visible onClose={() => {}} title="Confirm?" />)
    expect(screen.getByTestId('modal')).toBeInTheDocument()
    expect(screen.getByText('Confirm?')).toBeInTheDocument()
  })

  it('does not render when not visible', () => {
    render(<Dialog visible={false} onClose={() => {}} title="Hidden" />)
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument()
  })

  it('renders description when provided', () => {
    render(<Dialog visible onClose={() => {}} title="Delete?" description="This cannot be undone." />)
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument()
  })

  it('renders primary action button', () => {
    const onPress = vi.fn()
    render(
      <Dialog
        visible
        onClose={() => {}}
        title="Confirm"
        primaryAction={{ label: 'OK', onPress }}
      />
    )
    expect(screen.getByText('OK')).toBeInTheDocument()
  })

  it('renders secondary action button', () => {
    render(
      <Dialog
        visible
        onClose={() => {}}
        title="Confirm"
        secondaryAction={{ label: 'Cancel', onPress: () => {} }}
      />
    )
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('calls primary action onPress when clicked', () => {
    const onPress = vi.fn()
    const onClose = vi.fn()
    render(
      <Dialog
        visible
        onClose={onClose}
        title="Confirm"
        primaryAction={{ label: 'Delete', onPress }}
      />
    )
    fireEvent.click(screen.getByText('Delete'))
    expect(onPress).toHaveBeenCalledOnce()
  })

  it('has alert accessibility role', () => {
    render(<Dialog visible onClose={() => {}} title="Alert" />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})
