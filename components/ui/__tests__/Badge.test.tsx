/**
 * Tests for components/ui/Badge.tsx
 *
 * Tests the Badge, BadgeGroup, and NotificationBadge components.
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge, BadgeGroup, NotificationBadge } from '../Badge'

describe('Badge', () => {
  describe('rendering', () => {
    it('should render children', () => {
      render(<Badge>New</Badge>)

      expect(screen.getByText('New')).toBeInTheDocument()
    })

    it('should render as span', () => {
      render(<Badge>Badge</Badge>)

      expect(screen.getByText('Badge').tagName).toBe('SPAN')
    })
  })

  describe('variants', () => {
    it('should render default variant', () => {
      render(<Badge variant="default">Default</Badge>)

      expect(screen.getByText('Default')).toHaveClass('bg-neutral-100')
    })

    it('should render primary variant', () => {
      render(<Badge variant="primary">Primary</Badge>)

      expect(screen.getByText('Primary')).toHaveClass('bg-primary-100')
    })

    it('should render secondary variant', () => {
      render(<Badge variant="secondary">Secondary</Badge>)

      expect(screen.getByText('Secondary')).toHaveClass('bg-accent-100')
    })

    it('should render success variant', () => {
      render(<Badge variant="success">Success</Badge>)

      expect(screen.getByText('Success')).toHaveClass('bg-success-light')
    })

    it('should render warning variant', () => {
      render(<Badge variant="warning">Warning</Badge>)

      expect(screen.getByText('Warning')).toHaveClass('bg-warning-light')
    })

    it('should render error variant', () => {
      render(<Badge variant="error">Error</Badge>)

      expect(screen.getByText('Error')).toHaveClass('bg-error-light')
    })

    it('should render outline variant', () => {
      render(<Badge variant="outline">Outline</Badge>)

      expect(screen.getByText('Outline')).toHaveClass('bg-transparent')
      expect(screen.getByText('Outline')).toHaveClass('border')
    })
  })

  describe('sizes', () => {
    it('should render medium size by default', () => {
      render(<Badge>Medium</Badge>)

      expect(screen.getByText('Medium')).toHaveClass('py-1')
    })

    it('should render small size', () => {
      render(<Badge size="sm">Small</Badge>)

      expect(screen.getByText('Small')).toHaveClass('py-0.5')
    })

    it('should render large size', () => {
      render(<Badge size="lg">Large</Badge>)

      expect(screen.getByText('Large')).toHaveClass('text-sm')
    })
  })

  describe('dot', () => {
    it('should not render dot by default', () => {
      const { container } = render(<Badge>No dot</Badge>)

      const dots = container.querySelectorAll('.rounded-full.bg-current')
      expect(dots.length).toBe(0)
    })

    it('should render dot when dot prop is true', () => {
      const { container } = render(<Badge dot>With dot</Badge>)

      const dots = container.querySelectorAll('.rounded-full.bg-current')
      expect(dots.length).toBe(1)
    })

    it('should render dot with correct size for small badge', () => {
      const { container } = render(<Badge dot size="sm">Small</Badge>)

      const dot = container.querySelector('.rounded-full.bg-current')
      expect(dot).toHaveClass('h-1.5')
      expect(dot).toHaveClass('w-1.5')
    })

    it('should render dot with correct size for medium badge', () => {
      const { container } = render(<Badge dot size="md">Medium</Badge>)

      const dot = container.querySelector('.rounded-full.bg-current')
      expect(dot).toHaveClass('h-2')
      expect(dot).toHaveClass('w-2')
    })

    it('should render dot with correct size for large badge', () => {
      const { container } = render(<Badge dot size="lg">Large</Badge>)

      const dot = container.querySelector('.rounded-full.bg-current')
      expect(dot).toHaveClass('h-2.5')
      expect(dot).toHaveClass('w-2.5')
    })
  })

  describe('icon', () => {
    it('should render icon when provided', () => {
      render(<Badge icon={<span data-testid="icon">*</span>}>With icon</Badge>)

      expect(screen.getByTestId('icon')).toBeInTheDocument()
    })
  })

  describe('className', () => {
    it('should merge custom className', () => {
      render(<Badge className="custom-class">Custom</Badge>)

      expect(screen.getByText('Custom')).toHaveClass('custom-class')
    })
  })
})

describe('BadgeGroup', () => {
  it('should render children', () => {
    render(
      <BadgeGroup>
        <Badge>One</Badge>
        <Badge>Two</Badge>
      </BadgeGroup>
    )

    expect(screen.getByText('One')).toBeInTheDocument()
    expect(screen.getByText('Two')).toBeInTheDocument()
  })

  it('should have flex layout', () => {
    const { container } = render(
      <BadgeGroup>
        <Badge>Badge</Badge>
      </BadgeGroup>
    )

    expect(container.firstChild).toHaveClass('flex')
    expect(container.firstChild).toHaveClass('flex-wrap')
    expect(container.firstChild).toHaveClass('gap-1.5')
  })

  it('should merge custom className', () => {
    const { container } = render(
      <BadgeGroup className="custom-group">
        <Badge>Badge</Badge>
      </BadgeGroup>
    )

    expect(container.firstChild).toHaveClass('custom-group')
  })
})

describe('NotificationBadge', () => {
  describe('rendering', () => {
    it('should render children', () => {
      render(
        <NotificationBadge count={5}>
          <span>Icon</span>
        </NotificationBadge>
      )

      expect(screen.getByText('Icon')).toBeInTheDocument()
    })

    it('should render count', () => {
      render(
        <NotificationBadge count={5}>
          <span>Icon</span>
        </NotificationBadge>
      )

      expect(screen.getByText('5')).toBeInTheDocument()
    })
  })

  describe('count display', () => {
    it('should not show badge when count is 0 and showZero is false', () => {
      render(
        <NotificationBadge count={0}>
          <span>Icon</span>
        </NotificationBadge>
      )

      expect(screen.queryByText('0')).not.toBeInTheDocument()
    })

    it('should show badge when count is 0 and showZero is true', () => {
      render(
        <NotificationBadge count={0} showZero>
          <span>Icon</span>
        </NotificationBadge>
      )

      expect(screen.getByText('0')).toBeInTheDocument()
    })

    it('should show count up to max value', () => {
      render(
        <NotificationBadge count={99} max={99}>
          <span>Icon</span>
        </NotificationBadge>
      )

      expect(screen.getByText('99')).toBeInTheDocument()
    })

    it('should show max+ when count exceeds max', () => {
      render(
        <NotificationBadge count={150} max={99}>
          <span>Icon</span>
        </NotificationBadge>
      )

      expect(screen.getByText('99+')).toBeInTheDocument()
    })

    it('should use default max of 99', () => {
      render(
        <NotificationBadge count={100}>
          <span>Icon</span>
        </NotificationBadge>
      )

      expect(screen.getByText('99+')).toBeInTheDocument()
    })
  })

  describe('sizes', () => {
    it('should render medium size by default', () => {
      render(
        <NotificationBadge count={5}>
          <span>Icon</span>
        </NotificationBadge>
      )

      expect(screen.getByText('5')).toHaveClass('h-5')
    })

    it('should render small size', () => {
      render(
        <NotificationBadge count={5} size="sm">
          <span>Icon</span>
        </NotificationBadge>
      )

      expect(screen.getByText('5')).toHaveClass('h-4')
    })
  })

  describe('className', () => {
    it('should merge custom className', () => {
      const { container } = render(
        <NotificationBadge count={1} className="custom-wrapper">
          <span>Icon</span>
        </NotificationBadge>
      )

      expect(container.firstChild).toHaveClass('custom-wrapper')
    })
  })
})
