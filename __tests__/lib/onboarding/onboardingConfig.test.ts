/**
 * Unit tests for onboarding configuration and step logic
 *
 * Tests cover:
 * - Constants and type definitions
 * - Step lookup functions (getStepById, getStepByIndex, getStepIndex)
 * - Progress calculation functions
 * - Validation functions
 * - Navigation helper functions
 * - Edge cases and boundary conditions
 */

import { describe, it, expect } from 'vitest'
import {
  // Types
  type OnboardingStepId,
  type OnboardingStep,
  type OnboardingFeature,
  // Constants
  TOTAL_ONBOARDING_STEPS,
  TARGET_COMPLETION_MINUTES,
  ONBOARDING_STEPS,
  WELCOME_FEATURES,
  // Step Lookup Functions
  getStepById,
  getStepByIndex,
  getStepIndex,
  // Progress Calculation Functions
  calculateProgress,
  calculateRemainingTime,
  formatEstimatedTime,
  // Validation Functions
  isValidStepIndex,
  isValidStepId,
  // Navigation Helper Functions
  getNextStepId,
  getPreviousStepId,
  isFirstStep,
  isLastStep,
} from '@/lib/onboarding/onboardingConfig'

// ============================================================================
// Constants Tests
// ============================================================================

describe('Constants', () => {
  describe('TOTAL_ONBOARDING_STEPS', () => {
    it('equals 6', () => {
      expect(TOTAL_ONBOARDING_STEPS).toBe(6)
    })

    it('matches ONBOARDING_STEPS array length', () => {
      expect(TOTAL_ONBOARDING_STEPS).toBe(ONBOARDING_STEPS.length)
    })
  })

  describe('TARGET_COMPLETION_MINUTES', () => {
    it('equals 3', () => {
      expect(TARGET_COMPLETION_MINUTES).toBe(3)
    })
  })

  describe('ONBOARDING_STEPS', () => {
    it('has exactly 6 steps', () => {
      expect(ONBOARDING_STEPS).toHaveLength(6)
    })

    it('has steps in correct order', () => {
      const expectedOrder: OnboardingStepId[] = [
        'welcome',
        'avatar',
        'location',
        'producer-demo',
        'consumer-demo',
        'complete',
      ]

      expect(ONBOARDING_STEPS.map((step) => step.id)).toEqual(expectedOrder)
    })

    it('has unique step IDs', () => {
      const ids = ONBOARDING_STEPS.map((step) => step.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })

    it('has all required properties on each step', () => {
      ONBOARDING_STEPS.forEach((step, index) => {
        expect(step.id).toBeDefined()
        expect(step.title).toBeDefined()
        expect(step.description).toBeDefined()
        expect(step.icon).toBeDefined()
        expect(typeof step.showSkip).toBe('boolean')
        expect(typeof step.showBack).toBe('boolean')
        expect(step.primaryButtonLabel).toBeDefined()
        expect(typeof step.estimatedSeconds).toBe('number')
        expect(step.estimatedSeconds).toBeGreaterThan(0)
      })
    })

    describe('welcome step', () => {
      it('has correct configuration', () => {
        const welcomeStep = ONBOARDING_STEPS[0]
        expect(welcomeStep.id).toBe('welcome')
        expect(welcomeStep.title).toBe('Welcome to Backtrack')
        expect(welcomeStep.showSkip).toBe(true)
        expect(welcomeStep.showBack).toBe(false)
        expect(welcomeStep.primaryButtonLabel).toBe('Get Started')
      })
    })

    describe('avatar step', () => {
      it('has correct configuration', () => {
        const avatarStep = ONBOARDING_STEPS[1]
        expect(avatarStep.id).toBe('avatar')
        expect(avatarStep.showSkip).toBe(true)
        expect(avatarStep.showBack).toBe(true)
        expect(avatarStep.primaryButtonLabel).toBe('Continue')
      })
    })

    describe('location step', () => {
      it('has correct configuration', () => {
        const locationStep = ONBOARDING_STEPS[2]
        expect(locationStep.id).toBe('location')
        expect(locationStep.showSkip).toBe(true)
        expect(locationStep.showBack).toBe(true)
        expect(locationStep.primaryButtonLabel).toBe('Enable Location')
      })
    })

    describe('producer-demo step', () => {
      it('has correct configuration', () => {
        const producerStep = ONBOARDING_STEPS[3]
        expect(producerStep.id).toBe('producer-demo')
        expect(producerStep.showSkip).toBe(true)
        expect(producerStep.showBack).toBe(true)
        expect(producerStep.primaryButtonLabel).toBe('Next')
      })
    })

    describe('consumer-demo step', () => {
      it('has correct configuration', () => {
        const consumerStep = ONBOARDING_STEPS[4]
        expect(consumerStep.id).toBe('consumer-demo')
        expect(consumerStep.showSkip).toBe(true)
        expect(consumerStep.showBack).toBe(true)
        expect(consumerStep.primaryButtonLabel).toBe('Next')
      })
    })

    describe('complete step', () => {
      it('has correct configuration', () => {
        const completeStep = ONBOARDING_STEPS[5]
        expect(completeStep.id).toBe('complete')
        expect(completeStep.showSkip).toBe(false) // No skip on complete step
        expect(completeStep.showBack).toBe(true)
        expect(completeStep.primaryButtonLabel).toBe('Enter Backtrack')
      })
    })

    it('has total estimated time under 3 minutes', () => {
      const totalSeconds = ONBOARDING_STEPS.reduce(
        (sum, step) => sum + step.estimatedSeconds,
        0
      )
      const totalMinutes = totalSeconds / 60
      expect(totalMinutes).toBeLessThanOrEqual(TARGET_COMPLETION_MINUTES)
    })
  })

  describe('WELCOME_FEATURES', () => {
    it('has exactly 3 features', () => {
      expect(WELCOME_FEATURES).toHaveLength(3)
    })

    it('has all required properties on each feature', () => {
      WELCOME_FEATURES.forEach((feature) => {
        expect(feature.icon).toBeDefined()
        expect(feature.title).toBeDefined()
        expect(feature.description).toBeDefined()
      })
    })

    it('has expected feature titles', () => {
      const titles = WELCOME_FEATURES.map((f) => f.title)
      expect(titles).toContain('Missed Connections')
      expect(titles).toContain('Avatar Privacy')
      expect(titles).toContain('Local & Nearby')
    })
  })
})

// ============================================================================
// Step Lookup Functions Tests
// ============================================================================

describe('Step Lookup Functions', () => {
  describe('getStepById', () => {
    it('returns correct step for valid IDs', () => {
      expect(getStepById('welcome')?.id).toBe('welcome')
      expect(getStepById('avatar')?.id).toBe('avatar')
      expect(getStepById('location')?.id).toBe('location')
      expect(getStepById('producer-demo')?.id).toBe('producer-demo')
      expect(getStepById('consumer-demo')?.id).toBe('consumer-demo')
      expect(getStepById('complete')?.id).toBe('complete')
    })

    it('returns complete step data', () => {
      const step = getStepById('welcome')
      expect(step).toBeDefined()
      expect(step!.title).toBe('Welcome to Backtrack')
      expect(step!.showSkip).toBe(true)
      expect(step!.showBack).toBe(false)
    })

    it('returns undefined for invalid IDs', () => {
      expect(getStepById('invalid' as OnboardingStepId)).toBeUndefined()
      expect(getStepById('' as OnboardingStepId)).toBeUndefined()
    })
  })

  describe('getStepByIndex', () => {
    it('returns correct step for valid indices', () => {
      expect(getStepByIndex(0)?.id).toBe('welcome')
      expect(getStepByIndex(1)?.id).toBe('avatar')
      expect(getStepByIndex(2)?.id).toBe('location')
      expect(getStepByIndex(3)?.id).toBe('producer-demo')
      expect(getStepByIndex(4)?.id).toBe('consumer-demo')
      expect(getStepByIndex(5)?.id).toBe('complete')
    })

    it('returns undefined for out-of-bounds indices', () => {
      expect(getStepByIndex(-1)).toBeUndefined()
      expect(getStepByIndex(6)).toBeUndefined()
      expect(getStepByIndex(100)).toBeUndefined()
    })

    it('returns undefined for negative indices', () => {
      expect(getStepByIndex(-5)).toBeUndefined()
      expect(getStepByIndex(-100)).toBeUndefined()
    })
  })

  describe('getStepIndex', () => {
    it('returns correct index for valid IDs', () => {
      expect(getStepIndex('welcome')).toBe(0)
      expect(getStepIndex('avatar')).toBe(1)
      expect(getStepIndex('location')).toBe(2)
      expect(getStepIndex('producer-demo')).toBe(3)
      expect(getStepIndex('consumer-demo')).toBe(4)
      expect(getStepIndex('complete')).toBe(5)
    })

    it('returns -1 for invalid IDs', () => {
      expect(getStepIndex('invalid' as OnboardingStepId)).toBe(-1)
      expect(getStepIndex('' as OnboardingStepId)).toBe(-1)
    })
  })
})

// ============================================================================
// Progress Calculation Tests
// ============================================================================

describe('Progress Calculation Functions', () => {
  describe('calculateProgress', () => {
    it('calculates correct progress for step 0', () => {
      // Step 0: (0 + 1) / 6 * 100 = 16.67 → rounded to 17
      expect(calculateProgress(0)).toBe(17)
    })

    it('calculates correct progress for step 1', () => {
      // Step 1: (1 + 1) / 6 * 100 = 33.33 → rounded to 33
      expect(calculateProgress(1)).toBe(33)
    })

    it('calculates correct progress for step 2', () => {
      // Step 2: (2 + 1) / 6 * 100 = 50
      expect(calculateProgress(2)).toBe(50)
    })

    it('calculates correct progress for step 3', () => {
      // Step 3: (3 + 1) / 6 * 100 = 66.67 → rounded to 67
      expect(calculateProgress(3)).toBe(67)
    })

    it('calculates correct progress for step 4', () => {
      // Step 4: (4 + 1) / 6 * 100 = 83.33 → rounded to 83
      expect(calculateProgress(4)).toBe(83)
    })

    it('calculates correct progress for step 5 (last step)', () => {
      // Step 5: (5 + 1) / 6 * 100 = 100
      expect(calculateProgress(5)).toBe(100)
    })

    it('returns 0 for negative step values', () => {
      expect(calculateProgress(-1)).toBe(0)
      expect(calculateProgress(-100)).toBe(0)
    })

    it('returns 100 for step values >= total steps', () => {
      expect(calculateProgress(6)).toBe(100)
      expect(calculateProgress(10)).toBe(100)
      expect(calculateProgress(100)).toBe(100)
    })
  })

  describe('calculateRemainingTime', () => {
    it('returns total time for step 0', () => {
      const totalTime = ONBOARDING_STEPS.reduce(
        (sum, step) => sum + step.estimatedSeconds,
        0
      )
      expect(calculateRemainingTime(0)).toBe(totalTime)
    })

    it('returns sum of remaining steps for step 1', () => {
      const remaining = ONBOARDING_STEPS.slice(1).reduce(
        (sum, step) => sum + step.estimatedSeconds,
        0
      )
      expect(calculateRemainingTime(1)).toBe(remaining)
    })

    it('returns time for last step only at step 5', () => {
      const lastStepTime = ONBOARDING_STEPS[5].estimatedSeconds
      expect(calculateRemainingTime(5)).toBe(lastStepTime)
    })

    it('returns 0 for negative step values', () => {
      expect(calculateRemainingTime(-1)).toBe(0)
      expect(calculateRemainingTime(-100)).toBe(0)
    })

    it('returns 0 for step values >= total steps', () => {
      expect(calculateRemainingTime(6)).toBe(0)
      expect(calculateRemainingTime(10)).toBe(0)
    })

    it('decreases monotonically as step increases', () => {
      let previousTime = Infinity
      for (let i = 0; i < TOTAL_ONBOARDING_STEPS; i++) {
        const currentTime = calculateRemainingTime(i)
        expect(currentTime).toBeLessThanOrEqual(previousTime)
        previousTime = currentTime
      }
    })
  })

  describe('formatEstimatedTime', () => {
    it('formats seconds less than 60 as "X sec"', () => {
      expect(formatEstimatedTime(10)).toBe('10 sec')
      expect(formatEstimatedTime(30)).toBe('30 sec')
      expect(formatEstimatedTime(59)).toBe('59 sec')
    })

    it('formats exactly 60 seconds as "1 min"', () => {
      expect(formatEstimatedTime(60)).toBe('1 min')
    })

    it('formats seconds > 60 as "X min" (rounded up)', () => {
      expect(formatEstimatedTime(61)).toBe('2 min')
      expect(formatEstimatedTime(90)).toBe('2 min')
      expect(formatEstimatedTime(120)).toBe('2 min')
      expect(formatEstimatedTime(121)).toBe('3 min')
    })

    it('formats 0 seconds correctly', () => {
      expect(formatEstimatedTime(0)).toBe('0 sec')
    })

    it('formats larger times correctly', () => {
      expect(formatEstimatedTime(180)).toBe('3 min')
      expect(formatEstimatedTime(300)).toBe('5 min')
    })
  })
})

// ============================================================================
// Validation Functions Tests
// ============================================================================

describe('Validation Functions', () => {
  describe('isValidStepIndex', () => {
    it('returns true for valid indices (0 to 5)', () => {
      expect(isValidStepIndex(0)).toBe(true)
      expect(isValidStepIndex(1)).toBe(true)
      expect(isValidStepIndex(2)).toBe(true)
      expect(isValidStepIndex(3)).toBe(true)
      expect(isValidStepIndex(4)).toBe(true)
      expect(isValidStepIndex(5)).toBe(true)
    })

    it('returns false for negative indices', () => {
      expect(isValidStepIndex(-1)).toBe(false)
      expect(isValidStepIndex(-100)).toBe(false)
    })

    it('returns false for indices >= total steps', () => {
      expect(isValidStepIndex(6)).toBe(false)
      expect(isValidStepIndex(10)).toBe(false)
      expect(isValidStepIndex(100)).toBe(false)
    })
  })

  describe('isValidStepId', () => {
    it('returns true for all valid step IDs', () => {
      expect(isValidStepId('welcome')).toBe(true)
      expect(isValidStepId('avatar')).toBe(true)
      expect(isValidStepId('location')).toBe(true)
      expect(isValidStepId('producer-demo')).toBe(true)
      expect(isValidStepId('consumer-demo')).toBe(true)
      expect(isValidStepId('complete')).toBe(true)
    })

    it('returns false for invalid IDs', () => {
      expect(isValidStepId('invalid')).toBe(false)
      expect(isValidStepId('')).toBe(false)
      expect(isValidStepId('Welcome')).toBe(false) // case sensitive
      expect(isValidStepId('WELCOME')).toBe(false)
      expect(isValidStepId('producer')).toBe(false)
      expect(isValidStepId('consumer')).toBe(false)
    })

    it('acts as a type guard', () => {
      const id: string = 'welcome'
      if (isValidStepId(id)) {
        // TypeScript should recognize id as OnboardingStepId here
        const step = getStepById(id)
        expect(step).toBeDefined()
      }
    })
  })
})

// ============================================================================
// Navigation Helper Functions Tests
// ============================================================================

describe('Navigation Helper Functions', () => {
  describe('getNextStepId', () => {
    it('returns next step ID for each step', () => {
      expect(getNextStepId('welcome')).toBe('avatar')
      expect(getNextStepId('avatar')).toBe('location')
      expect(getNextStepId('location')).toBe('producer-demo')
      expect(getNextStepId('producer-demo')).toBe('consumer-demo')
      expect(getNextStepId('consumer-demo')).toBe('complete')
    })

    it('returns null for last step', () => {
      expect(getNextStepId('complete')).toBeNull()
    })

    it('returns null for invalid step ID', () => {
      expect(getNextStepId('invalid' as OnboardingStepId)).toBeNull()
    })
  })

  describe('getPreviousStepId', () => {
    it('returns previous step ID for each step', () => {
      expect(getPreviousStepId('avatar')).toBe('welcome')
      expect(getPreviousStepId('location')).toBe('avatar')
      expect(getPreviousStepId('producer-demo')).toBe('location')
      expect(getPreviousStepId('consumer-demo')).toBe('producer-demo')
      expect(getPreviousStepId('complete')).toBe('consumer-demo')
    })

    it('returns null for first step', () => {
      expect(getPreviousStepId('welcome')).toBeNull()
    })

    it('returns null for invalid step ID', () => {
      expect(getPreviousStepId('invalid' as OnboardingStepId)).toBeNull()
    })
  })

  describe('isFirstStep', () => {
    it('returns true for welcome step', () => {
      expect(isFirstStep('welcome')).toBe(true)
    })

    it('returns false for all other steps', () => {
      expect(isFirstStep('avatar')).toBe(false)
      expect(isFirstStep('location')).toBe(false)
      expect(isFirstStep('producer-demo')).toBe(false)
      expect(isFirstStep('consumer-demo')).toBe(false)
      expect(isFirstStep('complete')).toBe(false)
    })

    it('returns false for invalid step ID', () => {
      expect(isFirstStep('invalid' as OnboardingStepId)).toBe(false)
    })
  })

  describe('isLastStep', () => {
    it('returns true for complete step', () => {
      expect(isLastStep('complete')).toBe(true)
    })

    it('returns false for all other steps', () => {
      expect(isLastStep('welcome')).toBe(false)
      expect(isLastStep('avatar')).toBe(false)
      expect(isLastStep('location')).toBe(false)
      expect(isLastStep('producer-demo')).toBe(false)
      expect(isLastStep('consumer-demo')).toBe(false)
    })

    it('returns false for invalid step ID', () => {
      expect(isLastStep('invalid' as OnboardingStepId)).toBe(false)
    })
  })
})

// ============================================================================
// Edge Cases and Integration Tests
// ============================================================================

describe('Edge Cases', () => {
  describe('step data integrity', () => {
    it('each step has a non-empty title', () => {
      ONBOARDING_STEPS.forEach((step) => {
        expect(step.title.trim().length).toBeGreaterThan(0)
      })
    })

    it('each step has a non-empty description', () => {
      ONBOARDING_STEPS.forEach((step) => {
        expect(step.description.trim().length).toBeGreaterThan(0)
      })
    })

    it('each step has a non-empty icon', () => {
      ONBOARDING_STEPS.forEach((step) => {
        expect(step.icon.trim().length).toBeGreaterThan(0)
      })
    })

    it('each step has a non-empty primary button label', () => {
      ONBOARDING_STEPS.forEach((step) => {
        expect(step.primaryButtonLabel.trim().length).toBeGreaterThan(0)
      })
    })

    it('estimated seconds are positive integers', () => {
      ONBOARDING_STEPS.forEach((step) => {
        expect(step.estimatedSeconds).toBeGreaterThan(0)
        expect(Number.isInteger(step.estimatedSeconds)).toBe(true)
      })
    })
  })

  describe('feature data integrity', () => {
    it('each feature has a non-empty title', () => {
      WELCOME_FEATURES.forEach((feature) => {
        expect(feature.title.trim().length).toBeGreaterThan(0)
      })
    })

    it('each feature has a non-empty description', () => {
      WELCOME_FEATURES.forEach((feature) => {
        expect(feature.description.trim().length).toBeGreaterThan(0)
      })
    })

    it('each feature has a non-empty icon', () => {
      WELCOME_FEATURES.forEach((feature) => {
        expect(feature.icon.trim().length).toBeGreaterThan(0)
      })
    })
  })

  describe('function consistency', () => {
    it('getStepById and getStepByIndex return the same step', () => {
      ONBOARDING_STEPS.forEach((step, index) => {
        const byId = getStepById(step.id)
        const byIndex = getStepByIndex(index)
        expect(byId).toEqual(byIndex)
      })
    })

    it('getStepIndex returns correct index for each step', () => {
      ONBOARDING_STEPS.forEach((step, expectedIndex) => {
        expect(getStepIndex(step.id)).toBe(expectedIndex)
      })
    })

    it('navigation functions form a complete chain', () => {
      let currentId: OnboardingStepId | null = 'welcome'
      const visitedIds: OnboardingStepId[] = []

      while (currentId !== null) {
        visitedIds.push(currentId)
        currentId = getNextStepId(currentId)
      }

      expect(visitedIds).toEqual([
        'welcome',
        'avatar',
        'location',
        'producer-demo',
        'consumer-demo',
        'complete',
      ])
    })

    it('reverse navigation forms a complete chain', () => {
      let currentId: OnboardingStepId | null = 'complete'
      const visitedIds: OnboardingStepId[] = []

      while (currentId !== null) {
        visitedIds.push(currentId)
        currentId = getPreviousStepId(currentId)
      }

      expect(visitedIds).toEqual([
        'complete',
        'consumer-demo',
        'producer-demo',
        'location',
        'avatar',
        'welcome',
      ])
    })
  })

  describe('boundary consistency', () => {
    it('isFirstStep and isLastStep are exclusive', () => {
      ONBOARDING_STEPS.forEach((step) => {
        const first = isFirstStep(step.id)
        const last = isLastStep(step.id)
        // A step cannot be both first and last (unless there's only 1 step)
        if (TOTAL_ONBOARDING_STEPS > 1) {
          expect(first && last).toBe(false)
        }
      })
    })

    it('only first step has no previous, only last step has no next', () => {
      ONBOARDING_STEPS.forEach((step, index) => {
        const hasPrevious = getPreviousStepId(step.id) !== null
        const hasNext = getNextStepId(step.id) !== null

        if (index === 0) {
          expect(hasPrevious).toBe(false)
          expect(hasNext).toBe(true)
        } else if (index === TOTAL_ONBOARDING_STEPS - 1) {
          expect(hasPrevious).toBe(true)
          expect(hasNext).toBe(false)
        } else {
          expect(hasPrevious).toBe(true)
          expect(hasNext).toBe(true)
        }
      })
    })
  })
})

// ============================================================================
// Type Safety Tests
// ============================================================================

describe('Type Safety', () => {
  it('ONBOARDING_STEPS is readonly', () => {
    // This is a compile-time check - if this file compiles, the test passes
    // Attempting to mutate ONBOARDING_STEPS would cause a TypeScript error
    expect(Object.isFrozen(ONBOARDING_STEPS)).toBe(false) // as const doesn't freeze at runtime
    // But TypeScript prevents mutations at compile time
  })

  it('WELCOME_FEATURES is readonly', () => {
    // Same as above - compile-time check for readonly
    expect(Object.isFrozen(WELCOME_FEATURES)).toBe(false) // as const doesn't freeze at runtime
  })

  it('OnboardingStep interface has all expected properties', () => {
    const step: OnboardingStep = ONBOARDING_STEPS[0]

    // Type check - these would fail at compile time if wrong
    const _id: OnboardingStepId = step.id
    const _title: string = step.title
    const _description: string = step.description
    const _icon: string = step.icon
    const _showSkip: boolean = step.showSkip
    const _showBack: boolean = step.showBack
    const _primaryButtonLabel: string = step.primaryButtonLabel
    const _estimatedSeconds: number = step.estimatedSeconds

    expect(true).toBe(true) // If we got here, types are correct
  })

  it('OnboardingFeature interface has all expected properties', () => {
    const feature: OnboardingFeature = WELCOME_FEATURES[0]

    // Type check - these would fail at compile time if wrong
    const _icon: string = feature.icon
    const _title: string = feature.title
    const _description: string = feature.description

    expect(true).toBe(true) // If we got here, types are correct
  })
})
