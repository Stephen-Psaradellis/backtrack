/**
 * Tests for components/ui/Card.tsx
 *
 * Tests the Card component with various variants and sub-components.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Card, CardHeader, CardContent, CardFooter } from '../Card'

describe('Card', () => {
  describe('rendering', () => {
    it('should render children', () => {
      render(<Card>Card content</Card>)

      expect(screen.getByText('Card content')).toBeInTheDocument()
    })

    it('should render as div by default', () => {
      const { container } = render(<Card>Content</Card>)

      expect(container.firstChild?.nodeName).toBe('DIV')
    })

    it('should render as article when specified', () => {
      const { container } = render(<Card as="article">Content</Card>)

      expect(container.firstChild?.nodeName).toBe('ARTICLE')
    })

    it('should render as section when specified', () => {
      const { container } = render(<Card as="section">Content</Card>)

      expect(container.firstChild?.nodeName).toBe('SECTION')
    })
  })

  describe('variants', () => {
    it('should render default variant', () => {
      const { container } = render(<Card variant="default">Content</Card>)

      expect(container.firstChild).toHaveClass('bg-white')
      expect(container.firstChild).toHaveClass('shadow-sm')
    })

    it('should render outlined variant', () => {
      const { container } = render(<Card variant="outlined">Content</Card>)

      expect(container.firstChild).toHaveClass('border-neutral-200')
    })

    it('should render elevated variant', () => {
      const { container } = render(<Card variant="elevated">Content</Card>)

      expect(container.firstChild).toHaveClass('shadow-lg')
    })

    it('should render glass variant', () => {
      const { container } = render(<Card variant="glass">Content</Card>)

      expect(container.firstChild).toHaveClass('backdrop-blur-lg')
    })
  })

  describe('padding', () => {
    it('should have medium padding by default', () => {
      const { container } = render(<Card>Content</Card>)

      expect(container.firstChild).toHaveClass('p-4')
    })

    it('should have no padding when padding is none', () => {
      const { container } = render(<Card padding="none">Content</Card>)

      expect(container.firstChild).not.toHaveClass('p-3')
      expect(container.firstChild).not.toHaveClass('p-4')
      expect(container.firstChild).not.toHaveClass('p-6')
    })

    it('should have small padding', () => {
      const { container } = render(<Card padding="sm">Content</Card>)

      expect(container.firstChild).toHaveClass('p-3')
    })

    it('should have large padding', () => {
      const { container } = render(<Card padding="lg">Content</Card>)

      expect(container.firstChild).toHaveClass('p-6')
    })
  })

  describe('interactive', () => {
    it('should not be interactive by default', () => {
      const { container } = render(<Card>Content</Card>)

      expect(container.firstChild).not.toHaveAttribute('role')
      expect(container.firstChild).not.toHaveAttribute('tabindex')
    })

    it('should be interactive when interactive prop is true', () => {
      const { container } = render(<Card interactive>Content</Card>)

      expect(container.firstChild).toHaveAttribute('role', 'button')
      expect(container.firstChild).toHaveAttribute('tabindex', '0')
    })

    it('should have interactive styles when interactive', () => {
      const { container } = render(<Card interactive>Content</Card>)

      expect(container.firstChild).toHaveClass('cursor-pointer')
    })

    it('should handle click events when interactive', () => {
      const handleClick = vi.fn()
      render(
        <Card interactive onClick={handleClick}>
          Content
        </Card>
      )

      fireEvent.click(screen.getByRole('button'))

      expect(handleClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('className', () => {
    it('should merge custom className', () => {
      const { container } = render(<Card className="custom-class">Content</Card>)

      expect(container.firstChild).toHaveClass('custom-class')
    })
  })

  describe('ref forwarding', () => {
    it('should forward ref to element', () => {
      const ref = { current: null as HTMLDivElement | null }
      render(<Card ref={ref}>Content</Card>)

      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('displayName', () => {
    it('should have displayName', () => {
      expect(Card.displayName).toBe('Card')
    })
  })
})

describe('CardHeader', () => {
  describe('rendering', () => {
    it('should render children directly', () => {
      render(
        <CardHeader>
          <span>Custom header content</span>
        </CardHeader>
      )

      expect(screen.getByText('Custom header content')).toBeInTheDocument()
    })

    it('should render title', () => {
      render(<CardHeader title="Card Title" />)

      expect(screen.getByText('Card Title')).toBeInTheDocument()
    })

    it('should render subtitle', () => {
      render(<CardHeader title="Title" subtitle="Subtitle" />)

      expect(screen.getByText('Subtitle')).toBeInTheDocument()
    })

    it('should render action', () => {
      render(
        <CardHeader
          title="Title"
          action={<button>Action</button>}
        />
      )

      expect(screen.getByRole('button')).toHaveTextContent('Action')
    })

    it('should render with title as ReactNode', () => {
      render(<CardHeader title={<strong>Bold Title</strong>} />)

      expect(screen.getByText('Bold Title')).toBeInTheDocument()
    })
  })

  describe('className', () => {
    it('should merge custom className', () => {
      const { container } = render(
        <CardHeader className="custom-header">Header</CardHeader>
      )

      expect(container.firstChild).toHaveClass('custom-header')
    })
  })
})

describe('CardContent', () => {
  it('should render children', () => {
    render(<CardContent>Content here</CardContent>)

    expect(screen.getByText('Content here')).toBeInTheDocument()
  })

  it('should merge custom className', () => {
    const { container } = render(
      <CardContent className="custom-content">Content</CardContent>
    )

    expect(container.firstChild).toHaveClass('custom-content')
  })
})

describe('CardFooter', () => {
  it('should render children', () => {
    render(<CardFooter>Footer content</CardFooter>)

    expect(screen.getByText('Footer content')).toBeInTheDocument()
  })

  it('should have border styling', () => {
    const { container } = render(<CardFooter>Footer</CardFooter>)

    expect(container.firstChild).toHaveClass('border-t')
  })

  it('should merge custom className', () => {
    const { container } = render(
      <CardFooter className="custom-footer">Footer</CardFooter>
    )

    expect(container.firstChild).toHaveClass('custom-footer')
  })
})
