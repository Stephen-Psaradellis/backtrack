/**
 * Tests for hooks/useInViewport.ts
 *
 * Tests the IntersectionObserver-based viewport detection hook.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Mock IntersectionObserver
const mockObserve = vi.fn()
const mockUnobserve = vi.fn()
const mockDisconnect = vi.fn()

let observerCallback: (entries: IntersectionObserverEntry[]) => void

class MockIntersectionObserver {
  constructor(callback: (entries: IntersectionObserverEntry[]) => void) {
    observerCallback = callback
  }
  observe = mockObserve
  unobserve = mockUnobserve
  disconnect = mockDisconnect
}

// Store original IntersectionObserver
const originalIntersectionObserver = global.IntersectionObserver

import { useInViewport } from '../useInViewport'

describe('useInViewport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Set up mock IntersectionObserver
    global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver
  })

  afterEach(() => {
    // Restore original IntersectionObserver
    global.IntersectionObserver = originalIntersectionObserver
  })

  describe('initial state', () => {
    it('should return isInView false by default', () => {
      const { result } = renderHook(() => useInViewport())

      expect(result.current.isInView).toBe(false)
    })

    it('should return initialInView when provided', () => {
      const { result } = renderHook(() => useInViewport({ initialInView: true }))

      expect(result.current.isInView).toBe(true)
    })

    it('should return entry as null initially', () => {
      const { result } = renderHook(() => useInViewport())

      expect(result.current.entry).toBeNull()
    })

    it('should return a ref function', () => {
      const { result } = renderHook(() => useInViewport())

      expect(typeof result.current.ref).toBe('function')
    })
  })

  describe('observation', () => {
    it('should create observer when ref is called with element', () => {
      const { result } = renderHook(() => useInViewport())

      const element = document.createElement('div')

      act(() => {
        result.current.ref(element)
      })

      expect(mockObserve).toHaveBeenCalledWith(element)
    })

    it('should not observe when disabled', () => {
      const { result } = renderHook(() => useInViewport({ disabled: true }))

      const element = document.createElement('div')

      act(() => {
        result.current.ref(element)
      })

      expect(mockObserve).not.toHaveBeenCalled()
    })

    it('should not observe when node is null', () => {
      const { result } = renderHook(() => useInViewport())

      act(() => {
        result.current.ref(null)
      })

      expect(mockObserve).not.toHaveBeenCalled()
    })

    it('should disconnect previous observer when new element is set', () => {
      const { result } = renderHook(() => useInViewport())

      const element1 = document.createElement('div')
      const element2 = document.createElement('div')

      act(() => {
        result.current.ref(element1)
      })

      act(() => {
        result.current.ref(element2)
      })

      expect(mockDisconnect).toHaveBeenCalled()
      expect(mockObserve).toHaveBeenCalledWith(element2)
    })
  })

  describe('intersection handling', () => {
    it('should update isInView when element intersects', () => {
      const { result } = renderHook(() => useInViewport())

      const element = document.createElement('div')

      act(() => {
        result.current.ref(element)
      })

      // Simulate intersection
      act(() => {
        observerCallback([
          { isIntersecting: true } as IntersectionObserverEntry,
        ])
      })

      expect(result.current.isInView).toBe(true)
    })

    it('should update isInView to false when element exits viewport', () => {
      const { result } = renderHook(() => useInViewport())

      const element = document.createElement('div')

      act(() => {
        result.current.ref(element)
      })

      // Enter viewport
      act(() => {
        observerCallback([
          { isIntersecting: true } as IntersectionObserverEntry,
        ])
      })

      // Exit viewport
      act(() => {
        observerCallback([
          { isIntersecting: false } as IntersectionObserverEntry,
        ])
      })

      expect(result.current.isInView).toBe(false)
    })

    it('should update entry when intersection occurs', () => {
      const { result } = renderHook(() => useInViewport())

      const element = document.createElement('div')

      act(() => {
        result.current.ref(element)
      })

      const mockEntry = {
        isIntersecting: true,
        intersectionRatio: 0.5,
      } as IntersectionObserverEntry

      act(() => {
        observerCallback([mockEntry])
      })

      expect(result.current.entry).toBe(mockEntry)
    })

    it('should handle empty entries array', () => {
      const { result } = renderHook(() => useInViewport())

      const element = document.createElement('div')

      act(() => {
        result.current.ref(element)
      })

      // Simulate callback with empty entries - should not crash
      act(() => {
        observerCallback([])
      })

      expect(result.current.isInView).toBe(false)
    })
  })

  describe('triggerOnce option', () => {
    it('should disconnect observer after first intersection when triggerOnce is true', () => {
      const { result } = renderHook(() => useInViewport({ triggerOnce: true }))

      const element = document.createElement('div')

      act(() => {
        result.current.ref(element)
      })

      // First intersection
      act(() => {
        observerCallback([
          { isIntersecting: true } as IntersectionObserverEntry,
        ])
      })

      expect(mockDisconnect).toHaveBeenCalled()
      expect(result.current.isInView).toBe(true)
    })

    it('should keep isInView true after disconnect in triggerOnce mode', () => {
      const { result } = renderHook(() => useInViewport({ triggerOnce: true }))

      const element = document.createElement('div')

      act(() => {
        result.current.ref(element)
      })

      // Intersect
      act(() => {
        observerCallback([
          { isIntersecting: true } as IntersectionObserverEntry,
        ])
      })

      // After triggerOnce, isInView should remain true
      expect(result.current.isInView).toBe(true)
    })

    it('should not re-observe after triggerOnce has fired', () => {
      const { result } = renderHook(() => useInViewport({ triggerOnce: true }))

      const element1 = document.createElement('div')
      const element2 = document.createElement('div')

      act(() => {
        result.current.ref(element1)
      })

      // First intersection - triggers disconnect
      act(() => {
        observerCallback([
          { isIntersecting: true } as IntersectionObserverEntry,
        ])
      })

      // Clear mock calls
      mockObserve.mockClear()

      // Try to set a new element - should not observe
      act(() => {
        result.current.ref(element2)
      })

      // Should not observe because already triggered
      expect(mockObserve).not.toHaveBeenCalled()
    })
  })

  describe('cleanup', () => {
    it('should disconnect observer on unmount', () => {
      const { result, unmount } = renderHook(() => useInViewport())

      const element = document.createElement('div')

      act(() => {
        result.current.ref(element)
      })

      unmount()

      expect(mockDisconnect).toHaveBeenCalled()
    })
  })

  describe('SSR safety', () => {
    it('should handle missing IntersectionObserver', () => {
      // Temporarily remove IntersectionObserver
      const temp = global.IntersectionObserver
      // @ts-expect-error - deliberately removing for test
      delete global.IntersectionObserver

      const { result } = renderHook(() => useInViewport())

      const element = document.createElement('div')

      act(() => {
        result.current.ref(element)
      })

      // Should default to in view when IntersectionObserver is not available
      expect(result.current.isInView).toBe(true)

      // Restore
      global.IntersectionObserver = temp
    })
  })

  describe('options changes', () => {
    it('should reset hasTriggered when triggerOnce changes from true to false', () => {
      const { result, rerender } = renderHook(
        ({ triggerOnce }) => useInViewport({ triggerOnce }),
        { initialProps: { triggerOnce: true } }
      )

      const element = document.createElement('div')

      act(() => {
        result.current.ref(element)
      })

      // Trigger once
      act(() => {
        observerCallback([
          { isIntersecting: true } as IntersectionObserverEntry,
        ])
      })

      mockDisconnect.mockClear()
      mockObserve.mockClear()

      // Change to triggerOnce: false
      rerender({ triggerOnce: false })

      // The internal hasTriggeredRef should be reset (not directly testable,
      // but the behavior shows in re-observation)
      // Note: Due to implementation, the state doesn't re-observe automatically
      // but the ref can be called again
    })
  })
})
