/**
 * CreateHangoutModal Component
 *
 * Modal form for creating a new group hangout.
 * Includes fields for title, description, vibe, time, and max attendees.
 *
 * Features:
 * - Horizontal vibe selector (chip row)
 * - Time preset buttons (In 1 hour, Tonight, Tomorrow, Custom)
 * - Attendee count stepper (2-20)
 * - Form validation
 * - Success toast feedback
 * - Dark theme styling
 *
 * @example
 * ```tsx
 * <CreateHangoutModal
 *   visible={showModal}
 *   onClose={() => setShowModal(false)}
 *   locationId={currentLocationId}
 *   locationName={currentLocationName}
 * />
 * ```
 */

import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { addHours, setHours, setMinutes, addDays, startOfTomorrow } from 'date-fns'

import { darkTheme } from '../constants/glassStyles'
import { spacing } from '../constants/theme'
import { selectionFeedback } from '../lib/haptics'
import { useToast } from '../contexts/ToastContext'
import { useHangouts } from '../hooks/useHangouts'
import type { HangoutVibe } from '../types/database'

// ============================================================================
// TYPES
// ============================================================================

export interface CreateHangoutModalProps {
  /** Whether the modal is visible */
  visible: boolean
  /** Callback when modal is closed */
  onClose: () => void
  /** Location ID for the hangout */
  locationId: string
  /** Location name for display */
  locationName: string
  /** Test ID for testing */
  testID?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Available vibes */
const VIBE_OPTIONS: Array<{ value: HangoutVibe; label: string; emoji: string }> = [
  { value: 'chill', label: 'Chill', emoji: '🧊' },
  { value: 'party', label: 'Party', emoji: '🎉' },
  { value: 'adventure', label: 'Adventure', emoji: '🏔️' },
  { value: 'food', label: 'Food', emoji: '🍕' },
  { value: 'creative', label: 'Creative', emoji: '🎨' },
  { value: 'active', label: 'Active', emoji: '⚡' },
]

/** Time preset options */
const TIME_PRESETS = [
  { label: 'In 1 hour', value: () => addHours(new Date(), 1) },
  { label: 'Tonight', value: () => setHours(setMinutes(new Date(), 0), 19) },
  { label: 'Tomorrow', value: () => setHours(startOfTomorrow(), 12) },
]

// ============================================================================
// COMPONENT
// ============================================================================

export function CreateHangoutModal({
  visible,
  onClose,
  locationId,
  locationName,
  testID = 'create-hangout-modal',
}: CreateHangoutModalProps): React.ReactNode {
  const { showToast } = useToast()
  const { createHangout } = useHangouts()

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [vibe, setVibe] = useState<HangoutVibe | null>('chill')
  const [scheduledFor, setScheduledFor] = useState<Date>(addHours(new Date(), 1))
  const [maxAttendees, setMaxAttendees] = useState(8)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleClose = useCallback(async () => {
    await selectionFeedback()
    // Reset form
    setTitle('')
    setDescription('')
    setVibe('chill')
    setScheduledFor(addHours(new Date(), 1))
    setMaxAttendees(8)
    onClose()
  }, [onClose])

  const handleVibeSelect = useCallback(async (selectedVibe: HangoutVibe) => {
    await selectionFeedback()
    setVibe(selectedVibe)
  }, [])

  const handleTimePreset = useCallback(async (presetFn: () => Date) => {
    await selectionFeedback()
    setScheduledFor(presetFn())
  }, [])

  const handleIncrementAttendees = useCallback(async () => {
    await selectionFeedback()
    setMaxAttendees((prev) => Math.min(prev + 1, 20))
  }, [])

  const handleDecrementAttendees = useCallback(async () => {
    await selectionFeedback()
    setMaxAttendees((prev) => Math.max(prev - 1, 2))
  }, [])

  const handleSubmit = useCallback(async () => {
    // Validate
    if (!title.trim()) {
      showToast({
        message: 'Please enter a title',
        variant: 'warning',
      })
      return
    }

    if (title.length > 100) {
      showToast({
        message: 'Title must be 100 characters or less',
        variant: 'warning',
      })
      return
    }

    if (description.length > 500) {
      showToast({
        message: 'Description must be 500 characters or less',
        variant: 'warning',
      })
      return
    }

    if (scheduledFor <= new Date()) {
      showToast({
        message: 'Hangout must be scheduled in the future',
        variant: 'warning',
      })
      return
    }

    setIsSubmitting(true)

    try {
      await createHangout({
        location_id: locationId,
        title: title.trim(),
        description: description.trim() || null,
        vibe,
        scheduled_for: scheduledFor.toISOString(),
        max_attendees: maxAttendees,
      })

      await selectionFeedback()
      showToast({
        message: 'Hangout created successfully!',
        variant: 'success',
      })

      handleClose()
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Failed to create hangout',
        variant: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [
    title,
    description,
    vibe,
    scheduledFor,
    maxAttendees,
    locationId,
    createHangout,
    showToast,
    handleClose,
  ])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
      testID={testID}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />

        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Create Hangout</Text>
            <TouchableOpacity
              onPress={handleClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              testID={`${testID}-close`}
            >
              <Ionicons name="close" size={28} color={darkTheme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Location Display */}
          <View style={styles.locationBanner}>
            <Ionicons name="location" size={16} color={darkTheme.accent} />
            <Text style={styles.locationName}>{locationName}</Text>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.form}
            showsVerticalScrollIndicator={false}
          >
            {/* Title Input */}
            <View style={styles.field}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="Coffee & code meetup"
                placeholderTextColor={darkTheme.textMuted}
                value={title}
                onChangeText={setTitle}
                maxLength={100}
                testID={`${testID}-title-input`}
              />
            </View>

            {/* Description Input */}
            <View style={styles.field}>
              <Text style={styles.label}>Description (optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Let's grab coffee and work on projects together"
                placeholderTextColor={darkTheme.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                maxLength={500}
                testID={`${testID}-description-input`}
              />
            </View>

            {/* Vibe Selector */}
            <View style={styles.field}>
              <Text style={styles.label}>Vibe</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.vibeRow}
              >
                {VIBE_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.vibeChip,
                      vibe === option.value && styles.vibeChipSelected,
                    ]}
                    onPress={() => handleVibeSelect(option.value)}
                    activeOpacity={0.7}
                    testID={`${testID}-vibe-${option.value}`}
                  >
                    <Text style={styles.vibeEmoji}>{option.emoji}</Text>
                    <Text
                      style={[
                        styles.vibeLabel,
                        vibe === option.value && styles.vibeLabelSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Time Presets */}
            <View style={styles.field}>
              <Text style={styles.label}>When</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.timeRow}
              >
                {TIME_PRESETS.map((preset) => (
                  <TouchableOpacity
                    key={preset.label}
                    style={styles.timeChip}
                    onPress={() => handleTimePreset(preset.value)}
                    activeOpacity={0.7}
                    testID={`${testID}-time-${preset.label.replace(/\s/g, '-')}`}
                  >
                    <Text style={styles.timeLabel}>{preset.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Max Attendees Stepper */}
            <View style={styles.field}>
              <Text style={styles.label}>Max Attendees</Text>
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={handleDecrementAttendees}
                  disabled={maxAttendees <= 2}
                  testID={`${testID}-decrement`}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name="remove"
                    size={20}
                    color={maxAttendees <= 2 ? darkTheme.textMuted : darkTheme.textPrimary}
                  />
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{maxAttendees}</Text>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={handleIncrementAttendees}
                  disabled={maxAttendees >= 20}
                  testID={`${testID}-increment`}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name="add"
                    size={20}
                    color={maxAttendees >= 20 ? darkTheme.textMuted : darkTheme.textPrimary}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* Create Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.createButton, isSubmitting && styles.createButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.8}
              testID={`${testID}-submit`}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.createButtonText}>Create Hangout</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContainer: {
    backgroundColor: darkTheme.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[5],
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.cardBorder,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: darkTheme.textPrimary,
  },
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.cardBorder,
  },
  locationName: {
    fontSize: 14,
    fontWeight: '600',
    color: darkTheme.accent,
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  form: {
    padding: spacing[5],
    gap: spacing[5],
  },
  field: {
    gap: spacing[2],
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: darkTheme.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: darkTheme.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: darkTheme.cardBorder,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: 15,
    color: darkTheme.textPrimary,
  },
  textArea: {
    minHeight: 80,
    paddingTop: spacing[3],
    textAlignVertical: 'top',
  },
  vibeRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  vibeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[2],
    borderRadius: 20,
    backgroundColor: darkTheme.surface,
    borderWidth: 1,
    borderColor: darkTheme.cardBorder,
  },
  vibeChipSelected: {
    backgroundColor: darkTheme.primary,
    borderColor: darkTheme.primary,
  },
  vibeEmoji: {
    fontSize: 16,
  },
  vibeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: darkTheme.textSecondary,
  },
  vibeLabelSelected: {
    color: '#FFFFFF',
  },
  timeRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  timeChip: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2.5],
    borderRadius: 12,
    backgroundColor: darkTheme.surface,
    borderWidth: 1,
    borderColor: darkTheme.cardBorder,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: darkTheme.textPrimary,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    alignSelf: 'flex-start',
  },
  stepperButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: darkTheme.surface,
    borderWidth: 1,
    borderColor: darkTheme.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    fontSize: 18,
    fontWeight: '700',
    color: darkTheme.textPrimary,
    minWidth: 40,
    textAlign: 'center',
  },
  footer: {
    padding: spacing[5],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: darkTheme.cardBorder,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: darkTheme.primary,
    borderRadius: 14,
    paddingVertical: spacing[3.5],
    ...Platform.select({
      ios: {
        shadowColor: darkTheme.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
})
