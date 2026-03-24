import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('react-native', () => ({
  View: ({ children, style, accessibilityRole, accessibilityLabel, ...props }: any) => (
    <div data-style={JSON.stringify(style)} role={accessibilityRole} aria-label={accessibilityLabel} {...props}>{children}</div>
  ),
  Text: ({ children, style, numberOfLines, ...props }: any) => <span data-style={JSON.stringify(style)} {...props}>{children}</span>,
  Image: ({ source, onError, onLoad, style, ...props }: any) => (
    <img src={source?.uri} data-testid="avatar-image" onError={onError} onLoad={onLoad} {...props} />
  ),
  Pressable: ({ children, onPress, style, accessibilityRole, accessibilityLabel, ...props }: any) => {
    const resolvedStyle = typeof style === 'function' ? style({ pressed: false }) : style
    return (
      <button onClick={onPress} role={accessibilityRole} aria-label={accessibilityLabel} data-testid="avatar-pressable" {...props}>
        {typeof children === 'function' ? children({ pressed: false }) : children}
      </button>
    )
  },
  StyleSheet: { create: <T extends Record<string, unknown>>(s: T): T => s },
  Platform: { OS: 'ios', select: (obj: any) => obj.ios ?? obj.default },
}))

vi.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name, ...props }: any) => <span data-testid={`icon-${name}`} {...props} />,
}))

vi.mock('../../constants/theme', () => ({
  colors: {
    primary: { 500: '#FF6B47' },
    white: '#fff',
    text: { primary: '#fff', muted: '#666' },
    surface: { card: '#1a1a1a', background: '#000', cardElevated: '#222', border: '#333' },
    success: { main: '#34C759' },
    warning: { main: '#FFCC00' },
    neutral: { 500: '#888' },
  },
  spacing: {},
  borderRadius: { full: 9999 },
}))

import { Avatar, AvatarGroup } from '../Avatar'

describe('Avatar', () => {
  it('renders with image source', () => {
    render(<Avatar source={{ uri: 'https://example.com/photo.jpg' }} />)
    expect(screen.getByTestId('avatar-image')).toBeInTheDocument()
  })

  it('renders initials when no source and name provided', () => {
    render(<Avatar name="John Doe" />)
    expect(screen.getByText('JD')).toBeInTheDocument()
  })

  it('renders single initial for single name', () => {
    render(<Avatar name="Alice" />)
    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('renders placeholder icon when no source or name', () => {
    render(<Avatar />)
    expect(screen.getByTestId('icon-person')).toBeInTheDocument()
  })

  it('shows initials on image error', () => {
    render(<Avatar source={{ uri: 'bad-url' }} name="Jane Smith" />)
    fireEvent.error(screen.getByTestId('avatar-image'))
    expect(screen.getByText('JS')).toBeInTheDocument()
  })

  it('is pressable when onPress provided', () => {
    const onPress = vi.fn()
    render(<Avatar name="Test" onPress={onPress} />)
    fireEvent.click(screen.getByTestId('avatar-pressable'))
    expect(onPress).toHaveBeenCalledOnce()
  })

  it('has image role when not pressable', () => {
    render(<Avatar name="Test" />)
    expect(screen.getByRole('image')).toBeInTheDocument()
  })

  it('has button role when pressable', () => {
    render(<Avatar name="Test" onPress={() => {}} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('sets accessibility label with name', () => {
    render(<Avatar name="Bob" onPress={() => {}} />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', "Bob's avatar")
  })
})

describe('AvatarGroup', () => {
  it('renders children avatars', () => {
    render(
      <AvatarGroup>
        <Avatar name="A" />
        <Avatar name="B" />
      </AvatarGroup>
    )
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('B')).toBeInTheDocument()
  })

  it('shows overflow count when exceeding max', () => {
    render(
      <AvatarGroup max={2}>
        <Avatar name="A" />
        <Avatar name="B" />
        <Avatar name="C" />
        <Avatar name="D" />
      </AvatarGroup>
    )
    expect(screen.getByText('+2')).toBeInTheDocument()
  })

  it('has group accessibility role', () => {
    render(
      <AvatarGroup>
        <Avatar name="A" />
      </AvatarGroup>
    )
    expect(screen.getByRole('group')).toBeInTheDocument()
  })
})
