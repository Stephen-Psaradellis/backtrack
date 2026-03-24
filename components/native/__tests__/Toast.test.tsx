import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('react-native', () => ({
  View: ({ children, style, ...props }: any) => <div data-style={JSON.stringify(style)} {...props}>{children}</div>,
  Text: ({ children, style, numberOfLines, ...props }: any) => <span {...props}>{children}</span>,
  TouchableOpacity: ({ children, onPress, style, hitSlop, ...props }: any) => (
    <button onClick={onPress} {...props}>{children}</button>
  ),
  Animated: {
    View: ({ children, style, ...props }: any) => <div data-testid="toast-container" {...props}>{children}</div>,
    Value: class { constructor(v: number) {} setValue() {} interpolate() { return this } },
    timing: () => ({ start: (cb?: () => void) => cb?.() }),
    parallel: () => ({ start: (cb?: () => void) => cb?.() }),
    spring: () => ({ start: vi.fn() }),
  },
  PanResponder: {
    create: () => ({ panHandlers: {} }),
  },
  StyleSheet: {
    create: <T extends Record<string, unknown>>(s: T): T => s,
    absoluteFill: {},
  },
  Platform: { OS: 'ios', select: (obj: any) => obj.ios ?? obj.default },
}))

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}))

vi.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name, size, color, style, ...props }: any) => (
    <span data-testid={`icon-${name}`} {...props} />
  ),
}))

vi.mock('expo-haptics', () => ({
  notificationAsync: vi.fn(),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}))

vi.mock('../../constants/theme', () => ({
  COLORS: {
    info: { main: '#007AFF' },
    success: { main: '#34C759' },
    warning: { main: '#FFCC00' },
    error: { main: '#FF3B30' },
    text: { primary: '#fff', secondary: '#aaa' },
    primary: { 500: '#FF6B47' },
    glass: { background: 'rgba(0,0,0,0.5)', border: 'rgba(255,255,255,0.1)' },
  },
  SPACING: { xs: 4, sm: 8, md: 16 },
  BORDER_RADIUS: { xl: 24 },
  SHADOWS: { md: {} },
}))

import { Toast } from '../Toast'

describe('Toast', () => {
  it('renders message text', () => {
    render(<Toast message="Item saved" onDismiss={() => {}} />)
    expect(screen.getByText('Item saved')).toBeInTheDocument()
  })

  it('renders info icon by default', () => {
    render(<Toast message="Info" onDismiss={() => {}} />)
    expect(screen.getByTestId('icon-information-circle')).toBeInTheDocument()
  })

  it('renders success icon for success variant', () => {
    render(<Toast message="Done" variant="success" onDismiss={() => {}} />)
    expect(screen.getByTestId('icon-checkmark-circle')).toBeInTheDocument()
  })

  it('renders warning icon for warning variant', () => {
    render(<Toast message="Careful" variant="warning" onDismiss={() => {}} />)
    expect(screen.getByTestId('icon-warning')).toBeInTheDocument()
  })

  it('renders error icon for error variant', () => {
    render(<Toast message="Failed" variant="error" onDismiss={() => {}} />)
    expect(screen.getByTestId('icon-close-circle')).toBeInTheDocument()
  })

  it('renders action button when action provided', () => {
    const onAction = vi.fn()
    render(<Toast message="Undo?" action={{ label: 'Undo', onPress: onAction }} onDismiss={() => {}} />)
    expect(screen.getByText('Undo')).toBeInTheDocument()
  })

  it('calls action onPress when action button clicked', () => {
    const onAction = vi.fn()
    render(<Toast message="Undo?" action={{ label: 'Undo', onPress: onAction }} onDismiss={() => {}} />)
    fireEvent.click(screen.getByText('Undo'))
    expect(onAction).toHaveBeenCalledOnce()
  })

  it('renders close button', () => {
    render(<Toast message="Test" onDismiss={() => {}} />)
    expect(screen.getByTestId('icon-close')).toBeInTheDocument()
  })
})
