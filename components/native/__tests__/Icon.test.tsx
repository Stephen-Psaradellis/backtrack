import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('react-native', () => ({
  StyleSheet: { create: <T extends Record<string, unknown>>(s: T): T => s },
}))

vi.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name, size, color, style, accessible, accessibilityLabel, ...props }: any) => (
    <span
      data-testid="icon"
      data-name={name}
      data-size={size}
      data-color={color}
      aria-label={accessibilityLabel}
      aria-hidden={!accessible}
      {...props}
    />
  ),
}))

vi.mock('../../constants/theme', () => ({
  colors: { text: { primary: '#fff' } },
}))

import { Icon, ICON_MAP } from '../Icon'

describe('Icon', () => {
  it('renders with semantic name resolved to Ionicons name', () => {
    render(<Icon name="home" />)
    const icon = screen.getByTestId('icon')
    expect(icon).toHaveAttribute('data-name', 'home-outline')
  })

  it('passes through direct Ionicons names', () => {
    render(<Icon name={'heart-outline' as any} />)
    expect(screen.getByTestId('icon')).toHaveAttribute('data-name', 'heart-outline')
  })

  it('uses md size (22px) by default', () => {
    render(<Icon name="home" />)
    expect(screen.getByTestId('icon')).toHaveAttribute('data-size', '22')
  })

  it('resolves sm size to 18px', () => {
    render(<Icon name="home" size="sm" />)
    expect(screen.getByTestId('icon')).toHaveAttribute('data-size', '18')
  })

  it('resolves lg size to 28px', () => {
    render(<Icon name="home" size="lg" />)
    expect(screen.getByTestId('icon')).toHaveAttribute('data-size', '28')
  })

  it('accepts custom numeric size', () => {
    render(<Icon name="home" size={40} />)
    expect(screen.getByTestId('icon')).toHaveAttribute('data-size', '40')
  })

  it('uses theme text color by default', () => {
    render(<Icon name="home" />)
    expect(screen.getByTestId('icon')).toHaveAttribute('data-color', '#FFFFFF')
  })

  it('accepts custom color', () => {
    render(<Icon name="home" color="#FF0000" />)
    expect(screen.getByTestId('icon')).toHaveAttribute('data-color', '#FF0000')
  })

  it('is not accessible by default (decorative)', () => {
    render(<Icon name="home" />)
    expect(screen.getByTestId('icon')).toHaveAttribute('aria-hidden', 'true')
  })

  it('is accessible when accessibilityLabel provided', () => {
    render(<Icon name="close" accessibilityLabel="Close modal" />)
    expect(screen.getByTestId('icon')).toHaveAttribute('aria-label', 'Close modal')
    expect(screen.getByTestId('icon')).toHaveAttribute('aria-hidden', 'false')
  })
})

describe('ICON_MAP', () => {
  it('maps semantic names to Ionicons names', () => {
    expect(ICON_MAP['home']).toBe('home-outline')
    expect(ICON_MAP['home-active']).toBe('home')
    expect(ICON_MAP['send']).toBe('send-outline')
    expect(ICON_MAP['like']).toBe('heart-outline')
    expect(ICON_MAP['close']).toBe('close-outline')
  })
})
