/**
 * PostingPermissionModal
 *
 * Modal shown when a user tries to post at a location they don't have
 * permission to post at. Explains that they must be a Regular or have
 * checked in within 12 hours.
 *
 * @example
 * ```tsx
 * <PostingPermissionModal
 *   visible={!canPost}
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

export interface PostingPermissionModalProps {
  /** Whether the modal is visible */
  visible: boolean
  /** Name of the location */
  locationName: string
  /** Callback to check in to the location */
  onCheckIn?: () => void
  /** Callback to view regulars info */
  onViewRegulars?: () => void
  /** Callback when modal is closed */
  onClose: () => void
  /** Test ID for testing */
  testID?: string
}

// ============================================================================
// COMPONENT
// ============================================================================

export function PostingPermissionModal({
  visible,
  locationName,
  onCheckIn,
  onViewRegulars,
  onClose,
  testID = 'posting-permission-modal',
}: PostingPermissionModalProps): React.ReactNode {
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
            <Ionicons name="location-outline" size={48} color="#FF6B47" />
          </View>

          {/* Title */}
          <Text style={styles.title}>Can't Post Here Yet</Text>

          {/* Message */}
          <Text style={styles.message}>
            Only <Text style={styles.bold}>Regulars</Text> of{' '}
            <Text style={styles.locationName}>{locationName}</Text> or users who have{' '}
            <Text style={styles.bold}>checked in within the last 12 hours</Text> can post here.
          </Text>

          {/* Info box */}
          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="checkmark-circle" size={20} color="#2E7D32" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Become a Regular</Text>
                <Text style={styles.infoText}>
                  Visit {locationName} regularly to become a Regular and unlock posting
                </Text>
              </View>
            </View>
            <View style={styles.infoSeparator} />
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="location" size={20} color="#FF6B47" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Check In Now</Text>
                <Text style={styles.infoText}>
                  Check in when you're at {locationName} to post immediately
                </Text>
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            {onCheckIn && (
              <Button
                title="Check In to Post"
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
  infoSeparator: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 12,
  },
  actions: {
    gap: 10,
  },
  closeAction: {
    marginTop: 0,
  },
})

export default PostingPermissionModal
