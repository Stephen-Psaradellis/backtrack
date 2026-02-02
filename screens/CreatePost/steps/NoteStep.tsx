/**
 * NoteStep Component
 *
 * Third step in the CreatePost wizard flow. Allows the user to write a
 * personalized note/message for their missed connection. Features an avatar
 * preview showing who they're writing to, a multi-line text input, and
 * character counter with validation feedback.
 *
 * Features:
 * - Avatar preview showing the target person
 * - Multi-line text input with placeholder
 * - Character counter (remaining/needed)
 * - Minimum length validation (MIN_NOTE_LENGTH)
 * - Maximum length enforcement (MAX_NOTE_LENGTH)
 * - KeyboardAvoidingView for proper keyboard handling
 *
 * @example
 * ```tsx
 * <NoteStep
 *   avatarConfig={formData.targetAvatar}
 *   note={formData.note}
 *   onNoteChange={handleNoteChange}
 *   onNext={handleNext}
 *   onBack={handleBack}
 * />
 * ```
 */

import React, { memo } from 'react'
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  StyleSheet,
  Platform,
} from 'react-native'

import { Avatar, type StoredAvatar } from 'react-native-bitmoji'
import { Button, OutlineButton } from '../../../components/Button'
import { MIN_NOTE_LENGTH, MAX_NOTE_LENGTH } from '../types'
import { COLORS, sharedStyles } from '../styles'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Props for the NoteStep component
 */
export interface NoteStepProps {
  /**
   * Avatar for the target person preview
   */
  avatar: StoredAvatar | null

  /**
   * Current note text value
   */
  note: string

  /**
   * Callback fired when note text changes
   * @param text - The new note text
   */
  onNoteChange: (text: string) => void

  /**
   * Callback when user wants to proceed to next step
   */
  onNext: () => void

  /**
   * Callback when user wants to go back to previous step
   */
  onBack: () => void

  /**
   * Test ID prefix for testing purposes
   * @default 'create-post'
   */
  testID?: string
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * NoteStep - Note writing step in the CreatePost wizard
 *
 * Displays:
 * 1. Avatar preview showing who the user is writing to
 * 2. Multi-line text input for the note
 * 3. Character counter with validation feedback
 * 4. Back/Next navigation buttons
 */
export const NoteStep = memo(function NoteStep({
  avatar,
  note,
  onNoteChange,
  onNext,
  onBack,
  testID = 'create-post',
}: NoteStepProps): JSX.Element {
  // ---------------------------------------------------------------------------
  // COMPUTED VALUES
  // ---------------------------------------------------------------------------

  const noteLength = note.trim().length
  const isValid = noteLength >= MIN_NOTE_LENGTH
  const remaining = MAX_NOTE_LENGTH - note.length

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

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
            {avatar && <Avatar config={avatar.config} size="md" />}
          </View>
          <Text style={styles.avatarPreviewLabel}>
            You're writing to this person
          </Text>
        </View>

        {/* Note input */}
        <View style={styles.noteInputContainer}>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={onNoteChange}
            placeholder="Write something memorable... What caught your eye? What would you like to say?"
            placeholderTextColor={COLORS.textSecondary}
            multiline
            maxLength={MAX_NOTE_LENGTH}
            autoFocus
            textAlignVertical="top"
            testID={`${testID}-note-input`}
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
        <View style={sharedStyles.stepActions}>
          <OutlineButton
            title="Back"
            onPress={onBack}
            testID={`${testID}-note-back`}
          />
          <Button
            title="Next"
            onPress={onNext}
            disabled={!isValid}
            testID={`${testID}-note-next`}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
})

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  /**
   * Container with KeyboardAvoidingView
   */
  noteContainer: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
  },

  /**
   * Scrollable content area
   */
  noteScroll: {
    flex: 1,
  },

  /**
   * Scroll content with padding
   */
  noteScrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  /**
   * Row containing avatar preview and label
   */
  avatarPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 16,
    backgroundColor: COLORS.background,
    borderRadius: 12,
  },

  /**
   * Wrapper for avatar preview with spacing
   */
  avatarPreviewWrapper: {
    marginRight: 16,
  },

  /**
   * Label text next to avatar preview
   */
  avatarPreviewLabel: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },

  /**
   * Container for the note text input
   */
  noteInputContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    minHeight: 200,
    marginBottom: 12,
  },

  /**
   * Multi-line text input for note
   */
  noteInput: {
    fontSize: 16,
    color: COLORS.textPrimary,
    lineHeight: 24,
    minHeight: 160,
  },

  /**
   * Footer container for character count
   */
  noteFooter: {
    marginBottom: 20,
  },

  /**
   * Character count text (valid state)
   */
  noteCount: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },

  /**
   * Character count text (invalid state - needs more characters)
   */
  noteCountInvalid: {
    color: COLORS.error,
  },
})

// ============================================================================
// EXPORTS
// ============================================================================

export default NoteStep
