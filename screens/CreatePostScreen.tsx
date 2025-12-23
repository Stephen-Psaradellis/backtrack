/**
 * CreatePostScreen
 *
 * Full producer flow screen for creating "missed connection" posts.
 * Guides users through a multi-step process:
 * 1. Selfie capture - Verify user identity
 * 2. Avatar building - Describe the person of interest
 * 3. Note writing - Write a message about the missed connection
 * 4. Location selection - Choose where the connection happened
 * 5. Review and submit
 *
 * @example
 * ```tsx
 * // Navigate to create post
 * navigation.navigate('CreatePost', { locationId: 'optional-preset-location' })
 * ```
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'

import { SelfieCamera } from '../components/SelfieCamera'
import { AvatarBuilder } from '../components/AvatarBuilder'
import { LocationPicker, type LocationItem, locationToItem } from '../components/LocationPicker'
import { Button, OutlineButton, GhostButton } from '../components/Button'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { MediumAvatarPreview, LargeAvatarPreview } from '../components/AvatarPreview'
import { useAuth } from '../contexts/AuthContext'
import { useLocation } from '../hooks/useLocation'
import { supabase } from '../lib/supabase'
import { uploadSelfie } from '../lib/storage'
import { DEFAULT_AVATAR_CONFIG } from '../types/avatar'
import type { AvatarConfig } from '../types/avatar'
import type { MainStackNavigationProp, CreatePostRouteProp } from '../navigation/types'
import type { Location as LocationEntity } from '../lib/types'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Steps in the create post flow
 */
type CreatePostStep = 'selfie' | 'avatar' | 'note' | 'location' | 'review'

/**
 * Form data for creating a post
 */
interface CreatePostFormData {
  selfieUri: string | null
  targetAvatar: AvatarConfig
  note: string
  location: LocationItem | null
}

/**
 * Step configuration
 */
interface StepConfig {
  id: CreatePostStep
  title: string
  subtitle: string
  icon: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Step configuration for the flow
 */
const STEPS: StepConfig[] = [
  {
    id: 'selfie',
    title: 'Take a Selfie',
    subtitle: 'This is private and used for verification only',
    icon: '📷',
  },
  {
    id: 'avatar',
    title: 'Describe Who You Saw',
    subtitle: 'Build an avatar of the person you noticed',
    icon: '👤',
  },
  {
    id: 'note',
    title: 'Write a Note',
    subtitle: 'What would you like to say to them?',
    icon: '✍️',
  },
  {
    id: 'location',
    title: 'Where Did You See Them?',
    subtitle: 'Select the location of your missed connection',
    icon: '📍',
  },
  {
    id: 'review',
    title: 'Review Your Post',
    subtitle: "Make sure everything looks right before posting",
    icon: '✅',
  },
]

/**
 * Minimum note length
 */
const MIN_NOTE_LENGTH = 10

/**
 * Maximum note length
 */
const MAX_NOTE_LENGTH = 500

/**
 * Screen dimensions
 */
const { width: SCREEN_WIDTH } = Dimensions.get('window')

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * CreatePostScreen - Full producer flow for creating posts
 */
export function CreatePostScreen(): JSX.Element {
  // ---------------------------------------------------------------------------
  // HOOKS
  // ---------------------------------------------------------------------------

  const navigation = useNavigation<MainStackNavigationProp>()
  const route = useRoute<CreatePostRouteProp>()
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
  const [formData, setFormData] = useState<CreatePostFormData>({
    selfieUri: null,
    targetAvatar: DEFAULT_AVATAR_CONFIG,
    note: '',
    location: null,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [nearbyLocations, setNearbyLocations] = useState<LocationEntity[]>([])
  const [loadingLocations, setLoadingLocations] = useState(false)
  const [preselectedLocation, setPreselectedLocation] = useState<LocationEntity | null>(null)

  // Animation for progress bar
  const progressAnim = useRef(new Animated.Value(0)).current

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
   * Fetch nearby locations when on location step
   */
  useEffect(() => {
    if (currentStep === 'location' && latitude && longitude && nearbyLocations.length === 0) {
      fetchNearbyLocations()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, latitude, longitude])

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

  /**
   * Fetch nearby locations
   */
  const fetchNearbyLocations = useCallback(async () => {
    if (!latitude || !longitude) return

    setLoadingLocations(true)
    try {
      const latDelta = 0.05
      const lngDelta = 0.05

      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .gte('latitude', latitude - latDelta)
        .lte('latitude', latitude + latDelta)
        .gte('longitude', longitude - lngDelta)
        .lte('longitude', longitude + lngDelta)
        .limit(50)

      if (error) throw error

      setNearbyLocations(data || [])
    } catch {
      // Silently fail - user can create a new location
    } finally {
      setLoadingLocations(false)
    }
  }, [latitude, longitude])

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

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
    handleNext()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * Handle avatar save
   */
  const handleAvatarSave = useCallback((config: AvatarConfig) => {
    setFormData((prev) => ({ ...prev, targetAvatar: config }))
    handleNext()
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const tempPostId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

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
  // RENDER: STEP CONTENT
  // ---------------------------------------------------------------------------

  /**
   * Render selfie step
   */
  const renderSelfieStep = () => {
    if (formData.selfieUri) {
      // Show captured selfie with option to retake
      return (
        <View style={styles.selfiePreviewContainer}>
          <Image
            source={{ uri: formData.selfieUri }}
            style={styles.selfiePreview}
            resizeMode="cover"
          />
          <View style={styles.selfieActions}>
            <OutlineButton
              title="Retake"
              onPress={handleRetakeSelfie}
              testID="create-post-retake-selfie"
            />
            <Button
              title="Use This Photo"
              onPress={handleNext}
              testID="create-post-use-selfie"
            />
          </View>
        </View>
      )
    }

    return (
      <SelfieCamera
        onCapture={handleSelfieCapture}
        onCancel={handleBack}
        testID="create-post-camera"
      />
    )
  }

  /**
   * Render avatar step
   */
  const renderAvatarStep = () => (
    <AvatarBuilder
      initialConfig={formData.targetAvatar}
      onChange={(config) => setFormData((prev) => ({ ...prev, targetAvatar: config }))}
      onSave={handleAvatarSave}
      onCancel={handleBack}
      saveLabel="Next"
      cancelLabel="Back"
      testID="create-post-avatar"
    />
  )

  /**
   * Render note step
   */
  const renderNoteStep = () => {
    const noteLength = formData.note.trim().length
    const isValid = noteLength >= MIN_NOTE_LENGTH
    const remaining = MAX_NOTE_LENGTH - formData.note.length

    return (
      <KeyboardAvoidingView
        style={styles.noteContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          style={styles.noteScroll}
          contentContainerStyle={styles.noteScrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar preview */}
          <View style={styles.avatarPreviewRow}>
            <View style={styles.avatarPreviewWrapper}>
              <MediumAvatarPreview config={formData.targetAvatar} />
            </View>
            <Text style={styles.avatarPreviewLabel}>
              You're writing to this person
            </Text>
          </View>

          {/* Note input */}
          <View style={styles.noteInputContainer}>
            <TextInput
              style={styles.noteInput}
              value={formData.note}
              onChangeText={handleNoteChange}
              placeholder="Write something memorable... What caught your eye? What would you like to say?"
              placeholderTextColor="#8E8E93"
              multiline
              maxLength={MAX_NOTE_LENGTH}
              autoFocus
              textAlignVertical="top"
              testID="create-post-note-input"
            />
          </View>

          {/* Character count */}
          <View style={styles.noteFooter}>
            <Text style={[styles.noteCount, !isValid && styles.noteCountInvalid]}>
              {noteLength < MIN_NOTE_LENGTH
                ? `${MIN_NOTE_LENGTH - noteLength} more characters needed`
                : `${remaining} characters remaining`}
            </Text>
          </View>

          {/* Action buttons */}
          <View style={styles.stepActions}>
            <OutlineButton
              title="Back"
              onPress={handleBack}
              testID="create-post-note-back"
            />
            <Button
              title="Next"
              onPress={handleNext}
              disabled={!isValid}
              testID="create-post-note-next"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    )
  }

  /**
   * Render location step
   */
  const renderLocationStep = () => {
    const locationItems: LocationItem[] = nearbyLocations.map(locationToItem)

    return (
      <View style={styles.locationContainer}>
        <LocationPicker
          locations={locationItems}
          selectedLocationId={formData.location?.id ?? null}
          onSelect={handleLocationSelect}
          userCoordinates={latitude && longitude ? { latitude, longitude } : null}
          loading={loadingLocations || locationLoading}
          showCurrentLocation={false}
          placeholder="Search for a venue..."
          testID="create-post-location-picker"
        />

        {/* Action buttons */}
        <View style={styles.locationActions}>
          <OutlineButton
            title="Back"
            onPress={handleBack}
            style={styles.locationBackButton}
            testID="create-post-location-back"
          />
          <Button
            title="Next"
            onPress={handleNext}
            disabled={!formData.location}
            style={styles.locationNextButton}
            testID="create-post-location-next"
          />
        </View>
      </View>
    )
  }

  /**
   * Render review step
   */
  const renderReviewStep = () => (
    <ScrollView
      style={styles.reviewContainer}
      contentContainerStyle={styles.reviewContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Selfie preview */}
      <View style={styles.reviewSection}>
        <Text style={styles.reviewSectionTitle}>Your Verification Selfie</Text>
        <View style={styles.reviewSelfieContainer}>
          {formData.selfieUri && (
            <Image
              source={{ uri: formData.selfieUri }}
              style={styles.reviewSelfie}
              resizeMode="cover"
            />
          )}
          <TouchableOpacity
            style={styles.editButton}
            onPress={handleRetakeSelfie}
            testID="create-post-review-edit-selfie"
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.reviewSelfieNote}>
          This is private and only used for verification.
        </Text>
      </View>

      {/* Avatar preview */}
      <View style={styles.reviewSection}>
        <Text style={styles.reviewSectionTitle}>Who You're Looking For</Text>
        <View style={styles.reviewAvatarContainer}>
          <LargeAvatarPreview config={formData.targetAvatar} />
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setCurrentStep('avatar')}
            testID="create-post-review-edit-avatar"
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Note preview */}
      <View style={styles.reviewSection}>
        <View style={styles.reviewSectionHeader}>
          <Text style={styles.reviewSectionTitle}>Your Note</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setCurrentStep('note')}
            testID="create-post-review-edit-note"
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.reviewNoteContainer}>
          <Text style={styles.reviewNoteText}>{formData.note}</Text>
        </View>
      </View>

      {/* Location preview */}
      <View style={styles.reviewSection}>
        <View style={styles.reviewSectionHeader}>
          <Text style={styles.reviewSectionTitle}>Location</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setCurrentStep('location')}
            testID="create-post-review-edit-location"
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.reviewLocationContainer}>
          <Text style={styles.reviewLocationIcon}>📍</Text>
          <View style={styles.reviewLocationDetails}>
            <Text style={styles.reviewLocationName}>{formData.location?.name}</Text>
            {formData.location?.address && (
              <Text style={styles.reviewLocationAddress}>{formData.location.address}</Text>
            )}
          </View>
        </View>
      </View>

      {/* Submit button */}
      <View style={styles.submitContainer}>
        <Button
          title="Post Missed Connection"
          onPress={handleSubmit}
          loading={isSubmitting}
          disabled={isSubmitting || !isFormValid}
          fullWidth
          testID="create-post-submit"
        />
        <GhostButton
          title="Go Back"
          onPress={handleBack}
          disabled={isSubmitting}
          testID="create-post-review-back"
        />
      </View>
    </ScrollView>
  )

  /**
   * Render current step content
   */
  const renderStepContent = () => {
    switch (currentStep) {
      case 'selfie':
        return renderSelfieStep()
      case 'avatar':
        return renderAvatarStep()
      case 'note':
        return renderNoteStep()
      case 'location':
        return renderLocationStep()
      case 'review':
        return renderReviewStep()
      default:
        return null
    }
  }

  // ---------------------------------------------------------------------------
  // RENDER: LOADING
  // ---------------------------------------------------------------------------

  if (isSubmitting) {
    return (
      <View style={styles.loadingContainer} testID="create-post-submitting">
        <LoadingSpinner message="Creating your post..." fullScreen />
      </View>
    )
  }

  // ---------------------------------------------------------------------------
  // RENDER: MAIN
  // ---------------------------------------------------------------------------

  // Full-screen steps (camera and avatar builder)
  const isFullScreenStep = currentStep === 'selfie' && !formData.selfieUri
  const showAvatarBuilder = currentStep === 'avatar'

  if (isFullScreenStep || showAvatarBuilder) {
    return (
      <View style={styles.fullScreenContainer} testID="create-post-screen">
        {renderStepContent()}
      </View>
    )
  }

  return (
    <View style={styles.container} testID="create-post-screen">
      {/* Header with progress */}
      <View style={styles.header}>
        {/* Back button */}
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={handleBack}
          testID="create-post-back"
          accessibilityLabel="Go back"
        >
          <Text style={styles.headerBackText}>←</Text>
        </TouchableOpacity>

        {/* Step indicator */}
        <View style={styles.stepIndicator}>
          <Text style={styles.stepIcon}>{currentStepConfig.icon}</Text>
          <View style={styles.stepTextContainer}>
            <Text style={styles.stepTitle}>{currentStepConfig.title}</Text>
            <Text style={styles.stepSubtitle}>{currentStepConfig.subtitle}</Text>
          </View>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          Step {currentStepIndex + 1} of {STEPS.length}
        </Text>
      </View>

      {/* Step content */}
      <View style={styles.content}>
        {renderStepContent()}
      </View>
    </View>
  )
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerBackText: {
    fontSize: 22,
    color: '#007AFF',
    fontWeight: '400',
  },
  stepIndicator: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  stepTextContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  stepSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
  },

  // Progress bar
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },

  // Content
  content: {
    flex: 1,
  },

  // Selfie preview
  selfiePreviewContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  selfiePreview: {
    width: SCREEN_WIDTH - 80,
    height: SCREEN_WIDTH - 80,
    borderRadius: 16,
    marginBottom: 24,
  },
  selfieActions: {
    flexDirection: 'row',
    gap: 16,
  },

  // Note step
  noteContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  noteScroll: {
    flex: 1,
  },
  noteScrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  avatarPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  avatarPreviewWrapper: {
    marginRight: 16,
  },
  avatarPreviewLabel: {
    flex: 1,
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
  noteInputContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    minHeight: 200,
    marginBottom: 12,
  },
  noteInput: {
    fontSize: 16,
    color: '#000000',
    lineHeight: 24,
    minHeight: 160,
  },
  noteFooter: {
    marginBottom: 20,
  },
  noteCount: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'right',
  },
  noteCountInvalid: {
    color: '#FF3B30',
  },
  stepActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },

  // Location step
  locationContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  locationActions: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  locationBackButton: {
    flex: 1,
    marginRight: 8,
  },
  locationNextButton: {
    flex: 2,
  },

  // Review step
  reviewContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  reviewContent: {
    padding: 16,
    paddingBottom: 40,
  },
  reviewSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  reviewSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F2F2F7',
    borderRadius: 14,
  },
  editButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  reviewSelfieContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  reviewSelfie: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 8,
  },
  reviewSelfieNote: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  reviewAvatarContainer: {
    alignItems: 'center',
  },
  reviewNoteContainer: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 12,
  },
  reviewNoteText: {
    fontSize: 16,
    color: '#000000',
    lineHeight: 24,
  },
  reviewLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewLocationIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  reviewLocationDetails: {
    flex: 1,
  },
  reviewLocationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  reviewLocationAddress: {
    fontSize: 14,
    color: '#8E8E93',
  },

  // Submit
  submitContainer: {
    gap: 12,
    marginTop: 8,
  },
})

// ============================================================================
// EXPORTS
// ============================================================================

export default CreatePostScreen
