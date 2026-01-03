/**
 * Unit tests for Button component
 *
 * Tests the Button UI component including variants, sizes,
 * interactive states, icons, and accessibility features.
 */

import React from 'react'
import { describe, it, expect, vi } from 'vitest'
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
      // Primary variant has gradient background
      expect(button).toHaveClass('bg-gradient-to-br')
    })

    it('renders with default medium size', () => {
      renderWithProviders(<Button>Click me</Button>)
      const button = screen.getByRole('button', { name: 'Click me' })
      // Medium size has px-5 py-2.5
      expect(button).toHaveClass('px-5', 'py-2.5')
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
      expect(button).toHaveClass('font-semibold')
      expect(button).toHaveClass('transition-all')
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
        expect(button).toHaveClass('bg-gradient-to-br', 'text-white')
      })

      it('has correct hover styles', () => {
        renderWithProviders(<Button variant="primary">Primary</Button>)
        const button = screen.getByRole('button', { name: 'Primary' })
        expect(button).toHaveClass('hover:shadow-lg')
      })

      it('has correct focus ring color', () => {
        renderWithProviders(<Button variant="primary">Primary</Button>)
        const button = screen.getByRole('button', { name: 'Primary' })
        expect(button).toHaveClass('focus-visible:ring-primary-500')
      })

      it('has correct active state styles', () => {
        renderWithProviders(<Button variant="primary">Primary</Button>)
        const button = screen.getByRole('button', { name: 'Primary' })
        expect(button).toHaveClass('active:scale-[0.98]')
      })

      it('has correct disabled styles', () => {
        renderWithProviders(<Button variant="primary">Primary</Button>)
        const button = screen.getByRole('button', { name: 'Primary' })
        expect(button).toHaveClass('disabled:from-primary-200')
      })
    })

    describe('secondary variant', () => {
      it('renders with secondary variant styles', () => {
        renderWithProviders(<Button variant="secondary">Secondary</Button>)
        const button = screen.getByRole('button', { name: 'Secondary' })
        expect(button).toHaveClass('bg-neutral-100', 'text-neutral-900')
      })

      it('has correct hover styles', () => {
        renderWithProviders(<Button variant="secondary">Secondary</Button>)
        const button = screen.getByRole('button', { name: 'Secondary' })
        expect(button).toHaveClass('hover:bg-neutral-200')
      })

      it('has correct focus ring color', () => {
        renderWithProviders(<Button variant="secondary">Secondary</Button>)
        const button = screen.getByRole('button', { name: 'Secondary' })
        expect(button).toHaveClass('focus-visible:ring-neutral-400')
      })

      it('has dark mode styles', () => {
        renderWithProviders(<Button variant="secondary">Secondary</Button>)
        const button = screen.getByRole('button', { name: 'Secondary' })
        expect(button).toHaveClass('dark:bg-neutral-800', 'dark:text-neutral-100')
      })
    })

    describe('ghost variant', () => {
      it('renders with ghost variant styles', () => {
        renderWithProviders(<Button variant="ghost">Ghost</Button>)
        const button = screen.getByRole('button', { name: 'Ghost' })
        expect(button).toHaveClass('bg-transparent', 'text-neutral-700')
      })

      it('has correct hover styles', () => {
        renderWithProviders(<Button variant="ghost">Ghost</Button>)
        const button = screen.getByRole('button', { name: 'Ghost' })
        expect(button).toHaveClass('hover:bg-neutral-100')
      })

      it('has correct active state styles', () => {
        renderWithProviders(<Button variant="ghost">Ghost</Button>)
        const button = screen.getByRole('button', { name: 'Ghost' })
        expect(button).toHaveClass('active:bg-neutral-200')
      })

      it('has dark mode styles', () => {
        renderWithProviders(<Button variant="ghost">Ghost</Button>)
        const button = screen.getByRole('button', { name: 'Ghost' })
        expect(button).toHaveClass('dark:text-neutral-300', 'dark:hover:bg-neutral-800')
      })
    })

    describe('danger variant', () => {
      it('renders with danger variant styles', () => {
        renderWithProviders(<Button variant="danger">Danger</Button>)
        const button = screen.getByRole('button', { name: 'Danger' })
        expect(button).toHaveClass('bg-gradient-to-br', 'from-error', 'to-error-dark', 'text-white')
      })

      it('has correct hover styles', () => {
        renderWithProviders(<Button variant="danger">Danger</Button>)
        const button = screen.getByRole('button', { name: 'Danger' })
        expect(button).toHaveClass('hover:shadow-lg', 'hover:shadow-error/25')
      })

      it('has correct focus ring color', () => {
        renderWithProviders(<Button variant="danger">Danger</Button>)
        const button = screen.getByRole('button', { name: 'Danger' })
        expect(button).toHaveClass('focus-visible:ring-error')
      })

      it('has correct active state styles', () => {
        renderWithProviders(<Button variant="danger">Danger</Button>)
        const button = screen.getByRole('button', { name: 'Danger' })
        expect(button).toHaveClass('active:from-error-dark', 'active:to-red-800')
      })

      it('has correct disabled styles', () => {
        renderWithProviders(<Button variant="danger">Danger</Button>)
        const button = screen.getByRole('button', { name: 'Danger' })
        expect(button).toHaveClass('disabled:from-red-200', 'disabled:to-red-300')
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
        expect(button).toHaveClass('px-4', 'py-2', 'text-sm', 'gap-1.5', 'rounded-[12px]')
      })
    })

    describe('medium size', () => {
      it('renders with medium size styles', () => {
        renderWithProviders(<Button size="md">Medium</Button>)
        const button = screen.getByRole('button', { name: 'Medium' })
        expect(button).toHaveClass('px-5', 'py-2.5', 'text-base', 'gap-2', 'rounded-[14px]')
      })
    })

    describe('large size', () => {
      it('renders with large size styles', () => {
        renderWithProviders(<Button size="lg">Large</Button>)
        const button = screen.getByRole('button', { name: 'Large' })
        expect(button).toHaveClass('px-7', 'py-3.5', 'text-lg', 'gap-2.5', 'rounded-[16px]')
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
      expect(button).toHaveClass('w-full', 'bg-neutral-100')
    })

    it('works with different sizes', () => {
      renderWithProviders(
        <Button size="lg" fullWidth>
          Large Full
        </Button>
      )
      const button = screen.getByRole('button', { name: 'Large Full' })
      expect(button).toHaveClass('w-full', 'px-7', 'py-3.5')
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
      expect(button).toHaveClass('bg-gradient-to-br', 'px-4', 'py-2', 'rounded-[12px]')
    })

    it('renders large secondary button correctly', () => {
      renderWithProviders(
        <Button variant="secondary" size="lg">
          Large Secondary
        </Button>
      )
      const button = screen.getByRole('button', { name: 'Large Secondary' })
      expect(button).toHaveClass('bg-neutral-100', 'px-7', 'py-3.5', 'rounded-[16px]')
    })

    it('renders medium ghost button correctly', () => {
      renderWithProviders(
        <Button variant="ghost" size="md">
          Medium Ghost
        </Button>
      )
      const button = screen.getByRole('button', { name: 'Medium Ghost' })
      expect(button).toHaveClass('bg-transparent', 'px-5', 'py-2.5', 'rounded-[14px]')
    })

    it('renders small danger button correctly', () => {
      renderWithProviders(
        <Button variant="danger" size="sm">
          Small Danger
        </Button>
      )
      const button = screen.getByRole('button', { name: 'Small Danger' })
      expect(button).toHaveClass('from-error', 'px-4', 'py-2', 'rounded-[12px]')
    })
  })

  // ============================================================================
  // Interactive states
  // ============================================================================

  describe('interactive states', () => {
    describe('click handlers', () => {
      it('calls onClick handler when clicked', async () => {
        const handleClick = vi.fn()
        const { user } = renderWithProviders(
          <Button onClick={handleClick}>Click me</Button>
        )
        const button = screen.getByRole('button', { name: 'Click me' })

        await user.click(button)

        expect(handleClick).toHaveBeenCalledTimes(1)
      })

      it('calls onClick handler multiple times when clicked multiple times', async () => {
        const handleClick = vi.fn()
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
        const handleClick = vi.fn()
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
          const handleClick = vi.fn()
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
        const handleClick = vi.fn()
        const { user } = renderWithProviders(
          <Button disabled onClick={handleClick}>
            Disabled
          </Button>
        )
        const button = screen.getByRole('button', { name: 'Disabled' })

        await user.click(button)

        expect(handleClick).not.toHaveBeenCalled()
      })

      it('is not focusable when disabled', () => {
        renderWithProviders(<Button disabled>Disabled</Button>)
        const button = screen.getByRole('button', { name: 'Disabled' })
        expect(button).toBeDisabled()
      })

      it('is focusable when not disabled', () => {
        renderWithProviders(<Button>Enabled</Button>)
        const button = screen.getByRole('button', { name: 'Enabled' })
        expect(button).not.toBeDisabled()
      })

      it('has disabled attribute', () => {
        renderWithProviders(<Button disabled>Disabled</Button>)
        const button = screen.getByRole('button', { name: 'Disabled' })
        expect(button).toHaveAttribute('disabled')
      })
    })

    describe('focus styles', () => {
      it('has focus ring classes', () => {
        renderWithProviders(<Button>Focus me</Button>)
        const button = screen.getByRole('button', { name: 'Focus me' })
        expect(button).toHaveClass('focus-visible:ring-2', 'focus-visible:ring-offset-2', 'focus:outline-none')
      })

      it('has correct focus ring color for each variant', () => {
        const variantRingColors = {
          primary: 'focus-visible:ring-primary-500',
          secondary: 'focus-visible:ring-neutral-400',
          ghost: 'focus-visible:ring-neutral-400',
          danger: 'focus-visible:ring-error',
        }

        Object.entries(variantRingColors).forEach(([variant, ringColor]) => {
          const { unmount } = renderWithProviders(
            <Button variant={variant as ButtonVariant}>{variant}</Button>
          )
          const button = screen.getByRole('button', { name: variant })
          expect(button).toHaveClass(ringColor)
          unmount()
        })
      })
    })

    describe('keyboard interactions', () => {
      it('can be focused via keyboard', () => {
        renderWithProviders(<Button>Keyboard Focus</Button>)
        const button = screen.getByRole('button', { name: 'Keyboard Focus' })
        button.focus()
        expect(button).toHaveFocus()
      })

      it('activates on Enter key', async () => {
        const handleClick = vi.fn()
        const { user } = renderWithProviders(
          <Button onClick={handleClick}>Enter</Button>
        )
        const button = screen.getByRole('button', { name: 'Enter' })

        button.focus()
        await user.keyboard('{Enter}')

        expect(handleClick).toHaveBeenCalled()
      })

      it('activates on Space key', async () => {
        const handleClick = vi.fn()
        const { user } = renderWithProviders(
          <Button onClick={handleClick}>Space</Button>
        )
        const button = screen.getByRole('button', { name: 'Space' })

        button.focus()
        await user.keyboard(' ')

        expect(handleClick).toHaveBeenCalled()
      })
    })
  })

  // ============================================================================
  // Icon handling
  // ============================================================================

  describe('icon handling', () => {
    it('renders with icon and text', () => {
      renderWithProviders(
        <Button>
          <span data-testid="icon">Icon</span>
          Text
        </Button>
      )
      const button = screen.getByRole('button')
      expect(screen.getByTestId('icon')).toBeInTheDocument()
      expect(button).toHaveTextContent('Text')
    })

    it('renders with only icon', () => {
      renderWithProviders(
        <Button>
          <span data-testid="icon">Icon</span>
        </Button>
      )
      expect(screen.getByTestId('icon')).toBeInTheDocument()
    })

    it('maintains icon alignment with text', () => {
      renderWithProviders(
        <Button>
          <span data-testid="icon">⭐</span>
          Favorite
        </Button>
      )
      const button = screen.getByRole('button')
      expect(button).toHaveClass('inline-flex', 'items-center')
      expect(screen.getByTestId('icon')).toBeInTheDocument()
    })

    it('applies correct gap for icons with different sizes', () => {
      const sizes: ButtonSize[] = ['sm', 'md', 'lg']
      const expectedGaps = { sm: 'gap-1.5', md: 'gap-2', lg: 'gap-2.5' }

      sizes.forEach((size) => {
        const { unmount } = renderWithProviders(
          <Button size={size}>
            <span>Icon</span>
            Text
          </Button>
        )
        const button = screen.getByRole('button')
        expect(button).toHaveClass(expectedGaps[size])
        unmount()
      })
    })
  })

  // ============================================================================
  // Loading state
  // ============================================================================

  describe('loading state', () => {
    it('renders with loading prop', () => {
      renderWithProviders(<Button isLoading>Loading</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-busy', 'true')
    })

    it('disables click when loading', async () => {
      const handleClick = vi.fn()
      const { user } = renderWithProviders(
        <Button isLoading onClick={handleClick}>
          Loading
        </Button>
      )
      const button = screen.getByRole('button')

      await user.click(button)

      expect(handleClick).not.toHaveBeenCalled()
    })

    it('shows loading indicator when loading', () => {
      renderWithProviders(
        <Button isLoading>
          <span data-testid="loading-indicator">...</span>
          Loading
        </Button>
      )
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // HTML attributes
  // ============================================================================

  describe('HTML attributes', () => {
    it('passes through aria-label', () => {
      renderWithProviders(<Button aria-label="Custom label">Button</Button>)
      const button = screen.getByRole('button', { name: 'Custom label' })
      expect(button).toHaveAttribute('aria-label', 'Custom label')
    })

    it('passes through data attributes', () => {
      renderWithProviders(<Button data-testid="custom-button">Button</Button>)
      const button = screen.getByTestId('custom-button')
      expect(button).toBeInTheDocument()
    })

    it('passes through id attribute', () => {
      renderWithProviders(<Button id="my-button">Button</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('id', 'my-button')
    })

    it('passes through name attribute', () => {
      renderWithProviders(<Button name="submit-btn">Button</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('name', 'submit-btn')
    })

    it('passes through custom className', () => {
      renderWithProviders(<Button className="custom-class">Button</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('custom-class')
    })

    it('renders different button types', () => {
      const { unmount: unmountSubmit } = renderWithProviders(
        <Button type="submit">Submit</Button>
      )
      expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
      unmountSubmit()

      const { unmount: unmountReset } = renderWithProviders(
        <Button type="reset">Reset</Button>
      )
      expect(screen.getByRole('button')).toHaveAttribute('type', 'reset')
      unmountReset()

      const { unmount: unmountButton } = renderWithProviders(
        <Button type="button">Button</Button>
      )
      expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
      unmountButton()
    })
  })

  // ============================================================================
  // Accessibility
  // ============================================================================

  describe('accessibility', () => {
    it('is keyboard accessible', () => {
      renderWithProviders(<Button>Accessible</Button>)
      const button = screen.getByRole('button', { name: 'Accessible' })
      expect(button.tagName).toBe('BUTTON')
    })

    it('has visible text content for screen readers', () => {
      renderWithProviders(<Button>Readable</Button>)
      expect(screen.getByText('Readable')).toBeInTheDocument()
    })

    it('announces disabled state to assistive technologies', () => {
      renderWithProviders(<Button disabled>Disabled Button</Button>)
      const button = screen.getByRole('button', { name: 'Disabled Button' })
      expect(button).toBeDisabled()
    })

    it('maintains semantic HTML structure', () => {
      const { container } = renderWithProviders(<Button>Button</Button>)
      const button = container.querySelector('button')
      expect(button).toBeInTheDocument()
    })
  })
})