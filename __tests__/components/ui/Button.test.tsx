/**
 * Unit tests for Button component
 *
 * Tests the Button UI component including variants, sizes,
 * interactive states, icons, and accessibility features.
 */

import React from 'react'
import { renderWithProviders, screen } from '../../utils/test-utils'
import { Button, type ButtonVariant, type ButtonSize } from '@/components/ui/Button'

describe('Button', () => {
  // ============================================================================
  // Default rendering
  // ============================================================================

  describe('default rendering', () => {
    it('renders with default primary variant', () => {
      renderWithProviders(<Button>Click me</Button>)
      const button = screen.getByRole('button', { name: 'Click me' })
      expect(button).toBeInTheDocument()
      // Primary variant has pink background
      expect(button).toHaveClass('bg-pink-500')
    })

    it('renders with default medium size', () => {
      renderWithProviders(<Button>Click me</Button>)
      const button = screen.getByRole('button', { name: 'Click me' })
      // Medium size has px-4 py-2
      expect(button).toHaveClass('px-4', 'py-2')
    })

    it('renders with type="button" by default', () => {
      renderWithProviders(<Button>Click me</Button>)
      const button = screen.getByRole('button', { name: 'Click me' })
      expect(button).toHaveAttribute('type', 'button')
    })

    it('renders children text content', () => {
      renderWithProviders(<Button>Submit Form</Button>)
      expect(screen.getByText('Submit Form')).toBeInTheDocument()
    })

    it('renders without fullWidth by default', () => {
      renderWithProviders(<Button>Click me</Button>)
      const button = screen.getByRole('button', { name: 'Click me' })
      expect(button).not.toHaveClass('w-full')
    })

    it('renders base styles correctly', () => {
      renderWithProviders(<Button>Click me</Button>)
      const button = screen.getByRole('button', { name: 'Click me' })
      // Check for base styles
      expect(button).toHaveClass('inline-flex', 'items-center', 'justify-center')
      expect(button).toHaveClass('font-medium', 'rounded-lg')
      expect(button).toHaveClass('transition-colors')
    })
  })

  // ============================================================================
  // Variant styles
  // ============================================================================

  describe('variant styles', () => {
    describe('primary variant', () => {
      it('renders with primary variant styles', () => {
        renderWithProviders(<Button variant="primary">Primary</Button>)
        const button = screen.getByRole('button', { name: 'Primary' })
        expect(button).toHaveClass('bg-pink-500', 'text-white')
      })

      it('has correct hover styles', () => {
        renderWithProviders(<Button variant="primary">Primary</Button>)
        const button = screen.getByRole('button', { name: 'Primary' })
        expect(button).toHaveClass('hover:bg-pink-600')
      })

      it('has correct focus ring color', () => {
        renderWithProviders(<Button variant="primary">Primary</Button>)
        const button = screen.getByRole('button', { name: 'Primary' })
        expect(button).toHaveClass('focus:ring-pink-500')
      })

      it('has correct active state styles', () => {
        renderWithProviders(<Button variant="primary">Primary</Button>)
        const button = screen.getByRole('button', { name: 'Primary' })
        expect(button).toHaveClass('active:bg-pink-700')
      })

      it('has correct disabled styles', () => {
        renderWithProviders(<Button variant="primary">Primary</Button>)
        const button = screen.getByRole('button', { name: 'Primary' })
        expect(button).toHaveClass('disabled:bg-pink-300')
      })
    })

    describe('secondary variant', () => {
      it('renders with secondary variant styles', () => {
        renderWithProviders(<Button variant="secondary">Secondary</Button>)
        const button = screen.getByRole('button', { name: 'Secondary' })
        expect(button).toHaveClass('bg-gray-100', 'text-gray-900')
      })

      it('has correct hover styles', () => {
        renderWithProviders(<Button variant="secondary">Secondary</Button>)
        const button = screen.getByRole('button', { name: 'Secondary' })
        expect(button).toHaveClass('hover:bg-gray-200')
      })

      it('has correct focus ring color', () => {
        renderWithProviders(<Button variant="secondary">Secondary</Button>)
        const button = screen.getByRole('button', { name: 'Secondary' })
        expect(button).toHaveClass('focus:ring-gray-500')
      })

      it('has dark mode styles', () => {
        renderWithProviders(<Button variant="secondary">Secondary</Button>)
        const button = screen.getByRole('button', { name: 'Secondary' })
        expect(button).toHaveClass('dark:bg-gray-800', 'dark:text-gray-100')
      })
    })

    describe('ghost variant', () => {
      it('renders with ghost variant styles', () => {
        renderWithProviders(<Button variant="ghost">Ghost</Button>)
        const button = screen.getByRole('button', { name: 'Ghost' })
        expect(button).toHaveClass('bg-transparent', 'text-gray-700')
      })

      it('has correct hover styles', () => {
        renderWithProviders(<Button variant="ghost">Ghost</Button>)
        const button = screen.getByRole('button', { name: 'Ghost' })
        expect(button).toHaveClass('hover:bg-gray-100')
      })

      it('has correct active state styles', () => {
        renderWithProviders(<Button variant="ghost">Ghost</Button>)
        const button = screen.getByRole('button', { name: 'Ghost' })
        expect(button).toHaveClass('active:bg-gray-200')
      })

      it('has dark mode styles', () => {
        renderWithProviders(<Button variant="ghost">Ghost</Button>)
        const button = screen.getByRole('button', { name: 'Ghost' })
        expect(button).toHaveClass('dark:text-gray-300', 'dark:hover:bg-gray-800')
      })
    })

    describe('danger variant', () => {
      it('renders with danger variant styles', () => {
        renderWithProviders(<Button variant="danger">Danger</Button>)
        const button = screen.getByRole('button', { name: 'Danger' })
        expect(button).toHaveClass('bg-red-500', 'text-white')
      })

      it('has correct hover styles', () => {
        renderWithProviders(<Button variant="danger">Danger</Button>)
        const button = screen.getByRole('button', { name: 'Danger' })
        expect(button).toHaveClass('hover:bg-red-600')
      })

      it('has correct focus ring color', () => {
        renderWithProviders(<Button variant="danger">Danger</Button>)
        const button = screen.getByRole('button', { name: 'Danger' })
        expect(button).toHaveClass('focus:ring-red-500')
      })

      it('has correct active state styles', () => {
        renderWithProviders(<Button variant="danger">Danger</Button>)
        const button = screen.getByRole('button', { name: 'Danger' })
        expect(button).toHaveClass('active:bg-red-700')
      })

      it('has correct disabled styles', () => {
        renderWithProviders(<Button variant="danger">Danger</Button>)
        const button = screen.getByRole('button', { name: 'Danger' })
        expect(button).toHaveClass('disabled:bg-red-300')
      })
    })

    describe('all variants render correctly', () => {
      const variants: ButtonVariant[] = ['primary', 'secondary', 'ghost', 'danger']

      variants.forEach((variant) => {
        it(`renders ${variant} variant without error`, () => {
          renderWithProviders(<Button variant={variant}>{variant}</Button>)
          const button = screen.getByRole('button', { name: variant })
          expect(button).toBeInTheDocument()
        })
      })
    })
  })

  // ============================================================================
  // Size styles
  // ============================================================================

  describe('size styles', () => {
    describe('small size', () => {
      it('renders with small size styles', () => {
        renderWithProviders(<Button size="sm">Small</Button>)
        const button = screen.getByRole('button', { name: 'Small' })
        expect(button).toHaveClass('px-3', 'py-1.5', 'text-sm', 'gap-1.5')
      })
    })

    describe('medium size', () => {
      it('renders with medium size styles', () => {
        renderWithProviders(<Button size="md">Medium</Button>)
        const button = screen.getByRole('button', { name: 'Medium' })
        expect(button).toHaveClass('px-4', 'py-2', 'text-base', 'gap-2')
      })
    })

    describe('large size', () => {
      it('renders with large size styles', () => {
        renderWithProviders(<Button size="lg">Large</Button>)
        const button = screen.getByRole('button', { name: 'Large' })
        expect(button).toHaveClass('px-6', 'py-3', 'text-lg', 'gap-2.5')
      })
    })

    describe('all sizes render correctly', () => {
      const sizes: ButtonSize[] = ['sm', 'md', 'lg']

      sizes.forEach((size) => {
        it(`renders ${size} size without error`, () => {
          renderWithProviders(<Button size={size}>{size}</Button>)
          const button = screen.getByRole('button', { name: size })
          expect(button).toBeInTheDocument()
        })
      })
    })
  })

  // ============================================================================
  // fullWidth prop
  // ============================================================================

  describe('fullWidth prop', () => {
    it('applies w-full class when fullWidth is true', () => {
      renderWithProviders(<Button fullWidth>Full Width</Button>)
      const button = screen.getByRole('button', { name: 'Full Width' })
      expect(button).toHaveClass('w-full')
    })

    it('does not apply w-full class when fullWidth is false', () => {
      renderWithProviders(<Button fullWidth={false}>Not Full</Button>)
      const button = screen.getByRole('button', { name: 'Not Full' })
      expect(button).not.toHaveClass('w-full')
    })

    it('works with different variants', () => {
      renderWithProviders(
        <Button variant="secondary" fullWidth>
          Secondary Full
        </Button>
      )
      const button = screen.getByRole('button', { name: 'Secondary Full' })
      expect(button).toHaveClass('w-full', 'bg-gray-100')
    })

    it('works with different sizes', () => {
      renderWithProviders(
        <Button size="lg" fullWidth>
          Large Full
        </Button>
      )
      const button = screen.getByRole('button', { name: 'Large Full' })
      expect(button).toHaveClass('w-full', 'px-6', 'py-3')
    })
  })

  // ============================================================================
  // Combined variant and size props
  // ============================================================================

  describe('combined variant and size props', () => {
    it('renders small primary button correctly', () => {
      renderWithProviders(
        <Button variant="primary" size="sm">
          Small Primary
        </Button>
      )
      const button = screen.getByRole('button', { name: 'Small Primary' })
      expect(button).toHaveClass('bg-pink-500', 'px-3', 'py-1.5')
    })

    it('renders large secondary button correctly', () => {
      renderWithProviders(
        <Button variant="secondary" size="lg">
          Large Secondary
        </Button>
      )
      const button = screen.getByRole('button', { name: 'Large Secondary' })
      expect(button).toHaveClass('bg-gray-100', 'px-6', 'py-3')
    })

    it('renders medium ghost button correctly', () => {
      renderWithProviders(
        <Button variant="ghost" size="md">
          Medium Ghost
        </Button>
      )
      const button = screen.getByRole('button', { name: 'Medium Ghost' })
      expect(button).toHaveClass('bg-transparent', 'px-4', 'py-2')
    })

    it('renders small danger button correctly', () => {
      renderWithProviders(
        <Button variant="danger" size="sm">
          Small Danger
        </Button>
      )
      const button = screen.getByRole('button', { name: 'Small Danger' })
      expect(button).toHaveClass('bg-red-500', 'px-3', 'py-1.5')
    })
  })

  // ============================================================================
  // Interactive states
  // ============================================================================

  describe('interactive states', () => {
    describe('click handlers', () => {
      it('calls onClick handler when clicked', async () => {
        const handleClick = jest.fn()
        const { user } = renderWithProviders(
          <Button onClick={handleClick}>Click me</Button>
        )
        const button = screen.getByRole('button', { name: 'Click me' })

        await user.click(button)

        expect(handleClick).toHaveBeenCalledTimes(1)
      })

      it('calls onClick handler multiple times when clicked multiple times', async () => {
        const handleClick = jest.fn()
        const { user } = renderWithProviders(
          <Button onClick={handleClick}>Click me</Button>
        )
        const button = screen.getByRole('button', { name: 'Click me' })

        await user.click(button)
        await user.click(button)
        await user.click(button)

        expect(handleClick).toHaveBeenCalledTimes(3)
      })

      it('passes event object to onClick handler', async () => {
        const handleClick = jest.fn()
        const { user } = renderWithProviders(
          <Button onClick={handleClick}>Click me</Button>
        )
        const button = screen.getByRole('button', { name: 'Click me' })

        await user.click(button)

        expect(handleClick).toHaveBeenCalledWith(expect.any(Object))
        expect(handleClick.mock.calls[0][0]).toHaveProperty('type', 'click')
      })

      it('works with all variants', async () => {
        const variants = ['primary', 'secondary', 'ghost', 'danger'] as const

        for (const variant of variants) {
          const handleClick = jest.fn()
          const { user, unmount } = renderWithProviders(
            <Button variant={variant} onClick={handleClick}>
              {variant}
            </Button>
          )
          const button = screen.getByRole('button', { name: variant })

          await user.click(button)

          expect(handleClick).toHaveBeenCalledTimes(1)
          unmount()
        }
      })
    })

    describe('disabled state', () => {
      it('does not call onClick when disabled', async () => {
        const handleClick = jest.fn()
        const { user } = renderWithProviders(
          <Button disabled onClick={handleClick}>
            Disabled
          </Button>
        )
        const button = screen.getByRole('button', { name: 'Disabled' })

        await user.click(button)

        expect(handleClick).not.toHaveBeenCalled()
      })

      it('has disabled attribute when disabled prop is true', () => {
        renderWithProviders(<Button disabled>Disabled</Button>)
        const button = screen.getByRole('button', { name: 'Disabled' })
        expect(button).toBeDisabled()
      })

      it('has disabled cursor class when disabled', () => {
        renderWithProviders(<Button disabled>Disabled</Button>)
        const button = screen.getByRole('button', { name: 'Disabled' })
        expect(button).toHaveClass('disabled:cursor-not-allowed')
      })

      it('has disabled styles for primary variant', () => {
        renderWithProviders(
          <Button variant="primary" disabled>
            Disabled
          </Button>
        )
        const button = screen.getByRole('button', { name: 'Disabled' })
        expect(button).toHaveClass('disabled:bg-pink-300')
      })

      it('has disabled styles for secondary variant', () => {
        renderWithProviders(
          <Button variant="secondary" disabled>
            Disabled
          </Button>
        )
        const button = screen.getByRole('button', { name: 'Disabled' })
        expect(button).toHaveClass('disabled:bg-gray-50', 'disabled:text-gray-400')
      })

      it('has disabled styles for ghost variant', () => {
        renderWithProviders(
          <Button variant="ghost" disabled>
            Disabled
          </Button>
        )
        const button = screen.getByRole('button', { name: 'Disabled' })
        expect(button).toHaveClass('disabled:text-gray-400')
      })

      it('has disabled styles for danger variant', () => {
        renderWithProviders(
          <Button variant="danger" disabled>
            Disabled
          </Button>
        )
        const button = screen.getByRole('button', { name: 'Disabled' })
        expect(button).toHaveClass('disabled:bg-red-300')
      })
    })

    describe('loading state', () => {
      it('shows loading spinner when isLoading is true', () => {
        renderWithProviders(<Button isLoading>Loading</Button>)
        const button = screen.getByRole('button', { name: 'Loading' })

        // Check for SVG spinner element
        const spinner = button.querySelector('svg')
        expect(spinner).toBeInTheDocument()
        expect(spinner).toHaveClass('animate-spin')
      })

      it('disables the button when isLoading is true', () => {
        renderWithProviders(<Button isLoading>Loading</Button>)
        const button = screen.getByRole('button', { name: 'Loading' })
        expect(button).toBeDisabled()
      })

      it('does not call onClick when loading', async () => {
        const handleClick = jest.fn()
        const { user } = renderWithProviders(
          <Button isLoading onClick={handleClick}>
            Loading
          </Button>
        )
        const button = screen.getByRole('button', { name: 'Loading' })

        await user.click(button)

        expect(handleClick).not.toHaveBeenCalled()
      })

      it('sets aria-busy to true when loading', () => {
        renderWithProviders(<Button isLoading>Loading</Button>)
        const button = screen.getByRole('button', { name: 'Loading' })
        expect(button).toHaveAttribute('aria-busy', 'true')
      })

      it('sets aria-busy to false when not loading', () => {
        renderWithProviders(<Button>Not Loading</Button>)
        const button = screen.getByRole('button', { name: 'Not Loading' })
        expect(button).toHaveAttribute('aria-busy', 'false')
      })

      it('still renders children text when loading', () => {
        renderWithProviders(<Button isLoading>Submit</Button>)
        expect(screen.getByText('Submit')).toBeInTheDocument()
      })

      it('does not show leftIcon when loading', () => {
        const leftIcon = <span data-testid="left-icon">←</span>
        renderWithProviders(
          <Button isLoading leftIcon={leftIcon}>
            Loading
          </Button>
        )

        expect(screen.queryByTestId('left-icon')).not.toBeInTheDocument()
      })

      it('does not show rightIcon when loading', () => {
        const rightIcon = <span data-testid="right-icon">→</span>
        renderWithProviders(
          <Button isLoading rightIcon={rightIcon}>
            Loading
          </Button>
        )

        expect(screen.queryByTestId('right-icon')).not.toBeInTheDocument()
      })

      describe('loading spinner sizes', () => {
        it('shows small spinner for small button', () => {
          renderWithProviders(
            <Button size="sm" isLoading>
              Small
            </Button>
          )
          const spinner = screen.getByRole('button', { name: 'Small' }).querySelector('svg')
          expect(spinner).toHaveClass('h-3', 'w-3')
        })

        it('shows medium spinner for medium button', () => {
          renderWithProviders(
            <Button size="md" isLoading>
              Medium
            </Button>
          )
          const spinner = screen.getByRole('button', { name: 'Medium' }).querySelector('svg')
          expect(spinner).toHaveClass('h-4', 'w-4')
        })

        it('shows large spinner for large button', () => {
          renderWithProviders(
            <Button size="lg" isLoading>
              Large
            </Button>
          )
          const spinner = screen.getByRole('button', { name: 'Large' }).querySelector('svg')
          expect(spinner).toHaveClass('h-5', 'w-5')
        })
      })

      it('spinner has aria-hidden attribute', () => {
        renderWithProviders(<Button isLoading>Loading</Button>)
        const spinner = screen.getByRole('button', { name: 'Loading' }).querySelector('svg')
        expect(spinner).toHaveAttribute('aria-hidden', 'true')
      })
    })

    describe('combined disabled and loading states', () => {
      it('is disabled when both disabled and isLoading are true', () => {
        renderWithProviders(
          <Button disabled isLoading>
            Both
          </Button>
        )
        const button = screen.getByRole('button', { name: 'Both' })
        expect(button).toBeDisabled()
      })

      it('shows spinner when both disabled and isLoading are true', () => {
        renderWithProviders(
          <Button disabled isLoading>
            Both
          </Button>
        )
        const spinner = screen.getByRole('button', { name: 'Both' }).querySelector('svg')
        expect(spinner).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Icon props
  // ============================================================================

  describe('icon props', () => {
    describe('leftIcon', () => {
      it('renders leftIcon on the left side', () => {
        const leftIcon = <span data-testid="left-icon">←</span>
        renderWithProviders(<Button leftIcon={leftIcon}>Click me</Button>)

        const icon = screen.getByTestId('left-icon')
        expect(icon).toBeInTheDocument()
        expect(icon.textContent).toBe('←')
      })

      it('renders leftIcon before children text', () => {
        const leftIcon = <span data-testid="left-icon">←</span>
        renderWithProviders(<Button leftIcon={leftIcon}>Click me</Button>)

        const button = screen.getByRole('button', { name: 'Click me' })
        const iconContainer = screen.getByTestId('left-icon').parentElement

        // Icon container should be before children container
        const children = Array.from(button.children)
        const iconIndex = children.indexOf(iconContainer!)
        const textIndex = children.findIndex((el) => el.textContent === 'Click me')
        expect(iconIndex).toBeLessThan(textIndex)
      })

      it('wraps leftIcon in flex-shrink-0 container', () => {
        const leftIcon = <span data-testid="left-icon">←</span>
        renderWithProviders(<Button leftIcon={leftIcon}>Click me</Button>)

        const iconContainer = screen.getByTestId('left-icon').parentElement
        expect(iconContainer).toHaveClass('flex-shrink-0')
      })

      it('renders leftIcon with different variants', () => {
        const leftIcon = <span data-testid="left-icon">←</span>
        renderWithProviders(
          <Button variant="secondary" leftIcon={leftIcon}>
            Secondary
          </Button>
        )

        expect(screen.getByTestId('left-icon')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Secondary' })).toHaveClass('bg-gray-100')
      })

      it('renders leftIcon with different sizes', () => {
        const leftIcon = <span data-testid="left-icon">←</span>
        renderWithProviders(
          <Button size="lg" leftIcon={leftIcon}>
            Large
          </Button>
        )

        expect(screen.getByTestId('left-icon')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Large' })).toHaveClass('px-6', 'py-3')
      })

      it('renders complex leftIcon elements', () => {
        const leftIcon = (
          <svg data-testid="left-icon-svg" viewBox="0 0 24 24">
            <path d="M12 0L24 24H0z" />
          </svg>
        )
        renderWithProviders(<Button leftIcon={leftIcon}>With SVG</Button>)

        expect(screen.getByTestId('left-icon-svg')).toBeInTheDocument()
      })
    })

    describe('rightIcon', () => {
      it('renders rightIcon on the right side', () => {
        const rightIcon = <span data-testid="right-icon">→</span>
        renderWithProviders(<Button rightIcon={rightIcon}>Click me</Button>)

        const icon = screen.getByTestId('right-icon')
        expect(icon).toBeInTheDocument()
        expect(icon.textContent).toBe('→')
      })

      it('renders rightIcon after children text', () => {
        const rightIcon = <span data-testid="right-icon">→</span>
        renderWithProviders(<Button rightIcon={rightIcon}>Click me</Button>)

        const button = screen.getByRole('button', { name: 'Click me' })
        const iconContainer = screen.getByTestId('right-icon').parentElement

        // Icon container should be after children container
        const children = Array.from(button.children)
        const iconIndex = children.indexOf(iconContainer!)
        const textIndex = children.findIndex((el) => el.textContent === 'Click me')
        expect(iconIndex).toBeGreaterThan(textIndex)
      })

      it('wraps rightIcon in flex-shrink-0 container', () => {
        const rightIcon = <span data-testid="right-icon">→</span>
        renderWithProviders(<Button rightIcon={rightIcon}>Click me</Button>)

        const iconContainer = screen.getByTestId('right-icon').parentElement
        expect(iconContainer).toHaveClass('flex-shrink-0')
      })

      it('renders rightIcon with different variants', () => {
        const rightIcon = <span data-testid="right-icon">→</span>
        renderWithProviders(
          <Button variant="danger" rightIcon={rightIcon}>
            Danger
          </Button>
        )

        expect(screen.getByTestId('right-icon')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Danger' })).toHaveClass('bg-red-500')
      })

      it('renders rightIcon with different sizes', () => {
        const rightIcon = <span data-testid="right-icon">→</span>
        renderWithProviders(
          <Button size="sm" rightIcon={rightIcon}>
            Small
          </Button>
        )

        expect(screen.getByTestId('right-icon')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Small' })).toHaveClass('px-3', 'py-1.5')
      })

      it('renders complex rightIcon elements', () => {
        const rightIcon = (
          <svg data-testid="right-icon-svg" viewBox="0 0 24 24">
            <path d="M12 0L24 24H0z" />
          </svg>
        )
        renderWithProviders(<Button rightIcon={rightIcon}>With SVG</Button>)

        expect(screen.getByTestId('right-icon-svg')).toBeInTheDocument()
      })
    })

    describe('both icons', () => {
      it('renders both leftIcon and rightIcon simultaneously', () => {
        const leftIcon = <span data-testid="left-icon">←</span>
        const rightIcon = <span data-testid="right-icon">→</span>
        renderWithProviders(
          <Button leftIcon={leftIcon} rightIcon={rightIcon}>
            Both Icons
          </Button>
        )

        expect(screen.getByTestId('left-icon')).toBeInTheDocument()
        expect(screen.getByTestId('right-icon')).toBeInTheDocument()
      })

      it('renders icons in correct order: left, text, right', () => {
        const leftIcon = <span data-testid="left-icon">←</span>
        const rightIcon = <span data-testid="right-icon">→</span>
        renderWithProviders(
          <Button leftIcon={leftIcon} rightIcon={rightIcon}>
            Text
          </Button>
        )

        const button = screen.getByRole('button', { name: 'Text' })
        const children = Array.from(button.children)
        const leftContainer = screen.getByTestId('left-icon').parentElement
        const rightContainer = screen.getByTestId('right-icon').parentElement

        const leftIndex = children.indexOf(leftContainer!)
        const rightIndex = children.indexOf(rightContainer!)
        const textIndex = children.findIndex((el) => el.textContent === 'Text')

        expect(leftIndex).toBeLessThan(textIndex)
        expect(textIndex).toBeLessThan(rightIndex)
      })

      it('both icons have flex-shrink-0 containers', () => {
        const leftIcon = <span data-testid="left-icon">←</span>
        const rightIcon = <span data-testid="right-icon">→</span>
        renderWithProviders(
          <Button leftIcon={leftIcon} rightIcon={rightIcon}>
            Both
          </Button>
        )

        expect(screen.getByTestId('left-icon').parentElement).toHaveClass('flex-shrink-0')
        expect(screen.getByTestId('right-icon').parentElement).toHaveClass('flex-shrink-0')
      })
    })
  })

  // ============================================================================
  // Ref forwarding
  // ============================================================================

  describe('ref forwarding', () => {
    it('forwards ref to the button element', () => {
      const ref = React.createRef<HTMLButtonElement>()
      renderWithProviders(<Button ref={ref}>Click me</Button>)

      expect(ref.current).toBeInstanceOf(HTMLButtonElement)
      expect(ref.current?.tagName).toBe('BUTTON')
    })

    it('ref allows programmatic focus', () => {
      const ref = React.createRef<HTMLButtonElement>()
      renderWithProviders(<Button ref={ref}>Focusable</Button>)

      ref.current?.focus()

      expect(document.activeElement).toBe(ref.current)
    })

    it('ref allows programmatic click', async () => {
      const handleClick = jest.fn()
      const ref = React.createRef<HTMLButtonElement>()
      renderWithProviders(
        <Button ref={ref} onClick={handleClick}>
          Clickable
        </Button>
      )

      ref.current?.click()

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('ref works with different variants', () => {
      const ref = React.createRef<HTMLButtonElement>()
      renderWithProviders(
        <Button ref={ref} variant="secondary">
          Secondary
        </Button>
      )

      expect(ref.current).toBeInstanceOf(HTMLButtonElement)
      expect(ref.current).toHaveClass('bg-gray-100')
    })

    it('ref works with disabled button', () => {
      const ref = React.createRef<HTMLButtonElement>()
      renderWithProviders(
        <Button ref={ref} disabled>
          Disabled
        </Button>
      )

      expect(ref.current).toBeInstanceOf(HTMLButtonElement)
      expect(ref.current).toBeDisabled()
    })

    it('ref works with loading button', () => {
      const ref = React.createRef<HTMLButtonElement>()
      renderWithProviders(
        <Button ref={ref} isLoading>
          Loading
        </Button>
      )

      expect(ref.current).toBeInstanceOf(HTMLButtonElement)
      expect(ref.current).toHaveAttribute('aria-busy', 'true')
    })

    it('ref allows reading button properties', () => {
      const ref = React.createRef<HTMLButtonElement>()
      renderWithProviders(
        <Button ref={ref} type="submit">
          Submit
        </Button>
      )

      expect(ref.current?.type).toBe('submit')
      expect(ref.current?.textContent).toContain('Submit')
    })

    it('callback ref works correctly', () => {
      let buttonElement: HTMLButtonElement | null = null
      const callbackRef = (el: HTMLButtonElement | null) => {
        buttonElement = el
      }

      renderWithProviders(<Button ref={callbackRef}>Callback Ref</Button>)

      expect(buttonElement).toBeInstanceOf(HTMLButtonElement)
      expect((buttonElement as HTMLButtonElement | null)?.tagName).toBe('BUTTON')
    })
  })

  // ============================================================================
  // Custom className prop
  // ============================================================================

  describe('custom className prop', () => {
    it('applies custom className to button', () => {
      renderWithProviders(<Button className="custom-class">Custom</Button>)
      const button = screen.getByRole('button', { name: 'Custom' })
      expect(button).toHaveClass('custom-class')
    })

    it('preserves base styles when custom className is applied', () => {
      renderWithProviders(<Button className="my-custom-class">Custom</Button>)
      const button = screen.getByRole('button', { name: 'Custom' })

      // Check that base styles are preserved
      expect(button).toHaveClass('inline-flex', 'items-center', 'justify-center')
      expect(button).toHaveClass('my-custom-class')
    })

    it('preserves variant styles when custom className is applied', () => {
      renderWithProviders(
        <Button variant="primary" className="extra-class">
          Primary
        </Button>
      )
      const button = screen.getByRole('button', { name: 'Primary' })

      expect(button).toHaveClass('bg-pink-500', 'extra-class')
    })

    it('preserves size styles when custom className is applied', () => {
      renderWithProviders(
        <Button size="lg" className="extra-class">
          Large
        </Button>
      )
      const button = screen.getByRole('button', { name: 'Large' })

      expect(button).toHaveClass('px-6', 'py-3', 'extra-class')
    })

    it('applies multiple custom classes', () => {
      renderWithProviders(
        <Button className="class-one class-two class-three">Multi</Button>
      )
      const button = screen.getByRole('button', { name: 'Multi' })

      expect(button).toHaveClass('class-one', 'class-two', 'class-three')
    })

    it('works with fullWidth prop', () => {
      renderWithProviders(
        <Button fullWidth className="additional-class">
          Full Width
        </Button>
      )
      const button = screen.getByRole('button', { name: 'Full Width' })

      expect(button).toHaveClass('w-full', 'additional-class')
    })

    it('works with icons and custom className', () => {
      const leftIcon = <span data-testid="icon">★</span>
      renderWithProviders(
        <Button leftIcon={leftIcon} className="starred-button">
          Starred
        </Button>
      )
      const button = screen.getByRole('button', { name: 'Starred' })

      expect(button).toHaveClass('starred-button')
      expect(screen.getByTestId('icon')).toBeInTheDocument()
    })

    it('handles empty className gracefully', () => {
      renderWithProviders(<Button className="">Empty Class</Button>)
      const button = screen.getByRole('button', { name: 'Empty Class' })

      expect(button).toBeInTheDocument()
      expect(button).toHaveClass('inline-flex') // Base class still present
    })
  })
})
