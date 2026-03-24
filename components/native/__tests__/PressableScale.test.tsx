import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('react-native', () => ({
  Pressable: ({ children, onPress, onPressIn, onPressOut, disabled, accessibilityRole, accessibilityState, testID, ...props }: any) => (
    <button
      onClick={disabled ? undefined : onPress}
      disabled={disabled}
      role={accessibilityRole}
      aria-disabled={accessibilityState?.disabled}
      data-testid={testID}
      {...props}
    >
      {typeof children === 'function' ? children({ pressed: false }) : children}
    </button>
  ),
  Animated: {
    View: ({ children, style, ...props }: any) => <div data-style={JSON.stringify(style)} {...props}>{children}</div>,
    Value: class { constructor(v: number) {} setValue() {} interpolate() { return this } },
    spring: () => ({ start: vi.fn() }),
  },
  StyleSheet: { create: <T extends Record<string, unknown>>(s: T): T => s },
}))

vi.mock('expo-haptics', () => ({
  impactAsync: vi.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}))

import { PressableScale } from '../PressableScale'

describe('PressableScale', () => {
  it('renders children', () => {
    render(<PressableScale><span>Child</span></PressableScale>)
    expect(screen.getByText('Child')).toBeInTheDocument()
  })

  it('calls onPress when clicked', () => {
    const onPress = vi.fn()
    render(<PressableScale onPress={onPress} testID="ps"><span>Press</span></PressableScale>)
    fireEvent.click(screen.getByTestId('ps'))
    expect(onPress).toHaveBeenCalledOnce()
  })

  it('does not call onPress when disabled', () => {
    const onPress = vi.fn()
    render(<PressableScale onPress={onPress} disabled testID="ps"><span>Disabled</span></PressableScale>)
    fireEvent.click(screen.getByTestId('ps'))
    expect(onPress).not.toHaveBeenCalled()
  })

  it('has button accessibility role', () => {
    render(<PressableScale testID="ps"><span>Accessible</span></PressableScale>)
    expect(screen.getByTestId('ps')).toHaveAttribute('role', 'button')
  })

  it('sets aria-disabled when disabled', () => {
    render(<PressableScale disabled testID="ps"><span>Off</span></PressableScale>)
    expect(screen.getByTestId('ps')).toHaveAttribute('aria-disabled', 'true')
  })

  it('applies testID', () => {
    render(<PressableScale testID="my-pressable"><span>Test</span></PressableScale>)
    expect(screen.getByTestId('my-pressable')).toBeInTheDocument()
  })
})
