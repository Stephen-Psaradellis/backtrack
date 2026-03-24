import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('react-native', () => ({
  Text: React.forwardRef(({ children, style, accessibilityRole, numberOfLines, ...props }: any, ref: any) => (
    <span ref={ref} data-style={JSON.stringify(style)} role={accessibilityRole} data-lines={numberOfLines} {...props}>
      {children}
    </span>
  )),
  StyleSheet: { create: <T extends Record<string, unknown>>(s: T): T => s },
}))

vi.mock('../../constants/theme', () => ({
  colors: {
    text: { primary: '#fff', secondary: '#aaa', muted: '#666' },
    primary: { 500: '#FF6B47' },
  },
  typography: {
    fontSize: { xs: 12, sm: 14, base: 16, lg: 18, '2xl': 24, '5xl': 48 },
    fontWeight: { normal: '400', semibold: '600', bold: '700', medium: '500' },
    lineHeight: { tight: 1.2, normal: 1.5, relaxed: 1.6 },
    fontFamily: { display: 'System', displayMedium: 'System' },
  },
}))

import { Text } from '../Text'

describe('Text', () => {
  it('renders children text', () => {
    render(<Text>Hello</Text>)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('defaults to body variant', () => {
    render(<Text>Body text</Text>)
    const el = screen.getByText('Body text')
    const style = JSON.parse(el.getAttribute('data-style') || '[]')
    const flat = [].concat(...(Array.isArray(style) ? style : [style]))
    const hasBodySize = flat.some((s: any) => s?.fontSize === 16)
    expect(hasBodySize).toBe(true)
  })

  it('applies heading variant with header role', () => {
    render(<Text variant="heading">Title</Text>)
    const el = screen.getByText('Title')
    expect(el).toHaveAttribute('role', 'header')
  })

  it('applies subheading variant with header role', () => {
    render(<Text variant="subheading">Subtitle</Text>)
    expect(screen.getByText('Subtitle')).toHaveAttribute('role', 'header')
  })

  it('does not set header role for body variant', () => {
    render(<Text variant="body">Paragraph</Text>)
    expect(screen.getByText('Paragraph')).not.toHaveAttribute('role', 'header')
  })

  it('applies custom color override', () => {
    render(<Text color="#FF0000">Red</Text>)
    const el = screen.getByText('Red')
    const style = JSON.parse(el.getAttribute('data-style') || '[]')
    const flat = [].concat(...(Array.isArray(style) ? style : [style]))
    const hasColor = flat.some((s: any) => s?.color === '#FF0000')
    expect(hasColor).toBe(true)
  })

  it('applies text alignment', () => {
    render(<Text align="center">Centered</Text>)
    const el = screen.getByText('Centered')
    const style = JSON.parse(el.getAttribute('data-style') || '[]')
    const flat = [].concat(...(Array.isArray(style) ? style : [style]))
    const hasAlign = flat.some((s: any) => s?.textAlign === 'center')
    expect(hasAlign).toBe(true)
  })

  it('passes numberOfLines', () => {
    render(<Text numberOfLines={2}>Truncated</Text>)
    expect(screen.getByText('Truncated')).toHaveAttribute('data-lines', '2')
  })

  it('has displayName', () => {
    expect(Text.displayName).toBe('Text')
  })
})
