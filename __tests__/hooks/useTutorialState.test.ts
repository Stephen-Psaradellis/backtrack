/**
 * @vitest-environment jsdom
 */

/**
 * Unit tests for useTutorialState hook
 *
 * Tests the tutorial state hook including:
 * - Initialization and loading state
 * - First-use detection (auto-show when not completed)
 * - markComplete() saves to AsyncStorage and hides tooltip
 * - replay() clears completion and shows tooltip
 * - hide() and show() manual controls
 * - Fail-safe behavior on storage errors
 * - Cleanup on unmount
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// ============================================================================
// Mock Setup
// ============================================================================

// Mock tutorialStorage utilities
const mockIsTutorialCompleted = vi.fn()
const mockSaveTutorialCompletion = vi.fn()
const mockClearTutorialCompletion = vi.fn()

vi.mock('../../utils/tutorialStorage', () => ({
  isTutorialCompleted: (feature: string) => mockIsTutorialCompleted(feature),
  saveTutorialCompletion: (feature: string) => mockSaveTutorialCompletion(feature),
  clearTutorialCompletion: (feature: string) => mockClearTutorialCompletion(feature),
}))

// Import after mocking
import { useTutorialState } from '../../hooks/useTutorialState'
import type { TutorialState, UseTutorialStateResult } from '../../hooks/useTutorialState'

// ============================================================================
// Setup and Teardown
// ============================================================================

describe('useTutorialState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()

    // Default mock implementations
    mockIsTutorialCompleted.mockResolvedValue(false)
    mockSaveTutorialCompletion.mockResolvedValue({ success: true, error: null })
    mockClearTutorialCompletion.mockResolvedValue({ success: true, error: null })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ============================================================================
  // Initial State Tests
  // ============================================================================

  describe('initialization', () => {
    it('returns default state while loading', () => {
      const { result } = renderHook(() => useTutorialState('post_creation'))

      expect(result.current.loading).toBe(true)
      expect(result.current.isVisible).toBe(false)
      expect(result.current.hasCompleted).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('provides all control functions', () => {
      const { result } = renderHook(() => useTutorialState('post_creation'))

      expect(typeof result.current.markComplete).toBe('function')
      expect(typeof result.current.replay).toBe('function')
      expect(typeof result.current.hide).toBe('function')
      expect(typeof result.current.show).toBe('function')
    })

    it('calls isTutorialCompleted with correct feature name', async () => {
      renderHook(() => useTutorialState('post_creation'))

      expect(mockIsTutorialCompleted).toHaveBeenCalledWith('post_creation')
    })

    it('works with all feature types', () => {
      const features = ['post_creation', 'ledger_browsing', 'selfie_verification', 'messaging']

      features.forEach((feature) => {
        mockIsTutorialCompleted.mockClear()
        renderHook(() => useTutorialState(feature as any))
        expect(mockIsTutorialCompleted).toHaveBeenCalledWith(feature)
      })
    })
  })

  // ============================================================================
  // First-Use Detection Tests
  // ============================================================================

  describe('first-use detection', () => {
    it('sets isVisible=true when tutorial not completed (with delay)', async () => {
      mockIsTutorialCompleted.mockResolvedValue(false)

      const { result } = renderHook(() => useTutorialState('post_creation'))

      // Initially not visible
      expect(result.current.isVisible).toBe(false)

      // Wait for loading to complete
      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(result.current.loading).toBe(false)
      expect(result.current.isVisible).toBe(true)
    })

    it('keeps isVisible=false when tutorial already completed', async () => {
      mockIsTutorialCompleted.mockResolvedValue(true)

      const { result } = renderHook(() => useTutorialState('post_creation'))

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(result.current.loading).toBe(false)
      expect(result.current.hasCompleted).toBe(true)
      expect(result.current.isVisible).toBe(false)
    })

    it('respects custom showDelay option', async () => {
      mockIsTutorialCompleted.mockResolvedValue(false)

      const { result } = renderHook(() =>
        useTutorialState('post_creation', { showDelay: 1000 })
      )

      await act(async () => {
        // Fast forward past storage load but not past delay
        await Promise.resolve()
      })

      expect(result.current.loading).toBe(false)
      expect(result.current.isVisible).toBe(false)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000)
      })

      expect(result.current.isVisible).toBe(true)
    })

    it('respects autoShow=false option', async () => {
      mockIsTutorialCompleted.mockResolvedValue(false)

      const { result } = renderHook(() =>
        useTutorialState('post_creation', { autoShow: false })
      )

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(result.current.loading).toBe(false)
      expect(result.current.hasCompleted).toBe(false)
      expect(result.current.isVisible).toBe(false)
    })
  })

  // ============================================================================
  // markComplete() Tests
  // ============================================================================

  describe('markComplete', () => {
    it('hides tooltip immediately', async () => {
      mockIsTutorialCompleted.mockResolvedValue(false)

      const { result } = renderHook(() => useTutorialState('post_creation'))

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(result.current.isVisible).toBe(true)

      await act(async () => {
        await result.current.markComplete()
      })

      expect(result.current.isVisible).toBe(false)
    })

    it('sets hasCompleted=true', async () => {
      mockIsTutorialCompleted.mockResolvedValue(false)

      const { result } = renderHook(() => useTutorialState('post_creation'))

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(result.current.hasCompleted).toBe(false)

      await act(async () => {
        await result.current.markComplete()
      })

      expect(result.current.hasCompleted).toBe(true)
    })

    it('calls saveTutorialCompletion with correct feature', async () => {
      mockIsTutorialCompleted.mockResolvedValue(false)

      const { result } = renderHook(() => useTutorialState('post_creation'))

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      await act(async () => {
        await result.current.markComplete()
      })

      expect(mockSaveTutorialCompletion).toHaveBeenCalledWith('post_creation')
    })

    it('sets error on save failure but keeps tooltip hidden', async () => {
      mockIsTutorialCompleted.mockResolvedValue(false)
      mockSaveTutorialCompletion.mockResolvedValue({
        success: false,
        error: 'Save failed',
      })

      const { result } = renderHook(() => useTutorialState('post_creation'))

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      await act(async () => {
        await result.current.markComplete()
      })

      // Tooltip stays hidden for good UX even on error
      expect(result.current.isVisible).toBe(false)
      expect(result.current.error).toBe('Save failed')
    })
  })

  // ============================================================================
  // replay() Tests
  // ============================================================================

  describe('replay', () => {
    it('sets isVisible=true regardless of completion state', async () => {
      mockIsTutorialCompleted.mockResolvedValue(true)

      const { result } = renderHook(() => useTutorialState('post_creation'))

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(result.current.isVisible).toBe(false)
      expect(result.current.hasCompleted).toBe(true)

      await act(async () => {
        await result.current.replay()
      })

      expect(result.current.isVisible).toBe(true)
    })

    it('sets hasCompleted=false', async () => {
      mockIsTutorialCompleted.mockResolvedValue(true)

      const { result } = renderHook(() => useTutorialState('post_creation'))

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(result.current.hasCompleted).toBe(true)

      await act(async () => {
        await result.current.replay()
      })

      expect(result.current.hasCompleted).toBe(false)
    })

    it('calls clearTutorialCompletion with correct feature', async () => {
      mockIsTutorialCompleted.mockResolvedValue(true)

      const { result } = renderHook(() => useTutorialState('post_creation'))

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      await act(async () => {
        await result.current.replay()
      })

      expect(mockClearTutorialCompletion).toHaveBeenCalledWith('post_creation')
    })

    it('still shows tooltip even if clear fails', async () => {
      mockIsTutorialCompleted.mockResolvedValue(true)
      mockClearTutorialCompletion.mockResolvedValue({
        success: false,
        error: 'Clear failed',
      })

      const { result } = renderHook(() => useTutorialState('post_creation'))

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      await act(async () => {
        await result.current.replay()
      })

      // Still shows tooltip for good UX
      expect(result.current.isVisible).toBe(true)
      expect(result.current.error).toBe('Clear failed')
    })
  })

  // ============================================================================
  // hide() and show() Tests
  // ============================================================================

  describe('hide and show', () => {
    it('hide() sets isVisible=false without marking complete', async () => {
      mockIsTutorialCompleted.mockResolvedValue(false)

      const { result } = renderHook(() => useTutorialState('post_creation'))

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(result.current.isVisible).toBe(true)

      act(() => {
        result.current.hide()
      })

      expect(result.current.isVisible).toBe(false)
      expect(result.current.hasCompleted).toBe(false)
      expect(mockSaveTutorialCompletion).not.toHaveBeenCalled()
    })

    it('show() sets isVisible=true', async () => {
      mockIsTutorialCompleted.mockResolvedValue(true)

      const { result } = renderHook(() => useTutorialState('post_creation'))

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

  // ============================================================================
  // Fail-Safe Behavior Tests
  // ============================================================================

  describe('fail-safe behavior', () => {
    it('shows tooltip on load error (fail-safe to over-show)', async () => {
      mockIsTutorialCompleted.mockRejectedValue(new Error('Storage unavailable'))

      const { result } = renderHook(() => useTutorialState('post_creation'))

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(result.current.loading).toBe(false)
      expect(result.current.isVisible).toBe(true)
      expect(result.current.error).toContain('Failed to load')
    })

    it('respects autoShow=false even on error', async () => {
      mockIsTutorialCompleted.mockRejectedValue(new Error('Storage error'))

      const { result } = renderHook(() =>
        useTutorialState('post_creation', { autoShow: false })
      )

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(result.current.loading).toBe(false)
      expect(result.current.isVisible).toBe(false)
    })
  })

  // ============================================================================
  // Cleanup Tests
  // ============================================================================

  describe('cleanup', () => {
    it('cancels pending show timeout on unmount', async () => {
      mockIsTutorialCompleted.mockResolvedValue(false)

      const { result, unmount } = renderHook(() =>
        useTutorialState('post_creation', { showDelay: 1000 })
      )

      // Load but don't let delay complete
      await act(async () => {
        await Promise.resolve()
      })

      expect(result.current.loading).toBe(false)
      expect(result.current.isVisible).toBe(false)

      // Unmount before delay completes
      unmount()

      // Advance time past delay
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000)
      })

      // No error should occur from trying to update unmounted component
    })

    it('does not update state after unmount', async () => {
      mockIsTutorialCompleted.mockResolvedValue(false)

      const { result, unmount } = renderHook(() => useTutorialState('post_creation'))

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      const markComplete = result.current.markComplete

      unmount()

      // Should not throw
      await act(async () => {
        await markComplete()
      })
    })
  })

  // ============================================================================
  // Feature Name Change Tests
  // ============================================================================

  describe('feature name change', () => {
    it('reloads state when feature name changes', async () => {
      mockIsTutorialCompleted
        .mockResolvedValueOnce(true) // post_creation completed
        .mockResolvedValueOnce(false) // messaging not completed

      const { result, rerender } = renderHook(
        ({ feature }) => useTutorialState(feature as any),
        { initialProps: { feature: 'post_creation' } }
      )

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(result.current.hasCompleted).toBe(true)
      expect(result.current.isVisible).toBe(false)

      // Change feature
      rerender({ feature: 'messaging' })

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(result.current.hasCompleted).toBe(false)
      expect(result.current.isVisible).toBe(true)
      expect(mockIsTutorialCompleted).toHaveBeenCalledWith('messaging')
    })
  })
})
