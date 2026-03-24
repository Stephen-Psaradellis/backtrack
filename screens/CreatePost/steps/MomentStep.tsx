/**
 * MomentStep Component (Moment 2: Who & What)
 *
 * Second step in the 3-moment CreatePost wizard flow.
 * Uses guided prompt UI for AI avatar generation via Recraft.
 */

import React, { memo, useCallback, useState, useMemo } from 'react'
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
  ViewStyle,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { AvatarDisplay } from '../../../components/AvatarDisplay'
import { AvatarCreationStep } from '../../../components/onboarding/AvatarCreationStep'
import {
  type StoredAvatar,
  hasGeneratedAvatar,
} from '../../../types/avatar'
import { Button, OutlineButton } from '../../../components/Button'
import { lightFeedback, successFeedback } from '../../../lib/haptics'
import { MIN_NOTE_LENGTH, MAX_NOTE_LENGTH } from '../types'
import { COLORS } from '../styles'
import { screenPostContent } from '../../../lib/utils/contentScreening'

// ============================================================================
// TYPES
// ============================================================================

export interface MomentStepProps {
  avatar: StoredAvatar | null
  note: string
  onAvatarChange: (avatar: StoredAvatar) => void
  onNoteChange: (text: string) => void
  onNext: () => void
  onBack: () => void
  testID?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const NOTE_PLACEHOLDERS = [
  'What caught your eye about them?',
  'What would you say if you saw them again?',
  'What made this moment memorable?',
]

// ============================================================================
// COMPONENT
// ============================================================================

export const MomentStep = memo(function MomentStep({
  avatar,
  note,
  onAvatarChange,
  onNoteChange,
  onNext,
  onBack,
  testID = 'create-post',
}: MomentStepProps): JSX.Element {
  const [showAvatarCreator, setShowAvatarCreator] = useState(false)

  const noteLength = note.trim().length
  const isNoteValid = noteLength >= MIN_NOTE_LENGTH
  const isAvatarValid = avatar !== null && hasGeneratedAvatar(avatar)

  const screeningResult = useMemo(() => screenPostContent(note), [note])
  const canProceed = isAvatarValid && isNoteValid && !screeningResult.isBlocked
  const remaining = MAX_NOTE_LENGTH - note.length

  const [placeholder] = useState(() =>
    NOTE_PLACEHOLDERS[Math.floor(Math.random() * NOTE_PLACEHOLDERS.length)]
  )

  const handleOpenAvatarCreator = useCallback(async () => {
    await lightFeedback()
    setShowAvatarCreator(true)
  }, [])

  const handleAvatarComplete = useCallback(async (newAvatar: StoredAvatar) => {
    await successFeedback()
    onAvatarChange(newAvatar)
    setShowAvatarCreator(false)
  }, [onAvatarChange])

  const handleAvatarCancel = useCallback(() => {
    setShowAvatarCreator(false)
  }, [])

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <Text style={styles.sectionTitle}>Who did you see?</Text>

          <TouchableOpacity
            style={styles.avatarPreview}
            onPress={handleOpenAvatarCreator}
            activeOpacity={0.8}
            testID={`${testID}-avatar-preview`}
          >
            {avatar && hasGeneratedAvatar(avatar) ? (
              <AvatarDisplay avatar={avatar} size="lg" />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person-outline" size={64} color={COLORS.textSecondary} />
                <Text style={styles.avatarPlaceholderText}>Tap to describe person</Text>
              </View>
            )}

            <View style={styles.customizeIndicator}>
              <Ionicons name="pencil" size={16} color={COLORS.background} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.customizeButton}
            onPress={handleOpenAvatarCreator}
            testID={`${testID}-customize-avatar`}
          >
            <Ionicons name="color-palette-outline" size={18} color={COLORS.primary} />
            <Text style={styles.customizeButtonText}>
              {avatar && hasGeneratedAvatar(avatar) ? 'Change Description' : 'Describe Person'}
            </Text>
          </TouchableOpacity>

          {!isAvatarValid && (
            <View style={styles.requiredHint}>
              <Text style={styles.requiredHintText}>Avatar is required</Text>
            </View>
          )}
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>What would you say to them?</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Note Section */}
        <View style={styles.noteSection}>
          <View style={styles.noteInputContainer}>
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={onNoteChange}
              placeholder={placeholder}
              placeholderTextColor={COLORS.textSecondary}
              multiline
              maxLength={MAX_NOTE_LENGTH}
              textAlignVertical="top"
              testID={`${testID}-note-input`}
            />
          </View>

          {screeningResult.isBlocked && (
            <View style={styles.blockMessage}>
              <Ionicons name="alert-circle" size={16} color={COLORS.error} />
              <Text style={styles.blockMessageText}>{screeningResult.blockedReason}</Text>
            </View>
          )}

          {!screeningResult.isBlocked && screeningResult.warnings.length > 0 && (
            <View style={styles.warningsContainer}>
              {screeningResult.warnings.map((warning, index) => (
                <View key={index} style={styles.warningMessage}>
                  <Ionicons name="warning" size={14} color={COLORS.warning} />
                  <Text style={styles.warningMessageText}>{warning}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.noteFooter}>
            <Text style={[styles.noteCount, !isNoteValid && styles.noteCountInvalid]}>
              {noteLength < MIN_NOTE_LENGTH
                ? `${MIN_NOTE_LENGTH - noteLength} more characters needed`
                : `${remaining} characters remaining`}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Action buttons */}
      <View style={styles.actions}>
        <OutlineButton
          title="Back"
          onPress={onBack}
          style={styles.backButton as ViewStyle}
          testID={`${testID}-moment-back`}
        />
        <Button
          title="Next"
          onPress={onNext}
          disabled={!canProceed}
          style={styles.nextButton as ViewStyle}
          testID={`${testID}-moment-next`}
        />
      </View>

      {/* Avatar Creator Modal */}
      <Modal
        visible={showAvatarCreator}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleAvatarCancel}
      >
        <AvatarCreationStep
          onComplete={handleAvatarComplete}
          onSkip={handleAvatarCancel}
          title="Describe Person"
          subtitle="Create an avatar of who you saw"
          confirmLabel="Done"
        />
      </Modal>
    </KeyboardAvoidingView>
  )
})

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundSecondary },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },
  avatarSection: { backgroundColor: COLORS.background, borderRadius: 12, padding: 20, alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 16 },
  avatarPreview: { width: 160, height: 160, borderRadius: 80, backgroundColor: COLORS.backgroundSecondary, justifyContent: 'center', alignItems: 'center', marginBottom: 16, overflow: 'hidden', borderWidth: 2, borderColor: COLORS.border },
  avatarPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  avatarPlaceholderText: { fontSize: 12, color: COLORS.textSecondary, marginTop: 8 },
  customizeIndicator: { position: 'absolute', bottom: 8, right: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  customizeButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: COLORS.backgroundSecondary, borderRadius: 20, gap: 6 },
  customizeButtonText: { fontSize: 14, fontWeight: '500', color: COLORS.primary },
  requiredHint: { marginTop: 12 },
  requiredHintText: { fontSize: 12, color: COLORS.error },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 8, paddingHorizontal: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { fontSize: 14, color: COLORS.textSecondary, marginHorizontal: 12 },
  noteSection: { backgroundColor: COLORS.background, borderRadius: 12, padding: 16 },
  noteInputContainer: { minHeight: 140, marginBottom: 12 },
  noteInput: { fontSize: 16, color: COLORS.textPrimary, lineHeight: 24, minHeight: 120 },
  noteFooter: { alignItems: 'flex-end' },
  noteCount: { fontSize: 13, color: COLORS.textSecondary },
  noteCountInvalid: { color: COLORS.error },
  blockMessage: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#3D1515', borderLeftWidth: 3, borderLeftColor: COLORS.error, borderRadius: 8, padding: 12, marginBottom: 12, gap: 8 },
  blockMessageText: { flex: 1, fontSize: 13, color: COLORS.error, lineHeight: 18 },
  warningsContainer: { gap: 8, marginBottom: 12 },
  warningMessage: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#3D3315', borderLeftWidth: 3, borderLeftColor: COLORS.warning, borderRadius: 8, padding: 10, gap: 8 },
  warningMessageText: { flex: 1, fontSize: 12, color: COLORS.warning, lineHeight: 16 },
  actions: { flexDirection: 'row', padding: 16, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border },
  backButton: { flex: 1, marginRight: 8 },
  nextButton: { flex: 2 },
})


export default MomentStep
