/**
 * Tests for components/Badge.tsx
 *
 * Tests Badge, NotificationBadge, and StatusDot components.
 */

import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge, NotificationBadge, StatusDot } from '../Badge'

describe('Badge', () => {
  describe('rendering', () => {
    it('should render with label text', () => {
      const { getByText } = render(<Badge label="New" />)
      expect(getByText('New')).toBeInTheDocument()
    })

    it('should render with default variant and size', () => {
      const { container } = render(<Badge label="Default" />)
      expect(container.firstChild).toBeInTheDocument()
    })
  })

  describe('variants', () => {
    it.each(['primary', 'secondary', 'success', 'warning', 'error', 'outline'] as const)(
      'should render %s variant without crashing',
      (variant) => {
        const { getByText } = render(<Badge label={`${variant} badge`} variant={variant} />)
        expect(getByText(`${variant} badge`)).toBeInTheDocument()
      }
    )
  })

  describe('sizes', () => {
    it.each(['sm', 'md', 'lg'] as const)(
      'should render %s size without crashing',
      (size) => {
        const { getByText } = render(<Badge label="Sized" size={size} />)
        expect(getByText('Sized')).toBeInTheDocument()
      }
    )
  })

  describe('dot indicator', () => {
    it('should render dot when dot prop is true', () => {
      const { container } = render(<Badge label="With dot" dot />)
      // Badge with dot has an extra child View for the dot
      const children = container.firstChild?.childNodes
      expect(children).toBeDefined()
      expect(children!.length).toBeGreaterThan(1)
    })

    it('should not render dot by default', () => {
      const { container } = render(<Badge label="No dot" />)
      const children = container.firstChild?.childNodes
      // Just the text node
      expect(children!.length).toBe(1)
    })
  })
})

describe('NotificationBadge', () => {
  it('should render children', () => {
    const { getByText } = render(
      <NotificationBadge count={5}>
        <span>Icon</span>
      </NotificationBadge>
    )
    expect(getByText('Icon')).toBeInTheDocument()
  })

  it('should show count when count > 0', () => {
    const { getByText } = render(
      <NotificationBadge count={3}>
        <span>Icon</span>
      </NotificationBadge>
    )
    expect(getByText('3')).toBeInTheDocument()
  })

  it('should not show badge when count is 0 and showZero is false', () => {
    const { queryByText } = render(
      <NotificationBadge count={0}>
        <span>Icon</span>
      </NotificationBadge>
    )
    expect(queryByText('0')).not.toBeInTheDocument()
  })

  it('should show badge when count is 0 and showZero is true', () => {
    const { getByText } = render(
      <NotificationBadge count={0} showZero>
        <span>Icon</span>
      </NotificationBadge>
    )
    expect(getByText('0')).toBeInTheDocument()
  })

  it('should cap display at max value', () => {
    const { getByText } = render(
      <NotificationBadge count={150} max={99}>
        <span>Icon</span>
      </NotificationBadge>
    )
    expect(getByText('99+')).toBeInTheDocument()
  })

  it('should show exact count when under max', () => {
    const { getByText } = render(
      <NotificationBadge count={50} max={99}>
        <span>Icon</span>
      </NotificationBadge>
    )
    expect(getByText('50')).toBeInTheDocument()
  })
})

describe('StatusDot', () => {
  it.each(['online', 'offline', 'away', 'busy'] as const)(
    'should render %s status without crashing',
    (status) => {
      const { container } = render(<StatusDot status={status} />)
      expect(container.firstChild).toBeInTheDocument()
    }
  )

  it.each(['sm', 'md', 'lg'] as const)(
    'should render %s size without crashing',
    (size) => {
      const { container } = render(<StatusDot status="online" size={size} />)
      expect(container.firstChild).toBeInTheDocument()
    }
  )
})
