/**
 * ReportModal Component
 *
 * A modal dialog for reporting inappropriate content (posts, messages, or users).
 * Required for app store compliance and content moderation.
 *
 * Features:
 * - Reason selection from predefined list
 * - Optional additional details text input
 * - Loading state during submission
 * - Error and success feedback
 * - Accessible with proper labels
 *
 * @example
 * ```tsx
 * import { ReportModal } from 'components/ReportModal'
 *
 * // Report a post
 * <ReportModal
 *   visible={showReport}
 *   onClose={() => setShowReport(false)}
 *   reportedType="post"
 *   reportedId={post.id}
 *   onSuccess={() => Alert.alert('Thanks!', 'Your report has been submitted.')}
 * />
 *
 * // Report a message
 * <ReportModal
 *   visible={showReport}
 *   onClose={() => setShowReport(false)}
 *   reportedType="message"
 *   reportedId={message.id}
 * />
 * ```
 */

import React, { useState, useCallback, useEffect, memo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { useAuth } from '../contexts/AuthContext'
import { submitReport, REPORT_REASONS, MODERATION_ERRORS } from '../lib/moderation'
import { successFeedback, errorFeedback, selectionFeedback } from '../lib/haptics'
import type { ReportedType } from '../types/database'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Props for the ReportModal component
 */
export interface ReportModalProps {
  /**
   * Whether the modal is visible
   */
  visible: boolean

  /**
   * Callback when the modal is closed (canceled or successful)
   */
  onClose: () => void

  /**
   * Type of content being reported
   */
  reportedType: ReportedType

  /**
   * ID of the content being reported
   */
  reportedId: string

  /**
   * Optional callback when report is successfully submitted
   */
  onSuccess?: () => void

  /**
   * Optional title override
   * @default "Report Content"
   */
  title?: string

  /**
   * Test ID for testing purposes
   */
  testID?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Colors used in the ReportModal component
 */
const COLORS = {
  primary: '#007AFF',
  background: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.5)',
  border: '#E5E5EA',
  textPrimary: '#000000',
  textSecondary: '#8E8E93',
  textPlaceholder: '#C7C7CC',
  error: '#FF3B30',
  success: '#34C759',
  selectedBackground: '#E3F2FD',
  selectedBorder: '#007AFF',
} as const

/**
 * Maximum length for additional details
 */
const MAX_DETAILS_LENGTH = 500

/**
 * Report reason options with keys and labels
 */
const REASON_OPTIONS = [
  { key: 'SPAM', label: REPORT_REASONS.SPAM },
  { key: 'HARASSMENT', label: REPORT_REASONS.HARASSMENT },
  { key: 'INAPPROPRIATE', label: REPORT_REASONS.INAPPROPRIATE },
  { key: 'IMPERSONATION', label: REPORT_REASONS.IMPERSONATION },
  { key: 'VIOLENCE', label: REPORT_REASONS.VIOLENCE },
  { key: 'HATE_SPEECH', label: REPORT_REASONS.HATE_SPEECH },
  { key: 'OTHER', label: REPORT_REASONS.OTHER },
] as const

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get a user-friendly title based on report type
 */
function getDefaultTitle(reportedType: ReportedType): string {
  switch (reportedType) {
    case 'post':
      return 'Report Post'
    case 'message':
      return 'Report Message'
    case 'user':
      return 'Report User'
    default:
      return 'Report Content'
  }
}

/**
 * Get a description based on report type
 */
function getDescription(reportedType: ReportedType): string {
  switch (reportedType) {
    case 'post':
      return 'Why are you reporting this post?'
    case 'message':
      return 'Why are you reporting this message?'
    case 'user':
      return 'Why are you reporting this user?'
    default:
      return 'Why are you reporting this content?'
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * ReportModal - A modal for reporting content
 *
 * Provides a form for users to report inappropriate content with a reason
 * and optional additional details.
 */
export const ReportModal = memo(function ReportModal({
  visible,
  onClose,
  reportedType,
  reportedId,
  onSuccess,
  title,
  testID = 'report-modal',
}: ReportModalProps): JSX.Element {
  // ---------------------------------------------------------------------------
  // HOOKS
  // ---------------------------------------------------------------------------

  const { userId } = useAuth()

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [selectedReason, setSelectedReason] = useState<string | null>(null)
  const [additionalDetails, setAdditionalDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ---------------------------------------------------------------------------
  // RESET STATE WHEN MODAL OPENS
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (visible) {
      setSelectedReason(null)
      setAdditionalDetails('')
      setError(null)
      setSubmitting(false)
    }
  }, [visible])

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  /**
   * Handle reason selection
   */
  const handleSelectReason = useCallback((reason: string) => {
    selectionFeedback()
    setSelectedReason(reason)
    setError(null)
  }, [])

  /**
   * Handle additional details change
   */
  const handleDetailsChange = useCallback((text: string) => {
    setAdditionalDetails(text)
  }, [])

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async () => {
    // Validate selection
    if (!selectedReason) {
      errorFeedback()
      setError('Please select a reason for your report.')
      return
    }

    // Require additional details for "Other" reason
    if (selectedReason === REPORT_REASONS.OTHER && additionalDetails.trim().length === 0) {
      errorFeedback()
      setError('Please provide details for your report.')
      return
    }

    setSubmitting(true)
    setError(null)

    const result = await submitReport(
      userId,
      reportedType,
      reportedId,
      selectedReason,
      additionalDetails.trim() || null
    )

    setSubmitting(false)

    if (result.success) {
      successFeedback()
      onSuccess?.()
      onClose()
    } else {
      errorFeedback()
      setError(result.error || MODERATION_ERRORS.REPORT_FAILED)
    }
  }, [
    selectedReason,
    additionalDetails,
    userId,
    reportedType,
    reportedId,
    onSuccess,
    onClose,
  ])

  /**
   * Handle cancel
   */
  const handleCancel = useCallback(() => {
    if (!submitting) {
      onClose()
    }
  }, [submitting, onClose])

  // ---------------------------------------------------------------------------
  // COMPUTED
  // ---------------------------------------------------------------------------

  const modalTitle = title || getDefaultTitle(reportedType)
  const description = getDescription(reportedType)
  const canSubmit = selectedReason !== null && !submitting
  const showDetailsInput = selectedReason === REPORT_REASONS.OTHER || additionalDetails.length > 0

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

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
          onPress={handleCancel}
        >
          <TouchableOpacity
            style={styles.modalContainer}
            activeOpacity={1}
            onPress={() => {}} // Prevent closing when tapping inside
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title} testID={`${testID}-title`}>
                {modalTitle}
              </Text>
              <TouchableOpacity
                onPress={handleCancel}
                disabled={submitting}
                style={styles.closeButton}
                testID={`${testID}-close`}
                accessibilityLabel="Close"
                accessibilityRole="button"
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Description */}
              <Text style={styles.description} testID={`${testID}-description`}>
                {description}
              </Text>

              {/* Reason Options */}
              <View style={styles.reasonList} testID={`${testID}-reasons`}>
                {REASON_OPTIONS.map(({ key, label }) => {
                  const isSelected = selectedReason === label
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.reasonItem,
                        isSelected && styles.reasonItemSelected,
                      ]}
                      onPress={() => handleSelectReason(label)}
                      disabled={submitting}
                      testID={`${testID}-reason-${key.toLowerCase()}`}
                      accessibilityLabel={label}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                    >
                      <View
                        style={[
                          styles.radioButton,
                          isSelected && styles.radioButtonSelected,
                        ]}
                      >
                        {isSelected && <View style={styles.radioButtonInner} />}
                      </View>
                      <Text
                        style={[
                          styles.reasonText,
                          isSelected && styles.reasonTextSelected,
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              {/* Additional Details Input */}
              {showDetailsInput && (
                <View style={styles.detailsContainer}>
                  <Text style={styles.detailsLabel}>
                    Additional details {selectedReason === REPORT_REASONS.OTHER ? '(required)' : '(optional)'}
                  </Text>
                  <TextInput
                    style={styles.detailsInput}
                    value={additionalDetails}
                    onChangeText={handleDetailsChange}
                    placeholder="Provide more context about your report..."
                    placeholderTextColor={COLORS.textPlaceholder}
                    multiline
                    maxLength={MAX_DETAILS_LENGTH}
                    editable={!submitting}
                    testID={`${testID}-details-input`}
                    accessibilityLabel="Additional details"
                  />
                  <Text style={styles.characterCount}>
                    {additionalDetails.length}/{MAX_DETAILS_LENGTH}
                  </Text>
                </View>
              )}

              {/* Error Message */}
              {error && (
                <View style={styles.errorContainer} testID={`${testID}-error`}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
                disabled={submitting}
                testID={`${testID}-cancel`}
                accessibilityLabel="Cancel"
                accessibilityRole="button"
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  !canSubmit && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={!canSubmit}
                testID={`${testID}-submit`}
                accessibilityLabel="Submit report"
                accessibilityRole="button"
                accessibilityState={{ disabled: !canSubmit }}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Report</Text>
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
// PRESET VARIANTS
// ============================================================================

/**
 * ReportPostModal - Preset for reporting posts
 */
export const ReportPostModal = memo(function ReportPostModal(
  props: Omit<ReportModalProps, 'reportedType'>
): JSX.Element {
  return (
    <ReportModal
      {...props}
      reportedType="post"
      testID={props.testID ?? 'report-post-modal'}
    />
  )
})

/**
 * ReportMessageModal - Preset for reporting messages
 */
export const ReportMessageModal = memo(function ReportMessageModal(
  props: Omit<ReportModalProps, 'reportedType'>
): JSX.Element {
  return (
    <ReportModal
      {...props}
      reportedType="message"
      testID={props.testID ?? 'report-message-modal'}
    />
  )
})

/**
 * ReportUserModal - Preset for reporting users
 */
export const ReportUserModal = memo(function ReportUserModal(
  props: Omit<ReportModalProps, 'reportedType'>
): JSX.Element {
  return (
    <ReportModal
      {...props}
      reportedType="user"
      testID={props.testID ?? 'report-user-modal'}
    />
  )
})

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  overlayTouchable: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    maxHeight: '90%',
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
  },
  closeButton: {
    padding: 8,
    marginRight: -8,
  },
  closeButtonText: {
    fontSize: 24,
    color: COLORS.textSecondary,
    fontWeight: '300',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 16,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  reasonList: {
    gap: 8,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  reasonItemSelected: {
    backgroundColor: COLORS.selectedBackground,
    borderColor: COLORS.selectedBorder,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.textSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radioButtonSelected: {
    borderColor: COLORS.primary,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  reasonText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    flex: 1,
  },
  reasonTextSelected: {
    fontWeight: '500',
  },
  detailsContainer: {
    gap: 8,
  },
  detailsLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  detailsInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.error,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
})