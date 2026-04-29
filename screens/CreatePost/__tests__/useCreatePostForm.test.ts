/**
 * Tests for useCreatePostForm Hook
 *
 * Tests the core form state management, validation, step navigation,
 * and submission logic for the CreatePost wizard.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { Alert } from 'react-native'

import { MIN_NOTE_LENGTH, MAX_NOTE_LENGTH } from '../types'
import {
  createMockAvatar,
  createMockLocation,
  generateTestUUID,
  resetUUIDCounter,
} from '../../../__tests__/utils/factories'

// ============================================================================
// MOCKS
// ============================================================================

// Mock react-native-bitmoji (has Flow types that break vitest)
vi.mock('react-native-bitmoji', () => ({
  AvatarBuilderModal: vi.fn(),
  AvatarDisplay: vi.fn(),
}))

// Mock @react-navigation/native
vi.mock('@react-navigation/native', () => ({
  useNavigation: vi.fn(),
  useRoute: vi.fn(),
  useFocusEffect: vi.fn(),
}))

// Mock expo-location
vi.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: vi.fn(),
  getCurrentPositionAsync: vi.fn(),
}))

// Mock Supabase
const mockSupabaseFrom = vi.fn()

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
  },
}))

// Mock AuthContext
const mockUserId = 'test-user-id'
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ userId: mockUserId }),
}))

// Mock useLocation
const mockLatitude = 40.7128
const mockLongitude = -74.006
vi.mock('../../../hooks/useLocation', () => ({
  useLocation: () => ({
    latitude: mockLatitude,
    longitude: mockLongitude,
    loading: false,
  }),
}))

// Mock useNearbyLocations
const mockVisitedLocations = [
  createMockLocation({ id: 'visited-1', name: 'Recent Cafe' }),
]
vi.mock('../../../hooks/useNearbyLocations', () => ({
  useVisitedLocations: () => ({
    locations: mockVisitedLocations,
    isLoading: false,
    refetch: vi.fn(),
  }),
  useNearbyLocations: () => ({
    locations: [],
  }),
}))

// Mock recordLocationVisit
vi.mock('../../../lib/utils/geo', () => ({
  recordLocationVisit: vi.fn().mockResolvedValue({ data: {}, error: null }),
}))

// Mock analytics
vi.mock('../../../lib/analytics', () => ({
  trackEvent: vi.fn(),
  AnalyticsEvent: {
    POST_CREATED: 'post_created',
    POST_CREATION_ERROR: 'post_creation_error',
  },
}))

// Mock validateSightingDate
vi.mock('../../../utils/dateTime', () => ({
  validateSightingDate: (date: Date) => {
    const now = new Date()
    return { valid: date <= now, error: date > now ? 'Future date' : null }
  },
}))

// Mock Alert
vi.spyOn(Alert, 'alert')

// Import after mocks
import { useCreatePostForm } from '../useCreatePostForm'

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Create mock navigation and route options
 */
function createMockOptions(overrides?: any): any {
  return {
    navigation: {
      goBack: vi.fn(),
      replace: vi.fn(),
      navigate: vi.fn(),
    },
    route: {
      params: {},
    },
    ...overrides,
  }
}

/**
 * Create a mock location item
 */
function createMockLocationItem(overrides?: any): any {
  return {
    id: generateTestUUID(),
    name: 'Test Location',
    address: '123 Test St',
    latitude: 40.7128,
    longitude: -74.006,
    place_id: 'test-place-id',
    ...overrides,
  }
}

// ============================================================================
// TESTS
// ============================================================================

describe('useCreatePostForm', () => {
  beforeEach(() => {
    resetUUIDCounter()
    vi.clearAllMocks()

    // Setup default Supabase mock behavior
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'locations') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'new-location-id' },
                error: null,
              }),
            }),
          }),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: createMockLocation({ id: 'preset-location-id' }),
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'posts') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      }
      return {}
    })
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  // --------------------------------------------------------------------------
  // INITIAL STATE
  // --------------------------------------------------------------------------

  describe('Initial State', () => {
    it('should initialize with correct default values', () => {
      const options = createMockOptions()
      const { result } = renderHook(() => useCreatePostForm(options))

      expect(result.current.formData).toEqual({
        selectedPhotoId: null,
        targetAvatar: null,
        note: '',
        location: null,
        sightingDate: null,
        timeGranularity: null,
      })
      expect(result.current.currentStep).toBe('scene')
      expect(result.current.isSubmitting).toBe(false)
    })

    it('should start at scene step (index 0)', () => {
      const options = createMockOptions()
      const { result } = renderHook(() => useCreatePostForm(options))

      expect(result.current.currentStepIndex).toBe(0)
      expect(result.current.currentStep).toBe('scene')
    })

    it('should calculate initial progress correctly', () => {
      const options = createMockOptions()
      const { result } = renderHook(() => useCreatePostForm(options))

      // Progress = (currentStepIndex + 1) / totalSteps = 1/3 = 0.333...
      expect(result.current.progress).toBeCloseTo(1 / 3)
    })

    it('should expose user coordinates from useLocation', () => {
      const options = createMockOptions()
      const { result } = renderHook(() => useCreatePostForm(options))

      expect(result.current.userLatitude).toBe(mockLatitude)
      expect(result.current.userLongitude).toBe(mockLongitude)
    })

    it('should expose visited locations from useVisitedLocations', () => {
      const options = createMockOptions()
      const { result } = renderHook(() => useCreatePostForm(options))

      expect(result.current.visitedLocations).toEqual(mockVisitedLocations)
    })
  })

  // --------------------------------------------------------------------------
  // FORM STATE UPDATES
  // --------------------------------------------------------------------------

  describe('Form State Updates', () => {
    it('should update note text', () => {
      const options = createMockOptions()
      const { result } = renderHook(() => useCreatePostForm(options))

      act(() => {
        result.current.handleNoteChange('This is a test note')
      })

      expect(result.current.formData.note).toBe('This is a test note')
    })

    it('should enforce max note length', () => {
      const options = createMockOptions()
      const { result } = renderHook(() => useCreatePostForm(options))

      const longNote = 'a'.repeat(MAX_NOTE_LENGTH + 100)

      act(() => {
        result.current.handleNoteChange(longNote)
      })

      // Should not update if exceeds max length
      expect(result.current.formData.note).toBe('')
    })

    it('should allow note up to max length', () => {
      const options = createMockOptions()
      const { result } = renderHook(() => useCreatePostForm(options))

      const maxNote = 'a'.repeat(MAX_NOTE_LENGTH)

      act(() => {
        result.current.handleNoteChange(maxNote)
      })

      expect(result.current.formData.note).toBe(maxNote)
      expect(result.current.formData.note.length).toBe(MAX_NOTE_LENGTH)
    })

    it('should update selected photo ID', () => {
      const options = createMockOptions()
      const { result } = renderHook(() => useCreatePostForm(options))

      const photoId = 'test-photo-id'

      act(() => {
        result.current.handlePhotoSelect(photoId)
      })

      expect(result.current.formData.selectedPhotoId).toBe(photoId)
    })

    it('should update target avatar', () => {
      const options = createMockOptions()
      const { result } = renderHook(() => useCreatePostForm(options))

      const avatar = createMockAvatar()

      act(() => {
        result.current.handleAvatarChange(avatar)
      })

      expect(result.current.formData.targetAvatar).toEqual(avatar)
    })

    it('should update location', () => {
      const options = createMockOptions()
      const { result } = renderHook(() => useCreatePostForm(options))

      const location = createMockLocationItem()

      act(() => {
        result.current.handleLocationSelect(location)
      })

      expect(result.current.formData.location).toEqual(location)
    })

    it('should update sighting date', () => {
      const options = createMockOptions()
      const { result } = renderHook(() => useCreatePostForm(options))

      const date = new Date('2026-01-01T12:00:00Z')

      act(() => {
        result.current.handleSightingDateChange(date)
      })

      expect(result.current.formData.sightingDate).toEqual(date)
    })

    it('should update time granularity', () => {
      const options = createMockOptions()
      const { result } = renderHook(() => useCreatePostForm(options))

      act(() => {
        result.current.handleTimeGranularityChange('morning')
      })

      expect(result.current.formData.timeGranularity).toBe('morning')
    })

    it('should clear sighting date when set to null', () => {
      const options = createMockOptions()
      const { result } = renderHook(() => useCreatePostForm(options))

      act(() => {
        result.current.handleSightingDateChange(new Date())
      })
      expect(result.current.formData.sightingDate).not.toBeNull()

      act(() => {
        result.current.handleSightingDateChange(null)
      })

      expect(result.current.formData.sightingDate).toBeNull()
    })
  })

  // --------------------------------------------------------------------------
  // STEP NAVIGATION
  // --------------------------------------------------------------------------

  describe('Step Navigation', () => {
    it('should advance to next step', () => {
      const options = createMockOptions()
      const { result } = renderHook(() => useCreatePostForm(options))

      expect(result.current.currentStep).toBe('scene')

      act(() => {
        result.current.handleNext()
      })

      expect(result.current.currentStep).toBe('moment')
    })

    it('should go back to previous step', () => {
      const options = createMockOptions()
      const { result } = renderHook(() => useCreatePostForm(options))

      // Go to moment step first
      act(() => {
        result.current.handleNext()
      })
      expect(result.current.currentStep).toBe('moment')

      // Go back
      act(() => {
        result.current.handleBack()
      })

      expect(result.current.currentStep).toBe('scene')
    })

    it('should not advance beyond last step', () => {
      const options = createMockOptions()
      const { result } = renderHook(() => useCreatePostForm(options))

      // Navigate to last step
      act(() => {
        result.current.goToStep('seal')
      })
      expect(result.current.currentStep).toBe('seal')

      // Try to advance
      act(() => {
        result.current.handleNext()
      })

      // Should stay on seal step
      expect(result.current.currentStep).toBe('seal')
    })

    it('should show confirmation alert when going back from first step', () => {
      const mockGoBack = vi.fn()
      const options = createMockOptions({
        navigation: {
          goBack: mockGoBack,
        },
      })
      const { result } = renderHook(() => useCreatePostForm(options))

      act(() => {
        result.current.handleBack()
      })

      expect(Alert.alert).toHaveBeenCalledWith(
        'Discard Post?',
        'Are you sure you want to discard this post? All progress will be lost.',
        expect.any(Array)
      )
    })

    it('should allow jumping to specific step', () => {
      const options = createMockOptions()
      const { result } = renderHook(() => useCreatePostForm(options))

      act(() => {
        result.current.goToStep('seal')
      })

      expect(result.current.currentStep).toBe('seal')
      expect(result.current.currentStepIndex).toBe(2)
    })

    it('should update progress when navigating steps', () => {
      const options = createMockOptions()
      const { result } = renderHook(() => useCreatePostForm(options))

      // Step 1: progress = 1/3
      expect(result.current.progress).toBeCloseTo(1 / 3)

      act(() => {
        result.current.handleNext()
      })

      // Step 2: progress = 2/3
      expect(result.current.progress).toBeCloseTo(2 / 3)

      act(() => {
        result.current.handleNext()
      })

      // Step 3: progress = 3/3
      expect(result.current.progress).toBeCloseTo(1)
    })
  })

  // --------------------------------------------------------------------------
  // VALIDATION
  // --------------------------------------------------------------------------

  describe('Validation', () => {
    it('should validate scene step requires location', () => {
      const options = createMockOptions()
      const { result } = renderHook(() => useCreatePostForm(options))

      expect(result.current.currentStep).toBe('scene')
      expect(result.current.isCurrentStepValid).toBe(false)

      act(() => {
        result.current.handleLocationSelect(createMockLocationItem())
      })

      expect(result.current.isCurrentStepValid).toBe(true)
    })

    it('should validate scene step rejects future dates', () => {
      const options = createMockOptions()
      const { result } = renderHook(() => useCreatePostForm(options))

      act(() => {
        result.current.handleLocationSelect(createMockLocationItem())
      })
      expect(result.current.isCurrentStepValid).toBe(true)

      // Set future date
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 1)

      act(() => {
        result.current.handleSightingDateChange(futureDate)
      })

      expect(result.current.isCurrentStepValid).toBe(false)
    })

    it('should validate moment step requires avatar and min note length', () => {
      const options = createMockOptions()
      const { result } = renderHook(() => useCreatePostForm(options))

      act(() => {
        result.current.goToStep('moment')
      })

      expect(result.current.isCurrentStepValid).toBe(false)

      // Add avatar only
      act(() => {
        result.current.handleAvatarChange(createMockAvatar())
      })
      expect(result.current.isCurrentStepValid).toBe(false)

      // Add note too short
      act(() => {
        result.current.handleNoteChange('Hi')
      })
      expect(result.current.isCurrentStepValid).toBe(false)

      // Add note meeting min length
      act(() => {
        result.current.handleNoteChange('a'.repeat(MIN_NOTE_LENGTH))
      })
      expect(result.current.isCurrentStepValid).toBe(true)
    })

    it('should validate seal step requires all fields', () => {
      const options = createMockOptions()
      const { result } = renderHook(() => useCreatePostForm(options))

      act(() => {
        result.current.goToStep('seal')
      })

      expect(result.current.isCurrentStepValid).toBe(false)
      expect(result.current.isFormValid).toBe(false)

      // Add all required fields
      act(() => {
        result.current.handlePhotoSelect('photo-id')
        result.current.handleAvatarChange(createMockAvatar())
        result.current.handleNoteChange('Valid note text here')
        result.current.handleLocationSelect(createMockLocationItem())
      })

      expect(result.current.isCurrentStepValid).toBe(true)
      expect(result.current.isFormValid).toBe(true)
    })

    it('should validate form requires photo, avatar, note, and location', () => {
      const options = createMockOptions()
      const { result } = renderHook(() => useCreatePostForm(options))

      expect(result.current.isFormValid).toBe(false)

      // Add photo
      act(() => {
        result.current.handlePhotoSelect('photo-id')
      })
      expect(result.current.isFormValid).toBe(false)

      // Add avatar
      act(() => {
        result.current.handleAvatarChange(createMockAvatar())
      })
      expect(result.current.isFormValid).toBe(false)

      // Add note
      act(() => {
        result.current.handleNoteChange('This is a valid note')
      })
      expect(result.current.isFormValid).toBe(false)

      // Add location
      act(() => {
        result.current.handleLocationSelect(createMockLocationItem())
      })

      expect(result.current.isFormValid).toBe(true)
    })

    it('should trim note whitespace for validation', () => {
      const options = createMockOptions()
      const { result } = renderHook(() => useCreatePostForm(options))

      // Fill other required fields
      act(() => {
        result.current.handlePhotoSelect('photo-id')
        result.current.handleAvatarChange(createMockAvatar())
        result.current.handleLocationSelect(createMockLocationItem())
      })

      // Note with only whitespace should fail
      act(() => {
        result.current.handleNoteChange('          ')
      })
      expect(result.current.isFormValid).toBe(false)

      // Note with content + whitespace should pass
      act(() => {
        result.current.handleNoteChange('  valid note  ')
      })
      expect(result.current.isFormValid).toBe(true)
    })
  })

  // --------------------------------------------------------------------------
  // SUBMISSION
  // --------------------------------------------------------------------------

  describe('Submission', () => {
    it('should prevent submission with invalid form', async () => {
      const options = createMockOptions()
      const { result } = renderHook(() => useCreatePostForm(options))

      // Form is incomplete
      expect(result.current.isFormValid).toBe(false)

      await act(async () => {
        await result.current.handleSubmit()
      })

      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Please complete all required fields.'
      )
    })
  })
})
