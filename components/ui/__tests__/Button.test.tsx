/**
 * Tests for components/ui/Button.tsx
 *
 * Tests the Button component with various variants, sizes, and states.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '../Button'

describe('Button', () => {
  describe('rendering', () => {
    it('should render children text', () => {
      render(<Button>Click me</Button>)

      expect(screen.getByText('Click me')).toBeInTheDocument()
    })

    it('should render as a button element', () => {
      render(<Button>Button</Button>)

      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('should have type="button" by default', () => {
      render(<Button>Button</Button>)

      expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
    })

    it('should accept type prop', () => {
      render(<Button type="submit">Submit</Button>)

      expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
    })
  })

  describe('variants', () => {
    it('should render primary variant by default', () => {
      render(<Button>Primary</Button>)

      const button = screen.getByRole('button')
      expect(button.className).toContain('bg-gradient-to-br')
      expect(button.className).toContain('from-primary')
    })

    it('should render secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>)

      const button = screen.getByRole('button')
      expect(button.className).toContain('bg-neutral-100')
    })

    it('should render outline variant', () => {
      render(<Button variant="outline">Outline</Button>)

      const button = screen.getByRole('button')
      expect(button.className).toContain('border-primary-500')
    })

    it('should render ghost variant', () => {
      render(<Button variant="ghost">Ghost</Button>)

      const button = screen.getByRole('button')
      expect(button.className).toContain('bg-transparent')
    })

    it('should render danger variant', () => {
      render(<Button variant="danger">Danger</Button>)

      const button = screen.getByRole('button')
      expect(button.className).toContain('from-error')
    })
  })

  describe('sizes', () => {
    it('should render medium size by default', () => {
      render(<Button>Medium</Button>)

      const button = screen.getByRole('button')
      expect(button.className).toContain('py-2.5')
      expect(button.className).toContain('text-base')
    })

    it('should render small size', () => {
      render(<Button size="sm">Small</Button>)

      const button = screen.getByRole('button')
      expect(button.className).toContain('py-2')
      expect(button.className).toContain('text-sm')
    })

    it('should render large size', () => {
      render(<Button size="lg">Large</Button>)

      const button = screen.getByRole('button')
      expect(button.className).toContain('py-3.5')
      expect(button.className).toContain('text-lg')
    })
  })

  describe('states', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled</Button>)

      expect(screen.getByRole('button')).toBeDisabled()
    })

    it('should be disabled when isLoading is true', () => {
      render(<Button isLoading>Loading</Button>)

      expect(screen.getByRole('button')).toBeDisabled()
    })

    it('should show loading spinner when isLoading is true', () => {
      render(<Button isLoading>Loading</Button>)

      expect(screen.getByRole('button').querySelector('svg')).toBeInTheDocument()
    })

    it('should have aria-busy when loading', () => {
      render(<Button isLoading>Loading</Button>)

      expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true')
    })
  })

  describe('icons', () => {
    it('should render left icon', () => {
      render(
        <Button leftIcon={<span data-testid="left-icon">L</span>}>
          With Icon
        </Button>
      )

      expect(screen.getByTestId('left-icon')).toBeInTheDocument()
    })

    it('should render right icon', () => {
      render(
        <Button rightIcon={<span data-testid="right-icon">R</span>}>
          With Icon
        </Button>
      )

      expect(screen.getByTestId('right-icon')).toBeInTheDocument()
    })

    it('should render both icons', () => {
      render(
        <Button
          leftIcon={<span data-testid="left-icon">L</span>}
          rightIcon={<span data-testid="right-icon">R</span>}
        >
          With Icons
        </Button>
      )

      expect(screen.getByTestId('left-icon')).toBeInTheDocument()
      expect(screen.getByTestId('right-icon')).toBeInTheDocument()
    })

    it('should not render icons when loading', () => {
      render(
        <Button
          isLoading
          leftIcon={<span data-testid="left-icon">L</span>}
          rightIcon={<span data-testid="right-icon">R</span>}
        >
          Loading
        </Button>
      )

      expect(screen.queryByTestId('left-icon')).not.toBeInTheDocument()
      expect(screen.queryByTestId('right-icon')).not.toBeInTheDocument()
    })
  })

  describe('fullWidth', () => {
    it('should not be full width by default', () => {
      render(<Button>Button</Button>)

      expect(screen.getByRole('button').className).not.toContain('w-full')
    })

    it('should be full width when fullWidth is true', () => {
      render(<Button fullWidth>Full Width</Button>)

      expect(screen.getByRole('button').className).toContain('w-full')
    })
  })

  describe('events', () => {
    it('should call onClick when clicked', () => {
      const handleClick = vi.fn()
      render(<Button onClick={handleClick}>Click</Button>)

      fireEvent.click(screen.getByRole('button'))

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should not call onClick when disabled', () => {
      const handleClick = vi.fn()
      render(
        <Button disabled onClick={handleClick}>
          Disabled
        </Button>
      )

      fireEvent.click(screen.getByRole('button'))

      expect(handleClick).not.toHaveBeenCalled()
    })

    it('should not call onClick when loading', () => {
      const handleClick = vi.fn()
      render(
        <Button isLoading onClick={handleClick}>
          Loading
        </Button>
      )

      fireEvent.click(screen.getByRole('button'))

      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  describe('className', () => {
    it('should merge custom className', () => {
      render(<Button className="custom-class">Custom</Button>)

      expect(screen.getByRole('button').className).toContain('custom-class')
    })
  })

  describe('ref forwarding', () => {
    it('should forward ref to button element', () => {
      const ref = { current: null as HTMLButtonElement | null }
      render(<Button ref={ref}>Ref</Button>)

      expect(ref.current).toBeInstanceOf(HTMLButtonElement)
    })
  })

  describe('displayName', () => {
    it('should have displayName', () => {
      expect(Button.displayName).toBe('Button')
    })
  })
})
