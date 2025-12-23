'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

// ============================================================================
// Types
// ============================================================================

/**
 * Options for configuring the IntersectionObserver behavior
 */
export interface UseInViewportOptions {
  /**
   * Margin around the root element (viewport by default)
   * Can be specified similar to CSS margin: "10px 20px 30px 40px"
   * Useful for triggering visibility before element enters viewport
   * @default "0px"
   */
  rootMargin?: string

  /**
   * Threshold(s) at which to trigger the callback
   * A value of 0 means "as soon as even one pixel is visible"
   * A value of 1.0 means "every pixel is visible"
   * @default 0
   */
  threshold?: number | number[]

  /**
   * Root element that is used as the viewport for checking visibility
   * If null, uses the browser viewport
   * @default null
   */
  root?: Element | null

  /**
   * If true, observer will be disconnected after first intersection
   * Useful for one-time lazy loading scenarios
   * @default false
   */
  triggerOnce?: boolean

  /**
   * Initial visibility state before observer kicks in
   * Useful for SSR or when you want to default to visible
   * @default false
   */
  initialInView?: boolean

  /**
   * Disable the observer (useful for conditional observation)
   * @default false
   */
  disabled?: boolean
}

/**
 * Return type for the useInViewport hook
 */
export interface UseInViewportResult<T extends Element = Element> {
  /**
   * Ref callback to attach to the element you want to observe
   */
  ref: (node: T | null) => void

  /**
   * Whether the element is currently in the viewport
   */
  isInView: boolean

  /**
   * The current IntersectionObserverEntry, if any
   * Useful for getting detailed information like intersection ratio
   */
  entry: IntersectionObserverEntry | null
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * A React hook for detecting when an element enters or exits the viewport
 * using the IntersectionObserver API.
 *
 * This hook is optimized for performance:
 * - Uses a ref callback pattern for flexible attachment
 * - Properly cleans up observer on unmount
 * - Supports one-time triggering for lazy loading scenarios
 * - SSR-safe with initial state option
 *
 * @param options Configuration options for the observer
 * @returns Object containing ref callback, visibility state, and entry
 *
 * @example
 * ```tsx
 * // Basic usage - detect when element is visible
 * function LazyImage({ src }: { src: string }) {
 *   const { ref, isInView } = useInViewport()
 *
 *   return (
 *     <div ref={ref}>
 *       {isInView ? <img src={src} /> : <Placeholder />}
 *     </div>
 *   )
 * }
 * ```
 *
 * @example
 * ```tsx
 * // One-time lazy loading - stays rendered once visible
 * function LazyComponent({ children }: { children: React.ReactNode }) {
 *   const { ref, isInView } = useInViewport({
 *     triggerOnce: true,
 *     rootMargin: '100px', // Load 100px before entering viewport
 *   })
 *
 *   return (
 *     <div ref={ref}>
 *       {isInView ? children : <Skeleton />}
 *     </div>
 *   )
 * }
 * ```
 */
export function useInViewport<T extends Element = Element>(
  options: UseInViewportOptions = {}
): UseInViewportResult<T> {
  const {
    rootMargin = '0px',
    threshold = 0,
    root = null,
    triggerOnce = false,
    initialInView = false,
    disabled = false,
  } = options

  // Track the target element
  const elementRef = useRef<T | null>(null)

  // Track the observer instance
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Track whether we've already triggered (for triggerOnce mode)
  const hasTriggeredRef = useRef(false)

  // Visibility state
  const [isInView, setIsInView] = useState<boolean>(initialInView)
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null)

  // Observer callback
  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [observerEntry] = entries

      if (!observerEntry) return

      setEntry(observerEntry)
      setIsInView(observerEntry.isIntersecting)

      // If triggerOnce is enabled and element is intersecting, disconnect
      if (triggerOnce && observerEntry.isIntersecting && !hasTriggeredRef.current) {
        hasTriggeredRef.current = true

        // Keep isInView as true and disconnect observer
        if (observerRef.current) {
          observerRef.current.disconnect()
          observerRef.current = null
        }
      }
    },
    [triggerOnce]
  )

  // Ref callback for attaching to elements
  const setRef = useCallback(
    (node: T | null) => {
      // Clean up previous observer
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }

      // Store the new node reference
      elementRef.current = node

      // Don't observe if disabled, no node, or already triggered in triggerOnce mode
      if (disabled || !node || (triggerOnce && hasTriggeredRef.current)) {
        return
      }

      // Check for IntersectionObserver support (SSR-safety)
      if (typeof IntersectionObserver === 'undefined') {
        // Fallback: assume element is in view if no IntersectionObserver
        setIsInView(true)
        return
      }

      // Create new observer
      observerRef.current = new IntersectionObserver(handleIntersection, {
        root,
        rootMargin,
        threshold,
      })

      // Start observing
      observerRef.current.observe(node)
    },
    [disabled, handleIntersection, root, rootMargin, threshold, triggerOnce]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }
    }
  }, [])

  // Reset triggered state if options change (except in triggerOnce mode where we want to keep it)
  useEffect(() => {
    if (!triggerOnce) {
      hasTriggeredRef.current = false
    }
  }, [triggerOnce])

  return {
    ref: setRef,
    isInView,
    entry,
  }
}

// ============================================================================
// Default Export
// ============================================================================

export default useInViewport
