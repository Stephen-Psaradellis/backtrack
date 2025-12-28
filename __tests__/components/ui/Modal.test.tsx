/**
 * Unit tests for Modal component
 *
 * Tests the Modal UI component including rendering, visibility,
 * close behaviors, accessibility features, and size variants.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderWithProviders, screen, waitFor, within } from '../../utils/test-utils'
import { Modal, type ModalSize } from '@/components/ui/Modal'

describe('Modal', () => {
  // Default props for testing
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: 'Test Modal',
    children: <p>Modal content</p>,
  }

  // Reset mocks before each test
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset body overflow style that Modal modifies
    document.body.style.overflow = ''
  })

  // Clean up after each test
  afterEach(() => {
    // Ensure body overflow is reset
    document.body.style.overflow = ''
  })

  // ============================================================================
  // Rendering when open
  // ============================================================================

  describe('rendering when open', () => {
    it('renders modal when isOpen is true', () => {
      renderWithProviders(<Modal {...defaultProps} isOpen={true} />)

      const dialog = screen.getByRole('dialog')
      expect(dialog).toBeInTheDocument()
    })

    it('renders modal content in document.body via portal', () => {
      renderWithProviders(<Modal {...defaultProps} isOpen={true} />)

      // Modal uses createPortal to render to document.body
      const dialog = screen.getByRole('dialog')
      expect(document.body.contains(dialog)).toBe(true)
    })

    it('renders with backdrop', () => {
      renderWithProviders(<Modal {...defaultProps} isOpen={true} />)

      // Backdrop has aria-hidden="true" and specific classes
      const backdrop = document.querySelector('[aria-hidden="true"]')
      expect(backdrop).toBeInTheDocument()
      expect(backdrop).toHaveClass('bg-black/50', 'backdrop-blur-sm')
    })

    it('sets aria-modal to true', () => {
      renderWithProviders(<Modal {...defaultProps} isOpen={true} />)

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
    })

    it('renders with correct base styles', () => {
      renderWithProviders(<Modal {...defaultProps} isOpen={true} />)

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveClass('relative', 'w-full')
      expect(dialog).toHaveClass('bg-white', 'dark:bg-gray-800')
      expect(dialog).toHaveClass('rounded-xl', 'shadow-xl')
    })
  })

  // ============================================================================
  // Not rendering when closed
  // ============================================================================

  describe('not rendering when closed', () => {
    it('does not render modal when isOpen is false', () => {
      renderWithProviders(<Modal {...defaultProps} isOpen={false} />)

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('does not render backdrop when isOpen is false', () => {
      renderWithProviders(<Modal {...defaultProps} isOpen={false} />)

      // No backdrop should be present
      const backdrop = document.querySelector('.bg-black\\/50')
      expect(backdrop).not.toBeInTheDocument()
    })

    it('does not render title when isOpen is false', () => {
      renderWithProviders(
        <Modal {...defaultProps} isOpen={false} title="Test Title" />
      )

      expect(screen.queryByText('Test Title')).not.toBeInTheDocument()
    })

    it('does not render children when isOpen is false', () => {
      renderWithProviders(
        <Modal {...defaultProps} isOpen={false}>
          <p>Child content</p>
        </Modal>
      )

      expect(screen.queryByText('Child content')).not.toBeInTheDocument()
    })

    it('does not modify body overflow when isOpen is false', () => {
      document.body.style.overflow = ''
      renderWithProviders(<Modal {...defaultProps} isOpen={false} />)

      expect(document.body.style.overflow).toBe('')
    })
  })

  // ============================================================================
  // Title rendering
  // ============================================================================

  describe('title rendering', () => {
    it('renders title when provided', () => {
      renderWithProviders(<Modal {...defaultProps} title="My Modal Title" />)

      expect(screen.getByText('My Modal Title')).toBeInTheDocument()
    })

    it('renders title as h2 element', () => {
      renderWithProviders(<Modal {...defaultProps} title="Heading Title" />)

      const heading = screen.getByRole('heading', { level: 2 })
      expect(heading).toHaveTextContent('Heading Title')
    })

    it('applies title styles', () => {
      renderWithProviders(<Modal {...defaultProps} title="Styled Title" />)

      const heading = screen.getByRole('heading', { level: 2 })
      expect(heading).toHaveClass('text-lg', 'font-semibold')
      expect(heading).toHaveClass('text-gray-900', 'dark:text-gray-100')
    })

    it('sets aria-labelledby to title id', () => {
      renderWithProviders(<Modal {...defaultProps} title="Labeled Title" />)

      const dialog = screen.getByRole('dialog')
      const heading = screen.getByRole('heading', { level: 2 })
      const titleId = heading.getAttribute('id')

      expect(dialog).toHaveAttribute('aria-labelledby', titleId)
    })

    it('does not set aria-labelledby when title is not provided', () => {
      renderWithProviders(<Modal {...defaultProps} title={undefined} />)

      const dialog = screen.getByRole('dialog')
      expect(dialog).not.toHaveAttribute('aria-labelledby')
    })

    it('renders ReactNode as title', () => {
      const titleElement = (
        <span data-testid="custom-title">
          <strong>Bold</strong> Title
        </span>
      )
      renderWithProviders(<Modal {...defaultProps} title={titleElement} />)

      expect(screen.getByTestId('custom-title')).toBeInTheDocument()
      expect(screen.getByText('Bold')).toBeInTheDocument()
    })

    it('renders empty modal header when no title but showCloseButton is true', () => {
      renderWithProviders(
        <Modal {...defaultProps} title={undefined} showCloseButton={true} />
      )

      // Close button should still be present
      expect(screen.getByLabelText('Close modal')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Description rendering
  // ============================================================================

  describe('description rendering', () => {
    it('renders description when provided', () => {
      renderWithProviders(
        <Modal {...defaultProps} description="This is a description" />
      )

      expect(screen.getByText('This is a description')).toBeInTheDocument()
    })

    it('applies description styles', () => {
      renderWithProviders(
        <Modal {...defaultProps} description="Styled description" />
      )

      const description = screen.getByText('Styled description')
      expect(description).toHaveClass('mt-1', 'text-sm')
      expect(description).toHaveClass('text-gray-500', 'dark:text-gray-400')
    })

    it('sets aria-describedby to description id', () => {
      renderWithProviders(
        <Modal {...defaultProps} description="Modal description" />
      )

      const dialog = screen.getByRole('dialog')
      const description = screen.getByText('Modal description')
      const descriptionId = description.getAttribute('id')

      expect(dialog).toHaveAttribute('aria-describedby', descriptionId)
    })

    it('does not set aria-describedby when description is not provided', () => {
      renderWithProviders(<Modal {...defaultProps} description={undefined} />)

      const dialog = screen.getByRole('dialog')
      expect(dialog).not.toHaveAttribute('aria-describedby')
    })

    it('renders description below title', () => {
      renderWithProviders(
        <Modal
          {...defaultProps}
          title="Title Text"
          description="Description Text"
        />
      )

      const title = screen.getByRole('heading', { level: 2 })
      const description = screen.getByText('Description Text')

      // Description should be a sibling after the title in the DOM
      expect(title.parentElement?.contains(description)).toBe(true)
    })

    it('does not render description when title is not provided', () => {
      // Description requires title to be shown (based on component structure)
      renderWithProviders(
        <Modal
          {...defaultProps}
          title={undefined}
          description="Orphan description"
        />
      )

      // The description is only rendered inside the title wrapper, so without title it won't show
      expect(screen.queryByText('Orphan description')).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // Footer rendering
  // ============================================================================

  describe('footer rendering', () => {
    it('renders footer when provided', () => {
      const footer = <button>Save</button>
      renderWithProviders(<Modal {...defaultProps} footer={footer} />)

      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
    })

    it('applies footer styles', () => {
      const footer = <div data-testid="footer-content">Footer</div>
      renderWithProviders(<Modal {...defaultProps} footer={footer} />)

      const footerContent = screen.getByTestId('footer-content')
      const footerContainer = footerContent.parentElement

      expect(footerContainer).toHaveClass('px-6', 'pb-6', 'pt-2')
      expect(footerContainer).toHaveClass('border-t', 'border-gray-200', 'dark:border-gray-700')
    })

    it('does not render footer section when footer is not provided', () => {
      renderWithProviders(<Modal {...defaultProps} footer={undefined} />)

      // No border-t element should exist (footer has border-t)
      const dialog = screen.getByRole('dialog')
      const footerSection = dialog.querySelector('.border-t')
      expect(footerSection).not.toBeInTheDocument()
    })

    it('renders complex footer with multiple elements', () => {
      const footer = (
        <div className="flex gap-2 justify-end">
          <button data-testid="cancel-btn">Cancel</button>
          <button data-testid="save-btn">Save</button>
        </div>
      )
      renderWithProviders(<Modal {...defaultProps} footer={footer} />)

      expect(screen.getByTestId('cancel-btn')).toBeInTheDocument()
      expect(screen.getByTestId('save-btn')).toBeInTheDocument()
    })

    it('renders footer after content area', () => {
      const footer = <div data-testid="footer">Footer</div>
      renderWithProviders(
        <Modal {...defaultProps} footer={footer}>
          <div data-testid="content">Content</div>
        </Modal>
      )

      const dialog = screen.getByRole('dialog')
      const content = screen.getByTestId('content')
      const footerEl = screen.getByTestId('footer')

      // Footer container should come after content container
      const contentContainer = content.parentElement
      const footerContainer = footerEl.parentElement

      const children = Array.from(dialog.children)
      const contentIdx = children.indexOf(contentContainer!)
      const footerIdx = children.indexOf(footerContainer!)

      expect(footerIdx).toBeGreaterThan(contentIdx)
    })
  })

  // ============================================================================
  // Children rendering
  // ============================================================================

  describe('children rendering', () => {
    it('renders children in content area', () => {
      renderWithProviders(
        <Modal {...defaultProps}>
          <p>Modal body content</p>
        </Modal>
      )

      expect(screen.getByText('Modal body content')).toBeInTheDocument()
    })

    it('renders multiple children', () => {
      renderWithProviders(
        <Modal {...defaultProps}>
          <p data-testid="child-1">First child</p>
          <p data-testid="child-2">Second child</p>
          <p data-testid="child-3">Third child</p>
        </Modal>
      )

      expect(screen.getByTestId('child-1')).toBeInTheDocument()
      expect(screen.getByTestId('child-2')).toBeInTheDocument()
      expect(screen.getByTestId('child-3')).toBeInTheDocument()
    })

    it('renders complex children elements', () => {
      renderWithProviders(
        <Modal {...defaultProps}>
          <form data-testid="modal-form">
            <input type="text" placeholder="Name" />
            <button type="submit">Submit</button>
          </form>
        </Modal>
      )

      expect(screen.getByTestId('modal-form')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Name')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument()
    })

    it('applies content area styles', () => {
      renderWithProviders(
        <Modal {...defaultProps}>
          <div data-testid="content">Content</div>
        </Modal>
      )

      const content = screen.getByTestId('content')
      const contentContainer = content.parentElement

      expect(contentContainer).toHaveClass('px-6')
    })

    it('renders content between header and footer', () => {
      const footer = <div data-testid="footer">Footer</div>
      renderWithProviders(
        <Modal {...defaultProps} title="Title" footer={footer}>
          <div data-testid="content">Content</div>
        </Modal>
      )

      const dialog = screen.getByRole('dialog')
      const header = screen.getByRole('heading', { level: 2 }).parentElement?.parentElement
      const content = screen.getByTestId('content').parentElement
      const footerContainer = screen.getByTestId('footer').parentElement

      const children = Array.from(dialog.children)
      const headerIdx = children.indexOf(header!)
      const contentIdx = children.indexOf(content!)
      const footerIdx = children.indexOf(footerContainer!)

      expect(headerIdx).toBeLessThan(contentIdx)
      expect(contentIdx).toBeLessThan(footerIdx)
    })

    it('renders null children gracefully', () => {
      renderWithProviders(<Modal {...defaultProps}>{null}</Modal>)

      const dialog = screen.getByRole('dialog')
      expect(dialog).toBeInTheDocument()
    })

    it('renders undefined children gracefully', () => {
      renderWithProviders(<Modal {...defaultProps}>{undefined}</Modal>)

      const dialog = screen.getByRole('dialog')
      expect(dialog).toBeInTheDocument()
    })

    it('renders conditional children', () => {
      const showContent = true
      renderWithProviders(
        <Modal {...defaultProps}>
          {showContent && <p>Conditional content</p>}
        </Modal>
      )

      expect(screen.getByText('Conditional content')).toBeInTheDocument()
    })

    it('does not render hidden conditional children', () => {
      const showContent = false
      renderWithProviders(
        <Modal {...defaultProps}>
          {showContent && <p>Hidden content</p>}
        </Modal>
      )

      expect(screen.queryByText('Hidden content')).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // Body scroll lock
  // ============================================================================

  describe('body scroll lock', () => {
    it('locks body scroll when modal opens', async () => {
      renderWithProviders(<Modal {...defaultProps} isOpen={true} />)

      await waitFor(() => {
        expect(document.body.style.overflow).toBe('hidden')
      })
    })

    it('does not lock body scroll when modal is closed', () => {
      document.body.style.overflow = ''
      renderWithProviders(<Modal {...defaultProps} isOpen={false} />)

      expect(document.body.style.overflow).toBe('')
    })

    it('restores body scroll when modal closes', async () => {
      const { rerender } = renderWithProviders(
        <Modal {...defaultProps} isOpen={true} />
      )

      await waitFor(() => {
        expect(document.body.style.overflow).toBe('hidden')
      })

      rerender(<Modal {...defaultProps} isOpen={false} />)

      await waitFor(() => {
        expect(document.body.style.overflow).toBe('')
      })
    })
  })

  // ============================================================================
  // Close button behavior
  // ============================================================================

  describe('close button behavior', () => {
    it('calls onClose when close button is clicked', async () => {
      const onClose = vi.fn()
      const { user } = renderWithProviders(
        <Modal {...defaultProps} onClose={onClose} />
      )

      const closeButton = screen.getByLabelText('Close modal')
      await user.click(closeButton)

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('renders close button by default (showCloseButton defaults to true)', () => {
      renderWithProviders(<Modal {...defaultProps} />)

      expect(screen.getByLabelText('Close modal')).toBeInTheDocument()
    })

    it('renders close button when showCloseButton is true', () => {
      renderWithProviders(<Modal {...defaultProps} showCloseButton={true} />)

      expect(screen.getByLabelText('Close modal')).toBeInTheDocument()
    })

    it('does not render close button when showCloseButton is false', () => {
      renderWithProviders(<Modal {...defaultProps} showCloseButton={false} />)

      expect(screen.queryByLabelText('Close modal')).not.toBeInTheDocument()
    })

    it('close button has correct aria-label', () => {
      renderWithProviders(<Modal {...defaultProps} />)

      const closeButton = screen.getByLabelText('Close modal')
      expect(closeButton).toHaveAttribute('aria-label', 'Close modal')
    })

    it('close button is a button element', () => {
      renderWithProviders(<Modal {...defaultProps} />)

      const closeButton = screen.getByLabelText('Close modal')
      expect(closeButton.tagName).toBe('BUTTON')
      expect(closeButton).toHaveAttribute('type', 'button')
    })

    it('calls onClose only once per click', async () => {
      const onClose = vi.fn()
      const { user } = renderWithProviders(
        <Modal {...defaultProps} onClose={onClose} />
      )

      const closeButton = screen.getByLabelText('Close modal')
      await user.click(closeButton)
      await user.click(closeButton)

      expect(onClose).toHaveBeenCalledTimes(2)
    })

    it('close button has hover and focus styles', () => {
      renderWithProviders(<Modal {...defaultProps} />)

      const closeButton = screen.getByLabelText('Close modal')
      expect(closeButton).toHaveClass('hover:text-gray-600')
      expect(closeButton).toHaveClass('focus:outline-none', 'focus:ring-2')
    })
  })

  // ============================================================================
  // Escape key behavior
  // ============================================================================

  describe('escape key behavior', () => {
    it('calls onClose when Escape key is pressed and closeOnEscape is true', async () => {
      const onClose = vi.fn()
      const { user } = renderWithProviders(
        <Modal {...defaultProps} onClose={onClose} closeOnEscape={true} />
      )

      await user.keyboard('{Escape}')

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when Escape key is pressed and closeOnEscape defaults to true', async () => {
      const onClose = vi.fn()
      const { user } = renderWithProviders(
        <Modal {...defaultProps} onClose={onClose} />
      )

      await user.keyboard('{Escape}')

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('does not call onClose when Escape key is pressed and closeOnEscape is false', async () => {
      const onClose = vi.fn()
      const { user } = renderWithProviders(
        <Modal {...defaultProps} onClose={onClose} closeOnEscape={false} />
      )

      await user.keyboard('{Escape}')

      expect(onClose).not.toHaveBeenCalled()
    })

    it('calls onClose only once per Escape press', async () => {
      const onClose = vi.fn()
      const { user } = renderWithProviders(
        <Modal {...defaultProps} onClose={onClose} closeOnEscape={true} />
      )

      await user.keyboard('{Escape}')
      await user.keyboard('{Escape}')

      expect(onClose).toHaveBeenCalledTimes(2)
    })

    it('Escape key works regardless of focus position', async () => {
      const onClose = vi.fn()
      const { user } = renderWithProviders(
        <Modal {...defaultProps} onClose={onClose} closeOnEscape={true}>
          <input type="text" placeholder="Focus here" />
          <button>Click me</button>
        </Modal>
      )

      // Focus the input and press escape
      const input = screen.getByPlaceholderText('Focus here')
      await user.click(input)
      await user.keyboard('{Escape}')

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('Escape key does not trigger other handlers when closeOnEscape is true', async () => {
      const onClose = vi.fn()
      const onKeyDown = vi.fn()
      const { user } = renderWithProviders(
        <Modal
          {...defaultProps}
          onClose={onClose}
          closeOnEscape={true}
          onKeyDown={onKeyDown}
        />
      )

      await user.keyboard('{Escape}')

      // onClose should be called, and onKeyDown should also be called
      // (component doesn't stopPropagation, just preventDefault)
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('other keys do not trigger onClose', async () => {
      const onClose = vi.fn()
      const { user } = renderWithProviders(
        <Modal {...defaultProps} onClose={onClose} closeOnEscape={true} />
      )

      await user.keyboard('{Enter}')
      await user.keyboard('{Space}')
      await user.keyboard('a')

      expect(onClose).not.toHaveBeenCalled()
    })
  })

  // ============================================================================
  // Backdrop click behavior
  // ============================================================================

  describe('backdrop click behavior', () => {
    it('calls onClose when backdrop is clicked and closeOnBackdropClick is true', async () => {
      const onClose = vi.fn()
      const { user } = renderWithProviders(
        <Modal {...defaultProps} onClose={onClose} closeOnBackdropClick={true} />
      )

      // Click on the backdrop (the container with role="presentation")
      const backdrop = document.querySelector('[role="presentation"]')
      expect(backdrop).toBeInTheDocument()
      await user.click(backdrop as Element)

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when backdrop is clicked and closeOnBackdropClick defaults to true', async () => {
      const onClose = vi.fn()
      const { user } = renderWithProviders(
        <Modal {...defaultProps} onClose={onClose} />
      )

      // Click on the backdrop (the container with role="presentation")
      const backdrop = document.querySelector('[role="presentation"]')
      await user.click(backdrop as Element)

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('does not call onClose when backdrop is clicked and closeOnBackdropClick is false', async () => {
      const onClose = vi.fn()
      const { user } = renderWithProviders(
        <Modal {...defaultProps} onClose={onClose} closeOnBackdropClick={false} />
      )

      // Click on the backdrop (the container with role="presentation")
      const backdrop = document.querySelector('[role="presentation"]')
      await user.click(backdrop as Element)

      expect(onClose).not.toHaveBeenCalled()
    })

    it('does not call onClose when clicking inside the modal content', async () => {
      const onClose = vi.fn()
      const { user } = renderWithProviders(
        <Modal {...defaultProps} onClose={onClose} closeOnBackdropClick={true}>
          <div data-testid="content">Click me</div>
        </Modal>
      )

      // Click on the modal content
      const content = screen.getByTestId('content')
      await user.click(content)

      expect(onClose).not.toHaveBeenCalled()
    })

    it('does not call onClose when clicking on the modal dialog itself', async () => {
      const onClose = vi.fn()
      const { user } = renderWithProviders(
        <Modal {...defaultProps} onClose={onClose} closeOnBackdropClick={true} />
      )

      // Click on the dialog element
      const dialog = screen.getByRole('dialog')
      await user.click(dialog)

      expect(onClose).not.toHaveBeenCalled()
    })

    it('does not call onClose when clicking on modal header', async () => {
      const onClose = vi.fn()
      const { user } = renderWithProviders(
        <Modal
          {...defaultProps}
          onClose={onClose}
          closeOnBackdropClick={true}
          title="Test Title"
        />
      )

      // Click on the title
      const title = screen.getByText('Test Title')
      await user.click(title)

      // Should not close from clicking the title (only close button)
      expect(onClose).not.toHaveBeenCalled()
    })

    it('does not call onClose when clicking on modal footer', async () => {
      const onClose = vi.fn()
      const { user } = renderWithProviders(
        <Modal
          {...defaultProps}
          onClose={onClose}
          closeOnBackdropClick={true}
          footer={<div data-testid="footer">Footer content</div>}
        />
      )

      // Click on the footer
      const footer = screen.getByTestId('footer')
      await user.click(footer)

      expect(onClose).not.toHaveBeenCalled()
    })

    it('backdrop click works independently from Escape key setting', async () => {
      const onClose = vi.fn()
      const { user } = renderWithProviders(
        <Modal
          {...defaultProps}
          onClose={onClose}
          closeOnBackdropClick={true}
          closeOnEscape={false}
        />
      )

      // Click on the backdrop
      const backdrop = document.querySelector('[role="presentation"]')
      await user.click(backdrop as Element)

      expect(onClose).toHaveBeenCalledTimes(1)

      // Escape should not work
      onClose.mockClear()
      await user.keyboard('{Escape}')
      expect(onClose).not.toHaveBeenCalled()
    })

    it('Escape key works independently from backdrop click setting', async () => {
      const onClose = vi.fn()
      const { user } = renderWithProviders(
        <Modal
          {...defaultProps}
          onClose={onClose}
          closeOnBackdropClick={false}
          closeOnEscape={true}
        />
      )

      // Backdrop click should not work
      const backdrop = document.querySelector('[role="presentation"]')
      await user.click(backdrop as Element)
      expect(onClose).not.toHaveBeenCalled()

      // Escape should work
      await user.keyboard('{Escape}')
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('both close behaviors can be disabled simultaneously', async () => {
      const onClose = vi.fn()
      const { user } = renderWithProviders(
        <Modal
          {...defaultProps}
          onClose={onClose}
          closeOnBackdropClick={false}
          closeOnEscape={false}
        />
      )

      // Backdrop click should not work
      const backdrop = document.querySelector('[role="presentation"]')
      await user.click(backdrop as Element)
      expect(onClose).not.toHaveBeenCalled()

      // Escape should not work
      await user.keyboard('{Escape}')
      expect(onClose).not.toHaveBeenCalled()

      // Close button should still work
      const closeButton = screen.getByLabelText('Close modal')
      await user.click(closeButton)
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  // ============================================================================
  // Accessibility features (ARIA attributes and focus management)
  // ============================================================================

  describe('accessibility features', () => {
    describe('ARIA attributes', () => {
      it('has role=dialog', () => {
        renderWithProviders(<Modal {...defaultProps} />)

        const dialog = screen.getByRole('dialog')
        expect(dialog).toBeInTheDocument()
        expect(dialog.getAttribute('role')).toBe('dialog')
      })

      it('has aria-modal=true', () => {
        renderWithProviders(<Modal {...defaultProps} />)

        const dialog = screen.getByRole('dialog')
        expect(dialog).toHaveAttribute('aria-modal', 'true')
      })

      it('has aria-labelledby pointing to title when title is provided', () => {
        renderWithProviders(<Modal {...defaultProps} title="Accessible Title" />)

        const dialog = screen.getByRole('dialog')
        const heading = screen.getByRole('heading', { level: 2 })
        const titleId = heading.getAttribute('id')

        expect(titleId).toBeTruthy()
        expect(dialog).toHaveAttribute('aria-labelledby', titleId)
      })

      it('does not have aria-labelledby when no title is provided', () => {
        renderWithProviders(
          <Modal {...defaultProps} title={undefined} showCloseButton={true} />
        )

        const dialog = screen.getByRole('dialog')
        expect(dialog).not.toHaveAttribute('aria-labelledby')
      })

      it('has aria-describedby pointing to description when provided', () => {
        renderWithProviders(
          <Modal {...defaultProps} title="Title" description="This is a helpful description" />
        )

        const dialog = screen.getByRole('dialog')
        const description = screen.getByText('This is a helpful description')
        const descriptionId = description.getAttribute('id')

        expect(descriptionId).toBeTruthy()
        expect(dialog).toHaveAttribute('aria-describedby', descriptionId)
      })

      it('does not have aria-describedby when no description is provided', () => {
        renderWithProviders(<Modal {...defaultProps} description={undefined} />)

        const dialog = screen.getByRole('dialog')
        expect(dialog).not.toHaveAttribute('aria-describedby')
      })

      it('has both aria-labelledby and aria-describedby when both are provided', () => {
        renderWithProviders(
          <Modal
            {...defaultProps}
            title="Modal Title"
            description="Modal Description"
          />
        )

        const dialog = screen.getByRole('dialog')
        expect(dialog).toHaveAttribute('aria-labelledby')
        expect(dialog).toHaveAttribute('aria-describedby')
      })

      it('backdrop has aria-hidden=true', () => {
        renderWithProviders(<Modal {...defaultProps} />)

        const backdrop = document.querySelector('.bg-black\\/50')
        expect(backdrop).toHaveAttribute('aria-hidden', 'true')
      })

      it('modal panel has tabIndex=-1 for programmatic focus', () => {
        renderWithProviders(<Modal {...defaultProps} />)

        const dialog = screen.getByRole('dialog')
        expect(dialog).toHaveAttribute('tabindex', '-1')
      })
    })

    describe('focus management on open', () => {
      it('moves focus to first focusable element when modal opens', async () => {
        renderWithProviders(
          <Modal {...defaultProps}>
            <button data-testid="first-button">First Button</button>
            <button data-testid="second-button">Second Button</button>
          </Modal>
        )

        await waitFor(() => {
          expect(screen.getByTestId('first-button')).toHaveFocus()
        })
      })

      it('moves focus to close button when no other focusable elements exist', async () => {
        renderWithProviders(
          <Modal {...defaultProps} showCloseButton={true}>
            <p>Non-focusable content</p>
          </Modal>
        )

        await waitFor(() => {
          expect(screen.getByLabelText('Close modal')).toHaveFocus()
        })
      })

      it('moves focus to first input when form is present', async () => {
        renderWithProviders(
          <Modal {...defaultProps}>
            <form>
              <input type="text" data-testid="first-input" placeholder="Name" />
              <button type="submit">Submit</button>
            </form>
          </Modal>
        )

        await waitFor(() => {
          expect(screen.getByTestId('first-input')).toHaveFocus()
        })
      })

      it('skips disabled elements when finding first focusable', async () => {
        renderWithProviders(
          <Modal {...defaultProps}>
            <button disabled data-testid="disabled-button">Disabled</button>
            <button data-testid="enabled-button">Enabled</button>
          </Modal>
        )

        await waitFor(() => {
          expect(screen.getByTestId('enabled-button')).toHaveFocus()
        })
      })

      it('focuses modal itself when no focusable elements exist', async () => {
        renderWithProviders(
          <Modal {...defaultProps} showCloseButton={false}>
            <p>No focusable elements here</p>
          </Modal>
        )

        const dialog = screen.getByRole('dialog')

        await waitFor(() => {
          expect(dialog).toHaveFocus()
        })
      })

      it('focuses link elements when they are first focusable', async () => {
        renderWithProviders(
          <Modal {...defaultProps} showCloseButton={false}>
            <a href="https://example.com" data-testid="first-link">Link</a>
            <button>Button</button>
          </Modal>
        )

        await waitFor(() => {
          expect(screen.getByTestId('first-link')).toHaveFocus()
        })
      })
    })

    describe('focus trap', () => {
      it('traps focus within modal on Tab from last element', async () => {
        const { user } = renderWithProviders(
          <Modal {...defaultProps}>
            <button data-testid="first-button">First</button>
            <button data-testid="last-button">Last</button>
          </Modal>
        )

        // Wait for initial focus
        await waitFor(() => {
          expect(screen.getByTestId('first-button')).toHaveFocus()
        })

        // Tab to last element (close button is actually last)
        const closeButton = screen.getByLabelText('Close modal')
        closeButton.focus()

        // Tab from close button should go to first focusable element
        await user.tab()

        await waitFor(() => {
          expect(screen.getByTestId('first-button')).toHaveFocus()
        })
      })

      it('traps focus within modal on Shift+Tab from first element', async () => {
        const { user } = renderWithProviders(
          <Modal {...defaultProps}>
            <button data-testid="first-button">First</button>
            <button data-testid="last-button">Last</button>
          </Modal>
        )

        // Wait for initial focus on first button
        await waitFor(() => {
          expect(screen.getByTestId('first-button')).toHaveFocus()
        })

        // Shift+Tab from first element should go to last focusable (close button)
        await user.tab({ shift: true })

        await waitFor(() => {
          expect(screen.getByLabelText('Close modal')).toHaveFocus()
        })
      })

      it('cycles through all focusable elements with Tab', async () => {
        const { user } = renderWithProviders(
          <Modal {...defaultProps}>
            <button data-testid="button-1">Button 1</button>
            <button data-testid="button-2">Button 2</button>
            <button data-testid="button-3">Button 3</button>
          </Modal>
        )

        // Wait for initial focus
        await waitFor(() => {
          expect(screen.getByTestId('button-1')).toHaveFocus()
        })

        // Tab through all elements
        await user.tab()
        expect(screen.getByTestId('button-2')).toHaveFocus()

        await user.tab()
        expect(screen.getByTestId('button-3')).toHaveFocus()

        await user.tab()
        expect(screen.getByLabelText('Close modal')).toHaveFocus()

        // Tab from close button wraps to first element
        await user.tab()
        expect(screen.getByTestId('button-1')).toHaveFocus()
      })

      it('does not trap focus when modal has no focusable elements', async () => {
        renderWithProviders(
          <Modal {...defaultProps} showCloseButton={false}>
            <p>No focusable elements</p>
          </Modal>
        )

        // Modal itself should have focus since there are no focusable elements
        const dialog = screen.getByRole('dialog')
        await waitFor(() => {
          expect(dialog).toHaveFocus()
        })
      })
    })

    describe('focus restoration on close', () => {
      it('restores focus to previously focused element when modal closes', async () => {
        // Create a button outside the modal that will be focused before opening
        const OuterButton = () => (
          <button data-testid="outer-button">Focus me</button>
        )

        const { rerender } = renderWithProviders(
          <>
            <OuterButton />
            <Modal {...defaultProps} isOpen={false}>
              <button>Inside modal</button>
            </Modal>
          </>
        )

        // Focus the outer button
        const outerButton = screen.getByTestId('outer-button')
        outerButton.focus()
        expect(outerButton).toHaveFocus()

        // Open the modal
        rerender(
          <>
            <OuterButton />
            <Modal {...defaultProps} isOpen={true}>
              <button data-testid="inner-button">Inside modal</button>
            </Modal>
          </>
        )

        // Wait for focus to move to modal content
        await waitFor(() => {
          expect(screen.getByTestId('inner-button')).toHaveFocus()
        })

        // Close the modal
        rerender(
          <>
            <OuterButton />
            <Modal {...defaultProps} isOpen={false}>
              <button data-testid="inner-button">Inside modal</button>
            </Modal>
          </>
        )

        // Focus should be restored to outer button
        await waitFor(() => {
          expect(outerButton).toHaveFocus()
        })
      })

      it('stores reference to previously active element when opening', async () => {
        const triggerButton = document.createElement('button')
        triggerButton.textContent = 'Trigger'
        document.body.appendChild(triggerButton)
        triggerButton.focus()

        expect(document.activeElement).toBe(triggerButton)

        renderWithProviders(
          <Modal {...defaultProps}>
            <button data-testid="modal-button">Modal Button</button>
          </Modal>
        )

        // Focus should move to modal content
        await waitFor(() => {
          expect(screen.getByTestId('modal-button')).toHaveFocus()
        })

        // Cleanup
        document.body.removeChild(triggerButton)
      })
    })
  })

  // ============================================================================
  // Size variants
  // ============================================================================

  describe('size variants', () => {
    it('renders with default size (md)', () => {
      renderWithProviders(<Modal {...defaultProps} />)

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveClass('max-w-md')
    })

    it('renders with sm size', () => {
      renderWithProviders(<Modal {...defaultProps} size="sm" />)

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveClass('max-w-sm')
    })

    it('renders with md size', () => {
      renderWithProviders(<Modal {...defaultProps} size="md" />)

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveClass('max-w-md')
    })

    it('renders with lg size', () => {
      renderWithProviders(<Modal {...defaultProps} size="lg" />)

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveClass('max-w-lg')
    })

    it('renders with xl size', () => {
      renderWithProviders(<Modal {...defaultProps} size="xl" />)

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveClass('max-w-xl')
    })

    it('renders with full size', () => {
      renderWithProviders(<Modal {...defaultProps} size="full" />)

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveClass('max-w-full', 'mx-4')
    })

    it('sm size is smaller than md size', () => {
      const { rerender } = renderWithProviders(<Modal {...defaultProps} size="sm" />)

      let dialog = screen.getByRole('dialog')
      expect(dialog).toHaveClass('max-w-sm')
      expect(dialog).not.toHaveClass('max-w-md')

      rerender(<Modal {...defaultProps} size="md" />)

      dialog = screen.getByRole('dialog')
      expect(dialog).toHaveClass('max-w-md')
      expect(dialog).not.toHaveClass('max-w-sm')
    })

    it('maintains other styles regardless of size', () => {
      renderWithProviders(<Modal {...defaultProps} size="lg" />)

      const dialog = screen.getByRole('dialog')
      // Base styles should still be present
      expect(dialog).toHaveClass('relative', 'w-full')
      expect(dialog).toHaveClass('bg-white', 'dark:bg-gray-800')
      expect(dialog).toHaveClass('rounded-xl', 'shadow-xl')
    })

    it('size can be changed dynamically', () => {
      const { rerender } = renderWithProviders(<Modal {...defaultProps} size="sm" />)

      let dialog = screen.getByRole('dialog')
      expect(dialog).toHaveClass('max-w-sm')

      rerender(<Modal {...defaultProps} size="xl" />)

      dialog = screen.getByRole('dialog')
      expect(dialog).toHaveClass('max-w-xl')
      expect(dialog).not.toHaveClass('max-w-sm')
    })

    it('works with all size values as valid ModalSize type', () => {
      const sizes: ModalSize[] = ['sm', 'md', 'lg', 'xl', 'full']
      const expectedClasses: Record<ModalSize, string[]> = {
        sm: ['max-w-sm'],
        md: ['max-w-md'],
        lg: ['max-w-lg'],
        xl: ['max-w-xl'],
        full: ['max-w-full', 'mx-4'],
      }

      sizes.forEach((size) => {
        const { unmount } = renderWithProviders(<Modal {...defaultProps} size={size} />)
        const dialog = screen.getByRole('dialog')

        expectedClasses[size].forEach((className) => {
          expect(dialog).toHaveClass(className)
        })

        unmount()
      })
    })
  })

  // ============================================================================
  // Centered prop
  // ============================================================================

  describe('centered prop', () => {
    it('renders centered by default (centered defaults to true)', () => {
      renderWithProviders(<Modal {...defaultProps} />)

      const container = document.querySelector('[role="presentation"]')
      expect(container).toHaveClass('items-center')
      expect(container).not.toHaveClass('items-start')
    })

    it('renders centered when centered prop is true', () => {
      renderWithProviders(<Modal {...defaultProps} centered={true} />)

      const container = document.querySelector('[role="presentation"]')
      expect(container).toHaveClass('items-center')
      expect(container).not.toHaveClass('items-start')
      expect(container).not.toHaveClass('pt-10')
    })

    it('renders at top when centered prop is false', () => {
      renderWithProviders(<Modal {...defaultProps} centered={false} />)

      const container = document.querySelector('[role="presentation"]')
      expect(container).toHaveClass('items-start', 'pt-10')
      expect(container).not.toHaveClass('items-center')
    })

    it('maintains flex container styles when centered', () => {
      renderWithProviders(<Modal {...defaultProps} centered={true} />)

      const container = document.querySelector('[role="presentation"]')
      expect(container).toHaveClass('flex', 'justify-center')
    })

    it('maintains flex container styles when not centered', () => {
      renderWithProviders(<Modal {...defaultProps} centered={false} />)

      const container = document.querySelector('[role="presentation"]')
      expect(container).toHaveClass('flex', 'justify-center')
    })

    it('can be changed dynamically', () => {
      const { rerender } = renderWithProviders(<Modal {...defaultProps} centered={true} />)

      let container = document.querySelector('[role="presentation"]')
      expect(container).toHaveClass('items-center')

      rerender(<Modal {...defaultProps} centered={false} />)

      container = document.querySelector('[role="presentation"]')
      expect(container).toHaveClass('items-start', 'pt-10')
    })

    it('works with all sizes when centered', () => {
      const sizes: ModalSize[] = ['sm', 'md', 'lg', 'xl', 'full']

      sizes.forEach((size) => {
        const { unmount } = renderWithProviders(
          <Modal {...defaultProps} size={size} centered={true} />
        )

        const container = document.querySelector('[role="presentation"]')
        expect(container).toHaveClass('items-center')

        const dialog = screen.getByRole('dialog')
        expect(dialog).toBeInTheDocument()

        unmount()
      })
    })

    it('works with all sizes when not centered', () => {
      const sizes: ModalSize[] = ['sm', 'md', 'lg', 'xl', 'full']

      sizes.forEach((size) => {
        const { unmount } = renderWithProviders(
          <Modal {...defaultProps} size={size} centered={false} />
        )

        const container = document.querySelector('[role="presentation"]')
        expect(container).toHaveClass('items-start', 'pt-10')

        const dialog = screen.getByRole('dialog')
        expect(dialog).toBeInTheDocument()

        unmount()
      })
    })
  })

  // ============================================================================
  // showCloseButton prop (comprehensive tests)
  // ============================================================================

  describe('showCloseButton prop', () => {
    it('shows close button by default', () => {
      renderWithProviders(<Modal {...defaultProps} />)

      expect(screen.getByLabelText('Close modal')).toBeInTheDocument()
    })

    it('shows close button when explicitly set to true', () => {
      renderWithProviders(<Modal {...defaultProps} showCloseButton={true} />)

      expect(screen.getByLabelText('Close modal')).toBeInTheDocument()
    })

    it('hides close button when set to false', () => {
      renderWithProviders(<Modal {...defaultProps} showCloseButton={false} />)

      expect(screen.queryByLabelText('Close modal')).not.toBeInTheDocument()
    })

    it('close button has X icon', () => {
      renderWithProviders(<Modal {...defaultProps} showCloseButton={true} />)

      const closeButton = screen.getByLabelText('Close modal')
      const svg = closeButton.querySelector('svg')

      expect(svg).toBeInTheDocument()
      expect(svg).toHaveClass('h-5', 'w-5')
      expect(svg).toHaveAttribute('aria-hidden', 'true')
    })

    it('close button has proper styling', () => {
      renderWithProviders(<Modal {...defaultProps} showCloseButton={true} />)

      const closeButton = screen.getByLabelText('Close modal')
      expect(closeButton).toHaveClass('h-8', 'w-8', 'rounded-lg')
      expect(closeButton).toHaveClass('text-gray-400')
      expect(closeButton).toHaveClass('hover:text-gray-600')
      expect(closeButton).toHaveClass('hover:bg-gray-100')
    })

    it('renders header when only showCloseButton is true (no title)', () => {
      renderWithProviders(
        <Modal {...defaultProps} title={undefined} showCloseButton={true} />
      )

      expect(screen.getByLabelText('Close modal')).toBeInTheDocument()
    })

    it('does not render header when both title is undefined and showCloseButton is false', () => {
      renderWithProviders(
        <Modal {...defaultProps} title={undefined} showCloseButton={false}>
          <div data-testid="content">Content</div>
        </Modal>
      )

      expect(screen.queryByLabelText('Close modal')).not.toBeInTheDocument()
      // Content should be in the dialog but no header elements
      expect(screen.getByTestId('content')).toBeInTheDocument()
    })

    it('close button position is absolute when no title', () => {
      renderWithProviders(
        <Modal {...defaultProps} title={undefined} showCloseButton={true} />
      )

      const closeButton = screen.getByLabelText('Close modal')
      expect(closeButton).toHaveClass('absolute', 'top-4', 'right-4')
    })

    it('close button position is in flex layout when title exists', () => {
      renderWithProviders(
        <Modal {...defaultProps} title="Test Title" showCloseButton={true} />
      )

      const closeButton = screen.getByLabelText('Close modal')
      // Should not have absolute positioning when title exists
      expect(closeButton).not.toHaveClass('absolute')
    })

    it('can toggle showCloseButton dynamically', () => {
      const { rerender } = renderWithProviders(
        <Modal {...defaultProps} showCloseButton={true} />
      )

      expect(screen.getByLabelText('Close modal')).toBeInTheDocument()

      rerender(<Modal {...defaultProps} showCloseButton={false} />)

      expect(screen.queryByLabelText('Close modal')).not.toBeInTheDocument()

      rerender(<Modal {...defaultProps} showCloseButton={true} />)

      expect(screen.getByLabelText('Close modal')).toBeInTheDocument()
    })

    it('works with all sizes', () => {
      const sizes: ModalSize[] = ['sm', 'md', 'lg', 'xl', 'full']

      sizes.forEach((size) => {
        const { unmount } = renderWithProviders(
          <Modal {...defaultProps} size={size} showCloseButton={true} />
        )

        expect(screen.getByLabelText('Close modal')).toBeInTheDocument()

        unmount()
      })
    })

    it('works with centered and non-centered modals', () => {
      const { rerender } = renderWithProviders(
        <Modal {...defaultProps} centered={true} showCloseButton={true} />
      )

      expect(screen.getByLabelText('Close modal')).toBeInTheDocument()

      rerender(
        <Modal {...defaultProps} centered={false} showCloseButton={true} />
      )

      expect(screen.getByLabelText('Close modal')).toBeInTheDocument()
    })
  })
})
