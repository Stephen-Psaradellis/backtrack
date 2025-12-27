/**
 * Unit tests for Input component
 *
 * Tests the Input UI component including rendering, accessibility,
 * error states, icons, sizes, and ref forwarding.
 */

import React from 'react'
import { renderWithProviders, screen } from '../../utils/test-utils'
import { Input, type InputSize } from '@/components/ui/Input'

describe('Input', () => {
  // ============================================================================
  // Default rendering
  // ============================================================================

  describe('default rendering', () => {
    it('renders an input element', () => {
      renderWithProviders(<Input />)
      const input = screen.getByRole('textbox')
      expect(input).toBeInTheDocument()
    })

    it('renders with default medium size', () => {
      renderWithProviders(<Input />)
      const input = screen.getByRole('textbox')
      // Medium size has px-4 py-2 text-base
      expect(input).toHaveClass('px-4', 'py-2', 'text-base')
    })

    it('renders without fullWidth by default', () => {
      renderWithProviders(<Input />)
      const input = screen.getByRole('textbox')
      expect(input).not.toHaveClass('w-full')
    })

    it('renders base styles correctly', () => {
      renderWithProviders(<Input />)
      const input = screen.getByRole('textbox')
      // Check for base styles
      expect(input).toHaveClass('block', 'rounded-lg', 'border')
      expect(input).toHaveClass('transition-colors')
    })

    it('renders with default border styles (no error)', () => {
      renderWithProviders(<Input />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('border-gray-300')
      expect(input).toHaveClass('focus:border-pink-500', 'focus:ring-pink-500')
    })
  })

  // ============================================================================
  // Label rendering
  // ============================================================================

  describe('label rendering', () => {
    it('renders with label', () => {
      renderWithProviders(<Input label="Email" />)
      const label = screen.getByText('Email')
      expect(label).toBeInTheDocument()
      expect(label.tagName).toBe('LABEL')
    })

    it('renders without label when not provided', () => {
      renderWithProviders(<Input />)
      expect(screen.queryByRole('textbox')?.previousElementSibling).toBe(null)
    })

    it('applies correct label styles', () => {
      renderWithProviders(<Input label="Username" />)
      const label = screen.getByText('Username')
      expect(label).toHaveClass('block', 'font-medium', 'mb-1.5')
      expect(label).toHaveClass('text-gray-700')
    })

    it('applies correct label size for small input', () => {
      renderWithProviders(<Input label="Small Label" size="sm" />)
      const label = screen.getByText('Small Label')
      expect(label).toHaveClass('text-xs')
    })

    it('applies correct label size for medium input', () => {
      renderWithProviders(<Input label="Medium Label" size="md" />)
      const label = screen.getByText('Medium Label')
      expect(label).toHaveClass('text-sm')
    })

    it('applies correct label size for large input', () => {
      renderWithProviders(<Input label="Large Label" size="lg" />)
      const label = screen.getByText('Large Label')
      expect(label).toHaveClass('text-base')
    })
  })

  // ============================================================================
  // Label-input association via htmlFor
  // ============================================================================

  describe('label-input association', () => {
    it('associates label with input via htmlFor', () => {
      renderWithProviders(<Input label="Email" />)
      const input = screen.getByRole('textbox')
      const label = screen.getByText('Email')

      // Label's htmlFor should match input's id
      expect(label).toHaveAttribute('for', input.id)
    })

    it('clicking label focuses the input', async () => {
      const { user } = renderWithProviders(<Input label="Click me" />)
      const label = screen.getByText('Click me')

      await user.click(label)

      const input = screen.getByRole('textbox')
      expect(document.activeElement).toBe(input)
    })

    it('label and input share the same id', () => {
      renderWithProviders(<Input label="Password" />)
      const input = screen.getByRole('textbox')
      const label = screen.getByText('Password')

      const labelFor = label.getAttribute('for')
      const inputId = input.getAttribute('id')

      expect(labelFor).toBe(inputId)
      expect(labelFor).toBeTruthy()
    })
  })

  // ============================================================================
  // Generated ID when no id prop provided
  // ============================================================================

  describe('generated id', () => {
    it('generates an id when no id prop is provided', () => {
      renderWithProviders(<Input label="Auto ID" />)
      const input = screen.getByRole('textbox')

      expect(input).toHaveAttribute('id')
      expect(input.id).toBeTruthy()
    })

    it('generated id is used in label htmlFor', () => {
      renderWithProviders(<Input label="Generated" />)
      const input = screen.getByRole('textbox')
      const label = screen.getByText('Generated')

      expect(label).toHaveAttribute('for', input.id)
    })

    it('generates unique ids for multiple inputs', () => {
      renderWithProviders(
        <>
          <Input label="First" />
          <Input label="Second" />
        </>
      )

      const firstLabel = screen.getByText('First')
      const secondLabel = screen.getByText('Second')

      const firstFor = firstLabel.getAttribute('for')
      const secondFor = secondLabel.getAttribute('for')

      expect(firstFor).not.toBe(secondFor)
    })

    it('generated id follows React useId pattern', () => {
      renderWithProviders(<Input label="React ID" />)
      const input = screen.getByRole('textbox')

      // React's useId generates ids containing colons like ":r0:"
      expect(input.id).toMatch(/:/)
    })
  })

  // ============================================================================
  // Custom ID prop
  // ============================================================================

  describe('custom id prop', () => {
    it('uses custom id when provided', () => {
      renderWithProviders(<Input id="custom-input-id" label="Custom ID" />)
      const input = screen.getByRole('textbox')

      expect(input).toHaveAttribute('id', 'custom-input-id')
    })

    it('custom id is used in label htmlFor', () => {
      renderWithProviders(<Input id="my-email-input" label="Email" />)
      const label = screen.getByText('Email')

      expect(label).toHaveAttribute('for', 'my-email-input')
    })

    it('custom id overrides generated id', () => {
      renderWithProviders(<Input id="override-id" label="Override" />)
      const input = screen.getByRole('textbox')

      expect(input.id).toBe('override-id')
      // Should not contain the useId pattern
      expect(input.id).not.toMatch(/:/)
    })

    it('works with empty string id (falls back to generated)', () => {
      renderWithProviders(<Input id="" label="Empty ID" />)
      const input = screen.getByRole('textbox')
      const label = screen.getByText('Empty ID')

      // Empty string is falsy, so it should fall back to generated id
      // Actually looking at the code: id || generatedId, empty string is falsy
      expect(input.id).toBeTruthy()
      expect(label).toHaveAttribute('for', input.id)
    })

    it('clicking label with custom id focuses input', async () => {
      const { user } = renderWithProviders(
        <Input id="focusable-input" label="Focus Me" />
      )
      const label = screen.getByText('Focus Me')

      await user.click(label)

      const input = screen.getByRole('textbox')
      expect(document.activeElement).toBe(input)
    })

    it('custom id works with all sizes', () => {
      const sizes: InputSize[] = ['sm', 'md', 'lg']

      sizes.forEach((size) => {
        const { unmount } = renderWithProviders(
          <Input id={`input-${size}`} label={`Size ${size}`} size={size} />
        )
        const input = screen.getByRole('textbox')
        expect(input).toHaveAttribute('id', `input-${size}`)
        unmount()
      })
    })
  })

  // ============================================================================
  // Accessibility attributes
  // ============================================================================

  describe('accessibility attributes', () => {
    it('has aria-invalid=false by default', () => {
      renderWithProviders(<Input label="Valid Input" />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-invalid', 'false')
    })

    it('does not have aria-describedby by default', () => {
      renderWithProviders(<Input label="No Description" />)
      const input = screen.getByRole('textbox')
      expect(input).not.toHaveAttribute('aria-describedby')
    })

    it('renders disabled state correctly', () => {
      renderWithProviders(<Input label="Disabled Input" disabled />)
      const input = screen.getByRole('textbox')
      expect(input).toBeDisabled()
    })

    it('has disabled cursor style when disabled', () => {
      renderWithProviders(<Input label="Disabled" disabled />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('disabled:cursor-not-allowed')
    })

    it('has disabled background style when disabled', () => {
      renderWithProviders(<Input label="Disabled" disabled />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('disabled:bg-gray-50', 'disabled:text-gray-500')
    })

    it('accepts placeholder attribute', () => {
      renderWithProviders(
        <Input label="Email" placeholder="Enter your email" />
      )
      const input = screen.getByPlaceholderText('Enter your email')
      expect(input).toBeInTheDocument()
    })

    it('accepts type attribute', () => {
      renderWithProviders(<Input label="Password" type="password" />)
      const input = screen.getByLabelText('Password')
      expect(input).toHaveAttribute('type', 'password')
    })

    it('accepts name attribute', () => {
      renderWithProviders(<Input label="Username" name="username" />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('name', 'username')
    })

    it('accepts required attribute', () => {
      renderWithProviders(<Input label="Required Field" required />)
      const input = screen.getByRole('textbox')
      expect(input).toBeRequired()
    })

    it('accepts maxLength attribute', () => {
      renderWithProviders(<Input label="Limited" maxLength={100} />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('maxLength', '100')
    })

    it('accepts readOnly attribute', () => {
      renderWithProviders(<Input label="Read Only" readOnly />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('readOnly')
    })

    it('can be found by label text', () => {
      renderWithProviders(<Input label="Findable Input" />)
      const input = screen.getByLabelText('Findable Input')
      expect(input).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Error message display
  // ============================================================================

  describe('error message display', () => {
    it('renders error message when error prop is provided', () => {
      renderWithProviders(<Input label="Email" error="Email is required" />)
      const errorMessage = screen.getByText('Email is required')
      expect(errorMessage).toBeInTheDocument()
    })

    it('error message has role="alert"', () => {
      renderWithProviders(<Input label="Email" error="Invalid email format" />)
      const errorMessage = screen.getByRole('alert')
      expect(errorMessage).toBeInTheDocument()
      expect(errorMessage).toHaveTextContent('Invalid email format')
    })

    it('error message has correct id based on input id', () => {
      renderWithProviders(<Input id="my-email" label="Email" error="Error text" />)
      const errorMessage = screen.getByRole('alert')
      expect(errorMessage).toHaveAttribute('id', 'my-email-error')
    })

    it('error message has correct id with generated input id', () => {
      renderWithProviders(<Input label="Field" error="Error message" />)
      const input = screen.getByRole('textbox')
      const errorMessage = screen.getByRole('alert')

      // Error id should be inputId + "-error"
      expect(errorMessage.id).toBe(`${input.id}-error`)
    })

    it('error message has correct styling', () => {
      renderWithProviders(<Input label="Email" error="Error styling test" />)
      const errorMessage = screen.getByRole('alert')
      expect(errorMessage).toHaveClass('mt-1.5', 'text-sm', 'text-red-500')
    })

    it('error message is rendered as a paragraph element', () => {
      renderWithProviders(<Input label="Email" error="Paragraph check" />)
      const errorMessage = screen.getByRole('alert')
      expect(errorMessage.tagName).toBe('P')
    })

    it('does not render error message when error is not provided', () => {
      renderWithProviders(<Input label="Email" />)
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('does not render error message when error is empty string', () => {
      renderWithProviders(<Input label="Email" error="" />)
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // aria-invalid when error present
  // ============================================================================

  describe('aria-invalid with error', () => {
    it('has aria-invalid=true when error is present', () => {
      renderWithProviders(<Input label="Email" error="This field has an error" />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-invalid', 'true')
    })

    it('has aria-invalid=false when error is not present', () => {
      renderWithProviders(<Input label="Email" />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-invalid', 'false')
    })

    it('has aria-invalid=false when error is empty string', () => {
      renderWithProviders(<Input label="Email" error="" />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-invalid', 'false')
    })

    it('input has error border styles when error is present', () => {
      renderWithProviders(<Input label="Email" error="Border error test" />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('border-red-500')
      expect(input).toHaveClass('focus:border-red-500', 'focus:ring-red-500')
    })

    it('input has normal border styles when no error', () => {
      renderWithProviders(<Input label="Email" />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('border-gray-300')
      expect(input).not.toHaveClass('border-red-500')
    })
  })

  // ============================================================================
  // aria-describedby points to error message
  // ============================================================================

  describe('aria-describedby with error', () => {
    it('aria-describedby points to error message when error is present', () => {
      renderWithProviders(<Input id="test-input" label="Email" error="Error for aria" />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-describedby', 'test-input-error')
    })

    it('aria-describedby uses generated id for error message', () => {
      renderWithProviders(<Input label="Email" error="Error message" />)
      const input = screen.getByRole('textbox')
      const errorMessage = screen.getByRole('alert')

      expect(input).toHaveAttribute('aria-describedby', errorMessage.id)
    })

    it('error message is accessible via aria-describedby', () => {
      renderWithProviders(<Input label="Password" error="Password too short" />)
      const input = screen.getByRole('textbox')
      const describedById = input.getAttribute('aria-describedby')

      // The error message should have this id
      const errorMessage = document.getElementById(describedById!)
      expect(errorMessage).toBeInTheDocument()
      expect(errorMessage).toHaveTextContent('Password too short')
    })
  })

  // ============================================================================
  // Helper text display
  // ============================================================================

  describe('helper text display', () => {
    it('renders helper text when helperText prop is provided', () => {
      renderWithProviders(<Input label="Email" helperText="We'll never share your email" />)
      const helperText = screen.getByText("We'll never share your email")
      expect(helperText).toBeInTheDocument()
    })

    it('helper text does not have role="alert"', () => {
      renderWithProviders(<Input label="Email" helperText="Helper information" />)
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('helper text has correct id based on input id', () => {
      renderWithProviders(<Input id="my-field" label="Email" helperText="Help text" />)
      const helperText = screen.getByText('Help text')
      expect(helperText).toHaveAttribute('id', 'my-field-helper')
    })

    it('helper text has correct id with generated input id', () => {
      renderWithProviders(<Input label="Field" helperText="Helper text here" />)
      const input = screen.getByRole('textbox')
      const helperText = screen.getByText('Helper text here')

      // Helper id should be inputId + "-helper"
      expect(helperText.id).toBe(`${input.id}-helper`)
    })

    it('helper text has correct styling', () => {
      renderWithProviders(<Input label="Email" helperText="Styled helper" />)
      const helperText = screen.getByText('Styled helper')
      expect(helperText).toHaveClass('mt-1.5', 'text-sm', 'text-gray-500')
    })

    it('helper text is rendered as a paragraph element', () => {
      renderWithProviders(<Input label="Email" helperText="P element" />)
      const helperText = screen.getByText('P element')
      expect(helperText.tagName).toBe('P')
    })

    it('does not render helper text when helperText is not provided', () => {
      renderWithProviders(<Input label="Email" />)
      // No paragraph with text-gray-500 class
      const container = screen.getByRole('textbox').closest('.flex.flex-col')
      const helperParagraph = container?.querySelector('p.text-gray-500')
      expect(helperParagraph).not.toBeInTheDocument()
    })

    it('aria-describedby points to helper text when helperText is present', () => {
      renderWithProviders(<Input id="helper-input" label="Email" helperText="Help description" />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-describedby', 'helper-input-helper')
    })

    it('helper text is accessible via aria-describedby', () => {
      renderWithProviders(<Input label="Field" helperText="Accessible helper text" />)
      const input = screen.getByRole('textbox')
      const describedById = input.getAttribute('aria-describedby')

      const helperText = document.getElementById(describedById!)
      expect(helperText).toBeInTheDocument()
      expect(helperText).toHaveTextContent('Accessible helper text')
    })
  })

  // ============================================================================
  // Error takes precedence over helper text
  // ============================================================================

  describe('error precedence over helper text', () => {
    it('shows error message when both error and helperText are provided', () => {
      renderWithProviders(
        <Input label="Email" error="This is an error" helperText="This is helper text" />
      )
      expect(screen.getByText('This is an error')).toBeInTheDocument()
      expect(screen.queryByText('This is helper text')).not.toBeInTheDocument()
    })

    it('only error message is rendered, not helper text', () => {
      renderWithProviders(
        <Input label="Email" error="Error message" helperText="Helper message" />
      )
      // Only one paragraph (the error) should be rendered
      const container = screen.getByRole('textbox').closest('.flex.flex-col')
      const paragraphs = container?.querySelectorAll('p')
      expect(paragraphs?.length).toBe(1)
      expect(paragraphs?.[0]).toHaveTextContent('Error message')
    })

    it('aria-describedby points to error, not helper, when both provided', () => {
      renderWithProviders(
        <Input id="both" label="Email" error="Error text" helperText="Helper text" />
      )
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-describedby', 'both-error')
      expect(input).not.toHaveAttribute('aria-describedby', 'both-helper')
    })

    it('helper text appears when error is cleared', () => {
      const { rerender } = renderWithProviders(
        <Input label="Email" error="Error shown" helperText="Helper available" />
      )

      // Error is shown, helper is not
      expect(screen.getByText('Error shown')).toBeInTheDocument()
      expect(screen.queryByText('Helper available')).not.toBeInTheDocument()

      // Clear the error
      rerender(<Input label="Email" helperText="Helper available" />)

      // Now helper is shown, error is not
      expect(screen.queryByText('Error shown')).not.toBeInTheDocument()
      expect(screen.getByText('Helper available')).toBeInTheDocument()
    })

    it('aria-describedby updates when error is cleared', () => {
      const { rerender } = renderWithProviders(
        <Input id="dynamic" label="Email" error="Error" helperText="Helper" />
      )

      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-describedby', 'dynamic-error')

      // Clear the error
      rerender(<Input id="dynamic" label="Email" helperText="Helper" />)

      expect(input).toHaveAttribute('aria-describedby', 'dynamic-helper')
    })

    it('error message has role="alert" while helper text does not', () => {
      renderWithProviders(
        <Input label="Email" error="Error with alert" helperText="Helper without alert" />
      )

      // Error has role="alert"
      const alertElement = screen.getByRole('alert')
      expect(alertElement).toHaveTextContent('Error with alert')
    })

    it('empty error string allows helper text to show', () => {
      renderWithProviders(
        <Input label="Email" error="" helperText="Helper when empty error" />
      )

      expect(screen.getByText('Helper when empty error')).toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('shows neither when both are empty strings', () => {
      renderWithProviders(<Input label="Email" error="" helperText="" />)

      const container = screen.getByRole('textbox').closest('.flex.flex-col')
      const paragraphs = container?.querySelectorAll('p')
      expect(paragraphs?.length).toBe(0)
    })
  })

  // ============================================================================
  // Container structure
  // ============================================================================

  describe('container structure', () => {
    it('wraps input in a flex column container', () => {
      renderWithProviders(<Input label="Wrapped" />)
      const input = screen.getByRole('textbox')

      // Find the outer container
      const outerContainer = input.closest('.flex.flex-col')
      expect(outerContainer).toBeInTheDocument()
    })

    it('wraps input in an inner flex container for icons', () => {
      renderWithProviders(<Input label="Inner Wrap" />)
      const input = screen.getByRole('textbox')

      // Input should be inside a relative flex container
      const inputWrapper = input.parentElement
      expect(inputWrapper).toHaveClass('relative', 'flex', 'items-center')
    })

    it('label is rendered before input wrapper', () => {
      renderWithProviders(<Input label="First Label" />)
      const label = screen.getByText('First Label')
      const input = screen.getByRole('textbox')

      // Label should be before the input wrapper (sibling relationship via parent)
      const inputWrapper = input.parentElement
      expect(label.nextElementSibling).toBe(inputWrapper)
    })
  })

  // ============================================================================
  // Size variants
  // ============================================================================

  describe('size variants', () => {
    describe('small size', () => {
      it('renders with small size input styles', () => {
        renderWithProviders(<Input size="sm" label="Small Input" />)
        const input = screen.getByRole('textbox')
        expect(input).toHaveClass('px-3', 'py-1.5', 'text-sm')
      })

      it('renders with small size label styles', () => {
        renderWithProviders(<Input size="sm" label="Small Label" />)
        const label = screen.getByText('Small Label')
        expect(label).toHaveClass('text-xs')
      })
    })

    describe('medium size', () => {
      it('renders with medium size input styles', () => {
        renderWithProviders(<Input size="md" label="Medium Input" />)
        const input = screen.getByRole('textbox')
        expect(input).toHaveClass('px-4', 'py-2', 'text-base')
      })

      it('renders with medium size label styles', () => {
        renderWithProviders(<Input size="md" label="Medium Label" />)
        const label = screen.getByText('Medium Label')
        expect(label).toHaveClass('text-sm')
      })
    })

    describe('large size', () => {
      it('renders with large size input styles', () => {
        renderWithProviders(<Input size="lg" label="Large Input" />)
        const input = screen.getByRole('textbox')
        expect(input).toHaveClass('px-4', 'py-3', 'text-lg')
      })

      it('renders with large size label styles', () => {
        renderWithProviders(<Input size="lg" label="Large Label" />)
        const label = screen.getByText('Large Label')
        expect(label).toHaveClass('text-base')
      })
    })

    describe('all sizes render correctly', () => {
      const sizes: InputSize[] = ['sm', 'md', 'lg']

      sizes.forEach((size) => {
        it(`renders ${size} size without error`, () => {
          renderWithProviders(<Input size={size} label={`Size ${size}`} />)
          const input = screen.getByRole('textbox')
          expect(input).toBeInTheDocument()
        })
      })
    })

    it('works with error state across all sizes', () => {
      const sizes: InputSize[] = ['sm', 'md', 'lg']

      sizes.forEach((size) => {
        const { unmount } = renderWithProviders(
          <Input size={size} label={`Error ${size}`} error="Error message" />
        )
        const input = screen.getByRole('textbox')
        expect(input).toHaveAttribute('aria-invalid', 'true')
        expect(input).toHaveClass('border-red-500')
        unmount()
      })
    })
  })

  // ============================================================================
  // Icon props
  // ============================================================================

  describe('icon props', () => {
    describe('leftIcon', () => {
      it('renders leftIcon correctly', () => {
        const leftIcon = <span data-testid="left-icon">🔍</span>
        renderWithProviders(<Input leftIcon={leftIcon} label="Search" />)

        const icon = screen.getByTestId('left-icon')
        expect(icon).toBeInTheDocument()
        expect(icon.textContent).toBe('🔍')
      })

      it('wraps leftIcon in aria-hidden span', () => {
        const leftIcon = <span data-testid="left-icon">🔍</span>
        renderWithProviders(<Input leftIcon={leftIcon} label="Search" />)

        const iconContainer = screen.getByTestId('left-icon').parentElement
        expect(iconContainer).toHaveAttribute('aria-hidden', 'true')
      })

      it('positions leftIcon on the left side', () => {
        const leftIcon = <span data-testid="left-icon">🔍</span>
        renderWithProviders(<Input leftIcon={leftIcon} label="Search" />)

        const iconContainer = screen.getByTestId('left-icon').parentElement
        expect(iconContainer).toHaveClass('left-3')
      })

      it('adds left padding to input when leftIcon is provided', () => {
        const leftIcon = <span data-testid="left-icon">🔍</span>
        renderWithProviders(<Input leftIcon={leftIcon} label="With Icon" />)

        const input = screen.getByRole('textbox')
        expect(input).toHaveClass('pl-10')
      })

      it('does not add left padding when leftIcon is not provided', () => {
        renderWithProviders(<Input label="No Icon" />)

        const input = screen.getByRole('textbox')
        expect(input).not.toHaveClass('pl-10')
      })

      it('applies icon size styles based on input size - small', () => {
        const leftIcon = <span data-testid="left-icon">🔍</span>
        renderWithProviders(<Input size="sm" leftIcon={leftIcon} label="Small" />)

        const iconContainer = screen.getByTestId('left-icon').parentElement
        expect(iconContainer).toHaveClass('h-4', 'w-4')
      })

      it('applies icon size styles based on input size - medium', () => {
        const leftIcon = <span data-testid="left-icon">🔍</span>
        renderWithProviders(<Input size="md" leftIcon={leftIcon} label="Medium" />)

        const iconContainer = screen.getByTestId('left-icon').parentElement
        expect(iconContainer).toHaveClass('h-5', 'w-5')
      })

      it('applies icon size styles based on input size - large', () => {
        const leftIcon = <span data-testid="left-icon">🔍</span>
        renderWithProviders(<Input size="lg" leftIcon={leftIcon} label="Large" />)

        const iconContainer = screen.getByTestId('left-icon').parentElement
        expect(iconContainer).toHaveClass('h-6', 'w-6')
      })

      it('renders complex leftIcon elements', () => {
        const leftIcon = (
          <svg data-testid="left-icon-svg" viewBox="0 0 24 24">
            <path d="M12 0L24 24H0z" />
          </svg>
        )
        renderWithProviders(<Input leftIcon={leftIcon} label="With SVG" />)

        expect(screen.getByTestId('left-icon-svg')).toBeInTheDocument()
      })

      it('leftIcon has pointer-events-none', () => {
        const leftIcon = <span data-testid="left-icon">🔍</span>
        renderWithProviders(<Input leftIcon={leftIcon} label="Search" />)

        const iconContainer = screen.getByTestId('left-icon').parentElement
        expect(iconContainer).toHaveClass('pointer-events-none')
      })
    })

    describe('rightIcon', () => {
      it('renders rightIcon correctly', () => {
        const rightIcon = <span data-testid="right-icon">✓</span>
        renderWithProviders(<Input rightIcon={rightIcon} label="Validated" />)

        const icon = screen.getByTestId('right-icon')
        expect(icon).toBeInTheDocument()
        expect(icon.textContent).toBe('✓')
      })

      it('wraps rightIcon in aria-hidden span', () => {
        const rightIcon = <span data-testid="right-icon">✓</span>
        renderWithProviders(<Input rightIcon={rightIcon} label="Validated" />)

        const iconContainer = screen.getByTestId('right-icon').parentElement
        expect(iconContainer).toHaveAttribute('aria-hidden', 'true')
      })

      it('positions rightIcon on the right side', () => {
        const rightIcon = <span data-testid="right-icon">✓</span>
        renderWithProviders(<Input rightIcon={rightIcon} label="Validated" />)

        const iconContainer = screen.getByTestId('right-icon').parentElement
        expect(iconContainer).toHaveClass('right-3')
      })

      it('adds right padding to input when rightIcon is provided', () => {
        const rightIcon = <span data-testid="right-icon">✓</span>
        renderWithProviders(<Input rightIcon={rightIcon} label="With Icon" />)

        const input = screen.getByRole('textbox')
        expect(input).toHaveClass('pr-10')
      })

      it('does not add right padding when rightIcon is not provided', () => {
        renderWithProviders(<Input label="No Icon" />)

        const input = screen.getByRole('textbox')
        expect(input).not.toHaveClass('pr-10')
      })

      it('applies icon size styles based on input size - small', () => {
        const rightIcon = <span data-testid="right-icon">✓</span>
        renderWithProviders(<Input size="sm" rightIcon={rightIcon} label="Small" />)

        const iconContainer = screen.getByTestId('right-icon').parentElement
        expect(iconContainer).toHaveClass('h-4', 'w-4')
      })

      it('applies icon size styles based on input size - medium', () => {
        const rightIcon = <span data-testid="right-icon">✓</span>
        renderWithProviders(<Input size="md" rightIcon={rightIcon} label="Medium" />)

        const iconContainer = screen.getByTestId('right-icon').parentElement
        expect(iconContainer).toHaveClass('h-5', 'w-5')
      })

      it('applies icon size styles based on input size - large', () => {
        const rightIcon = <span data-testid="right-icon">✓</span>
        renderWithProviders(<Input size="lg" rightIcon={rightIcon} label="Large" />)

        const iconContainer = screen.getByTestId('right-icon').parentElement
        expect(iconContainer).toHaveClass('h-6', 'w-6')
      })

      it('renders complex rightIcon elements', () => {
        const rightIcon = (
          <svg data-testid="right-icon-svg" viewBox="0 0 24 24">
            <path d="M12 0L24 24H0z" />
          </svg>
        )
        renderWithProviders(<Input rightIcon={rightIcon} label="With SVG" />)

        expect(screen.getByTestId('right-icon-svg')).toBeInTheDocument()
      })

      it('rightIcon has pointer-events-none', () => {
        const rightIcon = <span data-testid="right-icon">✓</span>
        renderWithProviders(<Input rightIcon={rightIcon} label="Validated" />)

        const iconContainer = screen.getByTestId('right-icon').parentElement
        expect(iconContainer).toHaveClass('pointer-events-none')
      })
    })

    describe('both icons', () => {
      it('renders both leftIcon and rightIcon simultaneously', () => {
        const leftIcon = <span data-testid="left-icon">🔍</span>
        const rightIcon = <span data-testid="right-icon">✓</span>
        renderWithProviders(
          <Input leftIcon={leftIcon} rightIcon={rightIcon} label="Both Icons" />
        )

        expect(screen.getByTestId('left-icon')).toBeInTheDocument()
        expect(screen.getByTestId('right-icon')).toBeInTheDocument()
      })

      it('adds both left and right padding when both icons are provided', () => {
        const leftIcon = <span data-testid="left-icon">🔍</span>
        const rightIcon = <span data-testid="right-icon">✓</span>
        renderWithProviders(
          <Input leftIcon={leftIcon} rightIcon={rightIcon} label="Both Icons" />
        )

        const input = screen.getByRole('textbox')
        expect(input).toHaveClass('pl-10', 'pr-10')
      })

      it('renders icons in correct positions', () => {
        const leftIcon = <span data-testid="left-icon">🔍</span>
        const rightIcon = <span data-testid="right-icon">✓</span>
        renderWithProviders(
          <Input leftIcon={leftIcon} rightIcon={rightIcon} label="Both Icons" />
        )

        const leftContainer = screen.getByTestId('left-icon').parentElement
        const rightContainer = screen.getByTestId('right-icon').parentElement

        expect(leftContainer).toHaveClass('left-3')
        expect(rightContainer).toHaveClass('right-3')
      })

      it('both icons have consistent styling', () => {
        const leftIcon = <span data-testid="left-icon">🔍</span>
        const rightIcon = <span data-testid="right-icon">✓</span>
        renderWithProviders(
          <Input leftIcon={leftIcon} rightIcon={rightIcon} label="Both Icons" />
        )

        const leftContainer = screen.getByTestId('left-icon').parentElement
        const rightContainer = screen.getByTestId('right-icon').parentElement

        // Both should have the same base classes
        expect(leftContainer).toHaveClass('absolute', 'top-1/2', '-translate-y-1/2')
        expect(rightContainer).toHaveClass('absolute', 'top-1/2', '-translate-y-1/2')
        expect(leftContainer).toHaveClass('text-gray-400', 'pointer-events-none')
        expect(rightContainer).toHaveClass('text-gray-400', 'pointer-events-none')
      })
    })
  })

  // ============================================================================
  // Disabled state
  // ============================================================================

  describe('disabled state', () => {
    it('has disabled attribute when disabled prop is true', () => {
      renderWithProviders(<Input disabled label="Disabled Input" />)
      const input = screen.getByRole('textbox')
      expect(input).toBeDisabled()
    })

    it('has cursor-not-allowed style when disabled', () => {
      renderWithProviders(<Input disabled label="Disabled Input" />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('disabled:cursor-not-allowed')
    })

    it('has disabled background style when disabled', () => {
      renderWithProviders(<Input disabled label="Disabled Input" />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('disabled:bg-gray-50', 'disabled:text-gray-500')
    })

    it('has dark mode disabled styles', () => {
      renderWithProviders(<Input disabled label="Disabled Input" />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('dark:disabled:bg-gray-900', 'dark:disabled:text-gray-500')
    })

    it('is not disabled by default', () => {
      renderWithProviders(<Input label="Enabled Input" />)
      const input = screen.getByRole('textbox')
      expect(input).not.toBeDisabled()
    })

    it('disabled works with all sizes', () => {
      const sizes: InputSize[] = ['sm', 'md', 'lg']

      sizes.forEach((size) => {
        const { unmount } = renderWithProviders(
          <Input size={size} disabled label={`Disabled ${size}`} />
        )
        const input = screen.getByRole('textbox')
        expect(input).toBeDisabled()
        expect(input).toHaveClass('disabled:cursor-not-allowed')
        unmount()
      })
    })

    it('disabled works with icons', () => {
      const leftIcon = <span data-testid="left-icon">🔍</span>
      const rightIcon = <span data-testid="right-icon">✓</span>
      renderWithProviders(
        <Input
          disabled
          leftIcon={leftIcon}
          rightIcon={rightIcon}
          label="Disabled with icons"
        />
      )

      const input = screen.getByRole('textbox')
      expect(input).toBeDisabled()
      expect(screen.getByTestId('left-icon')).toBeInTheDocument()
      expect(screen.getByTestId('right-icon')).toBeInTheDocument()
    })

    it('disabled works with error state', () => {
      renderWithProviders(
        <Input disabled error="Error message" label="Disabled with error" />
      )

      const input = screen.getByRole('textbox')
      expect(input).toBeDisabled()
      expect(input).toHaveAttribute('aria-invalid', 'true')
      expect(screen.getByRole('alert')).toHaveTextContent('Error message')
    })

    it('disabled works with helper text', () => {
      renderWithProviders(
        <Input disabled helperText="Helper text" label="Disabled with helper" />
      )

      const input = screen.getByRole('textbox')
      expect(input).toBeDisabled()
      expect(screen.getByText('Helper text')).toBeInTheDocument()
    })

    it('disabled state is accessible', () => {
      renderWithProviders(<Input disabled label="Accessible Disabled" />)
      const input = screen.getByLabelText('Accessible Disabled')
      expect(input).toBeDisabled()
    })
  })

  // ============================================================================
  // fullWidth prop
  // ============================================================================

  describe('fullWidth prop', () => {
    it('applies w-full class to input when fullWidth is true', () => {
      renderWithProviders(<Input fullWidth label="Full Width" />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('w-full')
    })

    it('applies w-full class to container when fullWidth is true', () => {
      renderWithProviders(<Input fullWidth label="Full Width" />)
      const input = screen.getByRole('textbox')
      const outerContainer = input.closest('.flex.flex-col')
      expect(outerContainer).toHaveClass('w-full')
    })

    it('applies w-full class to input wrapper when fullWidth is true', () => {
      renderWithProviders(<Input fullWidth label="Full Width" />)
      const input = screen.getByRole('textbox')
      const inputWrapper = input.parentElement
      expect(inputWrapper).toHaveClass('w-full')
    })

    it('does not apply w-full class when fullWidth is false', () => {
      renderWithProviders(<Input fullWidth={false} label="Not Full" />)
      const input = screen.getByRole('textbox')
      expect(input).not.toHaveClass('w-full')
    })

    it('does not apply w-full class by default', () => {
      renderWithProviders(<Input label="Default Width" />)
      const input = screen.getByRole('textbox')
      expect(input).not.toHaveClass('w-full')
    })

    it('fullWidth works with different sizes', () => {
      const sizes: InputSize[] = ['sm', 'md', 'lg']

      sizes.forEach((size) => {
        const { unmount } = renderWithProviders(
          <Input size={size} fullWidth label={`Full ${size}`} />
        )
        const input = screen.getByRole('textbox')
        expect(input).toHaveClass('w-full')
        unmount()
      })
    })

    it('fullWidth works with icons', () => {
      const leftIcon = <span data-testid="left-icon">🔍</span>
      renderWithProviders(
        <Input fullWidth leftIcon={leftIcon} label="Full Width with Icon" />
      )

      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('w-full')
      expect(screen.getByTestId('left-icon')).toBeInTheDocument()
    })

    it('fullWidth works with error state', () => {
      renderWithProviders(
        <Input fullWidth error="Error message" label="Full Width with Error" />
      )

      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('w-full')
      expect(input).toHaveClass('border-red-500')
    })

    it('fullWidth works with disabled state', () => {
      renderWithProviders(
        <Input fullWidth disabled label="Full Width Disabled" />
      )

      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('w-full')
      expect(input).toBeDisabled()
    })
  })

  // ============================================================================
  // Ref forwarding
  // ============================================================================

  describe('ref forwarding', () => {
    it('forwards ref to the input element', () => {
      const ref = React.createRef<HTMLInputElement>()
      renderWithProviders(<Input ref={ref} label="Ref Input" />)

      expect(ref.current).toBeInstanceOf(HTMLInputElement)
      expect(ref.current?.tagName).toBe('INPUT')
    })

    it('ref allows programmatic focus', () => {
      const ref = React.createRef<HTMLInputElement>()
      renderWithProviders(<Input ref={ref} label="Focusable" />)

      ref.current?.focus()

      expect(document.activeElement).toBe(ref.current)
    })

    it('ref allows reading input value', () => {
      const ref = React.createRef<HTMLInputElement>()
      renderWithProviders(<Input ref={ref} label="Value" defaultValue="test value" />)

      expect(ref.current?.value).toBe('test value')
    })

    it('ref allows setting input value programmatically', () => {
      const ref = React.createRef<HTMLInputElement>()
      renderWithProviders(<Input ref={ref} label="Set Value" />)

      if (ref.current) {
        ref.current.value = 'programmatic value'
      }

      expect(ref.current?.value).toBe('programmatic value')
    })

    it('ref works with different sizes', () => {
      const sizes: InputSize[] = ['sm', 'md', 'lg']

      sizes.forEach((size) => {
        const ref = React.createRef<HTMLInputElement>()
        const { unmount } = renderWithProviders(
          <Input ref={ref} size={size} label={`Ref ${size}`} />
        )

        expect(ref.current).toBeInstanceOf(HTMLInputElement)
        unmount()
      })
    })

    it('ref works with disabled input', () => {
      const ref = React.createRef<HTMLInputElement>()
      renderWithProviders(<Input ref={ref} disabled label="Disabled" />)

      expect(ref.current).toBeInstanceOf(HTMLInputElement)
      expect(ref.current).toBeDisabled()
    })

    it('ref allows reading input properties', () => {
      const ref = React.createRef<HTMLInputElement>()
      renderWithProviders(
        <Input ref={ref} label="Properties" type="email" name="email" />
      )

      expect(ref.current?.type).toBe('email')
      expect(ref.current?.name).toBe('email')
    })

    it('callback ref works correctly', () => {
      let inputElement: HTMLInputElement | null = null
      const callbackRef = (el: HTMLInputElement | null) => {
        inputElement = el
      }

      renderWithProviders(<Input ref={callbackRef} label="Callback Ref" />)

      expect(inputElement).toBeInstanceOf(HTMLInputElement)
      expect((inputElement as HTMLInputElement | null)?.tagName).toBe('INPUT')
    })

    it('ref is associated with the correct element when icons are present', () => {
      const ref = React.createRef<HTMLInputElement>()
      const leftIcon = <span data-testid="left-icon">🔍</span>
      const rightIcon = <span data-testid="right-icon">✓</span>

      renderWithProviders(
        <Input ref={ref} leftIcon={leftIcon} rightIcon={rightIcon} label="With Icons" />
      )

      expect(ref.current).toBeInstanceOf(HTMLInputElement)
      // Ensure it's the input, not the icon containers
      expect(ref.current?.tagName).toBe('INPUT')
    })

    it('ref allows triggering select on input', () => {
      const ref = React.createRef<HTMLInputElement>()
      renderWithProviders(<Input ref={ref} label="Select" defaultValue="select me" />)

      ref.current?.select()

      // After select, the input should have its text selected
      expect(ref.current?.selectionStart).toBe(0)
      expect(ref.current?.selectionEnd).toBe('select me'.length)
    })
  })

  // ============================================================================
  // Custom className prop
  // ============================================================================

  describe('custom className prop', () => {
    it('applies custom className to input', () => {
      renderWithProviders(<Input className="custom-class" label="Custom" />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('custom-class')
    })

    it('preserves base styles when custom className is applied', () => {
      renderWithProviders(<Input className="my-custom-class" label="Custom" />)
      const input = screen.getByRole('textbox')

      // Check that base styles are preserved
      expect(input).toHaveClass('block', 'rounded-lg', 'border')
      expect(input).toHaveClass('my-custom-class')
    })

    it('preserves size styles when custom className is applied', () => {
      renderWithProviders(
        <Input size="lg" className="extra-class" label="Large" />
      )
      const input = screen.getByRole('textbox')

      expect(input).toHaveClass('px-4', 'py-3', 'extra-class')
    })

    it('applies multiple custom classes', () => {
      renderWithProviders(
        <Input className="class-one class-two class-three" label="Multi" />
      )
      const input = screen.getByRole('textbox')

      expect(input).toHaveClass('class-one', 'class-two', 'class-three')
    })

    it('works with fullWidth prop', () => {
      renderWithProviders(
        <Input fullWidth className="additional-class" label="Full Width" />
      )
      const input = screen.getByRole('textbox')

      expect(input).toHaveClass('w-full', 'additional-class')
    })

    it('works with icons and custom className', () => {
      const leftIcon = <span data-testid="icon">🔍</span>
      renderWithProviders(
        <Input leftIcon={leftIcon} className="search-input" label="Search" />
      )
      const input = screen.getByRole('textbox')

      expect(input).toHaveClass('search-input', 'pl-10')
      expect(screen.getByTestId('icon')).toBeInTheDocument()
    })

    it('handles empty className gracefully', () => {
      renderWithProviders(<Input className="" label="Empty Class" />)
      const input = screen.getByRole('textbox')

      expect(input).toBeInTheDocument()
      expect(input).toHaveClass('block') // Base class still present
    })
  })
})
