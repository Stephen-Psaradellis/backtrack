/**
 * Tests for components/ui/Skeleton.tsx
 *
 * Tests the Skeleton loading components.
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonPostCard,
  SkeletonChatItem,
  SkeletonList,
} from '../Skeleton'

describe('Skeleton', () => {
  describe('rendering', () => {
    it('should render a div', () => {
      const { container } = render(<Skeleton />)

      expect(container.firstChild?.nodeName).toBe('DIV')
    })

    it('should have base styles', () => {
      const { container } = render(<Skeleton />)

      expect(container.firstChild).toHaveClass('bg-neutral-200')
    })
  })

  describe('variants', () => {
    it('should render text variant by default', () => {
      const { container } = render(<Skeleton />)

      expect(container.firstChild).toHaveClass('rounded-md')
      expect(container.firstChild).toHaveClass('h-4')
    })

    it('should render circular variant', () => {
      const { container } = render(<Skeleton variant="circular" />)

      expect(container.firstChild).toHaveClass('rounded-full')
    })

    it('should render rectangular variant', () => {
      const { container } = render(<Skeleton variant="rectangular" />)

      expect(container.firstChild).toHaveClass('rounded-none')
    })

    it('should render rounded variant', () => {
      const { container } = render(<Skeleton variant="rounded" />)

      expect(container.firstChild).toHaveClass('rounded-xl')
    })
  })

  describe('animation', () => {
    it('should use shimmer animation by default', () => {
      const { container } = render(<Skeleton />)

      expect(container.firstChild).toHaveClass('skeleton-shimmer')
    })

    it('should use pulse animation', () => {
      const { container } = render(<Skeleton animation="pulse" />)

      expect(container.firstChild).toHaveClass('animate-pulse')
    })

    it('should not have animation when animation is none', () => {
      const { container } = render(<Skeleton animation="none" />)

      expect(container.firstChild).not.toHaveClass('skeleton-shimmer')
      expect(container.firstChild).not.toHaveClass('animate-pulse')
    })
  })

  describe('dimensions', () => {
    it('should set width as number', () => {
      const { container } = render(<Skeleton width={100} />)

      expect(container.firstChild).toHaveStyle({ width: '100px' })
    })

    it('should set width as string', () => {
      const { container } = render(<Skeleton width="50%" />)

      expect(container.firstChild).toHaveStyle({ width: '50%' })
    })

    it('should set height as number', () => {
      const { container } = render(<Skeleton height={20} />)

      expect(container.firstChild).toHaveStyle({ height: '20px' })
    })

    it('should set height as string', () => {
      const { container } = render(<Skeleton height="2rem" />)

      expect(container.firstChild).toHaveStyle({ height: '2rem' })
    })
  })

  describe('className and style', () => {
    it('should merge custom className', () => {
      const { container } = render(<Skeleton className="custom-class" />)

      expect(container.firstChild).toHaveClass('custom-class')
    })

    it('should merge custom styles', () => {
      const { container } = render(
        <Skeleton style={{ marginTop: '10px' }} />
      )

      expect(container.firstChild).toHaveStyle({ marginTop: '10px' })
    })
  })
})

describe('SkeletonText', () => {
  it('should render 3 lines by default', () => {
    const { container } = render(<SkeletonText />)

    const skeletons = container.querySelectorAll('.bg-neutral-200')
    expect(skeletons.length).toBe(3)
  })

  it('should render specified number of lines', () => {
    const { container } = render(<SkeletonText lines={5} />)

    const skeletons = container.querySelectorAll('.bg-neutral-200')
    expect(skeletons.length).toBe(5)
  })

  it('should merge custom className', () => {
    const { container } = render(<SkeletonText className="custom-text" />)

    expect(container.firstChild).toHaveClass('custom-text')
  })
})

describe('SkeletonAvatar', () => {
  it('should render circular skeleton', () => {
    const { container } = render(<SkeletonAvatar />)

    expect(container.firstChild).toHaveClass('rounded-full')
  })

  it('should have default size of 48px', () => {
    const { container } = render(<SkeletonAvatar />)

    expect(container.firstChild).toHaveStyle({ width: '48px', height: '48px' })
  })

  it('should accept custom size', () => {
    const { container } = render(<SkeletonAvatar size={64} />)

    expect(container.firstChild).toHaveStyle({ width: '64px', height: '64px' })
  })

  it('should merge custom className', () => {
    const { container } = render(<SkeletonAvatar className="custom-avatar" />)

    expect(container.firstChild).toHaveClass('custom-avatar')
  })
})

describe('SkeletonCard', () => {
  it('should render card structure', () => {
    const { container } = render(<SkeletonCard />)

    expect(container.firstChild).toHaveClass('rounded-xl')
    expect(container.firstChild).toHaveClass('shadow-sm')
  })

  it('should contain multiple skeleton elements', () => {
    const { container } = render(<SkeletonCard />)

    const skeletons = container.querySelectorAll('.bg-neutral-200')
    expect(skeletons.length).toBeGreaterThan(1)
  })

  it('should merge custom className', () => {
    const { container } = render(<SkeletonCard className="custom-card" />)

    expect(container.firstChild).toHaveClass('custom-card')
  })
})

describe('SkeletonPostCard', () => {
  it('should render post card structure', () => {
    const { container } = render(<SkeletonPostCard />)

    expect(container.firstChild).toHaveClass('rounded-2xl')
    expect(container.firstChild).toHaveClass('shadow-md')
  })

  it('should contain multiple skeleton elements', () => {
    const { container } = render(<SkeletonPostCard />)

    const skeletons = container.querySelectorAll('.bg-neutral-200')
    expect(skeletons.length).toBeGreaterThan(1)
  })

  it('should merge custom className', () => {
    const { container } = render(<SkeletonPostCard className="custom-post" />)

    expect(container.firstChild).toHaveClass('custom-post')
  })
})

describe('SkeletonChatItem', () => {
  it('should render chat item structure', () => {
    const { container } = render(<SkeletonChatItem />)

    expect(container.firstChild).toHaveClass('flex')
    expect(container.firstChild).toHaveClass('items-center')
  })

  it('should contain avatar and text skeletons', () => {
    const { container } = render(<SkeletonChatItem />)

    const skeletons = container.querySelectorAll('.bg-neutral-200')
    expect(skeletons.length).toBeGreaterThan(1)
  })

  it('should merge custom className', () => {
    const { container } = render(<SkeletonChatItem className="custom-chat" />)

    expect(container.firstChild).toHaveClass('custom-chat')
  })
})

describe('SkeletonList', () => {
  it('should render 5 items by default', () => {
    const { container } = render(<SkeletonList />)

    const items = container.querySelectorAll('.animate-fade-in')
    expect(items.length).toBe(5)
  })

  it('should render specified number of items', () => {
    const { container } = render(<SkeletonList count={3} />)

    const items = container.querySelectorAll('.animate-fade-in')
    expect(items.length).toBe(3)
  })

  it('should use custom ItemComponent', () => {
    const CustomItem = ({ className }: { className?: string }) => (
      <div data-testid="custom-item" className={className}>Custom</div>
    )

    render(<SkeletonList ItemComponent={CustomItem} count={2} />)

    expect(screen.getAllByTestId('custom-item')).toHaveLength(2)
  })

  it('should have default gap', () => {
    const { container } = render(<SkeletonList />)

    expect(container.firstChild).toHaveClass('gap-4')
  })

  it('should accept custom gap', () => {
    const { container } = render(<SkeletonList gap="gap-2" />)

    expect(container.firstChild).toHaveClass('gap-2')
  })

  it('should merge custom className', () => {
    const { container } = render(<SkeletonList className="custom-list" />)

    expect(container.firstChild).toHaveClass('custom-list')
  })

  it('should have staggered animation delays', () => {
    const { container } = render(<SkeletonList count={3} />)

    const items = container.querySelectorAll('.animate-fade-in')
    expect(items[0]).toHaveStyle({ animationDelay: '0ms' })
    expect(items[1]).toHaveStyle({ animationDelay: '100ms' })
    expect(items[2]).toHaveStyle({ animationDelay: '200ms' })
  })
})
