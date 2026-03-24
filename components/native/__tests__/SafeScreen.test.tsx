import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('react-native', () => ({
  View: ({ children, style, ...props }: any) => <div data-testid="view" data-style={JSON.stringify(style)} {...props}>{children}</div>,
  ScrollView: ({ children, style, contentContainerStyle, ...props }: any) => (
    <div data-testid="scrollview" data-style={JSON.stringify(style)} data-content-style={JSON.stringify(contentContainerStyle)} {...props}>
      {children}
    </div>
  ),
  StatusBar: ({ barStyle, ...props }: any) => <div data-testid="statusbar" data-bar-style={barStyle} {...props} />,
  KeyboardAvoidingView: ({ children, style, behavior, ...props }: any) => (
    <div data-testid="keyboard-avoiding" data-behavior={behavior} {...props}>{children}</div>
  ),
  Platform: { OS: 'ios', select: (obj: any) => obj.ios ?? obj.default },
  StyleSheet: { create: <T extends Record<string, unknown>>(s: T): T => s },
}))

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}))

vi.mock('../../constants/theme', () => ({
  colors: { surface: { background: '#000' } },
  spacing: { 4: 16 },
}))

import SafeScreen from '../SafeScreen'

describe('SafeScreen', () => {
  it('renders children', () => {
    render(<SafeScreen><span>Content</span></SafeScreen>)
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('renders StatusBar with light-content by default', () => {
    render(<SafeScreen><span>Test</span></SafeScreen>)
    expect(screen.getByTestId('statusbar')).toHaveAttribute('data-bar-style', 'light-content')
  })

  it('renders StatusBar with dark-content when statusBarStyle is dark', () => {
    render(<SafeScreen statusBarStyle="dark"><span>Test</span></SafeScreen>)
    expect(screen.getByTestId('statusbar')).toHaveAttribute('data-bar-style', 'dark-content')
  })

  it('wraps in ScrollView when scroll is true', () => {
    render(<SafeScreen scroll><span>Scrollable</span></SafeScreen>)
    expect(screen.getByTestId('scrollview')).toBeInTheDocument()
  })

  it('does not wrap in ScrollView by default', () => {
    render(<SafeScreen><span>Static</span></SafeScreen>)
    expect(screen.queryByTestId('scrollview')).not.toBeInTheDocument()
  })

  it('wraps in KeyboardAvoidingView when keyboardAvoiding is true', () => {
    render(<SafeScreen keyboardAvoiding><span>KB</span></SafeScreen>)
    expect(screen.getByTestId('keyboard-avoiding')).toBeInTheDocument()
  })

  it('does not wrap in KeyboardAvoidingView by default', () => {
    render(<SafeScreen><span>No KB</span></SafeScreen>)
    expect(screen.queryByTestId('keyboard-avoiding')).not.toBeInTheDocument()
  })

  it('applies safe area padding by default', () => {
    render(<SafeScreen><span>Padded</span></SafeScreen>)
    const views = screen.getAllByTestId('view')
    const mainView = views[0]
    const style = JSON.parse(mainView.getAttribute('data-style') || '[]')
    const flat = [].concat(...(Array.isArray(style) ? style : [style]))
    const hasTopPad = flat.some((s: any) => s?.paddingTop === 44)
    expect(hasTopPad).toBe(true)
  })

  it('skips top safe area when safeTop is false', () => {
    render(<SafeScreen safeTop={false}><span>No Top</span></SafeScreen>)
    const views = screen.getAllByTestId('view')
    const style = JSON.parse(views[0].getAttribute('data-style') || '[]')
    const flat = [].concat(...(Array.isArray(style) ? style : [style]))
    const hasZeroTop = flat.some((s: any) => s?.paddingTop === 0)
    expect(hasZeroTop).toBe(true)
  })
})
