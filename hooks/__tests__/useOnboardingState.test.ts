/**
 * Tests for hooks/useOnboardingState.ts
 *
 * Tests onboarding state management with localStorage persistence.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get store() {
      return store
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

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
} from '../useOnboardingState'
import { DEFAULT_MALE_CONFIG } from '../../types/avatar'

describe('useOnboardingState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
  })

  describe('initial state', () => {
    it('should start at step 0', () => {
      const { result } = renderHook(() => useOnboardingState())

      expect(result.current.currentStep).toBe(0)
    })

    it('should start with isComplete false', () => {
      const { result } = renderHook(() => useOnboardingState())

      expect(result.current.isComplete).toBe(false)
    })

    it('should have default avatar config', () => {
      const { result } = renderHook(() => useOnboardingState())

      expect(result.current.avatarConfig).toEqual(DEFAULT_MALE_CONFIG)
    })

    it('should have location permission status as pending', () => {
      const { result } = renderHook(() => useOnboardingState())

      expect(result.current.locationPermissionStatus).toBe('pending')
    })

    it('should have correct totalSteps', () => {
      const { result } = renderHook(() => useOnboardingState())

      expect(result.current.totalSteps).toBe(DEFAULT_TOTAL_STEPS)
    })

    it('should use custom totalSteps when provided', () => {
      const { result } = renderHook(() => useOnboardingState({ totalSteps: 4 }))

      expect(result.current.totalSteps).toBe(4)
    })

    it('should be on first step initially', () => {
      const { result } = renderHook(() => useOnboardingState())

      expect(result.current.isFirstStep).toBe(true)
      expect(result.current.isLastStep).toBe(false)
    })

    it('should compute progress correctly', () => {
      const { result } = renderHook(() => useOnboardingState({ totalSteps: 4 }))

      // Step 0 of 4 = 25%
      expect(result.current.progress).toBe(25)
    })
  })

  describe('navigation', () => {
    it('should go to next step', () => {
      const { result } = renderHook(() => useOnboardingState({ totalSteps: 4 }))

      act(() => {
        result.current.nextStep()
      })

      expect(result.current.currentStep).toBe(1)
    })

    it('should not go past last step', () => {
      const { result } = renderHook(() => useOnboardingState({ totalSteps: 2 }))

      act(() => {
        result.current.nextStep()
        result.current.nextStep()
        result.current.nextStep()
      })

      expect(result.current.currentStep).toBe(1)
      expect(result.current.isLastStep).toBe(true)
    })

    it('should go to previous step', () => {
      const { result } = renderHook(() => useOnboardingState({ totalSteps: 4 }))

      act(() => {
        result.current.nextStep()
        result.current.nextStep()
        result.current.prevStep()
      })

      expect(result.current.currentStep).toBe(1)
    })

    it('should not go before first step', () => {
      const { result } = renderHook(() => useOnboardingState())

      act(() => {
        result.current.prevStep()
        result.current.prevStep()
      })

      expect(result.current.currentStep).toBe(0)
      expect(result.current.isFirstStep).toBe(true)
    })

    it('should go to specific step', () => {
      const { result } = renderHook(() => useOnboardingState({ totalSteps: 6 }))

      act(() => {
        result.current.goToStep(3)
      })

      expect(result.current.currentStep).toBe(3)
    })

    it('should clamp goToStep to valid range', () => {
      const { result } = renderHook(() => useOnboardingState({ totalSteps: 4 }))

      act(() => {
        result.current.goToStep(10)
      })

      expect(result.current.currentStep).toBe(3)

      act(() => {
        result.current.goToStep(-5)
      })

      expect(result.current.currentStep).toBe(0)
    })
  })

  describe('persistence', () => {
    it('should persist step to localStorage', () => {
      const { result } = renderHook(() => useOnboardingState())

      act(() => {
        result.current.nextStep()
      })

      expect(localStorageMock.setItem).toHaveBeenCalled()
      const stored = JSON.parse(localStorageMock.store[ONBOARDING_STORAGE_KEY])
      expect(stored.lastStep).toBe(1)
    })

    it('should not persist step when persistStep is false', () => {
      const { result } = renderHook(() => useOnboardingState({ persistStep: false }))

      act(() => {
        result.current.nextStep()
      })

      // Should not have stored step
      expect(localStorageMock.store[ONBOARDING_STORAGE_KEY]).toBeUndefined()
    })

    it('should resume from last step', () => {
      localStorageMock.store[ONBOARDING_STORAGE_KEY] = JSON.stringify({
        isComplete: false,
        lastStep: 3,
        completedAt: null,
        avatarConfig: null,
        locationPermissionStatus: 'pending',
      })

      const { result } = renderHook(() => useOnboardingState({ totalSteps: 6 }))

      expect(result.current.currentStep).toBe(3)
    })

    it('should not resume when already complete', () => {
      localStorageMock.store[ONBOARDING_STORAGE_KEY] = JSON.stringify({
        isComplete: true,
        lastStep: 3,
        completedAt: '2024-01-01',
        avatarConfig: null,
        locationPermissionStatus: 'pending',
      })

      const { result } = renderHook(() => useOnboardingState())

      expect(result.current.isComplete).toBe(true)
    })
  })

  describe('completion', () => {
    it('should complete onboarding', () => {
      const { result } = renderHook(() => useOnboardingState())

      act(() => {
        result.current.completeOnboarding()
      })

      expect(result.current.isComplete).toBe(true)
    })

    it('should persist completion', () => {
      const { result } = renderHook(() => useOnboardingState())

      act(() => {
        result.current.completeOnboarding()
      })

      const stored = JSON.parse(localStorageMock.store[ONBOARDING_STORAGE_KEY])
      expect(stored.isComplete).toBe(true)
      expect(stored.completedAt).toBeTruthy()
    })

    it('should skip onboarding (marks as complete)', () => {
      const { result } = renderHook(() => useOnboardingState())

      act(() => {
        result.current.skipOnboarding()
      })

      expect(result.current.isComplete).toBe(true)
    })

    it('should reset onboarding', () => {
      const { result } = renderHook(() => useOnboardingState())

      act(() => {
        result.current.nextStep()
        result.current.completeOnboarding()
      })

      expect(result.current.isComplete).toBe(true)

      act(() => {
        result.current.resetOnboarding()
      })

      expect(result.current.currentStep).toBe(0)
      expect(result.current.isComplete).toBe(false)
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(ONBOARDING_STORAGE_KEY)
    })
  })

  describe('avatar', () => {
    it('should set avatar config', () => {
      const { result } = renderHook(() => useOnboardingState())

      const newAvatar = {
        ...DEFAULT_MALE_CONFIG,
        hairColor: '#8d3121',
      }

      act(() => {
        result.current.setAvatar(newAvatar)
      })

      expect(result.current.avatarConfig).toEqual(newAvatar)
    })

    it('should persist avatar config', () => {
      const { result } = renderHook(() => useOnboardingState())

      const newAvatar = {
        ...DEFAULT_MALE_CONFIG,
        skinTone: '#6b4423',
      }

      act(() => {
        result.current.setAvatar(newAvatar)
      })

      const stored = JSON.parse(localStorageMock.store[ONBOARDING_STORAGE_KEY])
      expect(stored.avatarConfig.skinTone).toBe('#6b4423')
    })

    it('should load persisted avatar config', () => {
      const savedAvatar = {
        ...DEFAULT_MALE_CONFIG,
        hairStyle: 'longHairBob',
      }

      localStorageMock.store[ONBOARDING_STORAGE_KEY] = JSON.stringify({
        isComplete: false,
        lastStep: 0,
        completedAt: null,
        avatarConfig: savedAvatar,
        locationPermissionStatus: 'pending',
      })

      const { result } = renderHook(() => useOnboardingState())

      expect(result.current.avatarConfig.hairStyle).toBe('longHairBob')
    })
  })

  describe('location permission', () => {
    it('should set location permission status', () => {
      const { result } = renderHook(() => useOnboardingState())

      act(() => {
        result.current.setLocationPermission('granted')
      })

      expect(result.current.locationPermissionStatus).toBe('granted')
    })

    it('should persist location permission status', () => {
      const { result } = renderHook(() => useOnboardingState())

      act(() => {
        result.current.setLocationPermission('denied')
      })

      const stored = JSON.parse(localStorageMock.store[ONBOARDING_STORAGE_KEY])
      expect(stored.locationPermissionStatus).toBe('denied')
    })

    it('should load persisted location permission status', () => {
      localStorageMock.store[ONBOARDING_STORAGE_KEY] = JSON.stringify({
        isComplete: false,
        lastStep: 0,
        completedAt: null,
        avatarConfig: null,
        locationPermissionStatus: 'skipped',
      })

      const { result } = renderHook(() => useOnboardingState())

      expect(result.current.locationPermissionStatus).toBe('skipped')
    })
  })

  describe('custom storage key', () => {
    it('should use custom storage key', () => {
      const { result } = renderHook(() =>
        useOnboardingState({ storageKey: 'custom_key' })
      )

      act(() => {
        result.current.nextStep()
      })

      expect(localStorageMock.store['custom_key']).toBeTruthy()
    })
  })
})

describe('utility functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
  })

  describe('isOnboardingComplete', () => {
    it('should return false when not complete', () => {
      expect(isOnboardingComplete()).toBe(false)
    })

    it('should return true when complete', () => {
      localStorageMock.store[ONBOARDING_STORAGE_KEY] = JSON.stringify({
        isComplete: true,
        lastStep: 5,
        completedAt: '2024-01-01',
        avatarConfig: null,
        locationPermissionStatus: 'pending',
      })

      expect(isOnboardingComplete()).toBe(true)
    })

    it('should use custom storage key', () => {
      localStorageMock.store['custom_key'] = JSON.stringify({
        isComplete: true,
        lastStep: 0,
        completedAt: '2024-01-01',
        avatarConfig: null,
        locationPermissionStatus: 'pending',
      })

      expect(isOnboardingComplete('custom_key')).toBe(true)
      expect(isOnboardingComplete()).toBe(false)
    })
  })

  describe('getLastOnboardingStep', () => {
    it('should return 0 when no data', () => {
      expect(getLastOnboardingStep()).toBe(0)
    })

    it('should return stored step', () => {
      localStorageMock.store[ONBOARDING_STORAGE_KEY] = JSON.stringify({
        isComplete: false,
        lastStep: 4,
        completedAt: null,
        avatarConfig: null,
        locationPermissionStatus: 'pending',
      })

      expect(getLastOnboardingStep()).toBe(4)
    })
  })

  describe('getOnboardingAvatarConfig', () => {
    it('should return default when no config stored', () => {
      expect(getOnboardingAvatarConfig()).toEqual(DEFAULT_MALE_CONFIG)
    })

    it('should return stored config', () => {
      const storedAvatar = { ...DEFAULT_MALE_CONFIG, gender: 'female' as const }

      localStorageMock.store[ONBOARDING_STORAGE_KEY] = JSON.stringify({
        isComplete: false,
        lastStep: 0,
        completedAt: null,
        avatarConfig: storedAvatar,
        locationPermissionStatus: 'pending',
      })

      expect(getOnboardingAvatarConfig().gender).toBe('female')
    })
  })

  describe('setOnboardingAvatarConfig', () => {
    it('should set avatar config', () => {
      const newAvatar = { ...DEFAULT_MALE_CONFIG, mouthType: 'tongue' }

      setOnboardingAvatarConfig(newAvatar)

      const stored = JSON.parse(localStorageMock.store[ONBOARDING_STORAGE_KEY])
      expect(stored.avatarConfig.mouthType).toBe('tongue')
    })

    it('should preserve other state', () => {
      localStorageMock.store[ONBOARDING_STORAGE_KEY] = JSON.stringify({
        isComplete: true,
        lastStep: 3,
        completedAt: '2024-01-01',
        avatarConfig: null,
        locationPermissionStatus: 'granted',
      })

      const newAvatar = { ...DEFAULT_MALE_CONFIG, eyeType: 'happy' }
      setOnboardingAvatarConfig(newAvatar)

      const stored = JSON.parse(localStorageMock.store[ONBOARDING_STORAGE_KEY])
      expect(stored.isComplete).toBe(true)
      expect(stored.lastStep).toBe(3)
      expect(stored.locationPermissionStatus).toBe('granted')
    })
  })

  describe('markOnboardingComplete', () => {
    it('should mark onboarding as complete', () => {
      markOnboardingComplete()

      const stored = JSON.parse(localStorageMock.store[ONBOARDING_STORAGE_KEY])
      expect(stored.isComplete).toBe(true)
      expect(stored.completedAt).toBeTruthy()
    })
  })

  describe('getOnboardingLocationPermissionStatus', () => {
    it('should return pending when no data', () => {
      expect(getOnboardingLocationPermissionStatus()).toBe('pending')
    })

    it('should return stored status', () => {
      localStorageMock.store[ONBOARDING_STORAGE_KEY] = JSON.stringify({
        isComplete: false,
        lastStep: 0,
        completedAt: null,
        avatarConfig: null,
        locationPermissionStatus: 'granted',
      })

      expect(getOnboardingLocationPermissionStatus()).toBe('granted')
    })
  })

  describe('setOnboardingLocationPermissionStatus', () => {
    it('should set location permission status', () => {
      setOnboardingLocationPermissionStatus('denied')

      const stored = JSON.parse(localStorageMock.store[ONBOARDING_STORAGE_KEY])
      expect(stored.locationPermissionStatus).toBe('denied')
    })
  })

  describe('clearOnboardingState', () => {
    it('should clear onboarding state', () => {
      localStorageMock.store[ONBOARDING_STORAGE_KEY] = JSON.stringify({
        isComplete: true,
        lastStep: 5,
        completedAt: '2024-01-01',
        avatarConfig: null,
        locationPermissionStatus: 'granted',
      })

      clearOnboardingState()

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(ONBOARDING_STORAGE_KEY)
    })
  })
})
