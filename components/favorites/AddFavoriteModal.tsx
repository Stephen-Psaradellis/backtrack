/**
 * AddFavoriteModal Component
 *
 * A modal dialog for adding a location to the user's favorites list.
 * Displays location information and allows the user to provide a custom name.
 *
 * Features:
 * - Shows location details (place name, address)
 * - Custom name input with validation (1-50 characters)
 * - Auto-populates custom name with place name as suggestion
 * - Character count indicator
 * - Loading state during save operation
 * - Error handling with user-friendly messages
 * - Accessible with proper labels
 * - Keyboard-aware layout
 *
 * @module components/favorites/AddFavoriteModal
 *
 * @example
 * ```tsx
 * import { AddFavoriteModal } from 'components/favorites/AddFavoriteModal'
 *
 * <AddFavoriteModal
 *   visible={showModal}
 *   location={{
 *     placeName: 'Starbucks',
 *     address: '123 Main St, City, State',
 *     latitude: 40.7128,
 *     longitude: -74.006,
 *     placeId: 'ChIJ...',
 *   }}
 *   onSave={(customName) => handleSave(customName)}
 *   onCancel={() => setShowModal(false)}
 *   isLoading={isSaving}
 *   error={saveError}
 * />
 * ```
 */

import React, { useState, useCallback, useEffect, memo, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native'
import { selectionFeedback, lightFeedback, errorFeedback } from '../../lib/haptics'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Location data for the AddFavoriteModal
 */
export interface AddFavoriteLocationData {
  /**
   * Name of the venue/place
   */
  placeName: string

  /**
   * Full address of the location
   */
  address?: string | null

  /**
   * GPS latitude coordinate
   */
  latitude: number

  /**
   * GPS longitude coordinate
   */
  longitude: number

  /**
   * Google Places ID (optional)
   */
  placeId?: string | null
}

/**
 * Props for the AddFavoriteModal component
 */
export interface AddFavoriteModalProps {
  /**
   * Whether the modal is visible
   */
  visible: boolean

  /**
   * Location data to save as favorite
   */
  location: AddFavoriteLocationData | null

  /**
   * Callback when user saves the favorite
   * @param customName - User-provided custom name for the favorite
   */
  onSave: (customName: string) => void

  /**
   * Callback when user cancels (closes modal)
   */
  onCancel: () => void

  /**
   * Whether save operation is in progress
   * @default false
   */
  isLoading?: boolean

  /**
   * Error message to display
   */
  error?: string | null

  /**
   * Test ID for testing purposes
   */
  testID?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Maximum character length for custom name
 */
const MAX_CUSTOM_NAME_LENGTH = 50

/**
 * Minimum character length for custom name
 */
const MIN_CUSTOM_NAME_LENGTH = 1

/**
 * Colors used in the AddFavoriteModal component
 */
const COLORS = {
  primary: '#FF6B47',
  background: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.5)',
  border: '#E5E5EA',
  textPrimary: '#000000',
  textSecondary: '#8E8E93',
  textTertiary: '#C7C7CC',
  textLink: '#FF6B47',
  error: '#FF3B30',
  inputBackground: '#F9F9F9',
  buttonDisabled: '#FFD0C2',
  locationBackground: '#F2F2F7',
  locationIcon: '#FF2D55',
} as const

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate custom name input
 *
 * @param name - The custom name to validate
 * @returns Error message if invalid, null if valid
 */
function validateCustomName(name: string): string | null {
  const trimmed = name.trim()

  if (trimmed.length < MIN_CUSTOM_NAME_LENGTH) {
    return 'Please enter a name for this favorite'
  }

  if (trimmed.length > MAX_CUSTOM_NAME_LENGTH) {
    return `Name must be ${MAX_CUSTOM_NAME_LENGTH} characters or less`
  }

  return null
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

/**
 * Location icon component
 */
function LocationIcon(): JSX.Element {
  return (
    <View style={styles.locationIcon}>
      <Text style={styles.locationIconText}>{'\uD83D\uDCCD'}</Text>
    </View>
  )
}

/**
 * Location info display component
 */
interface LocationInfoProps {
  placeName: string
  address?: string | null
  testID?: string
}

const LocationInfo = memo(function LocationInfo({
  placeName,
  address,
  testID,
}: LocationInfoProps): JSX.Element {
  return (
    <View style={styles.locationInfo} testID={testID}>
      <LocationIcon />
      <View style={styles.locationDetails}>
        <Text
          style={styles.placeName}
          numberOfLines={1}
          testID={`${testID}-place-name`}
        >
          {placeName}
        </Text>
        {address && (
          <Text
            style={styles.address}
            numberOfLines={2}
            testID={`${testID}-address`}
          >
            {address}
          </Text>
        )}
      </View>
    </View>
  )
})

/**
 * Character count indicator component
 */
interface CharacterCountProps {
  current: number
  max: number
  testID?: string
}

function CharacterCount({ current, max, testID }: CharacterCountProps): JSX.Element {
  const isNearLimit = current >= max * 0.8
  const isAtLimit = current >= max

  return (
    <Text
      style={[
        styles.characterCount,
        isNearLimit && styles.characterCountWarning,
        isAtLimit && styles.characterCountError,
      ]}
      testID={testID}
    >
      {current}/{max}
    </Text>
  )
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * AddFavoriteModal - A modal for adding a location to favorites
 *
 * Allows users to save a location with a custom name for quick access.
 * Validates input and provides feedback on errors.
 */
export const AddFavoriteModal = memo(function AddFavoriteModal({
  visible,
  location,
  onSave,
  onCancel,
  isLoading = false,
  error,
  testID = 'add-favorite-modal',
}: AddFavoriteModalProps): JSX.Element {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [customName, setCustomName] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const inputRef = useRef<TextInput>(null)

  // ---------------------------------------------------------------------------
  // RESET STATE WHEN MODAL OPENS
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (visible && location) {
      // Pre-populate with place name as default suggestion
      setCustomName(location.placeName.substring(0, MAX_CUSTOM_NAME_LENGTH))
      setValidationError(null)

      // Focus input after modal animation
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 300)

      return () => clearTimeout(timer)
    }
  }, [visible, location])

  // Clear validation error when user types
  useEffect(() => {
    if (validationError && customName.trim().length > 0) {
      setValidationError(null)
    }
  }, [customName, validationError])

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  /**
   * Handle custom name input change
   */
  const handleCustomNameChange = useCallback((text: string) => {
    // Limit input to max length
    if (text.length <= MAX_CUSTOM_NAME_LENGTH) {
      setCustomName(text)
    }
  }, [])

  /**
   * Handle save button press
   */
  const handleSave = useCallback(() => {
    const trimmedName = customName.trim()
    const validationResult = validateCustomName(trimmedName)

    if (validationResult) {
      errorFeedback()
      setValidationError(validationResult)
      return
    }

    selectionFeedback()
    Keyboard.dismiss()
    onSave(trimmedName)
  }, [customName, onSave])

  /**
   * Handle cancel button press
   */
  const handleCancel = useCallback(() => {
    lightFeedback()
    Keyboard.dismiss()
    onCancel()
  }, [onCancel])

  /**
   * Handle overlay press (close when tapping outside)
   */
  const handleOverlayPress = useCallback(() => {
    if (!isLoading) {
      handleCancel()
    }
  }, [isLoading, handleCancel])

  /**
   * Handle submit on keyboard
   */
  const handleSubmitEditing = useCallback(() => {
    handleSave()
  }, [handleSave])

  // ---------------------------------------------------------------------------
  // COMPUTED
  // ---------------------------------------------------------------------------

  const canSave = customName.trim().length >= MIN_CUSTOM_NAME_LENGTH && !isLoading
  const displayError = error || validationError

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  if (!location) {
    return <></>
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleCancel}
      testID={testID}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={handleOverlayPress}
        >
          <TouchableOpacity
            style={styles.modalContainer}
            activeOpacity={1}
            onPress={() => {}} // Prevent closing when tapping inside
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title} testID={`${testID}-title`}>
                Add to Favorites
              </Text>
              <TouchableOpacity
                onPress={handleCancel}
                style={styles.closeButton}
                disabled={isLoading}
                testID={`${testID}-close`}
                accessibilityLabel="Close"
                accessibilityRole="button"
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Location Info */}
            <View style={styles.content}>
              <Text style={styles.sectionLabel}>Location</Text>
              <LocationInfo
                placeName={location.placeName}
                address={location.address}
                testID={`${testID}-location`}
              />

              {/* Custom Name Input */}
              <View style={styles.inputSection}>
                <Text style={styles.sectionLabel}>Custom Name</Text>
                <Text style={styles.inputDescription}>
                  Give this location a memorable name
                </Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    ref={inputRef}
                    style={[
                      styles.input,
                      displayError && styles.inputError,
                      isLoading && styles.inputDisabled,
                    ]}
                    value={customName}
                    onChangeText={handleCustomNameChange}
                    placeholder="e.g., Morning Coffee Spot"
                    placeholderTextColor={COLORS.textTertiary}
                    maxLength={MAX_CUSTOM_NAME_LENGTH}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmitEditing}
                    editable={!isLoading}
                    autoCapitalize="words"
                    autoCorrect={false}
                    selectTextOnFocus
                    testID={`${testID}-input`}
                    accessibilityLabel="Custom name for favorite location"
                    accessibilityHint={`Enter a name up to ${MAX_CUSTOM_NAME_LENGTH} characters`}
                  />
                  <CharacterCount
                    current={customName.length}
                    max={MAX_CUSTOM_NAME_LENGTH}
                    testID={`${testID}-char-count`}
                  />
                </View>

                {/* Error Message */}
                {displayError && (
                  <View style={styles.errorContainer} testID={`${testID}-error`}>
                    <Text style={styles.errorText}>{displayError}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
                disabled={isLoading}
                testID={`${testID}-cancel`}
                accessibilityLabel="Cancel"
                accessibilityRole="button"
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  !canSave && styles.saveButtonDisabled,
                ]}
                onPress={handleSave}
                disabled={!canSave}
                testID={`${testID}-save`}
                accessibilityLabel="Save favorite"
                accessibilityRole="button"
                accessibilityState={{ disabled: !canSave }}
              >
                {isLoading ? (
                  <Text style={styles.saveButtonText}>Saving...</Text>
                ) : (
                  <Text
                    style={[
                      styles.saveButtonText,
                      !canSave && styles.saveButtonTextDisabled,
                    ]}
                  >
                    Save
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  )
})

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Overlay styles
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  overlayTouchable: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  // Modal container styles
  modalContainer: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    maxHeight: '80%',
  },

  // Header styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  closeButton: {
    padding: 8,
    borderRadius: 6,
  },
  closeButtonText: {
    fontSize: 24,
    color: COLORS.textSecondary,
    fontWeight: '300',
  },

  // Content styles
  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },

  // Location info styles
  locationInfo: {
    flexDirection: 'row',
    backgroundColor: COLORS.locationBackground,
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  locationIconText: {
    fontSize: 20,
  },
  locationDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  placeName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  address: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },

  // Input section styles
  inputSection: {
    marginBottom: 8,
  },
  inputDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    backgroundColor: COLORS.inputBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    paddingRight: 50, // Space for character count
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  inputDisabled: {
    opacity: 0.6,
    backgroundColor: COLORS.border,
  },

  // Character count styles
  characterCount: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: [{ translateY: -8 }],
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  characterCountWarning: {
    color: '#FF9500', // Warning orange
  },
  characterCountError: {
    color: COLORS.error,
  },

  // Error styles
  errorContainer: {
    marginTop: 8,
    paddingHorizontal: 4,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.error,
  },

  // Footer styles
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: COLORS.buttonDisabled,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.background,
  },
  saveButtonTextDisabled: {
    color: COLORS.textSecondary,
  },
})

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default AddFavoriteModal
