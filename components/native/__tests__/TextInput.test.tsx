import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('react-native', () => ({
  View: ({ children, style, ...props }: any) => <div data-style={JSON.stringify(style)} {...props}>{children}</div>,
  Text: ({ children, style, ...props }: any) => <span data-style={JSON.stringify(style)} {...props}>{children}</span>,
  TextInput: React.forwardRef(({ value, onFocus, onBlur, onChangeText, editable, accessibilityLabel, accessibilityHint, placeholder, maxLength, multiline, ...props }: any, ref: any) => (
    <input
      ref={ref}
      value={value}
      onChange={e => onChangeText?.(e.target.value)}
      onFocus={onFocus}
      onBlur={onBlur}
      disabled={editable === false}
      aria-label={accessibilityLabel}
      aria-describedby={accessibilityHint}
      placeholder={placeholder}
      maxLength={maxLength}
      data-multiline={multiline}
      data-testid="text-input"
      {...props}
    />
  )),
  Pressable: ({ children, onPress, disabled, ...props }: any) => (
    <button onClick={disabled ? undefined : onPress} disabled={disabled} data-testid="right-icon-btn" {...props}>
      {typeof children === 'function' ? children({ pressed: false }) : children}
    </button>
  ),
  Animated: {
    View: ({ children, style, ...props }: any) => <div data-style={JSON.stringify(style)} {...props}>{children}</div>,
    Text: ({ children, style, ...props }: any) => <span data-style={JSON.stringify(style)} {...props}>{children}</span>,
    Value: class { constructor(v: number) {} setValue() {} interpolate() { return this } },
    timing: () => ({ start: vi.fn() }),
    sequence: () => ({ start: vi.fn() }),
  },
  StyleSheet: { create: <T extends Record<string, unknown>>(s: T): T => s },
}))

vi.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name, ...props }: any) => <span data-testid={`icon-${name}`} {...props} />,
}))

vi.mock('../../constants/theme', () => ({
  colors: {
    primary: { 500: '#FF6B47' },
    text: { primary: '#fff', secondary: '#aaa', muted: '#666' },
    surface: { card: '#1a1a1a', border: '#333' },
    error: { main: '#FF3B30' },
  },
  spacing: { 1: 4, 2: 8, 3: 12, 4: 16 },
  borderRadius: { lg: 20 },
  typography: {
    fontSize: { xs: 12, base: 16 },
    fontWeight: { normal: '400', medium: '500' },
  },
}))

import { TextInput } from '../TextInput'

describe('TextInput', () => {
  it('renders an input element', () => {
    render(<TextInput />)
    expect(screen.getByTestId('text-input')).toBeInTheDocument()
  })

  it('renders floating label when provided', () => {
    render(<TextInput label="Email" />)
    expect(screen.getByText('Email')).toBeInTheDocument()
  })

  it('sets accessibility label from label prop', () => {
    render(<TextInput label="Username" />)
    expect(screen.getByTestId('text-input')).toHaveAttribute('aria-label', 'Username')
  })

  it('renders error text', () => {
    render(<TextInput error="Required field" />)
    expect(screen.getByText('Required field')).toBeInTheDocument()
  })

  it('renders helper text when no error', () => {
    render(<TextInput helperText="Enter your email" />)
    expect(screen.getByText('Enter your email')).toBeInTheDocument()
  })

  it('shows error text instead of helper when both provided', () => {
    render(<TextInput error="Invalid" helperText="Enter email" />)
    expect(screen.getByText('Invalid')).toBeInTheDocument()
    expect(screen.queryByText('Enter email')).not.toBeInTheDocument()
  })

  it('shows character count when enabled', () => {
    render(<TextInput value="hello" maxLength={20} showCharCount />)
    expect(screen.getByText('5/20')).toBeInTheDocument()
  })

  it('renders left icon', () => {
    render(<TextInput leftIcon="search-outline" />)
    expect(screen.getByTestId('icon-search-outline')).toBeInTheDocument()
  })

  it('renders right icon', () => {
    render(<TextInput rightIcon="eye-outline" />)
    expect(screen.getByTestId('icon-eye-outline')).toBeInTheDocument()
  })

  it('calls onRightIconPress when right icon pressed', () => {
    const onPress = vi.fn()
    render(<TextInput rightIcon="eye-outline" onRightIconPress={onPress} />)
    fireEvent.click(screen.getByTestId('right-icon-btn'))
    expect(onPress).toHaveBeenCalledOnce()
  })

  it('disables input when disabled prop is true', () => {
    render(<TextInput disabled />)
    expect(screen.getByTestId('text-input')).toBeDisabled()
  })
})
