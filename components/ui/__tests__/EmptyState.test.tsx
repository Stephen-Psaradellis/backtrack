/**
 * Tests for components/ui/EmptyState.tsx
 *
 * Tests the EmptyState component with various variants and actions.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EmptyState } from '../EmptyState'

describe('EmptyState', () => {
  describe('rendering', () => {
    it('should render with default variant', () => {
      render(<EmptyState />)

      expect(screen.getByText('No results found')).toBeInTheDocument()
    })

    it('should render illustration', () => {
      const { container } = render(<EmptyState />)

      expect(container.querySelector('svg')).toBeInTheDocument()
    })

    it('should render children', () => {
      render(
        <EmptyState>
          <span>Custom content</span>
        </EmptyState>
      )

      expect(screen.getByText('Custom content')).toBeInTheDocument()
    })
  })

  describe('variants', () => {
    it('should render no-posts variant', () => {
      render(<EmptyState variant="no-posts" />)

      expect(screen.getByText('No posts yet')).toBeInTheDocument()
      expect(
        screen.getByText('Be the first to create a post at this location and start a connection.')
      ).toBeInTheDocument()
    })

    it('should render no-messages variant', () => {
      render(<EmptyState variant="no-messages" />)

      expect(screen.getByText('No messages yet')).toBeInTheDocument()
    })

    it('should render no-matches variant', () => {
      render(<EmptyState variant="no-matches" />)

      expect(screen.getByText('No matches found')).toBeInTheDocument()
    })

    it('should render no-results variant', () => {
      render(<EmptyState variant="no-results" />)

      expect(screen.getByText('No results found')).toBeInTheDocument()
    })

    it('should render no-favorites variant', () => {
      render(<EmptyState variant="no-favorites" />)

      expect(screen.getByText('No favorites yet')).toBeInTheDocument()
    })

    it('should render error variant', () => {
      render(<EmptyState variant="error" />)

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('should render offline variant', () => {
      render(<EmptyState variant="offline" />)

      expect(screen.getByText("You're offline")).toBeInTheDocument()
    })
  })

  describe('custom content', () => {
    it('should render custom title', () => {
      render(<EmptyState title="Custom Title" />)

      expect(screen.getByText('Custom Title')).toBeInTheDocument()
    })

    it('should render custom description', () => {
      render(<EmptyState description="Custom description text" />)

      expect(screen.getByText('Custom description text')).toBeInTheDocument()
    })

    it('should override default content with custom content', () => {
      render(
        <EmptyState
          variant="error"
          title="Custom Error Title"
          description="Custom error description"
        />
      )

      expect(screen.getByText('Custom Error Title')).toBeInTheDocument()
      expect(screen.getByText('Custom error description')).toBeInTheDocument()
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
    })
  })

  describe('actions', () => {
    it('should render action button', () => {
      const handleAction = vi.fn()
      render(<EmptyState actionLabel="Try Again" onAction={handleAction} />)

      expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument()
    })

    it('should call onAction when action button is clicked', () => {
      const handleAction = vi.fn()
      render(<EmptyState actionLabel="Try Again" onAction={handleAction} />)

      fireEvent.click(screen.getByRole('button', { name: 'Try Again' }))

      expect(handleAction).toHaveBeenCalledTimes(1)
    })

    it('should render secondary action button', () => {
      const handleSecondary = vi.fn()
      render(
        <EmptyState
          secondaryActionLabel="Cancel"
          onSecondaryAction={handleSecondary}
        />
      )

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })

    it('should call onSecondaryAction when secondary button is clicked', () => {
      const handleSecondary = vi.fn()
      render(
        <EmptyState
          secondaryActionLabel="Cancel"
          onSecondaryAction={handleSecondary}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(handleSecondary).toHaveBeenCalledTimes(1)
    })

    it('should render both action buttons', () => {
      render(
        <EmptyState
          actionLabel="Primary"
          onAction={() => {}}
          secondaryActionLabel="Secondary"
          onSecondaryAction={() => {}}
        />
      )

      expect(screen.getByRole('button', { name: 'Primary' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Secondary' })).toBeInTheDocument()
    })

    it('should not render action button without onAction', () => {
      render(<EmptyState actionLabel="Action without handler" />)

      expect(
        screen.queryByRole('button', { name: 'Action without handler' })
      ).not.toBeInTheDocument()
    })

    it('should not render action container when no actions', () => {
      const { container } = render(<EmptyState />)

      // No button should be present
      expect(container.querySelector('button')).not.toBeInTheDocument()
    })
  })

  describe('className', () => {
    it('should merge custom className', () => {
      const { container } = render(<EmptyState className="custom-empty" />)

      expect(container.firstChild).toHaveClass('custom-empty')
    })
  })

  describe('styling', () => {
    it('should have centered layout', () => {
      const { container } = render(<EmptyState />)

      expect(container.firstChild).toHaveClass('flex')
      expect(container.firstChild).toHaveClass('flex-col')
      expect(container.firstChild).toHaveClass('items-center')
      expect(container.firstChild).toHaveClass('justify-center')
      expect(container.firstChild).toHaveClass('text-center')
    })
  })
})
