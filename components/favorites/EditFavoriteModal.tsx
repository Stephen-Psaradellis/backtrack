/**
 * EditFavoriteModal Component
 *
 * A modal dialog for editing or deleting a favorite location.
 * Provides renaming functionality with the same validation as AddFavoriteModal
 * and delete with confirmation.
 *
 * Features:
 * - Edit mode: Rename favorite with validation (1-50 characters)
 * - Delete mode: Confirmation dialog before deletion
 * - Character count indicator
 * - Loading state during operations
 * - Error handling with user-friendly messages
 * - Accessible with proper labels
 * - Focus trap and keyboard handling
 *
 * @module components/favorites/EditFavoriteModal
 *
 * @example
 * ```tsx
 * import { EditFavoriteModal } from 'components/favorites/EditFavoriteModal'
 *
 * <EditFavoriteModal
 *   visible={showEditModal}
 *   favorite={selectedFavorite}
 *   onSave={(newName) => handleRename(newName)}
 *   onDelete={() => handleDelete()}
 *   onCancel={() => setShowEditModal(false)}
 *   isLoading={isUpdating || isDeleting}
 *   error={updateError || deleteError}
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
import {
  selectionFeedback,
  lightFeedback,
  errorFeedback,
  warningFeedback,
} from '../../lib/haptics'
import type { FavoriteLocation } from '../../types/database'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Mode of the edit modal
 */
type EditMode = 'edit' | 'delete-confirm'

/**
 * Props for the EditFavoriteModal component
 */
export interface EditFavoriteModalProps {
  /**
   * Whether the modal is visible
   */
  visible: boolean

  /**
   * The favorite location to edit
   */
  favorite: FavoriteLocation | null

  /**
   * Callback when user saves the rename
   * @param customName - New custom name for the favorite
   */
  onSave: (customName: string) => void

  /**
   * Callback when user confirms deletion
   */
  onDelete: () => void

  /**
   * Callback when user cancels (closes modal)
   */
  onCancel: () => void

  /**
   * Whether an operation is in progress
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
 * Colors used in the EditFavoriteModal component
 */
const COLORS = {
  primary: '#007AFF',
  background: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.5)',
  border: '#E5E5EA',
  textPrimary: '#000000',
  textSecondary: '#8E8E93',
  textTertiary: '#C7C7CC',
  error: '#FF3B30',
  danger: '#FF3B30',
  dangerBackground: 'rgba(255, 59, 48, 0.1)',
  inputBackground: '#F9F9F9',
  buttonDisabled: '#C7C7CC',
  locationBackground: '#F2F2F7',
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
 * Edit icon for the modal header
 */
function EditIcon(): JSX.Element {
  return (
    <View style={styles.iconContainer}>
      <Text style={styles.iconText}>{'\u270F\uFE0F'}</Text>
    </View>
  )
}

/**
 * Trash icon for delete confirmation
 */
function TrashIcon(): JSX.Element {
  return (
    <View style={[styles.iconContainer, styles.iconContainerDanger]}>
      <Text style={styles.iconText}>{'\uD83D\uDDD1\uFE0F'}</Text>
    </View>
  )
}

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
 * EditFavoriteModal - A modal for editing or deleting a favorite location
 *
 * Allows users to rename a favorite or delete it with confirmation.
 * Validates input and provides feedback on errors.
 */
export const EditFavoriteModal = memo(function EditFavoriteModal({
  visible,
  favorite,
  onSave,
  onDelete,
  onCancel,
  isLoading = false,
  error,
  testID = 'edit-favorite-modal',
}: EditFavoriteModalProps): JSX.Element {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [mode, setMode] = useState<EditMode>('edit')
  const [customName, setCustomName] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const inputRef = useRef<TextInput>(null)
  const cancelButtonRef = useRef<TouchableOpacity>(null)

  // ---------------------------------------------------------------------------
  // RESET STATE WHEN MODAL OPENS
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (visible && favorite) {
      // Reset to edit mode and populate with current name
      setMode('edit')
      setCustomName(favorite.custom_name)
      setValidationError(null)

      // Focus input after modal animation
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 300)

      return () => clearTimeout(timer)
    }
  }, [visible, favorite])

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
    // If in delete confirmation mode, go back to edit mode
    if (mode === 'delete-confirm') {
      setMode('edit')
    } else {
      onCancel()
    }
  }, [mode, onCancel])

  /**
   * Handle delete button press - show confirmation
   */
  const handleDeletePress = useCallback(() => {
    warningFeedback()
    Keyboard.dismiss()
    setMode('delete-confirm')
  }, [])

  /**
   * Handle confirmed delete
   */
  const handleConfirmDelete = useCallback(() => {
    warningFeedback()
    onDelete()
  }, [onDelete])

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

  const hasChanged = favorite ? customName.trim() !== favorite.custom_name : false
  const canSave =
    customName.trim().length >= MIN_CUSTOM_NAME_LENGTH && hasChanged && !isLoading
  const displayError = error || validationError

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  if (!favorite) {
    return <></>
  }

  // Delete confirmation view
  if (mode === 'delete-confirm') {
    return (
      <Modal
        visible={visible}
        animationType="fade"
        transparent
        onRequestClose={handleCancel}
        testID={`${testID}-delete-confirm`}
      >
        <View style={styles.overlay}>
          <TouchableOpacity
            style={styles.overlayTouchable}
            activeOpacity={1}
            onPress={handleOverlayPress}
          >
            <TouchableOpacity
              style={styles.deleteConfirmContainer}
              activeOpacity={1}
              onPress={() => {}} // Prevent closing when tapping inside
            >
              {/* Header with trash icon */}
              <View style={styles.deleteConfirmHeader}>
                <TrashIcon />
                <Text style={styles.deleteConfirmTitle} testID={`${testID}-delete-title`}>
                  Remove Favorite
                </Text>
              </View>

              {/* Confirmation text */}
              <Text style={styles.deleteConfirmText} testID={`${testID}-delete-message`}>
                Are you sure you want to remove{' '}
                <Text style={styles.customNameHighlight}>{favorite.custom_name}</Text>
                {' '}from your favorites?
              </Text>

              <Text style={styles.deleteConfirmSubtext}>
                This action cannot be undone. You can always add this location to your
                favorites again later.
              </Text>

              {/* Error message */}
              {error && (
                <View style={styles.errorContainer} testID={`${testID}-delete-error`}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Action buttons */}
              <View style={styles.deleteConfirmActions}>
                <TouchableOpacity
                  ref={cancelButtonRef}
                  style={styles.cancelButton}
                  onPress={handleCancel}
                  disabled={isLoading}
                  testID={`${testID}-delete-cancel`}
                  accessibilityLabel="Keep favorite"
                  accessibilityRole="button"
                >
                  <Text style={styles.cancelButtonText}>Keep</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.deleteButton,
                    isLoading && styles.deleteButtonLoading,
                  ]}
                  onPress={handleConfirmDelete}
                  disabled={isLoading}
                  testID={`${testID}-delete-confirm-button`}
                  accessibilityLabel="Remove from favorites"
                  accessibilityRole="button"
                >
                  {isLoading ? (
                    <Text style={styles.deleteButtonText}>Removing...</Text>
                  ) : (
                    <Text style={styles.deleteButtonText}>Remove</Text>
                  )}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      </Modal>
    )
  }

  // Edit view
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
              <EditIcon />
              <Text style={styles.title} testID={`${testID}-title`}>
                Edit Favorite
              </Text>
              <TouchableOpacity
                onPress={handleCancel}
                style={styles.closeButton}
                disabled={isLoading}
                testID={`${testID}-close`}
                accessibilityLabel="Close"
                accessibilityRole="button"
              >
                <Text style={styles.closeButtonText}>{'\u2715'}</Text>
              </TouchableOpacity>
            </View>

            {/* Location Info */}
            <View style={styles.content}>
              <Text style={styles.sectionLabel}>Location</Text>
              <LocationInfo
                placeName={favorite.place_name}
                address={favorite.address}
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

              {/* Delete section */}
              <View style={styles.deleteSection}>
                <TouchableOpacity
                  style={styles.deleteTextButton}
                  onPress={handleDeletePress}
                  disabled={isLoading}
                  testID={`${testID}-delete`}
                  accessibilityLabel="Remove from favorites"
                  accessibilityRole="button"
                >
                  <Text style={styles.deleteTextButtonText}>
                    Remove from Favorites
                  </Text>
                </TouchableOpacity>
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
                accessibilityLabel="Save changes"
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
    maxHeight: '85%',
  },

  // Delete confirmation container
  deleteConfirmContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    marginHorizontal: 24,
    marginBottom: 100,
    padding: 24,
    alignItems: 'center',
  },

  // Header styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginLeft: 12,
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

  // Icon styles
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.locationBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerDanger: {
    backgroundColor: COLORS.dangerBackground,
  },
  iconText: {
    fontSize: 18,
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
    marginBottom: 16,
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

  // Delete section styles
  deleteSection: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'center',
  },
  deleteTextButton: {
    padding: 12,
  },
  deleteTextButtonText: {
    fontSize: 15,
    color: COLORS.danger,
    fontWeight: '500',
  },

  // Delete confirmation styles
  deleteConfirmHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteConfirmTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 12,
  },
  deleteConfirmText: {
    fontSize: 16,
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 12,
  },
  customNameHighlight: {
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  deleteConfirmSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  deleteConfirmActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
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
  deleteButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonLoading: {
    opacity: 0.7,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.background,
  },
})

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default EditFavoriteModal
