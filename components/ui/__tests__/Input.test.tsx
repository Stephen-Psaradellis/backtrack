/**
 * Tests for components/ui/Input.tsx
 *
 * Tests the Input component with various sizes, states, and accessibility features.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Input } from '../Input'

describe('Input', () => {
  describe('rendering', () => {
    it('should render an input element', () => {
      render(<Input />)

      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('should render with placeholder', () => {
      render(<Input placeholder="Enter text" />)

      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument()
    })

    it('should render with value', () => {
      render(<Input value="test value" readOnly />)

      expect(screen.getByDisplayValue('test value')).toBeInTheDocument()
    })
  })

  describe('label', () => {
    it('should render label when provided', () => {
      render(<Input label="Username" />)

      expect(screen.getByText('Username')).toBeInTheDocument()
    })

    it('should associate label with input via htmlFor', () => {
      render(<Input label="Email" id="email-input" />)

      const label = screen.getByText('Email')
      expect(label).toHaveAttribute('for', 'email-input')
    })

    it('should not render label when not provided', () => {
      const { container } = render(<Input />)

      expect(container.querySelector('label')).not.toBeInTheDocument()
    })
  })

  describe('sizes', () => {
    it('should render medium size by default', () => {
      render(<Input />)

      const input = screen.getByRole('textbox')
      expect(input.className).toContain('py-3')
      expect(input.className).toContain('text-base')
    })

    it('should render small size', () => {
      render(<Input size="sm" />)

      const input = screen.getByRole('textbox')
      expect(input.className).toContain('py-2')
      expect(input.className).toContain('text-sm')
    })

    it('should render large size', () => {
      render(<Input size="lg" />)

      const input = screen.getByRole('textbox')
      expect(input.className).toContain('py-4')
      expect(input.className).toContain('text-lg')
    })
  })

  describe('error state', () => {
    it('should render error message when error prop is provided', () => {
      render(<Input error="This field is required" />)

      expect(screen.getByText('This field is required')).toBeInTheDocument()
    })

    it('should have aria-invalid when there is an error', () => {
      render(<Input error="Invalid input" />)

      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true')
    })

    it('should render error with role="alert"', () => {
      render(<Input error="Error message" />)

      expect(screen.getByRole('alert')).toHaveTextContent('Error message')
    })

    it('should have error border styling', () => {
      render(<Input error="Error" />)

      const input = screen.getByRole('textbox')
      expect(input.className).toContain('border-error')
    })
  })

  describe('helperText', () => {
    it('should render helper text when provided', () => {
      render(<Input helperText="Enter your email address" />)

      expect(screen.getByText('Enter your email address')).toBeInTheDocument()
    })

    it('should not render helper text when error is present', () => {
      render(<Input helperText="Helper" error="Error message" />)

      expect(screen.queryByText('Helper')).not.toBeInTheDocument()
      expect(screen.getByText('Error message')).toBeInTheDocument()
    })
  })

  describe('disabled state', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Input disabled />)

      expect(screen.getByRole('textbox')).toBeDisabled()
    })

    it('should have disabled styling', () => {
      render(<Input disabled />)

      const input = screen.getByRole('textbox')
      expect(input.className).toContain('disabled:cursor-not-allowed')
    })
  })

  describe('icons', () => {
    it('should render left icon', () => {
      render(<Input leftIcon={<span data-testid="left-icon">L</span>} />)

      expect(screen.getByTestId('left-icon')).toBeInTheDocument()
    })

    it('should render right icon', () => {
      render(<Input rightIcon={<span data-testid="right-icon">R</span>} />)

      expect(screen.getByTestId('right-icon')).toBeInTheDocument()
    })

    it('should add padding for left icon', () => {
      render(<Input leftIcon={<span>L</span>} />)

      const input = screen.getByRole('textbox')
      expect(input.className).toContain('pl-11')
    })

    it('should add padding for right icon', () => {
      render(<Input rightIcon={<span>R</span>} />)

      const input = screen.getByRole('textbox')
      expect(input.className).toContain('pr-11')
    })
  })

  describe('fullWidth', () => {
    it('should not be full width by default', () => {
      render(<Input />)

      const input = screen.getByRole('textbox')
      expect(input.className).not.toContain('w-full')
    })

    it('should be full width when fullWidth is true', () => {
      render(<Input fullWidth />)

      const input = screen.getByRole('textbox')
      expect(input.className).toContain('w-full')
    })
  })

  describe('events', () => {
    it('should call onChange when input value changes', () => {
      const handleChange = vi.fn()
      render(<Input onChange={handleChange} />)

      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'test' } })

      expect(handleChange).toHaveBeenCalled()
    })

    it('should call onFocus when input is focused', () => {
      const handleFocus = vi.fn()
      render(<Input onFocus={handleFocus} />)

      fireEvent.focus(screen.getByRole('textbox'))

      expect(handleFocus).toHaveBeenCalled()
    })

    it('should call onBlur when input loses focus', () => {
      const handleBlur = vi.fn()
      render(<Input onBlur={handleBlur} />)

      const input = screen.getByRole('textbox')
      fireEvent.focus(input)
      fireEvent.blur(input)

      expect(handleBlur).toHaveBeenCalled()
    })
  })

  describe('className', () => {
    it('should merge custom className', () => {
      render(<Input className="custom-class" />)

      expect(screen.getByRole('textbox').className).toContain('custom-class')
    })
  })

  describe('ref forwarding', () => {
    it('should forward ref to input element', () => {
      const ref = { current: null as HTMLInputElement | null }
      render(<Input ref={ref} />)

      expect(ref.current).toBeInstanceOf(HTMLInputElement)
    })
  })

  describe('displayName', () => {
    it('should have displayName', () => {
      expect(Input.displayName).toBe('Input')
    })
  })

  describe('accessibility', () => {
    it('should have aria-describedby for error', () => {
      render(<Input id="test-input" error="Error message" />)

      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-describedby', 'test-input-error')
    })

    it('should have aria-describedby for helper text', () => {
      render(<Input id="test-input" helperText="Helper text" />)

      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-describedby', 'test-input-helper')
    })

    it('should not have aria-describedby when no error or helper', () => {
      render(<Input />)

      const input = screen.getByRole('textbox')
      expect(input).not.toHaveAttribute('aria-describedby')
    })
  })
})
