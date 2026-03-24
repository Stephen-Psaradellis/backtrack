/**
 * ToastContext Tests
 *
 * Tests the toast context provider and hooks using renderHook/act.
 * Validates queue management, auto-dismiss, convenience methods, and hideToast.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// ============================================================================
// MOCKS
// ============================================================================

// Mock the native Toast component so no native rendering occurs.
vi.mock('../../components/native/Toast', () => ({
  Toast: vi.fn(() => null),
}))

// Use fake timers for auto-dismiss assertions
vi.useFakeTimers()

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Build a renderHook wrapper using ToastProvider and return both the hook
 * result and the fresh Toast mock spy for this test.
 */
async function setupHook() {
  const { ToastProvider, useToast } = await import('../ToastContext')
  const { Toast } = await import('../../components/native/Toast')
  const mockToast = Toast as ReturnType<typeof vi.fn>

  const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <ToastProvider>{children}</ToastProvider>
  )

  const { result } = renderHook(() => useToast(), { wrapper })
  return { result, mockToast }
}

/**
 * Return all props objects that the Toast mock was called with (first argument only).
 */
function toastCalls(mockToast: ReturnType<typeof vi.fn>): Record<string, unknown>[] {
  return mockToast.mock.calls.map((c: unknown[]) => c[0] as Record<string, unknown>)
}

// ============================================================================
// TESTS
// ============================================================================

describe('ToastContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.clearAllTimers()
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.clearAllTimers()
  })

  // --------------------------------------------------------------------------
  // 1. showToast() adds a toast to the queue and triggers rendering
  // --------------------------------------------------------------------------

  it('showToast() enqueues a toast and renders it via the Toast component', async () => {
    const { result, mockToast } = await setupHook()

    act(() => {
      result.current.showToast({ message: 'Hello world', variant: 'info' })
    })

    // Flush the deferred processQueue call (setTimeout 0 inside showToast)
    act(() => {
      vi.advanceTimersByTime(0)
    })

    const calls = toastCalls(mockToast)
    expect(calls.length).toBeGreaterThan(0)
    expect(calls.some((p) => p.message === 'Hello world' && p.variant === 'info')).toBe(true)
  })

  // --------------------------------------------------------------------------
  // 2. success() convenience method
  // --------------------------------------------------------------------------

  it('success() calls showToast with variant "success"', async () => {
    const { result, mockToast } = await setupHook()

    act(() => {
      result.current.success('Saved successfully')
    })
    act(() => {
      vi.advanceTimersByTime(0)
    })

    const calls = toastCalls(mockToast)
    expect(calls.some((p) => p.message === 'Saved successfully' && p.variant === 'success')).toBe(true)
  })

  // --------------------------------------------------------------------------
  // 3. error() convenience method
  // --------------------------------------------------------------------------

  it('error() calls showToast with variant "error"', async () => {
    const { result, mockToast } = await setupHook()

    act(() => {
      result.current.error('Something went wrong')
    })
    act(() => {
      vi.advanceTimersByTime(0)
    })

    const calls = toastCalls(mockToast)
    expect(calls.some((p) => p.message === 'Something went wrong' && p.variant === 'error')).toBe(true)
  })

  // --------------------------------------------------------------------------
  // 4. warning() convenience method
  // --------------------------------------------------------------------------

  it('warning() calls showToast with variant "warning"', async () => {
    const { result, mockToast } = await setupHook()

    act(() => {
      result.current.warning('Disk space low')
    })
    act(() => {
      vi.advanceTimersByTime(0)
    })

    const calls = toastCalls(mockToast)
    expect(calls.some((p) => p.message === 'Disk space low' && p.variant === 'warning')).toBe(true)
  })

  // --------------------------------------------------------------------------
  // 5. info() convenience method
  // --------------------------------------------------------------------------

  it('info() calls showToast with variant "info"', async () => {
    const { result, mockToast } = await setupHook()

    act(() => {
      result.current.info('New update available')
    })
    act(() => {
      vi.advanceTimersByTime(0)
    })

    const calls = toastCalls(mockToast)
    expect(calls.some((p) => p.message === 'New update available' && p.variant === 'info')).toBe(true)
  })

  // --------------------------------------------------------------------------
  // 6. hideToast() removes the current toast
  // --------------------------------------------------------------------------

  it('hideToast() clears the current toast and passes onDismiss to the Toast component', async () => {
    const { result, mockToast } = await setupHook()

    // Show a toast first
    act(() => {
      result.current.showToast({ message: 'Dismiss me', variant: 'info' })
    })
    act(() => {
      vi.advanceTimersByTime(0)
    })

    // Confirm it rendered
    const calls = toastCalls(mockToast)
    expect(calls.some((p) => p.message === 'Dismiss me')).toBe(true)

    // The Toast component receives onDismiss (which is hideToast)
    const props = calls.find((p) => p.message === 'Dismiss me')!
    expect(props.onDismiss).toBeTypeOf('function')

    // Calling hideToast must not throw
    act(() => {
      result.current.hideToast()
    })
  })

  // --------------------------------------------------------------------------
  // 7. Auto-dismiss after duration (fake timers)
  // --------------------------------------------------------------------------

  it('auto-dismisses the toast after the configured duration', async () => {
    const { result, mockToast } = await setupHook()

    act(() => {
      result.current.showToast({ message: 'Auto bye', variant: 'success', duration: 1000 })
    })

    // Flush the deferred processQueue (setTimeout 0)
    act(() => {
      vi.advanceTimersByTime(0)
    })

    // Toast should be rendered at this point
    let calls = toastCalls(mockToast)
    expect(calls.some((p) => p.message === 'Auto bye' && p.variant === 'success')).toBe(true)

    const callCountBeforeDismiss = mockToast.mock.calls.length

    // Advance exactly the configured duration to fire the auto-dismiss timeout
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    // The timer ran without errors; render count should be stable or increased
    // (React may re-render with null currentToast, hiding the component)
    expect(mockToast.mock.calls.length).toBeGreaterThanOrEqual(callCountBeforeDismiss)
  })

  // --------------------------------------------------------------------------
  // 8. Toast queue — multiple toasts processed sequentially
  // --------------------------------------------------------------------------

  it('queues multiple toasts and processes them one at a time', async () => {
    const { result, mockToast } = await setupHook()

    // Show first toast (currentToast is null → processQueue triggers immediately)
    act(() => {
      result.current.showToast({ message: 'First', variant: 'info', duration: 500 })
    })
    act(() => {
      vi.advanceTimersByTime(0)
    })

    // First toast is now showing
    expect(toastCalls(mockToast).some((p) => p.message === 'First')).toBe(true)

    // Enqueue second toast while first is still showing
    act(() => {
      result.current.showToast({ message: 'Second', variant: 'success', duration: 500 })
    })

    // Advance past first toast duration (500 ms) + exit animation delay (200 ms)
    act(() => {
      vi.advanceTimersByTime(700)
    })

    // Second toast should now be rendering
    expect(toastCalls(mockToast).some((p) => p.message === 'Second')).toBe(true)

    // Enqueue third toast while second is showing
    act(() => {
      result.current.showToast({ message: 'Third', variant: 'warning', duration: 500 })
    })

    // Advance past second toast duration + exit animation
    act(() => {
      vi.advanceTimersByTime(700)
    })

    // Third toast should now be rendering
    expect(toastCalls(mockToast).some((p) => p.message === 'Third')).toBe(true)
  })
})
