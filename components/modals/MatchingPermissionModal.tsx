/**
 * MatchingPermissionModal
 *
 * Modal shown when a user tries to respond to a post they don't have
 * permission to match. Explains that they must be a Regular or have
 * checked in within 24 hours of the post time.
 *
 * @example
 * ```tsx
 * <MatchingPermissionModal
 *   visible={!canMatch}
 *   locationName="Coffee Shop"
 *   onCheckIn={handleCheckIn}
 *   onClose={() => setVisible(false)}
 * />
 * ```
 */

import React, { useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  type ViewStyle,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { Button, OutlineButton } from '../Button'
import { selectionFeedback } from '../../lib/haptics'

// ============================================================================
// TYPES
// ============================================================================

export interface MatchingPermissionModalProps {
  /** Whether the modal is visible */
  visible: boolean
  /** Name of the location */
  locationName: string
  /** Callback to check in to the location */
  onCheckIn?: () => void
  /** Callback when modal is closed */
  onClose: () => void
  /** Test ID for testing */
  testID?: string
}

// ============================================================================
// COMPONENT
// ============================================================================

export function MatchingPermissionModal({
  visible,
  locationName,
  onCheckIn,
  onClose,
  testID = 'matching-permission-modal',
}: MatchingPermissionModalProps): React.ReactNode {
  /**
   * Handle check-in press
   */
  const handleCheckIn = useCallback(async () => {
    await selectionFeedback()
    onClose()
    if (onCheckIn) {
      onCheckIn()
    }
  }, [onClose, onCheckIn])

  /**
   * Handle close
   */
  const handleClose = useCallback(async () => {
    await selectionFeedback()
    onClose()
  }, [onClose])

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content} testID={testID}>
          {/* Close button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            testID={`${testID}-close`}
          >
            <Ionicons name="close" size={24} color="#8E8E93" />
          </TouchableOpacity>

          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="heart-outline" size={48} color="#FF6B47" />
          </View>

          {/* Title */}
          <Text style={styles.title}>Can't Respond Yet</Text>

          {/* Message */}
          <Text style={styles.message}>
            To respond to this post, you must be a{' '}
            <Text style={styles.bold}>Regular</Text> at{' '}
            <Text style={styles.locationName}>{locationName}</Text> or have{' '}
            <Text style={styles.bold}>checked in within 24 hours</Text> of when this post was created.
          </Text>

          {/* Info box */}
          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="shield-checkmark" size={20} color="#2E7D32" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Why This Requirement?</Text>
                <Text style={styles.infoText}>
                  This helps ensure authentic connections with people who were actually at the same location around the same time.
                </Text>
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            {onCheckIn && (
              <Button
                title="Check In Now"
                onPress={handleCheckIn}
                fullWidth
                testID={`${testID}-checkin`}
              />
            )}
            <OutlineButton
              title="Got it"
              onPress={handleClose}
              fullWidth
              style={styles.closeAction as ViewStyle}
              testID={`${testID}-close-button`}
            />
          </View>
        </View>
      </View>
    </Modal>
  )
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  bold: {
    fontWeight: '600',
    color: '#333333',
  },
  locationName: {
    fontWeight: '600',
    color: '#FF6B47',
  },
  infoBox: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 2,
  },
  infoText: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
  },
  actions: {
    gap: 10,
  },
  closeAction: {
    marginTop: 0,
  },
})

export default MatchingPermissionModal
