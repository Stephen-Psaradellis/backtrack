/**
 * useCreatePostForm Hook
 *
 * Custom hook for managing the CreatePost wizard form state, validation,
 * data fetching, and step navigation. Extracts all stateful logic from
 * CreatePostScreen to enable cleaner component composition.
 *
 * Features:
 * - Multi-step form state management
 * - Step navigation with validation
 * - Location data fetching (nearby and preselected)
 * - Form submission with selfie upload
 * - Progress animation for step indicator
 * - Memoized computed values for performance
 *
 * @example
 * ```tsx
 * function CreatePostScreen() {
 *   const navigation = useNavigation<MainStackNavigationProp>()
 *   const route = useRoute<CreatePostRouteProp>()
 *
 *   const form = useCreatePostForm({ navigation, route })
 *
 *   return (
 *     <View>
 *       <ProgressBar progress={form.progress} />
 *       {form.currentStep === 'selfie' && (
 *         <SelfieStep
 *           selfieUri={form.formData.selfieUri}
 *           onCapture={form.handleSelfieCapture}
 *         />
 *       )}
 *     </View>
 *   )
 * }
 * ```
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { Alert, Animated } from 'react-native'

import { locationToItem, type LocationItem } from '../../components/LocationPicker'
import { useAuth } from '../../contexts/AuthContext'
import { useLocation } from '../../hooks/useLocation'
import { useVisitedLocations, useNearbyLocations } from '../../hooks/useNearbyLocations'
import { supabase } from '../../lib/supabase'
import { recordLocationVisit } from '../../lib/utils/geo'
import type { StoredAvatar } from 'react-native-bitmoji'
import type { MainStackNavigationProp, CreatePostRouteProp } from '../../navigation/types'
import type { Location as LocationEntity, LocationWithVisit } from '../../lib/types'
import type { TimeGranularity } from '../../types/database'
import { validateSightingDate } from '../../utils/dateTime'

import {
  type CreatePostStep,
  type CreatePostFormData,
  type StepConfig,
  STEPS,
  MIN_NOTE_LENGTH,
  MAX_NOTE_LENGTH,
} from './types'
import { trackEvent, AnalyticsEvent } from '../../lib/analytics'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Options for the useCreatePostForm hook
 */
export interface UseCreatePostFormOptions {
  /** Navigation object for screen transitions */
  navigation: MainStackNavigationProp
  /** Route object containing params like preselected locationId */
  route: CreatePostRouteProp
}

/**
 * Return value from useCreatePostForm hook
 */
export interface UseCreatePostFormResult {
  // ---------------------------------------------------------------------------
  // Form State
  // ---------------------------------------------------------------------------

  /** Current form data */
  formData: CreatePostFormData
  /** Current step in the wizard */
  currentStep: CreatePostStep
  /** Whether form is currently submitting */
  isSubmitting: boolean

  // ---------------------------------------------------------------------------
  // Computed Values
  // ---------------------------------------------------------------------------

  /** Index of current step (0-based) */
  currentStepIndex: number
  /** Configuration for current step */
  currentStepConfig: StepConfig
  /** Progress percentage (0-1) */
  progress: number
  /** Whether entire form is valid for submission */
  isFormValid: boolean
  /** Whether current step is valid to proceed */
  isCurrentStepValid: boolean

  // ---------------------------------------------------------------------------
  // Animation
  // ---------------------------------------------------------------------------

  /** Animated value for progress bar */
  progressAnim: Animated.Value

  // ---------------------------------------------------------------------------
  // Location Data
  // ---------------------------------------------------------------------------

  /** Recently visited locations (within 3 hours) */
  visitedLocations: LocationWithVisit[]
  /** Whether visited locations are loading */
  loadingLocations: boolean
  /** Preselected location from route params */
  preselectedLocation: LocationEntity | null
  /** User's current latitude */
  userLatitude: number
  /** User's current longitude */
  userLongitude: number
  /** Whether user location is loading */
  locationLoading: boolean

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  /** Handle back button / previous step navigation */
  handleBack: () => void
  /** Handle next step navigation */
  handleNext: () => void
  /** Handle avatar save */
  handleAvatarSave: (avatar: StoredAvatar) => void
  /** Handle avatar change (without advancing step) */
  handleAvatarChange: (avatar: StoredAvatar) => void
  /** Handle location selection */
  handleLocationSelect: (location: LocationItem) => void
  /** Handle note text change */
  handleNoteChange: (text: string) => void
  /** Handle photo selection */
  handlePhotoSelect: (photoId: string) => void
  /** Handle sighting date change */
  handleSightingDateChange: (date: Date | null) => void
  /** Handle time granularity change */
  handleTimeGranularityChange: (granularity: TimeGranularity | null) => void
  /** Handle form submission */
  handleSubmit: () => Promise<void>
  /** Navigate to a specific step */
  goToStep: (step: CreatePostStep) => void
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Initial form data
 */
const INITIAL_FORM_DATA: CreatePostFormData = {
  selectedPhotoId: null,
  targetAvatar: null,
  note: '',
  location: null,
  sightingDate: null,
  timeGranularity: null,
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * useCreatePostForm - Custom hook for CreatePost wizard form management
 *
 * @param options - Navigation and route objects
 * @returns Form state, computed values, and handler functions
 *
 * @example
 * // Basic usage with all state and handlers
 * const {
 *   formData,
 *   currentStep,
 *   handleNext,
 *   handleBack,
 *   handleSubmit,
 * } = useCreatePostForm({ navigation, route })
 */
export function useCreatePostForm(
  options: UseCreatePostFormOptions
): UseCreatePostFormResult {
  const { navigation, route } = options

  // ---------------------------------------------------------------------------
  // EXTERNAL HOOKS
  // ---------------------------------------------------------------------------

  const { userId } = useAuth()
  const {
    latitude,
    longitude,
    loading: locationLoading,
  } = useLocation()

  // Pre-selected location from navigation params
  const preselectedLocationId = route.params?.locationId

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [currentStep, setCurrentStep] = useState<CreatePostStep>('scene')
  const [formData, setFormData] = useState<CreatePostFormData>(INITIAL_FORM_DATA)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [preselectedLocation, setPreselectedLocation] = useState<LocationEntity | null>(null)

  // Fetch recently visited locations (within 3 hours) for post creation
  const {
    locations: visitedLocations,
    isLoading: loadingLocations,
    refetch: refetchVisitedLocations,
  } = useVisitedLocations({
    // Only fetch when user reaches the scene step (location selection)
    enabled: currentStep === 'scene',
  })

  // User coordinates for check-in functionality
  const userCoordinates = useMemo(() => {
    if (latitude && longitude) {
      return { latitude, longitude }
    }
    return null
  }, [latitude, longitude])

  // Fetch nearby locations for check-in (recording visits for nearby POIs)
  const {
    locations: nearbyLocations,
  } = useNearbyLocations(userCoordinates, {
    // Only fetch when user reaches the scene step and has valid coordinates
    enabled: currentStep === 'scene' && userCoordinates !== null,
    // Use a smaller radius for check-in purposes (within walking distance)
    radiusMeters: 200,
    maxResults: 20,
  })

  // Animation for progress bar
  const progressAnim = useRef(new Animated.Value(0)).current

  // Track whether we've already triggered check-ins for this location step view
  const hasTriggeredCheckIns = useRef(false)

  // ---------------------------------------------------------------------------
  // COMPUTED VALUES
  // ---------------------------------------------------------------------------

  /**
   * Current step index
   */
  const currentStepIndex = useMemo(
    () => STEPS.findIndex((s) => s.id === currentStep),
    [currentStep]
  )

  /**
   * Current step configuration
   */
  const currentStepConfig = STEPS[currentStepIndex]

  /**
   * Progress percentage
   */
  const progress = (currentStepIndex + 1) / STEPS.length

  /**
   * Check if form is valid for submission
   */
  const isFormValid = useMemo(() => {
    return (
      formData.selectedPhotoId !== null &&
      formData.targetAvatar !== null &&
      formData.note.trim().length >= MIN_NOTE_LENGTH &&
      formData.location !== null
    )
  }, [formData])

  /**
   * Validation state for current step (new 3-moment flow)
   */
  const isCurrentStepValid = useMemo(() => {
    switch (currentStep) {
      case 'scene':
        // Scene requires location, time is optional
        // If a date is set, validate it's not in the future
        if (formData.sightingDate) {
          const validation = validateSightingDate(formData.sightingDate)
          if (!validation.valid) return false
        }
        return formData.location !== null
      case 'moment':
        // Moment requires avatar and note (min length)
        return formData.targetAvatar !== null && formData.note.trim().length >= MIN_NOTE_LENGTH
      case 'seal':
        // Seal requires photo and all other fields
        return isFormValid
      default:
        return false
    }
  }, [currentStep, formData, isFormValid])

  // ---------------------------------------------------------------------------
  // EFFECTS
  // ---------------------------------------------------------------------------

  /**
   * Animate progress bar
   */
  useEffect(() => {
    Animated.spring(progressAnim, {
      toValue: progress,
      useNativeDriver: false,
      tension: 40,
      friction: 8,
    }).start()
  }, [progress, progressAnim])

  /**
   * Fetch pre-selected location if provided
   */
  useEffect(() => {
    if (preselectedLocationId) {
      fetchPreselectedLocation()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedLocationId])

  /**
   * Record check-ins for nearby locations when user views the location list.
   *
   * When the user reaches the scene step, we attempt to record visits for
   * all nearby POIs. The server-side 50m proximity check in the RPC ensures
   * only legitimate visits are recorded. After recording, we refetch visited
   * locations to update the list.
   *
   * This is a "fire and forget" operation - we don't block the UI while
   * recording visits.
   */
  useEffect(() => {
    // Only trigger when on scene step with nearby locations available
    if (currentStep !== 'scene') {
      // Reset the flag when leaving scene step
      hasTriggeredCheckIns.current = false
      return
    }

    // Don't trigger if we've already done check-ins for this step view
    if (hasTriggeredCheckIns.current) {
      return
    }

    // Need valid user coordinates to record visits
    if (!userCoordinates) {
      return
    }

    // Wait until we have nearby locations to check in to
    if (nearbyLocations.length === 0) {
      return
    }

    // Mark that we've triggered check-ins
    hasTriggeredCheckIns.current = true

    // Fire-and-forget: Record visits for all nearby POIs
    // The server-side proximity check (50m) will only record valid visits
    const recordVisits = async () => {
      try {
        // Record visits in parallel for all nearby locations
        const visitPromises = nearbyLocations.map((location) =>
          recordLocationVisit(supabase, {
            location_id: location.id,
            user_lat: userCoordinates.latitude,
            user_lon: userCoordinates.longitude,
          }).catch(() => null) // Silently ignore individual failures
        )

        await Promise.all(visitPromises)

        // Refetch visited locations to update the list with any new visits
        await refetchVisitedLocations()
      } catch {
        // Silently fail - don't disrupt the user flow for check-in errors
      }
    }

    recordVisits()
  }, [currentStep, userCoordinates, nearbyLocations, refetchVisitedLocations])

  // ---------------------------------------------------------------------------
  // DATA FETCHING
  // ---------------------------------------------------------------------------

  /**
   * Fetch pre-selected location details
   */
  const fetchPreselectedLocation = useCallback(async () => {
    if (!preselectedLocationId) return

    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('id', preselectedLocationId)
        .single()

      if (error) throw error

      if (data) {
        setPreselectedLocation(data)
        setFormData((prev) => ({
          ...prev,
          location: locationToItem(data),
        }))
      }
    } catch {
      // Silently fail - user can select a different location
    }
  }, [preselectedLocationId])


  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  /**
   * Navigate to a specific step
   */
  const goToStep = useCallback((step: CreatePostStep) => {
    setCurrentStep(step)
  }, [])

  /**
   * Handle back button / navigation
   */
  const handleBack = useCallback(() => {
    const currentIndex = STEPS.findIndex((s) => s.id === currentStep)
    if (currentIndex === 0) {
      // On first step, show confirmation to exit
      Alert.alert(
        'Discard Post?',
        'Are you sure you want to discard this post? All progress will be lost.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
        ]
      )
    } else {
      // Go to previous step
      setCurrentStep(STEPS[currentIndex - 1].id)
    }
  }, [currentStep, navigation])

  /**
   * Handle next step
   */
  const handleNext = useCallback(() => {
    const currentIndex = STEPS.findIndex((s) => s.id === currentStep)
    if (currentIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentIndex + 1].id)
    }
  }, [currentStep])

  /**
   * Handle avatar change (without advancing step)
   */
  const handleAvatarChange = useCallback((avatar: StoredAvatar) => {
    setFormData((prev) => ({ ...prev, targetAvatar: avatar }))
  }, [])

  /**
   * Handle avatar save
   * In the new 3-moment flow, this just updates the avatar without advancing steps
   * (the MomentStep component handles its own modal flow)
   */
  const handleAvatarSave = useCallback((avatar: StoredAvatar) => {
    setFormData((prev) => ({ ...prev, targetAvatar: avatar }))
  }, [])

  /**
   * Handle location select
   */
  const handleLocationSelect = useCallback((location: LocationItem) => {
    setFormData((prev) => ({ ...prev, location }))
  }, [])

  /**
   * Handle note change
   */
  const handleNoteChange = useCallback((text: string) => {
    // Limit to max length
    if (text.length <= MAX_NOTE_LENGTH) {
      setFormData((prev) => ({ ...prev, note: text }))
    }
  }, [])

  /**
   * Handle photo selection
   */
  const handlePhotoSelect = useCallback((photoId: string) => {
    setFormData((prev) => ({ ...prev, selectedPhotoId: photoId }))
  }, [])

  /**
   * Handle sighting date change
   */
  const handleSightingDateChange = useCallback((date: Date | null) => {
    setFormData((prev) => ({ ...prev, sightingDate: date }))
  }, [])

  /**
   * Handle time granularity change
   */
  const handleTimeGranularityChange = useCallback((granularity: TimeGranularity | null) => {
    setFormData((prev) => ({ ...prev, timeGranularity: granularity }))
  }, [])

  /**
   * Handle submit post
   */
  const handleSubmit = useCallback(async () => {
    if (!isFormValid || !userId) {
      Alert.alert('Error', 'Please complete all required fields.')
      return
    }

    setIsSubmitting(true)
    try {
      // Create or get location ID
      let locationId = formData.location?.id

      // If location doesn't have an ID, create it
      if (!locationId && formData.location) {
        const { data: newLocation, error: locationError } = await supabase
          .from('locations')
          .insert({
            name: formData.location.name,
            address: formData.location.address,
            latitude: formData.location.latitude,
            longitude: formData.location.longitude,
            place_id: formData.location.place_id,
          })
          .select()
          .single()

        if (locationError) {
          throw new Error('Failed to save location')
        }

        locationId = newLocation.id
      }

      if (!locationId) {
        throw new Error('No location selected')
      }

      // Create the post
      const { error: postError } = await supabase
        .from('posts')
        .insert({
          producer_id: userId,
          location_id: locationId,
          photo_id: formData.selectedPhotoId,
          target_avatar_v2: formData.targetAvatar,
          message: formData.note.trim(),
          // selfie_url is required but we use photo_id for new posts
          // Use the storage path from the profile_photo for backwards compatibility
          selfie_url: formData.selectedPhotoId || 'photo_id_reference',
          // Optional sighting time fields - only include if date is set
          ...(formData.sightingDate && {
            sighting_date: formData.sightingDate.toISOString(),
            time_granularity: formData.timeGranularity,
          }),
        })

      if (postError) {
        trackEvent(AnalyticsEvent.POST_CREATION_ERROR, { error_type: 'database_error' })
        throw new Error('Failed to create post')
      }

      // Track successful post creation (no PII - just metadata)
      trackEvent(AnalyticsEvent.POST_CREATED, {
        has_time: formData.sightingDate !== null,
        has_note: formData.note.trim().length > 0,
      })

      // Success - show confirmation and navigate back
      Alert.alert(
        'Post Created!',
        'Your missed connection has been posted. Good luck!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to the ledger for this location
              if (locationId && formData.location) {
                navigation.replace('Ledger', {
                  locationId,
                  locationName: formData.location.name,
                })
              } else {
                navigation.goBack()
              }
            },
          },
        ]
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred'
      Alert.alert('Error', message)
    } finally {
      setIsSubmitting(false)
    }
  }, [isFormValid, userId, formData, navigation])

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------

  return {
    // Form State
    formData,
    currentStep,
    isSubmitting,

    // Computed Values
    currentStepIndex,
    currentStepConfig,
    progress,
    isFormValid,
    isCurrentStepValid,

    // Animation
    progressAnim,

    // Location Data
    visitedLocations,
    loadingLocations,
    preselectedLocation,
    userLatitude: latitude,
    userLongitude: longitude,
    locationLoading,

    // Handlers
    handleBack,
    handleNext,
    handlePhotoSelect,
    handleAvatarSave,
    handleAvatarChange,
    handleLocationSelect,
    handleNoteChange,
    handleSightingDateChange,
    handleTimeGranularityChange,
    handleSubmit,
    goToStep,
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default useCreatePostForm
