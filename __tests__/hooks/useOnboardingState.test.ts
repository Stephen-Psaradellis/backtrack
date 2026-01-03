/**
 * @vitest-environment jsdom
 */

/**
 * Unit tests for useOnboardingState hook
 *
 * Tests cover:
 * - Initial state
 * - Step navigation (nextStep, prevStep, goToStep)
 * - Skip and completion functionality
 * - Avatar configuration persistence
 * - Location permission status tracking
 * - localStorage persistence
 * - Edge cases and error handling
 * - Utility functions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import {
  useOnboardingState,
  isOnboardingComplete,
  getLastOnboardingStep,
  getOnboardingAvatarConfig,
  setOnboardingAvatarConfig,
  markOnboardingComplete,
  getOnboardingLocationPermissionStatus,
  setOnboardingLocationPermissionStatus,
  clearOnboardingState,
  ONBOARDING_STORAGE_KEY,
  DEFAULT_TOTAL_STEPS,
  type OnboardingPersistedState,
  type OnboardingLocationPermissionStatus,
} from '@/hooks/useOnboardingState'
import { DEFAULT_AVATAR_CONFIG, type AvatarConfig } from '@/types/avatar'

// ============================================================================
// Test Setup - localStorage Mocking
// ============================================================================

/**
 * Mock localStorage storage
 */
let localStorageStore: Record<string, string> = {}

/**
 * Mock localStorage implementation
 */
const mockLocalStorage = {
  getItem: vi.fn((key: string): string | null => {
    return localStorageStore[key] ?? null
  }),
  setItem: vi.fn((key: string, value: string): void => {
    localStorageStore[key] = value
  }),
  removeItem: vi.fn((key: string): void => {
    delete localStorageStore[key]
  }),
  clear: vi.fn((): void => {
    localStorageStore = {}
  }),
  get length(): number {
    return Object.keys(localStorageStore).length
  },
  key: vi.fn((index: number): string | null => {
    const keys = Object.keys(localStorageStore)
    return keys[index] ?? null
  }),
}

/**
 * Helper to set persisted state directly in localStorage
 */
function setPersistedState(state: Partial<OnboardingPersistedState>): void {
  const currentState = localStorageStore[ONBOARDING_STORAGE_KEY]
  const parsedState: OnboardingPersistedState = currentState
    ? JSON.parse(currentState)
    : {
        isComplete: false,
        lastStep: 0,
        completedAt: null,
        avatarConfig: null,
        locationPermissionStatus: 'pending',
      }

  const updatedState: OnboardingPersistedState = {
    ...parsedState,
    ...state,
  }

  localStorageStore[ONBOARDING_STORAGE_KEY] = JSON.stringify(updatedState)
}

/**
 * Helper to get persisted state from localStorage
 */
function getPersistedState(): OnboardingPersistedState | null {
  const item = localStorageStore[ONBOARDING_STORAGE_KEY]
  if (!item) return null
  return JSON.parse(item)
}

/**
 * Set up mocks before each test
 */
beforeEach(() => {
  // Clear localStorage mock
  localStorageStore = {}

  // Reset all mocks
  vi.clearAllMocks()

  // Mock window.localStorage
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
  })
})

/**
 * Clean up after each test
 */
afterEach(() => {
  vi.restoreAllMocks()
})

// ============================================================================
// Initial State Tests
// ============================================================================

describe('useOnboardingState - Initial State', () => {
  describe('when localStorage is empty', () => {
    it('returns initial state with step 0', async () => {
      const { result } = renderHook(() => useOnboardingState())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.currentStep).toBe(0)
      expect(result.current.isComplete).toBe(false)
      expect(result.current.totalSteps).toBe(DEFAULT_TOTAL_STEPS)
    })

    it('returns isFirstStep as true', async () => {
      const { result } = renderHook(() => useOnboardingState())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isFirstStep).toBe(true)
      expect(result.current.isLastStep).toBe(false)
    })

    it('returns default avatar config', async () => {
      const { result } = renderHook(() => useOnboardingState())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.avatarConfig).toEqual(DEFAULT_AVATAR_CONFIG)
    })

    it('returns pending location permission status', async () => {
      const { result } = renderHook(() => useOnboardingState())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.locationPermissionStatus).toBe('pending')
    })

    it('calculates initial progress correctly', async () => {
      const { result } = renderHook(() => useOnboardingState())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Progress = ((currentStep + 1) / totalSteps) * 100 = (1/6) * 100 ≈ 17%
      expect(result.current.progress).toBe(17)
    })
  })

  describe('when localStorage has existing state', () => {
    it('restores isComplete from localStorage', async () => {
      setPersistedState({ isComplete: true, completedAt: '2025-01-01T00:00:00Z' })

      const { result } = renderHook(() => useOnboardingState())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isComplete).toBe(true)
    })

    it('resumes from lastStep when not complete', async () => {
      setPersistedState({ isComplete: false, lastStep: 3 })

      const { result } = renderHook(() => useOnboardingState())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.currentStep).toBe(3)
    })

    it('does not resume from lastStep when complete', async () => {
      setPersistedState({ isComplete: true, lastStep: 3, completedAt: '2025-01-01T00:00:00Z' })

      const { result } = renderHook(() => useOnboardingState())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // When complete, should start at step 0 (but isComplete is true)
      expect(result.current.currentStep).toBe(0)
      expect(result.current.isComplete).toBe(true)
    })

    it('restores avatarConfig from localStorage', async () => {
      const customAvatar: AvatarConfig = {
        ...DEFAULT_AVATAR_CONFIG,
        topType: 'NoHair',
        skinColor: 'DarkBrown',
      }
      setPersistedState({ avatarConfig: customAvatar })

      const { result } = renderHook(() => useOnboardingState())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.avatarConfig.topType).toBe('NoHair')
      expect(result.current.avatarConfig.skinColor).toBe('DarkBrown')
    })

    it('restores locationPermissionStatus from localStorage', async () => {
      setPersistedState({ locationPermissionStatus: 'granted' })

      const { result } = renderHook(() => useOnboardingState())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.locationPermissionStatus).toBe('granted')
    })
  })

  describe('with custom options', () => {
    it('uses custom totalSteps', async () => {
      const { result } = renderHook(() => useOnboardingState({ totalSteps: 4 }))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.totalSteps).toBe(4)
    })

    it('uses custom storageKey', async () => {
      const customKey = 'custom_onboarding_key'

      // Set state in custom key
      localStorageStore[customKey] = JSON.stringify({
        isComplete: true,
        lastStep: 2,
        completedAt: '2025-01-01T00:00:00Z',
        avatarConfig: null,
        locationPermissionStatus: 'pending',
      })

      const { result } = renderHook(() => useOnboardingState({ storageKey: customKey }))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isComplete).toBe(true)
    })

    it('respects persistStep: false option', async () => {
      setPersistedState({ isComplete: false, lastStep: 3 })

      const { result } = renderHook(() => useOnboardingState({ persistStep: false }))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Should NOT resume from lastStep when persistStep is false
      expect(result.current.currentStep).toBe(0)
    })
  })
})

// ============================================================================
// Step Navigation Tests
// ============================================================================

describe('useOnboardingState - Step Navigation', () => {
  describe('nextStep', () => {
    it('increments currentStep by 1', async () => {
      const { result } = renderHook(() => useOnboardingState())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.nextStep()
      })

      expect(result.current.currentStep).toBe(1)
    })

    it('persists step to localStorage', async () => {
      const { result } = renderHook(() => useOnboardingState())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.nextStep()
      })

      const persistedState = getPersistedState()
      expect(persistedState?.lastStep).toBe(1)
    })

    it('does not exceed totalSteps - 1', async () => {
      const { result } = renderHook(() => useOnboardingState({ totalSteps: 3 }))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Go to step 2 (last step)
      act(() => {
        result.current.nextStep() // step 1
        result.current.nextStep() // step 2 (last)
        result.current.nextStep() // should stay at 2
      })

      expect(result.current.currentStep).toBe(2)
      expect(result.current.isLastStep).toBe(true)
    })

    it('updates isFirstStep and isLastStep correctly', async () => {
      const { result } = renderHook(() => useOnboardingState({ totalSteps: 2 }))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isFirstStep).toBe(true)
      expect(result.current.isLastStep).toBe(false)

      act(() => {
        result.current.nextStep()
      })

      expect(result.current.isFirstStep).toBe(false)
      expect(result.current.isLastStep).toBe(true)
    })

    it('updates progress correctly', async () => {
      const { result } = renderHook(() => useOnboardingState({ totalSteps: 4 }))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Step 0: progress = (1/4) * 100 = 25
      expect(result.current.progress).toBe(25)

      act(() => {
        result.current.nextStep()
      })

      // Step 1: progress = (2/4) * 100 = 50
      expect(result.current.progress).toBe(50)
    })
  })

  describe('prevStep', () => {
    it('decrements currentStep by 1', async () => {
      setPersistedState({ lastStep: 2 })

      const { result } = renderHook(() => useOnboardingState())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.currentStep).toBe(2)

      act(() => {
        result.current.prevStep()
      })

      expect(result.current.currentStep).toBe(1)
    })

    it('does not go below 0', async () => {
      const { result } = renderHook(() => useOnboardingState())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.prevStep()
        result.current.prevStep()
      })

      expect(result.current.currentStep).toBe(0)
      expect(result.current.isFirstStep).toBe(true)
    })

    it('persists step to localStorage', async () => {
      setPersistedState({ lastStep: 2 })

      const { result } = renderHook(() => useOnboardingState())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.prevStep()
      })

      const persistedState = getPersistedState()
      expect(persistedState?.lastStep).toBe(1)
    })
  })

  describe('goToStep', () => {
    it('navigates to a specific step', async () => {
      const { result } = renderHook(() => useOnboardingState())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.goToStep(3)
      })

      expect(result.current.currentStep).toBe(3)
    })

    it('clamps step to valid range (0 to totalSteps - 1)', async () => {
      const { result } = renderHook(() => useOnboardingState({ totalSteps: 4 }))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Try to go to step 10 (out of range)
      act(() => {
        result.current.goToStep(10)
      })
      expect(result.current.currentStep).toBe(3) // Should clamp to last step

      // Try to go to negative step
      act(() => {
        result.current.goToStep(-5)
      })
      expect(result.current.currentStep).toBe(0) // Should clamp to first step
    })

    it('persists step to localStorage', async () => {
      const { result } = renderHook(() => useOnboardingState())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.goToStep(4)
      })

      const persistedState = getPersistedState()
      expect(persistedState?.lastStep).toBe(4)
    })
  })
})

// ============================================================================
// Completion Tests
// ============================================================================

describe('useOnboardingState - Completion', () => {
  describe('completeOnboarding', () => {
    it('sets isComplete to true', async () => {
      const { result } = renderHook(() => useOnboardingState())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.completeOnboarding()
      })

      expect(result.current.isComplete).toBe(true)
    })

    it('persists completion to localStorage', async () => {
      const { result } = renderHook(() => useOnboardingState())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.completeOnboarding()
      })

      const persistedState = getPersistedState()
      expect(persistedState?.isComplete).toBe(true)
      expect(persistedState?.completedAt).toBeTruthy()
    })

    it('sets lastStep to totalSteps - 1', async () => {
      const { result } = renderHook(() => useOnboardingState({ totalSteps: 5 }))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.completeOnboarding()
      })

      const persistedState = getPersistedState()
      expect(persistedState?.lastStep).toBe(4)
    })

    it('sets completedAt timestamp', async () => {
      const { result } = renderHook(() => useOnboardingState())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const beforeComplete = new Date().toISOString()

      act(() => {
        result.current.completeOnboarding()
      })

      const afterComplete = new Date().toISOString()
      const persistedState = getPersistedState()

      expect(persistedState?.completedAt).toBeTruthy()
      expect(persistedState!.completedAt! >= beforeComplete).toBe(true)
      expect(persistedState!.completedAt! <= afterComplete).toBe(true)
    })
  })

  describe('skipOnboarding', () => {
    it('calls completeOnboarding (marks as complete)', async () => {
      const { result } = renderHook(() => useOnboardingState())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.skipOnboarding()
      })

      expect(result.current.isComplete).toBe(true)
    })

    it('persists completion to localStorage', async () => {
      const { result } = renderHook(() => useOnboardingState())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.skipOnboarding()
      })

      const persistedState = getPersistedState()
      expect(persistedState?.isComplete).toBe(true)
    })
  })

  describe('resetOnboarding', () => {
    it('resets all state to initial values', async () => {
      // Start with some state
      setPersistedState({
        isComplete: true,
        lastStep: 3,
        completedAt: '2025-01-01T00:00:00Z',
        avatarConfig: { topType: 'NoHair' },
        locationPermissionStatus: 'granted',
      })

      const { result } = renderHook(() => useOnboardingState())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isComplete).toBe(true)

      act(() => {
        result.current.resetOnboarding()
      })

      expect(result.current.currentStep).toBe(0)
      expect(result.current.isComplete).toBe(false)
      expect(result.current.avatarConfig).toEqual(DEFAULT_AVATAR_CONFIG)
      expect(result.current.locationPermissionStatus).toBe('pending')
    })

    it('clears localStorage', async () => {
      setPersistedState({ isComplete: true })

      const { result } = renderHook(() => useOnboardingState())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.resetOnboarding()
      })

      expect(localStorageStore[ONBOARDING_STORAGE_KEY]).toBeUndefined()
    })
  })
})

// ============================================================================
// Avatar Configuration Tests
// ============================================================================

describe('useOnboardingState - Avatar Configuration', () => {
  describe('setAvatar', () => {
    it('updates avatarConfig state', async () => {
      const { result } = renderHook(() => useOnboardingState())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const customAvatar: AvatarConfig = {
        ...DEFAULT_AVATAR_CONFIG,
        topType: 'LongHairBigHair',
        hairColor: 'Black',
        skinColor: 'Tanned',
      }

      act(() => {
        result.current.setAvatar(customAvatar)
      })

      expect(result.current.avatarConfig.topType).toBe('LongHairBigHair')
      expect(result.current.avatarConfig.hairColor).toBe('Black')
      expect(result.current.avatarConfig.skinColor).toBe('Tanned')
    })

    it('persists avatarConfig to localStorage', async () => {
      const { result } = renderHook(() => useOnboardingState())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const customAvatar: AvatarConfig = {
        topType: 'Hat',
        skinColor: 'Brown',
      }

      act(() => {
        result.current.setAvatar(customAvatar)
      })

      const persistedState = getPersistedState()
      expect(persistedState?.avatarConfig?.topType).toBe('Hat')
      expect(persistedState?.avatarConfig?.skinColor).toBe('Brown')
    })
  })
})

// ============================================================================
// Location Permission Tests
// ============================================================================

describe('useOnboardingState - Location Permission', () => {
  describe('setLocationPermission', () => {
    it('updates locationPermissionStatus to granted', async () => {
      const { result } = renderHook(() => useOnboardingState())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.setLocationPermission('granted')
      })

      expect(result.current.locationPermissionStatus).toBe('granted')
    })

    it('updates locationPermissionStatus to denied', async () => {
      const { result } = renderHook(() => useOnboardingState())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.setLocationPermission('denied')
      })

      expect(result.current.locationPermissionStatus).toBe('denied')
    })

    it('updates locationPermissionStatus to skipped', async () => {
      const { result } = renderHook(() => useOnboardingState())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.setLocationPermission('skipped')
      })

      expect(result.current.locationPermissionStatus).toBe('skipped')
    })

    it('persists locationPermissionStatus to localStorage', async () => {
      const { result } = renderHook(() => useOnboardingState())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.setLocationPermission('granted')
      })

      const persistedState = getPersistedState()
      expect(persistedState?.locationPermissionStatus).toBe('granted')
    })
  })
})

// ============================================================================
// Utility Functions Tests
// ============================================================================

describe('Utility Functions', () => {
  describe('isOnboardingComplete', () => {
    it('returns false when localStorage is empty', () => {
      expect(isOnboardingComplete()).toBe(false)
    })

    it('returns false when onboarding is not complete', () => {
      setPersistedState({ isComplete: false })
      expect(isOnboardingComplete()).toBe(false)
    })

    it('returns true when onboarding is complete', () => {
      setPersistedState({ isComplete: true })
      expect(isOnboardingComplete()).toBe(true)
    })

    it('uses custom storageKey when provided', () => {
      const customKey = 'custom_key'
      localStorageStore[customKey] = JSON.stringify({
        isComplete: true,
        lastStep: 0,
        completedAt: null,
        avatarConfig: null,
        locationPermissionStatus: 'pending',
      })

      expect(isOnboardingComplete(customKey)).toBe(true)
      expect(isOnboardingComplete()).toBe(false) // Default key should still be false
    })
  })

  describe('getLastOnboardingStep', () => {
    it('returns 0 when localStorage is empty', () => {
      expect(getLastOnboardingStep()).toBe(0)
    })

    it('returns the lastStep from localStorage', () => {
      setPersistedState({ lastStep: 4 })
      expect(getLastOnboardingStep()).toBe(4)
    })

    it('uses custom storageKey when provided', () => {
      const customKey = 'custom_key'
      localStorageStore[customKey] = JSON.stringify({
        isComplete: false,
        lastStep: 3,
        completedAt: null,
        avatarConfig: null,
        locationPermissionStatus: 'pending',
      })

      expect(getLastOnboardingStep(customKey)).toBe(3)
    })
  })

  describe('getOnboardingAvatarConfig', () => {
    it('returns DEFAULT_AVATAR_CONFIG when localStorage is empty', () => {
      expect(getOnboardingAvatarConfig()).toEqual(DEFAULT_AVATAR_CONFIG)
    })

    it('returns DEFAULT_AVATAR_CONFIG when avatarConfig is null', () => {
      setPersistedState({ avatarConfig: null })
      expect(getOnboardingAvatarConfig()).toEqual(DEFAULT_AVATAR_CONFIG)
    })

    it('returns stored avatarConfig', () => {
      const customAvatar: AvatarConfig = { topType: 'NoHair', skinColor: 'DarkBrown' }
      setPersistedState({ avatarConfig: customAvatar })

      const result = getOnboardingAvatarConfig()
      expect(result.topType).toBe('NoHair')
      expect(result.skinColor).toBe('DarkBrown')
    })
  })

  describe('setOnboardingAvatarConfig', () => {
    it('stores avatarConfig in localStorage', () => {
      const customAvatar: AvatarConfig = { topType: 'Hat', hairColor: 'Blue' }
      setOnboardingAvatarConfig(customAvatar)

      const persistedState = getPersistedState()
      expect(persistedState?.avatarConfig?.topType).toBe('Hat')
      expect(persistedState?.avatarConfig?.hairColor).toBe('Blue')
    })

    it('preserves other state when setting avatarConfig', () => {
      setPersistedState({
        isComplete: true,
        lastStep: 3,
        completedAt: '2025-01-01T00:00:00Z',
        locationPermissionStatus: 'granted',
      })

      const customAvatar: AvatarConfig = { topType: 'Hijab' }
      setOnboardingAvatarConfig(customAvatar)

      const persistedState = getPersistedState()
      expect(persistedState?.isComplete).toBe(true)
      expect(persistedState?.lastStep).toBe(3)
      expect(persistedState?.locationPermissionStatus).toBe('granted')
    })
  })

  describe('markOnboardingComplete', () => {
    it('sets isComplete to true', () => {
      markOnboardingComplete()

      const persistedState = getPersistedState()
      expect(persistedState?.isComplete).toBe(true)
    })

    it('sets completedAt timestamp', () => {
      markOnboardingComplete()

      const persistedState = getPersistedState()
      expect(persistedState?.completedAt).toBeTruthy()

      // Verify it's a valid ISO date string
      const date = new Date(persistedState!.completedAt!)
      expect(date.getTime()).not.toBeNaN()
    })

    it('preserves other state', () => {
      setPersistedState({
        lastStep: 2,
        avatarConfig: { topType: 'NoHair' },
        locationPermissionStatus: 'granted',
      })

      markOnboardingComplete()

      const persistedState = getPersistedState()
      expect(persistedState?.lastStep).toBe(2)
      expect(persistedState?.avatarConfig?.topType).toBe('NoHair')
      expect(persistedState?.locationPermissionStatus).toBe('granted')
    })
  })

  describe('getOnboardingLocationPermissionStatus', () => {
    it('returns pending when localStorage is empty', () => {
      expect(getOnboardingLocationPermissionStatus()).toBe('pending')
    })

    it('returns stored status', () => {
      setPersistedState({ locationPermissionStatus: 'granted' })
      expect(getOnboardingLocationPermissionStatus()).toBe('granted')

      setPersistedState({ locationPermissionStatus: 'denied' })
      expect(getOnboardingLocationPermissionStatus()).toBe('denied')

      setPersistedState({ locationPermissionStatus: 'skipped' })
      expect(getOnboardingLocationPermissionStatus()).toBe('skipped')
    })
  })

  describe('setOnboardingLocationPermissionStatus', () => {
    it('stores status in localStorage', () => {
      setOnboardingLocationPermissionStatus('granted')

      const persistedState = getPersistedState()
      expect(persistedState?.locationPermissionStatus).toBe('granted')
    })

    it('preserves other state', () => {
      setPersistedState({
        isComplete: true,
        lastStep: 4,
        avatarConfig: { topType: 'Hat' },
      })

      setOnboardingLocationPermissionStatus('denied')

      const persistedState = getPersistedState()
      expect(persistedState?.isComplete).toBe(true)
      expect(persistedState?.lastStep).toBe(4)
      expect(persistedState?.avatarConfig?.topType).toBe('Hat')
    })
  })

  describe('clearOnboardingState', () => {
    it('removes onboarding state from localStorage', () => {
      setPersistedState({
        isComplete: true,
        lastStep: 5,
        avatarConfig: { topType: 'NoHair' },
      })

      clearOnboardingState()

      expect(localStorageStore[ONBOARDING_STORAGE_KEY]).toBeUndefined()
    })

    it('uses custom storageKey when provided', () => {
      const customKey = 'custom_key'
      localStorageStore[customKey] = JSON.stringify({ isComplete: true })

      clearOnboardingState(customKey)

      expect(localStorageStore[customKey]).toBeUndefined()
      // Default key should be unaffected if it exists
    })
  })
})

// ============================================================================
// Edge Cases and Error Handling Tests
// ============================================================================

describe('Edge Cases', () => {
  describe('localStorage error handling', () => {
    it('handles JSON parse errors gracefully', async () => {
      // Set invalid JSON in localStorage
      localStorageStore[ONBOARDING_STORAGE_KEY] = 'not valid json'

      const { result } = renderHook(() => useOnboardingState())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Should fall back to initial state
      expect(result.current.currentStep).toBe(0)
      expect(result.current.isComplete).toBe(false)
    })

    it('handles localStorage.getItem throwing', async () => {
      mockLocalStorage.getItem.mockImplementationOnce(() => {
        throw new Error('localStorage error')
      })

      const { result } = renderHook(() => useOnboardingState())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Should fall back to initial state
      expect(result.current.currentStep).toBe(0)
    })

    it('handles localStorage.setItem throwing', async () => {
      const { result } = renderHook(() => useOnboardingState())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Make setItem throw
      mockLocalStorage.setItem.mockImplementationOnce(() => {
        throw new Error('localStorage full')
      })

      // This should not throw, even though localStorage fails
      act(() => {
        result.current.nextStep()
      })

      // The state should still update in memory
      expect(result.current.currentStep).toBe(1)
    })
  })

  describe('boundary conditions', () => {
    it('handles totalSteps of 1', async () => {
      const { result } = renderHook(() => useOnboardingState({ totalSteps: 1 }))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.currentStep).toBe(0)
      expect(result.current.isFirstStep).toBe(true)
      expect(result.current.isLastStep).toBe(true)
      expect(result.current.progress).toBe(100)
    })

    it('handles rapid navigation calls', async () => {
      const { result } = renderHook(() => useOnboardingState({ totalSteps: 10 }))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Rapid fire navigation
      act(() => {
        for (let i = 0; i < 5; i++) {
          result.current.nextStep()
        }
      })

      expect(result.current.currentStep).toBe(5)
    })
  })

  describe('state consistency', () => {
    it('maintains consistency between state and localStorage', async () => {
      const { result } = renderHook(() => useOnboardingState())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Navigate through steps
      act(() => {
        result.current.nextStep()
        result.current.nextStep()
      })

      // Set avatar
      act(() => {
        result.current.setAvatar({ topType: 'NoHair' })
      })

      // Set location permission
      act(() => {
        result.current.setLocationPermission('granted')
      })

      // Complete
      act(() => {
        result.current.completeOnboarding()
      })

      // Verify localStorage matches state
      const persistedState = getPersistedState()
      expect(persistedState?.isComplete).toBe(result.current.isComplete)
      expect(persistedState?.avatarConfig?.topType).toBe(result.current.avatarConfig.topType)
      expect(persistedState?.locationPermissionStatus).toBe(result.current.locationPermissionStatus)
    })
  })
})

// ============================================================================
// Loading State Tests
// ============================================================================

describe('Loading State', () => {
  it('eventually has isLoading false after initialization', async () => {
    const { result } = renderHook(() => useOnboardingState())

    // After initialization, isLoading should be false
    // (may be false immediately due to synchronous localStorage read)
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('sets isLoading to false after initialization', async () => {
    const { result } = renderHook(() => useOnboardingState())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
  })
})
