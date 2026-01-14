/**
 * Tests for hooks/useTutorialState.ts
 *
 * Tests tutorial state management hook with persistent storage.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// Mock the tutorial storage
const mockIsTutorialCompleted = vi.fn()
const mockSaveTutorialCompletion = vi.fn()
const mockClearTutorialCompletion = vi.fn()

vi.mock('../../utils/tutorialStorage', () => ({
  isTutorialCompleted: (...args: unknown[]) => mockIsTutorialCompleted(...args),
  saveTutorialCompletion: (...args: unknown[]) => mockSaveTutorialCompletion(...args),
  clearTutorialCompletion: (...args: unknown[]) => mockClearTutorialCompletion(...args),
}))

import { useTutorialState } from '../useTutorialState'

describe('useTutorialState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()

    // Default mocks
    mockIsTutorialCompleted.mockResolvedValue(false)
    mockSaveTutorialCompletion.mockResolvedValue({ success: true })
    mockClearTutorialCompletion.mockResolvedValue({ success: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('should start with loading true', () => {
      const { result } = renderHook(() => useTutorialState('post_creation'))

      expect(result.current.loading).toBe(true)
    })

    it('should start with isVisible false', () => {
      const { result } = renderHook(() => useTutorialState('post_creation'))

      expect(result.current.isVisible).toBe(false)
    })

    it('should check completion status on mount', async () => {
      renderHook(() => useTutorialState('post_creation'))

      await vi.runAllTimersAsync()

      expect(mockIsTutorialCompleted).toHaveBeenCalledWith('post_creation')
    })
  })

  describe('auto-show behavior', () => {
    it('should auto-show after delay when not completed', async () => {
      const { result } = renderHook(() => useTutorialState('post_creation'))

      // Loading completes
      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(result.current.loading).toBe(false)

      // Wait for show delay (default 500ms)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500)
      })

      expect(result.current.isVisible).toBe(true)
    })

    it('should not auto-show when already completed', async () => {
      mockIsTutorialCompleted.mockResolvedValue(true)

      const { result } = renderHook(() => useTutorialState('post_creation'))

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(result.current.isVisible).toBe(false)
      expect(result.current.hasCompleted).toBe(true)
    })

    it('should not auto-show when autoShow is false', async () => {
      const { result } = renderHook(() =>
        useTutorialState('post_creation', { autoShow: false })
      )

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(result.current.isVisible).toBe(false)
    })

    it('should respect custom showDelay', async () => {
      // Use a longer showDelay to test the delay behavior
      const { result } = renderHook(() =>
        useTutorialState('post_creation', { showDelay: 2000 })
      )

      // Run timers to complete loading (runAllTimersAsync runs all including showDelay)
      // So we need to manually control timing
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0) // Let isTutorialCompleted resolve
      })

      expect(result.current.loading).toBe(false)
      // The showDelay timeout has been set but not yet fired
      expect(result.current.isVisible).toBe(false)

      // Advance by 1000ms (less than showDelay of 2000ms)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000)
      })
      expect(result.current.isVisible).toBe(false)

      // Advance by another 1000ms to complete the delay
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000)
      })
      expect(result.current.isVisible).toBe(true)
    })
  })

  describe('markComplete', () => {
    it('should hide tooltip and mark as completed', async () => {
      const { result } = renderHook(() => useTutorialState('post_creation'))

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      await act(async () => {
        await result.current.markComplete()
      })

      expect(result.current.isVisible).toBe(false)
      expect(result.current.hasCompleted).toBe(true)
    })

    it('should save completion to storage', async () => {
      const { result } = renderHook(() => useTutorialState('post_creation'))

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      await act(async () => {
        await result.current.markComplete()
      })

      expect(mockSaveTutorialCompletion).toHaveBeenCalledWith('post_creation')
    })

    it('should set error if save fails', async () => {
      mockSaveTutorialCompletion.mockResolvedValue({
        success: false,
        error: 'Save error',
      })

      const { result } = renderHook(() => useTutorialState('post_creation'))

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      await act(async () => {
        await result.current.markComplete()
      })

      expect(result.current.error).toBe('Save error')
    })

    it('should handle exception during save', async () => {
      mockSaveTutorialCompletion.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useTutorialState('post_creation'))

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      await act(async () => {
        await result.current.markComplete()
      })

      expect(result.current.error).toBe('Failed to save tutorial completion.')
    })
  })

  describe('replay', () => {
    it('should clear completion and show tooltip', async () => {
      mockIsTutorialCompleted.mockResolvedValue(true)

      const { result } = renderHook(() => useTutorialState('post_creation'))

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(result.current.isVisible).toBe(false)

      await act(async () => {
        await result.current.replay()
      })

      expect(result.current.isVisible).toBe(true)
      expect(result.current.hasCompleted).toBe(false)
    })

    it('should call clearTutorialCompletion', async () => {
      const { result } = renderHook(() => useTutorialState('post_creation'))

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      await act(async () => {
        await result.current.replay()
      })

      expect(mockClearTutorialCompletion).toHaveBeenCalledWith('post_creation')
    })

    it('should still show tooltip even if clear fails', async () => {
      mockClearTutorialCompletion.mockResolvedValue({
        success: false,
        error: 'Clear error',
      })

      const { result } = renderHook(() => useTutorialState('post_creation'))

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      await act(async () => {
        await result.current.replay()
      })

      expect(result.current.isVisible).toBe(true)
      expect(result.current.error).toBe('Clear error')
    })

    it('should handle exception during clear', async () => {
      mockClearTutorialCompletion.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useTutorialState('post_creation'))

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      await act(async () => {
        await result.current.replay()
      })

      expect(result.current.isVisible).toBe(true)
      expect(result.current.error).toBe('Failed to reset tutorial state.')
    })
  })

  describe('hide', () => {
    it('should hide the tooltip without marking complete', async () => {
      const { result } = renderHook(() => useTutorialState('post_creation'))

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      // Show the tooltip
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500)
      })

      expect(result.current.isVisible).toBe(true)

      act(() => {
        result.current.hide()
      })

      expect(result.current.isVisible).toBe(false)
      expect(result.current.hasCompleted).toBe(false)
      expect(mockSaveTutorialCompletion).not.toHaveBeenCalled()
    })
  })

  describe('show', () => {
    it('should show the tooltip', async () => {
      const { result } = renderHook(() =>
        useTutorialState('post_creation', { autoShow: false })
      )

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(result.current.isVisible).toBe(false)

      act(() => {
        result.current.show()
      })

      expect(result.current.isVisible).toBe(true)
    })
  })

  describe('error handling', () => {
    it('should show tooltip on load error (fail-safe)', async () => {
      mockIsTutorialCompleted.mockRejectedValue(new Error('Load error'))

      const { result } = renderHook(() => useTutorialState('post_creation'))

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(result.current.isVisible).toBe(true)
      expect(result.current.error).toBe('Failed to load tutorial state.')
    })

    it('should not show on load error when autoShow is false', async () => {
      mockIsTutorialCompleted.mockRejectedValue(new Error('Load error'))

      const { result } = renderHook(() =>
        useTutorialState('post_creation', { autoShow: false })
      )

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(result.current.isVisible).toBe(false)
      expect(result.current.error).toBe('Failed to load tutorial state.')
    })
  })

  describe('feature name changes', () => {
    it('should reload state when feature name changes', async () => {
      type TestFeature = 'post_creation' | 'ledger_browsing'
      const { result, rerender } = renderHook<ReturnType<typeof useTutorialState>, { feature: TestFeature }>(
        ({ feature }) => useTutorialState(feature),
        { initialProps: { feature: 'post_creation' } }
      )

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(mockIsTutorialCompleted).toHaveBeenCalledWith('post_creation')

      mockIsTutorialCompleted.mockClear()
      mockIsTutorialCompleted.mockResolvedValue(true)

      rerender({ feature: 'ledger_browsing' })

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(mockIsTutorialCompleted).toHaveBeenCalledWith('ledger_browsing')
    })
  })

  describe('cleanup', () => {
    it('should clear timeout on unmount', async () => {
      const { result, unmount } = renderHook(() => useTutorialState('post_creation'))

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(result.current.loading).toBe(false)

      // Unmount before show delay completes
      unmount()

      // Advance timers - should not throw
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500)
      })

      // No error means cleanup worked
    })
  })
})
