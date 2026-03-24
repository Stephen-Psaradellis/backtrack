import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('react-native', () => ({
  View: ({ children, style, onLayout, accessibilityRole, ...props }: any) => {
    // Simulate layout event to set containerWidth
    if (onLayout) {
      setTimeout(() => onLayout({ nativeEvent: { layout: { width: 300 } } }), 0)
    }
    return <div role={accessibilityRole} data-style={JSON.stringify(style)} {...props}>{children}</div>
  },
  Text: ({ children, style, ...props }: any) => <span data-style={JSON.stringify(style)} {...props}>{children}</span>,
  Pressable: ({ children, onPress, accessibilityRole, accessibilityState, accessibilityLabel, style, ...props }: any) => (
    <button
      onClick={onPress}
      role={accessibilityRole}
      aria-selected={accessibilityState?.selected}
      aria-label={accessibilityLabel}
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
  selectionAsync: vi.fn(),
}))

vi.mock('../../constants/theme', () => ({
  colors: {
    text: { primary: '#fff', muted: '#666' },
    surface: { card: '#1a1a1a', overlay: '#444' },
  },
  borderRadius: { lg: 20, md: 16 },
  spacing: {},
  typography: {},
}))

import { SegmentedControl } from '../SegmentedControl'

describe('SegmentedControl', () => {
  it('renders all segment labels', () => {
    render(<SegmentedControl segments={['One', 'Two', 'Three']} selectedIndex={0} onChange={() => {}} />)
    expect(screen.getByText('One')).toBeInTheDocument()
    expect(screen.getByText('Two')).toBeInTheDocument()
    expect(screen.getByText('Three')).toBeInTheDocument()
  })

  it('calls onChange with index when segment clicked', () => {
    const onChange = vi.fn()
    render(<SegmentedControl segments={['A', 'B']} selectedIndex={0} onChange={onChange} />)
    fireEvent.click(screen.getByText('B'))
    expect(onChange).toHaveBeenCalledWith(1)
  })

  it('does not call onChange when clicking already selected segment', () => {
    const onChange = vi.fn()
    render(<SegmentedControl segments={['A', 'B']} selectedIndex={0} onChange={onChange} />)
    fireEvent.click(screen.getByText('A'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('has tablist accessibility role on container', () => {
    render(<SegmentedControl segments={['A', 'B']} selectedIndex={0} onChange={() => {}} />)
    expect(screen.getByRole('tablist')).toBeInTheDocument()
  })

  it('sets tab role on each segment', () => {
    render(<SegmentedControl segments={['X', 'Y']} selectedIndex={0} onChange={() => {}} />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(2)
  })

  it('marks selected segment with aria-selected', () => {
    render(<SegmentedControl segments={['X', 'Y']} selectedIndex={1} onChange={() => {}} />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs[0]).toHaveAttribute('aria-selected', 'false')
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true')
  })

  it('sets accessibility label on segments', () => {
    render(<SegmentedControl segments={['Feed', 'Map']} selectedIndex={0} onChange={() => {}} />)
    expect(screen.getByLabelText('Feed')).toBeInTheDocument()
    expect(screen.getByLabelText('Map')).toBeInTheDocument()
  })
})
