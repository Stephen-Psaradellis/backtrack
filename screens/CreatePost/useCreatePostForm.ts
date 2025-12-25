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
import { uploadSelfie } from '../../lib/storage'
import { recordLocationVisit } from '../../lib/utils/geo'
import { DEFAULT_AVATAR_CONFIG } from '../../types/avatar'
import type { AvatarConfig } from '../../types/avatar'
import type { MainStackNavigationProp, CreatePostRouteProp } from '../../navigation/types'
import type { Location as LocationEntity, LocationWithVisit } from '../../lib/types'

import {
  type CreatePostStep,
  type CreatePostFormData,
  type StepConfig,
  STEPS,
  MIN_NOTE_LENGTH,
  MAX_NOTE_LENGTH,
} from './types'

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
  /** Handle selfie capture */
  handleSelfieCapture: (uri: string) => void
  /** Handle avatar save */
  handleAvatarSave: (config: AvatarConfig) => void
  /** Handle avatar change (without advancing step) */
  handleAvatarChange: (config: AvatarConfig) => void
  /** Handle location selection */
  handleLocationSelect: (location: LocationItem) => void
  /** Handle note text change */
  handleNoteChange: (text: string) => void
  /** Handle retake selfie */
  handleRetakeSelfie: () => void
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
  selfieUri: null,
  targetAvatar: DEFAULT_AVATAR_CONFIG,
  note: '',
  location: null,
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

  const [currentStep, setCurrentStep] = useState<CreatePostStep>('selfie')
  const [formData, setFormData] = useState<CreatePostFormData>(INITIAL_FORM_DATA)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [preselectedLocation, setPreselectedLocation] = useState<LocationEntity | null>(null)

  // Fetch recently visited locations (within 3 hours) for post creation
  const {
    locations: visitedLocations,
    isLoading: loadingLocations,
    refetch: refetchVisitedLocations,
  } = useVisitedLocations({
    // Only fetch when user reaches the location step
    enabled: currentStep === 'location',
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
    // Only fetch when user reaches the location step and has valid coordinates
    enabled: currentStep === 'location' && userCoordinates !== null,
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
      formData.selfieUri !== null &&
      formData.targetAvatar !== null &&
      formData.note.trim().length >= MIN_NOTE_LENGTH &&
      formData.location !== null
    )
  }, [formData])

  /**
   * Validation state for current step
   */
  const isCurrentStepValid = useMemo(() => {
    switch (currentStep) {
      case 'selfie':
        return formData.selfieUri !== null
      case 'avatar':
        return true // Avatar always has default value
      case 'note':
        return formData.note.trim().length >= MIN_NOTE_LENGTH
      case 'location':
        return formData.location !== null
      case 'review':
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
   * When the user reaches the location step, we attempt to record visits for
   * all nearby POIs. The server-side 50m proximity check in the RPC ensures
   * only legitimate visits are recorded. After recording, we refetch visited
   * locations to update the list.
   *
   * This is a "fire and forget" operation - we don't block the UI while
   * recording visits.
   */
  useEffect(() => {
    // Only trigger when on location step with nearby locations available
    if (currentStep !== 'location') {
      // Reset the flag when leaving location step
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
   * Handle selfie capture
   */
  const handleSelfieCapture = useCallback((uri: string) => {
    setFormData((prev) => ({ ...prev, selfieUri: uri }))
    // Advance to next step after capture
    const currentIndex = STEPS.findIndex((s) => s.id === 'selfie')
    if (currentIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentIndex + 1].id)
    }
  }, [])

  /**
   * Handle avatar change (without advancing step)
   */
  const handleAvatarChange = useCallback((config: AvatarConfig) => {
    setFormData((prev) => ({ ...prev, targetAvatar: config }))
  }, [])

  /**
   * Handle avatar save
   */
  const handleAvatarSave = useCallback((config: AvatarConfig) => {
    setFormData((prev) => ({ ...prev, targetAvatar: config }))
    // Advance to next step after save
    const currentIndex = STEPS.findIndex((s) => s.id === 'avatar')
    if (currentIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentIndex + 1].id)
    }
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
   * Handle retake selfie
   */
  const handleRetakeSelfie = useCallback(() => {
    setFormData((prev) => ({ ...prev, selfieUri: null }))
    setCurrentStep('selfie')
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

      // Generate a temporary post ID for the selfie upload
      // We'll use this as the filename in storage
      const tempPostId = crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // Upload selfie to Supabase Storage
      let selfieUrl: string | null = null
      if (formData.selfieUri) {
        const uploadResult = await uploadSelfie(userId, tempPostId, formData.selfieUri)
        if (!uploadResult.success) {
          throw new Error(uploadResult.error || 'Failed to upload selfie')
        }
        selfieUrl = uploadResult.path
      }

      // Create the post with the uploaded selfie URL
      const { error: postError } = await supabase
        .from('posts')
        .insert({
          id: tempPostId,
          producer_id: userId,
          location_id: locationId,
          target_avatar: formData.targetAvatar,
          note: formData.note.trim(),
          selfie_url: selfieUrl,
        })

      if (postError) {
        throw new Error('Failed to create post')
      }

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
    handleSelfieCapture,
    handleAvatarSave,
    handleAvatarChange,
    handleLocationSelect,
    handleNoteChange,
    handleRetakeSelfie,
    handleSubmit,
    goToStep,
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default useCreatePostForm
export type { UseCreatePostFormOptions, UseCreatePostFormResult }
