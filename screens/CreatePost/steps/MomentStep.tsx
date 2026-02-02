/**
 * MomentStep Component (Moment 2: Who & What)
 *
 * Second step in the new 3-moment CreatePost wizard flow.
 * Combines avatar selection and note writing into a single screen.
 *
 * Features:
 * - Large tappable avatar preview at top
 * - 'Customize' button opens AvatarCreator as modal
 * - Note TextInput with placeholder inspiration
 * - Character counter
 * - Back/Next navigation
 *
 * @example
 * ```tsx
 * <MomentStep
 *   avatar={formData.targetAvatar}
 *   note={formData.note}
 *   onAvatarChange={handleAvatarChange}
 *   onNoteChange={handleNoteChange}
 *   onNext={handleNext}
 *   onBack={handleBack}
 * />
 * ```
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
  SafeAreaView,
  StyleSheet,
  Platform,
  ViewStyle,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import {
  Avatar,
  useAvatarEditor,
  EDITOR_CATEGORIES,
  CategoryTabs,
  OptionGrid,
  ColorPicker,
  type StoredAvatar,
  type CategoryTab,
} from 'react-native-bitmoji'
import { Button, OutlineButton } from '../../../components/Button'
import { lightFeedback, successFeedback } from '../../../lib/haptics'
import { darkTheme } from '../../../constants/glassStyles'
import { colors } from '../../../constants/theme'
import { MIN_NOTE_LENGTH, MAX_NOTE_LENGTH } from '../types'
import { COLORS } from '../styles'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Props for the MomentStep component
 */
export interface MomentStepProps {
  /**
   * Current avatar (null if not yet selected)
   */
  avatar: StoredAvatar | null

  /**
   * Current note text value
   */
  note: string

  /**
   * Callback when avatar is changed
   */
  onAvatarChange: (avatar: StoredAvatar) => void

  /**
   * Callback when note text changes
   */
  onNoteChange: (text: string) => void

  /**
   * Callback when user wants to proceed to next step
   */
  onNext: () => void

  /**
   * Callback when user wants to go back
   */
  onBack: () => void

  /**
   * Test ID prefix for testing purposes
   */
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
// AVATAR CREATOR MODAL COMPONENT
// ============================================================================

interface AvatarCreatorModalProps {
  visible: boolean
  initialConfig?: StoredAvatar['config']
  onComplete: (avatar: StoredAvatar) => void
  onCancel: () => void
}

const AvatarCreatorModal = memo(function AvatarCreatorModal({
  visible,
  initialConfig,
  onComplete,
  onCancel,
}: AvatarCreatorModalProps) {
  // Initialize editor with existing config or default
  const editor = useAvatarEditor({
    initialConfig,
  })

  // Convert categories for tabs
  const categoryTabs: CategoryTab[] = useMemo(
    () =>
      EDITOR_CATEGORIES.map((cat) => ({
        key: cat.key,
        label: cat.label,
        icon: cat.key,
      })),
    []
  )

  // Get current category config
  const currentCategoryConfig = useMemo(
    () => EDITOR_CATEGORIES.find((c) => c.key === editor.activeCategory),
    [editor.activeCategory]
  )

  // Get active subcategory config
  const activeSubcategoryConfig = currentCategoryConfig?.subcategories.find(
    (s) => s.key === editor.activeSubcategory
  )

  const handleSave = useCallback(() => {
    const storedAvatar = editor.getStoredAvatar()
    onComplete(storedAvatar)
  }, [editor, onComplete])

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onCancel}
    >
      <SafeAreaView style={modalStyles.container}>
        {/* Header */}
        <View style={modalStyles.header}>
          <TouchableOpacity
            style={modalStyles.headerButton}
            onPress={onCancel}
            activeOpacity={0.7}
          >
            <Text style={modalStyles.cancelText}>Cancel</Text>
          </TouchableOpacity>

          <Text style={modalStyles.headerTitle}>Create Avatar</Text>

          <TouchableOpacity
            style={[modalStyles.headerButton, modalStyles.saveButton]}
            onPress={handleSave}
            activeOpacity={0.7}
          >
            <Text style={modalStyles.saveText}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* Avatar Preview */}
        <View style={modalStyles.previewContainer}>
          <View style={modalStyles.avatarWrapper}>
            <Avatar config={editor.config} size="xl" />
          </View>
          <View style={modalStyles.actionButtons}>
            <TouchableOpacity
              style={modalStyles.actionButton}
              onPress={editor.randomize}
              activeOpacity={0.7}
            >
              <Ionicons name="shuffle" size={20} color={colors.primary[500]} />
              <Text style={modalStyles.actionButtonText}>Random</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={modalStyles.actionButton}
              onPress={editor.undo}
              disabled={!editor.canUndo}
              activeOpacity={0.7}
            >
              <Ionicons
                name="arrow-undo"
                size={20}
                color={editor.canUndo ? colors.primary[500] : darkTheme.textMuted}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={modalStyles.actionButton}
              onPress={editor.redo}
              disabled={!editor.canRedo}
              activeOpacity={0.7}
            >
              <Ionicons
                name="arrow-redo"
                size={20}
                color={editor.canRedo ? colors.primary[500] : darkTheme.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Category Tabs */}
        <CategoryTabs
          categories={categoryTabs}
          activeCategory={editor.activeCategory}
          onSelectCategory={editor.setCategory}
        />

        {/* Subcategory Tabs */}
        {currentCategoryConfig && currentCategoryConfig.subcategories.length > 0 && (
          <View style={modalStyles.subcategoryContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={modalStyles.subcategoryContent}
            >
              {currentCategoryConfig.subcategories.map((sub) => {
                const isActive = sub.key === editor.activeSubcategory
                return (
                  <TouchableOpacity
                    key={sub.key}
                    style={[
                      modalStyles.subcategoryTab,
                      isActive && modalStyles.subcategoryTabActive,
                    ]}
                    onPress={() => editor.setSubcategory(sub.key)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        modalStyles.subcategoryLabel,
                        isActive && modalStyles.subcategoryLabelActive,
                      ]}
                    >
                      {sub.label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>
        )}

        {/* Editor Content */}
        <View style={modalStyles.editorContent}>
          {activeSubcategoryConfig?.type === 'colors' && activeSubcategoryConfig.colors && (
            <ScrollView
              style={modalStyles.contentScroll}
              contentContainerStyle={modalStyles.contentScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <ColorPicker
                colors={activeSubcategoryConfig.colors}
                selectedColor={editor.config[activeSubcategoryConfig.configKey] as string}
                onSelect={(color) =>
                  editor.updateConfig({ [activeSubcategoryConfig.configKey]: color })
                }
                columns={5}
                size="medium"
              />
            </ScrollView>
          )}
          {activeSubcategoryConfig?.type === 'options' && activeSubcategoryConfig.options && (
            <OptionGrid
              options={activeSubcategoryConfig.options}
              selectedId={editor.config[activeSubcategoryConfig.configKey] as string}
              onSelect={(value) =>
                editor.updateConfig({ [activeSubcategoryConfig.configKey]: value })
              }
              columns={4}
              showLabels
            />
          )}
        </View>
      </SafeAreaView>
    </Modal>
  )
})

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * MomentStep - Combined avatar and note step (Moment 2)
 *
 * Layout:
 * 1. Large tappable avatar preview
 * 2. Customize button (opens modal)
 * 3. Divider with "What would you say?"
 * 4. Note TextInput with character counter
 * 5. Back/Next navigation
 */
export const MomentStep = memo(function MomentStep({
  avatar,
  note,
  onAvatarChange,
  onNoteChange,
  onNext,
  onBack,
  testID = 'create-post',
}: MomentStepProps): JSX.Element {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [showAvatarCreator, setShowAvatarCreator] = useState(false)

  // ---------------------------------------------------------------------------
  // COMPUTED VALUES
  // ---------------------------------------------------------------------------

  const noteLength = note.trim().length
  const isNoteValid = noteLength >= MIN_NOTE_LENGTH
  const isAvatarValid = avatar !== null
  const canProceed = isAvatarValid && isNoteValid
  const remaining = MAX_NOTE_LENGTH - note.length

  // Random placeholder
  const [placeholder] = useState(() =>
    NOTE_PLACEHOLDERS[Math.floor(Math.random() * NOTE_PLACEHOLDERS.length)]
  )

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

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
            {avatar ? (
              <Avatar config={avatar.config} size="lg" />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person-outline" size={64} color={COLORS.textSecondary} />
                <Text style={styles.avatarPlaceholderText}>Tap to create avatar</Text>
              </View>
            )}

            {/* Customize indicator */}
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
              {avatar ? 'Change Avatar' : 'Create Avatar'}
            </Text>
          </TouchableOpacity>

          {!avatar && (
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

          {/* Character count */}
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
      <AvatarCreatorModal
        visible={showAvatarCreator}
        initialConfig={avatar?.config}
        onComplete={handleAvatarComplete}
        onCancel={handleAvatarCancel}
      />
    </KeyboardAvoidingView>
  )
})

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },

  avatarSection: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },

  avatarPreview: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: COLORS.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.border,
  },

  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  avatarPlaceholderText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 8,
  },

  customizeIndicator: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  customizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 20,
    gap: 6,
  },

  customizeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary,
  },

  requiredHint: {
    marginTop: 12,
  },

  requiredHintText: {
    fontSize: 12,
    color: COLORS.error,
  },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    paddingHorizontal: 8,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },

  dividerText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginHorizontal: 12,
  },

  noteSection: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
  },

  noteInputContainer: {
    minHeight: 140,
    marginBottom: 12,
  },

  noteInput: {
    fontSize: 16,
    color: COLORS.textPrimary,
    lineHeight: 24,
    minHeight: 120,
  },

  noteFooter: {
    alignItems: 'flex-end',
  },

  noteCount: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  noteCountInvalid: {
    color: COLORS.error,
  },

  actions: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  backButton: {
    flex: 1,
    marginRight: 8,
  },

  nextButton: {
    flex: 2,
  },
})

const modalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.glassBorder,
    backgroundColor: darkTheme.surface,
  },
  headerButton: {
    minWidth: 60,
    paddingVertical: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: darkTheme.textPrimary,
  },
  cancelText: {
    fontSize: 16,
    color: darkTheme.textSecondary,
  },
  saveButton: {
    alignItems: 'flex-end',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary[500],
  },
  previewContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: darkTheme.surface,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.glassBorder,
  },
  avatarWrapper: {
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 8,
    backgroundColor: darkTheme.surfaceElevated,
    borderRadius: 20,
    paddingHorizontal: 12,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.primary[500],
  },
  subcategoryContainer: {
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.glassBorder,
    backgroundColor: darkTheme.surface,
  },
  subcategoryContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  subcategoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: darkTheme.surfaceElevated,
    marginRight: 8,
  },
  subcategoryTabActive: {
    backgroundColor: colors.primary[500],
  },
  subcategoryLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: darkTheme.textSecondary,
  },
  subcategoryLabelActive: {
    color: colors.white,
    fontWeight: '600',
  },
  editorContent: {
    flex: 1,
    backgroundColor: darkTheme.background,
  },
  contentScroll: {
    flex: 1,
  },
  contentScrollContent: {
    paddingVertical: 16,
  },
})

// ============================================================================
// EXPORTS
// ============================================================================

export default MomentStep
