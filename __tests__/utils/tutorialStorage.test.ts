/**
 * @vitest-environment jsdom
 */

/**
 * Unit tests for tutorialStorage utility
 *
 * Tests the tutorial storage utility including:
 * - Key naming convention verification (@Backtrack_tutorial_completed_<feature>)
 * - Storage value format verification ({ completed: boolean, timestamp: number })
 * - Save/load operations
 * - Clear operations (single and all)
 * - Error handling and fail-safe behavior
 * - All tutorial feature types
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// ============================================================================
// Mock Setup
// ============================================================================

// Mock AsyncStorage - must be defined inline with vi.mock due to hoisting
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    multiGet: vi.fn(),
    multiRemove: vi.fn(),
  },
}))

// Get reference to mocked module for test assertions
import AsyncStorage from '@react-native-async-storage/async-storage'
const mockAsyncStorage = AsyncStorage as unknown as {
  getItem: ReturnType<typeof vi.fn>
  setItem: ReturnType<typeof vi.fn>
  removeItem: ReturnType<typeof vi.fn>
  multiGet: ReturnType<typeof vi.fn>
  multiRemove: ReturnType<typeof vi.fn>
}

// Import after mocking
import {
  saveTutorialCompletion,
  getTutorialCompletion,
  isTutorialCompleted,
  clearTutorialCompletion,
  clearAllTutorialCompletions,
  getAllTutorialCompletions,
  getTutorialStorageKey,
  isValidTutorialFeature,
  TUTORIAL_KEY_PREFIX,
  TUTORIAL_FEATURES,
  TUTORIAL_FEATURE_LABELS,
  TUTORIAL_STORAGE_ERRORS,
  type TutorialFeature,
  type TutorialCompletionData,
} from '../../utils/tutorialStorage'

// ============================================================================
// Test Constants
// ============================================================================

const EXPECTED_KEY_PREFIX = '@Backtrack_tutorial_completed_'

const ALL_FEATURES: TutorialFeature[] = [
  'post_creation',
  'ledger_browsing',
  'selfie_verification',
  'messaging',
]

// ============================================================================
// Setup and Teardown
// ============================================================================

describe('tutorialStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementations
    mockAsyncStorage.setItem.mockResolvedValue(undefined)
    mockAsyncStorage.getItem.mockResolvedValue(null)
    mockAsyncStorage.removeItem.mockResolvedValue(undefined)
    mockAsyncStorage.multiGet.mockResolvedValue([])
    mockAsyncStorage.multiRemove.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ============================================================================
  // Key Naming Convention Tests
  // ============================================================================

  describe('key naming convention', () => {
    it('TUTORIAL_KEY_PREFIX matches spec: @Backtrack_tutorial_completed_', () => {
      expect(TUTORIAL_KEY_PREFIX).toBe(EXPECTED_KEY_PREFIX)
    })

    it('getTutorialStorageKey generates correct key for post_creation', () => {
      const key = getTutorialStorageKey('post_creation')
      expect(key).toBe('@Backtrack_tutorial_completed_post_creation')
    })

    it('getTutorialStorageKey generates correct key for ledger_browsing', () => {
      const key = getTutorialStorageKey('ledger_browsing')
      expect(key).toBe('@Backtrack_tutorial_completed_ledger_browsing')
    })

    it('getTutorialStorageKey generates correct key for selfie_verification', () => {
      const key = getTutorialStorageKey('selfie_verification')
      expect(key).toBe('@Backtrack_tutorial_completed_selfie_verification')
    })

    it('getTutorialStorageKey generates correct key for messaging', () => {
      const key = getTutorialStorageKey('messaging')
      expect(key).toBe('@Backtrack_tutorial_completed_messaging')
    })

    it('all feature keys follow the naming pattern', () => {
      ALL_FEATURES.forEach((feature) => {
        const key = getTutorialStorageKey(feature)
        expect(key).toBe(`${EXPECTED_KEY_PREFIX}${feature}`)
      })
    })
  })

  // ============================================================================
  // Feature Validation Tests
  // ============================================================================

  describe('feature validation', () => {
    it('TUTORIAL_FEATURES contains all 4 expected features', () => {
      expect(TUTORIAL_FEATURES).toEqual([
        'post_creation',
        'ledger_browsing',
        'selfie_verification',
        'messaging',
      ])
    })

    it('isValidTutorialFeature returns true for valid features', () => {
      ALL_FEATURES.forEach((feature) => {
        expect(isValidTutorialFeature(feature)).toBe(true)
      })
    })

    it('isValidTutorialFeature returns false for invalid features', () => {
      expect(isValidTutorialFeature('invalid_feature')).toBe(false)
      expect(isValidTutorialFeature('')).toBe(false)
      expect(isValidTutorialFeature('POST_CREATION')).toBe(false)
    })

    it('TUTORIAL_FEATURE_LABELS has labels for all features', () => {
      expect(TUTORIAL_FEATURE_LABELS.post_creation).toBe('Post Creation')
      expect(TUTORIAL_FEATURE_LABELS.ledger_browsing).toBe('Ledger Browsing')
      expect(TUTORIAL_FEATURE_LABELS.selfie_verification).toBe('Selfie Verification')
      expect(TUTORIAL_FEATURE_LABELS.messaging).toBe('Messaging')
    })
  })

  // ============================================================================
  // Save Tutorial Completion Tests
  // ============================================================================

  describe('saveTutorialCompletion', () => {
    it('saves completion data with correct key', async () => {
      await saveTutorialCompletion('post_creation')

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@Backtrack_tutorial_completed_post_creation',
        expect.any(String)
      )
    })

    it('saves data in correct JSON format with completed=true and timestamp', async () => {
      const beforeTime = Date.now()

      await saveTutorialCompletion('post_creation')

      const afterTime = Date.now()

      const savedValue = JSON.parse(mockAsyncStorage.setItem.mock.calls[0][1])

      expect(savedValue.completed).toBe(true)
      expect(savedValue.timestamp).toBeGreaterThanOrEqual(beforeTime)
      expect(savedValue.timestamp).toBeLessThanOrEqual(afterTime)
    })

    it('returns success result on successful save', async () => {
      const result = await saveTutorialCompletion('post_creation')

      expect(result.success).toBe(true)
      expect(result.error).toBeNull()
    })

    it('returns error result on AsyncStorage failure', async () => {
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage quota exceeded'))

      const result = await saveTutorialCompletion('post_creation')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Storage quota exceeded')
    })

    it('works for all feature types', async () => {
      for (const feature of ALL_FEATURES) {
        mockAsyncStorage.setItem.mockClear()

        const result = await saveTutorialCompletion(feature)

        expect(result.success).toBe(true)
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
          `${EXPECTED_KEY_PREFIX}${feature}`,
          expect.any(String)
        )
      }
    })
  })

  // ============================================================================
  // Get Tutorial Completion Tests
  // ============================================================================

  describe('getTutorialCompletion', () => {
    it('returns completed=false when no data exists', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null)

      const result = await getTutorialCompletion('post_creation')

      expect(result.success).toBe(true)
      expect(result.completed).toBe(false)
      expect(result.data).toBeNull()
    })

    it('returns completed=true when completion data exists', async () => {
      const storedData: TutorialCompletionData = {
        completed: true,
        timestamp: Date.now(),
      }
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedData))

      const result = await getTutorialCompletion('post_creation')

      expect(result.success).toBe(true)
      expect(result.completed).toBe(true)
      expect(result.data).toEqual(storedData)
    })

    it('calls getItem with correct key', async () => {
      await getTutorialCompletion('ledger_browsing')

      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith(
        '@Backtrack_tutorial_completed_ledger_browsing'
      )
    })

    it('returns error result on AsyncStorage failure (fail-safe)', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage unavailable'))

      const result = await getTutorialCompletion('post_creation')

      expect(result.success).toBe(false)
      expect(result.completed).toBeNull()
      expect(result.error).toContain('Storage unavailable')
    })

    it('returns error result on parse failure (fail-safe)', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('invalid json{')

      const result = await getTutorialCompletion('post_creation')

      expect(result.success).toBe(false)
      expect(result.completed).toBeNull()
    })
  })

  // ============================================================================
  // Is Tutorial Completed Tests
  // ============================================================================

  describe('isTutorialCompleted', () => {
    it('returns false when no data exists', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null)

      const completed = await isTutorialCompleted('post_creation')

      expect(completed).toBe(false)
    })

    it('returns true when completion data exists', async () => {
      const storedData: TutorialCompletionData = {
        completed: true,
        timestamp: Date.now(),
      }
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedData))

      const completed = await isTutorialCompleted('post_creation')

      expect(completed).toBe(true)
    })

    it('returns false on storage error (fail-safe behavior)', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'))

      const completed = await isTutorialCompleted('post_creation')

      expect(completed).toBe(false)
    })

    it('returns false on parse error (fail-safe behavior)', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('bad json')

      const completed = await isTutorialCompleted('post_creation')

      expect(completed).toBe(false)
    })
  })

  // ============================================================================
  // Clear Tutorial Completion Tests
  // ============================================================================

  describe('clearTutorialCompletion', () => {
    it('removes item with correct key', async () => {
      await clearTutorialCompletion('post_creation')

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
        '@Backtrack_tutorial_completed_post_creation'
      )
    })

    it('returns success result on successful clear', async () => {
      const result = await clearTutorialCompletion('post_creation')

      expect(result.success).toBe(true)
      expect(result.error).toBeNull()
    })

    it('returns error result on AsyncStorage failure', async () => {
      mockAsyncStorage.removeItem.mockRejectedValue(new Error('Remove failed'))

      const result = await clearTutorialCompletion('post_creation')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Remove failed')
    })

    it('works for all feature types', async () => {
      for (const feature of ALL_FEATURES) {
        mockAsyncStorage.removeItem.mockClear()

        const result = await clearTutorialCompletion(feature)

        expect(result.success).toBe(true)
        expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
          `${EXPECTED_KEY_PREFIX}${feature}`
        )
      }
    })
  })

  // ============================================================================
  // Clear All Tutorial Completions Tests
  // ============================================================================

  describe('clearAllTutorialCompletions', () => {
    it('removes all 4 feature keys', async () => {
      await clearAllTutorialCompletions()

      expect(mockAsyncStorage.multiRemove).toHaveBeenCalledWith([
        '@Backtrack_tutorial_completed_post_creation',
        '@Backtrack_tutorial_completed_ledger_browsing',
        '@Backtrack_tutorial_completed_selfie_verification',
        '@Backtrack_tutorial_completed_messaging',
      ])
    })

    it('returns success result on successful clear', async () => {
      const result = await clearAllTutorialCompletions()

      expect(result.success).toBe(true)
      expect(result.error).toBeNull()
    })

    it('returns error result on AsyncStorage failure', async () => {
      mockAsyncStorage.multiRemove.mockRejectedValue(new Error('Multi-remove failed'))

      const result = await clearAllTutorialCompletions()

      expect(result.success).toBe(false)
      expect(result.error).toContain('Multi-remove failed')
    })
  })

  // ============================================================================
  // Get All Tutorial Completions Tests
  // ============================================================================

  describe('getAllTutorialCompletions', () => {
    it('returns all features as false when no data exists', async () => {
      mockAsyncStorage.multiGet.mockResolvedValue([
        ['@Backtrack_tutorial_completed_post_creation', null],
        ['@Backtrack_tutorial_completed_ledger_browsing', null],
        ['@Backtrack_tutorial_completed_selfie_verification', null],
        ['@Backtrack_tutorial_completed_messaging', null],
      ])

      const result = await getAllTutorialCompletions()

      expect(result).toEqual({
        post_creation: false,
        ledger_browsing: false,
        selfie_verification: false,
        messaging: false,
      })
    })

    it('returns correct completion status for each feature', async () => {
      mockAsyncStorage.multiGet.mockResolvedValue([
        [
          '@Backtrack_tutorial_completed_post_creation',
          JSON.stringify({ completed: true, timestamp: 123 }),
        ],
        ['@Backtrack_tutorial_completed_ledger_browsing', null],
        [
          '@Backtrack_tutorial_completed_selfie_verification',
          JSON.stringify({ completed: true, timestamp: 456 }),
        ],
        ['@Backtrack_tutorial_completed_messaging', null],
      ])

      const result = await getAllTutorialCompletions()

      expect(result).toEqual({
        post_creation: true,
        ledger_browsing: false,
        selfie_verification: true,
        messaging: false,
      })
    })

    it('returns all false on storage error (fail-safe)', async () => {
      mockAsyncStorage.multiGet.mockRejectedValue(new Error('Storage error'))

      const result = await getAllTutorialCompletions()

      expect(result).toEqual({
        post_creation: false,
        ledger_browsing: false,
        selfie_verification: false,
        messaging: false,
      })
    })

    it('handles parse errors for individual items gracefully', async () => {
      mockAsyncStorage.multiGet.mockResolvedValue([
        ['@Backtrack_tutorial_completed_post_creation', 'invalid json'],
        [
          '@Backtrack_tutorial_completed_ledger_browsing',
          JSON.stringify({ completed: true, timestamp: 123 }),
        ],
        ['@Backtrack_tutorial_completed_selfie_verification', null],
        ['@Backtrack_tutorial_completed_messaging', null],
      ])

      const result = await getAllTutorialCompletions()

      // post_creation should be false due to parse error, ledger_browsing should be true
      expect(result.post_creation).toBe(false)
      expect(result.ledger_browsing).toBe(true)
    })
  })

  // ============================================================================
  // Persistence Verification Tests (for subtask-7-2)
  // ============================================================================

  describe('persistence verification', () => {
    it('save then get returns consistent data', async () => {
      // Simulate save
      let savedValue: string | null = null
      mockAsyncStorage.setItem.mockImplementation(async (key, value) => {
        savedValue = value
      })
      mockAsyncStorage.getItem.mockImplementation(async () => savedValue)

      await saveTutorialCompletion('post_creation')
      const result = await getTutorialCompletion('post_creation')

      expect(result.success).toBe(true)
      expect(result.completed).toBe(true)
      expect(result.data?.completed).toBe(true)
      expect(result.data?.timestamp).toBeGreaterThan(0)
    })

    it('clear then get returns not completed', async () => {
      // First simulate existing data
      let savedValue: string | null = JSON.stringify({ completed: true, timestamp: Date.now() })
      mockAsyncStorage.getItem.mockImplementation(async () => savedValue)
      mockAsyncStorage.removeItem.mockImplementation(async () => {
        savedValue = null
      })

      // Verify data exists
      const beforeClear = await isTutorialCompleted('post_creation')
      expect(beforeClear).toBe(true)

      // Clear and verify
      await clearTutorialCompletion('post_creation')
      const afterClear = await isTutorialCompleted('post_creation')
      expect(afterClear).toBe(false)
    })

    it('each feature is stored independently', async () => {
      const storage: Record<string, string | null> = {}

      mockAsyncStorage.setItem.mockImplementation(async (key, value) => {
        storage[key] = value
      })
      mockAsyncStorage.getItem.mockImplementation(async (key) => storage[key] || null)

      // Save different features
      await saveTutorialCompletion('post_creation')
      await saveTutorialCompletion('messaging')

      // Verify each has its own key
      expect(storage['@Backtrack_tutorial_completed_post_creation']).toBeDefined()
      expect(storage['@Backtrack_tutorial_completed_messaging']).toBeDefined()
      expect(storage['@Backtrack_tutorial_completed_ledger_browsing']).toBeUndefined()
      expect(storage['@Backtrack_tutorial_completed_selfie_verification']).toBeUndefined()

      // Verify independent retrieval
      const postResult = await isTutorialCompleted('post_creation')
      const messagingResult = await isTutorialCompleted('messaging')
      const ledgerResult = await isTutorialCompleted('ledger_browsing')

      expect(postResult).toBe(true)
      expect(messagingResult).toBe(true)
      expect(ledgerResult).toBe(false)
    })

    it('data format matches spec: { completed: boolean, timestamp: number }', async () => {
      await saveTutorialCompletion('post_creation')

      const savedJson = mockAsyncStorage.setItem.mock.calls[0][1]
      const parsedData = JSON.parse(savedJson)

      // Verify structure
      expect(Object.keys(parsedData)).toHaveLength(2)
      expect(parsedData).toHaveProperty('completed')
      expect(parsedData).toHaveProperty('timestamp')

      // Verify types
      expect(typeof parsedData.completed).toBe('boolean')
      expect(typeof parsedData.timestamp).toBe('number')
    })
  })

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('error handling', () => {
    it('TUTORIAL_STORAGE_ERRORS has all expected error messages', () => {
      expect(TUTORIAL_STORAGE_ERRORS.SAVE_FAILED).toBeDefined()
      expect(TUTORIAL_STORAGE_ERRORS.LOAD_FAILED).toBeDefined()
      expect(TUTORIAL_STORAGE_ERRORS.CLEAR_FAILED).toBeDefined()
      expect(TUTORIAL_STORAGE_ERRORS.INVALID_FEATURE).toBeDefined()
      expect(TUTORIAL_STORAGE_ERRORS.PARSE_ERROR).toBeDefined()
    })

    it('handles non-Error exceptions during save', async () => {
      mockAsyncStorage.setItem.mockRejectedValue('string error')

      const result = await saveTutorialCompletion('post_creation')

      expect(result.success).toBe(false)
      expect(result.error).toBe(TUTORIAL_STORAGE_ERRORS.SAVE_FAILED)
    })

    it('handles non-Error exceptions during get', async () => {
      mockAsyncStorage.getItem.mockRejectedValue('string error')

      const result = await getTutorialCompletion('post_creation')

      expect(result.success).toBe(false)
      expect(result.error).toBe(TUTORIAL_STORAGE_ERRORS.LOAD_FAILED)
    })

    it('handles non-Error exceptions during clear', async () => {
      mockAsyncStorage.removeItem.mockRejectedValue('string error')

      const result = await clearTutorialCompletion('post_creation')

      expect(result.success).toBe(false)
      expect(result.error).toBe(TUTORIAL_STORAGE_ERRORS.CLEAR_FAILED)
    })

    it('handles non-Error exceptions during clearAll', async () => {
      mockAsyncStorage.multiRemove.mockRejectedValue('string error')

      const result = await clearAllTutorialCompletions()

      expect(result.success).toBe(false)
      expect(result.error).toBe(TUTORIAL_STORAGE_ERRORS.CLEAR_FAILED)
    })
  })
})
