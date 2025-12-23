/**
 * TermsModal Component
 *
 * A modal dialog for displaying terms of service and privacy policy acceptance.
 * Required for app store compliance and legal requirements.
 * Includes age verification (18+) checkbox.
 *
 * Features:
 * - Age verification (18+) checkbox
 * - Terms of Service acceptance
 * - Privacy Policy acceptance
 * - Scrollable terms content
 * - Required acceptance before proceeding
 * - Accessible with proper labels
 *
 * @example
 * ```tsx
 * import { TermsModal } from 'components/TermsModal'
 *
 * <TermsModal
 *   visible={showTerms}
 *   onAccept={() => {
 *     setShowTerms(false)
 *     proceedWithSignup()
 *   }}
 *   onDecline={() => setShowTerms(false)}
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
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native'
import { selectionFeedback } from '../lib/haptics'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Props for the TermsModal component
 */
export interface TermsModalProps {
  /**
   * Whether the modal is visible
   */
  visible: boolean

  /**
   * Callback when user accepts all terms
   */
  onAccept: () => void

  /**
   * Callback when user declines (closes modal)
   */
  onDecline: () => void

  /**
   * Test ID for testing purposes
   */
  testID?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Colors used in the TermsModal component
 */
const COLORS = {
  primary: '#007AFF',
  background: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.5)',
  border: '#E5E5EA',
  textPrimary: '#000000',
  textSecondary: '#8E8E93',
  textLink: '#007AFF',
  error: '#FF3B30',
  checkboxActive: '#007AFF',
  checkboxInactive: '#C7C7CC',
  termsBackground: '#F9F9F9',
} as const

/**
 * Minimum age requirement
 */
const MINIMUM_AGE = 18

/**
 * Privacy policy and terms URLs - update with actual URLs
 */
const LEGAL_URLS = {
  termsOfService: 'https://loveledger.app/terms',
  privacyPolicy: 'https://loveledger.app/privacy',
} as const

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

/**
 * Checkbox component for terms acceptance
 */
interface CheckboxProps {
  checked: boolean
  onToggle: () => void
  label: React.ReactNode
  testID?: string
  disabled?: boolean
}

const Checkbox = memo(function Checkbox({
  checked,
  onToggle,
  label,
  testID,
  disabled = false,
}: CheckboxProps): JSX.Element {
  return (
    <TouchableOpacity
      style={styles.checkboxContainer}
      onPress={onToggle}
      disabled={disabled}
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
    >
      <View
        style={[
          styles.checkbox,
          checked && styles.checkboxChecked,
          disabled && styles.checkboxDisabled,
        ]}
      >
        {checked && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <View style={styles.checkboxLabelContainer}>{label}</View>
    </TouchableOpacity>
  )
})

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * TermsModal - A modal for terms acceptance and age verification
 *
 * Requires users to confirm they are 18+ and accept terms of service
 * and privacy policy before proceeding with signup.
 */
export const TermsModal = memo(function TermsModal({
  visible,
  onAccept,
  onDecline,
  testID = 'terms-modal',
}: TermsModalProps): JSX.Element {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [isAgeConfirmed, setIsAgeConfirmed] = useState(false)
  const [isTermsAccepted, setIsTermsAccepted] = useState(false)
  const [isPrivacyAccepted, setIsPrivacyAccepted] = useState(false)

  // ---------------------------------------------------------------------------
  // RESET STATE WHEN MODAL OPENS
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (visible) {
      setIsAgeConfirmed(false)
      setIsTermsAccepted(false)
      setIsPrivacyAccepted(false)
    }
  }, [visible])

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  /**
   * Toggle age confirmation
   */
  const handleAgeToggle = useCallback(() => {
    selectionFeedback()
    setIsAgeConfirmed((prev) => !prev)
  }, [])

  /**
   * Toggle terms acceptance
   */
  const handleTermsToggle = useCallback(() => {
    selectionFeedback()
    setIsTermsAccepted((prev) => !prev)
  }, [])

  /**
   * Toggle privacy acceptance
   */
  const handlePrivacyToggle = useCallback(() => {
    selectionFeedback()
    setIsPrivacyAccepted((prev) => !prev)
  }, [])

  /**
   * Open terms of service link
   */
  const handleOpenTerms = useCallback(async () => {
    try {
      const supported = await Linking.canOpenURL(LEGAL_URLS.termsOfService)
      if (supported) {
        await Linking.openURL(LEGAL_URLS.termsOfService)
      }
    } catch {
      // Silently fail if URL cannot be opened
    }
  }, [])

  /**
   * Open privacy policy link
   */
  const handleOpenPrivacy = useCallback(async () => {
    try {
      const supported = await Linking.canOpenURL(LEGAL_URLS.privacyPolicy)
      if (supported) {
        await Linking.openURL(LEGAL_URLS.privacyPolicy)
      }
    } catch {
      // Silently fail if URL cannot be opened
    }
  }, [])

  /**
   * Handle accept button press
   */
  const handleAccept = useCallback(() => {
    if (isAgeConfirmed && isTermsAccepted && isPrivacyAccepted) {
      selectionFeedback()
      onAccept()
    }
  }, [isAgeConfirmed, isTermsAccepted, isPrivacyAccepted, onAccept])

  // ---------------------------------------------------------------------------
  // COMPUTED
  // ---------------------------------------------------------------------------

  const canAccept = isAgeConfirmed && isTermsAccepted && isPrivacyAccepted

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onDecline}
      testID={testID}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={onDecline}
        >
          <TouchableOpacity
            style={styles.modalContainer}
            activeOpacity={1}
            onPress={() => {}} // Prevent closing when tapping inside
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title} testID={`${testID}-title`}>
                Terms & Conditions
              </Text>
              <TouchableOpacity
                onPress={onDecline}
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
              showsVerticalScrollIndicator={true}
            >
              {/* Introduction */}
              <Text style={styles.introText} testID={`${testID}-intro`}>
                Before creating your account, please review and accept our terms of service and privacy policy.
              </Text>

              {/* Age Verification Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Age Verification</Text>
                <View style={styles.ageNotice}>
                  <Text style={styles.ageNoticeIcon}>⚠️</Text>
                  <Text style={styles.ageNoticeText}>
                    Love Ledger is intended for users who are {MINIMUM_AGE} years of age or older.
                    By proceeding, you confirm that you meet this age requirement.
                  </Text>
                </View>
                <Checkbox
                  checked={isAgeConfirmed}
                  onToggle={handleAgeToggle}
                  testID={`${testID}-age-checkbox`}
                  label={
                    <Text style={styles.checkboxLabel}>
                      I confirm that I am at least{' '}
                      <Text style={styles.highlight}>{MINIMUM_AGE} years old</Text>
                    </Text>
                  }
                />
              </View>

              {/* Terms Summary */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Terms of Service</Text>
                <View style={styles.termsSummary}>
                  <Text style={styles.termsSummaryText}>
                    By using Love Ledger, you agree to:
                  </Text>
                  <View style={styles.termsList}>
                    <Text style={styles.termsListItem}>• Use the app respectfully and lawfully</Text>
                    <Text style={styles.termsListItem}>• Not post harmful or inappropriate content</Text>
                    <Text style={styles.termsListItem}>• Respect other users' privacy and boundaries</Text>
                    <Text style={styles.termsListItem}>• Accept that we may remove content or accounts that violate our policies</Text>
                  </View>
                  <TouchableOpacity
                    onPress={handleOpenTerms}
                    testID={`${testID}-terms-link`}
                    accessibilityLabel="Read full Terms of Service"
                    accessibilityRole="link"
                  >
                    <Text style={styles.linkText}>Read full Terms of Service →</Text>
                  </TouchableOpacity>
                </View>
                <Checkbox
                  checked={isTermsAccepted}
                  onToggle={handleTermsToggle}
                  testID={`${testID}-terms-checkbox`}
                  label={
                    <Text style={styles.checkboxLabel}>
                      I have read and agree to the{' '}
                      <Text style={styles.linkInline}>Terms of Service</Text>
                    </Text>
                  }
                />
              </View>

              {/* Privacy Policy Summary */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Privacy Policy</Text>
                <View style={styles.termsSummary}>
                  <Text style={styles.termsSummaryText}>
We respect your privacy. Here's how we handle your data:
                  </Text>
                  <View style={styles.termsList}>
                    <Text style={styles.termsListItem}>• We collect location data only when you create posts</Text>
                    <Text style={styles.termsListItem}>• Your selfies are stored privately for verification only</Text>
                    <Text style={styles.termsListItem}>• Anonymous chats do not reveal your identity</Text>
                    <Text style={styles.termsListItem}>• You can delete your account and data at any time</Text>
                  </View>
                  <TouchableOpacity
                    onPress={handleOpenPrivacy}
                    testID={`${testID}-privacy-link`}
                    accessibilityLabel="Read full Privacy Policy"
                    accessibilityRole="link"
                  >
                    <Text style={styles.linkText}>Read full Privacy Policy →</Text>
                  </TouchableOpacity>
                </View>
                <Checkbox
                  checked={isPrivacyAccepted}
                  onToggle={handlePrivacyToggle}
                  testID={`${testID}-privacy-checkbox`}
                  label={
                    <Text style={styles.checkboxLabel}>
                      I have read and agree to the{' '}
                      <Text style={styles.linkInline}>Privacy Policy</Text>
                    </Text>
                  }
                />
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.declineButton}
                onPress={onDecline}
                testID={`${testID}-decline`}
                accessibilityLabel="Decline and close"
                accessibilityRole="button"
              >
                <Text style={styles.declineButtonText}>Decline</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.acceptButton,
                  !canAccept && styles.acceptButtonDisabled,
                ]}
                onPress={handleAccept}
                disabled={!canAccept}
                testID={`${testID}-accept`}
                accessibilityLabel="Accept terms and continue"
                accessibilityRole="button"
                accessibilityState={{ disabled: !canAccept }}
              >
                <Text
                  style={[
                    styles.acceptButtonText,
                    !canAccept && styles.acceptButtonTextDisabled,
                  ]}
                >
                  Accept & Continue
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  )
})

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if user has completed age verification and terms acceptance
 * This can be stored in user profile or local storage
 */
export function hasAcceptedTerms(acceptedAt: string | null): boolean {
  return acceptedAt !== null
}

/**
 * Get current timestamp for terms acceptance
 */
export function getTermsAcceptanceTimestamp(): string {
  return new Date().toISOString()
}

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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
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
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  introText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  ageNotice: {
    flexDirection: 'row',
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  ageNoticeIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  ageNoticeText: {
    flex: 1,
    fontSize: 13,
    color: '#856404',
    lineHeight: 18,
  },
  termsSummary: {
    backgroundColor: COLORS.termsBackground,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  termsSummaryText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '500',
    marginBottom: 8,
  },
  termsList: {
    marginBottom: 12,
  },
  termsListItem: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 6,
    lineHeight: 16,
  },
  linkText: {
    fontSize: 13,
    color: COLORS.textLink,
    fontWeight: '500',
  },
  linkInline: {
    color: COLORS.textLink,
    fontWeight: '500',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.checkboxInactive,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: COLORS.checkboxActive,
    borderColor: COLORS.checkboxActive,
  },
  checkboxDisabled: {
    opacity: 0.5,
  },
  checkmark: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: '600',
  },
  checkboxLabelContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  checkboxLabel: {
    fontSize: 13,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  highlight: {
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  declineButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  acceptButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButtonDisabled: {
    backgroundColor: COLORS.checkboxInactive,
  },
  acceptButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.background,
  },
  acceptButtonTextDisabled: {
    color: COLORS.textSecondary,
  },
})