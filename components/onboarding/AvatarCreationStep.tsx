/**
 * Avatar Creation Step (Onboarding)
 *
 * Guided prompt-based avatar creation for onboarding.
 * Tab-based UI with reduced "Quick Create" subset.
 */

import React, { useCallback, useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

import { AvatarGeneratingOverlay } from '../AvatarGeneratingOverlay'

import { darkTheme } from '../../constants/glassStyles'
import { colors } from '../../constants/theme'
import { AvatarDisplay } from '../AvatarDisplay'
import { useAvatarGenerator } from '../../hooks/useAvatarGenerator'
import { createStoredAvatar, type StoredAvatar, type GeneratedAvatar } from '../../types/avatar'
import {
  type AvatarTraits,
  type TabId,
  DEFAULT_TRAITS,
  ONBOARDING_TABS,
  GENDER_OPTIONS,
  SKIN_TONE_OPTIONS,
  BODY_TYPE_OPTIONS,
  FACE_SHAPE_OPTIONS,
  EYE_COLOR_OPTIONS,
  EYE_SHAPE_OPTIONS,
  HAIR_STYLE_OPTIONS,
  HAIR_TEXTURE_OPTIONS,
  HAIR_COLOR_OPTIONS,
  EXPRESSION_OPTIONS,
  CLOTHING_OPTIONS,
} from '../../lib/recraftApi'

// =============================================================================
// TYPES
// =============================================================================

export interface AvatarCreationStepProps {
  /** Initial avatar if editing */
  initialAvatar?: StoredAvatar | null
  /** Called when avatar is created */
  onComplete: (avatar: StoredAvatar) => void
  /** Called when user wants to skip */
  onSkip?: () => void
  /** Custom title (default: "Create Your Avatar") */
  title?: string
  /** Custom subtitle (default: "This is how others will see you") */
  subtitle?: string
  /** Label for the confirm button (default: "Continue") */
  confirmLabel?: string
}

// =============================================================================
// CHIP SELECTOR
// =============================================================================

interface ChipSelectorProps {
  label: string
  options: Array<{ id: string; label: string; color?: string }>
  selected: string | string[]
  onSelect: (id: string) => void
  multiSelect?: boolean
}

function ChipSelector({ label, options, selected, onSelect }: ChipSelectorProps) {
  const isSelected = (id: string) =>
    Array.isArray(selected) ? selected.includes(id) : selected === id

  return (
    <View style={chipStyles.section}>
      <Text style={chipStyles.label}>{label}</Text>
      <View style={chipStyles.chips}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.id}
            style={[chipStyles.chip, isSelected(opt.id) && chipStyles.chipSelected]}
            onPress={() => onSelect(opt.id)}
            activeOpacity={0.7}
          >
            {opt.color && (
              <View style={[chipStyles.colorDot, { backgroundColor: opt.color }]} />
            )}
            <Text style={[chipStyles.chipText, isSelected(opt.id) && chipStyles.chipTextSelected]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

// =============================================================================
// TAB BAR
// =============================================================================

interface TabBarProps {
  tabs: Array<{ id: TabId; label: string }>
  selectedTab: TabId
  onSelectTab: (tab: TabId) => void
}

function TabBar({ tabs, selectedTab, onSelectTab }: TabBarProps) {
  return (
    <View style={tabBarStyles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={tabBarStyles.scrollContent}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[tabBarStyles.tab, selectedTab === tab.id && tabBarStyles.tabSelected]}
            onPress={() => onSelectTab(tab.id)}
            activeOpacity={0.7}
          >
            <Text style={[tabBarStyles.tabText, selectedTab === tab.id && tabBarStyles.tabTextSelected]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )
}

// =============================================================================
// COMPONENT
// =============================================================================

export function AvatarCreationStep({
  onComplete,
  onSkip,
  title = 'Create Your Avatar',
  subtitle = 'This is how others will see you',
  confirmLabel = 'Continue',
}: AvatarCreationStepProps): React.JSX.Element {
  const avatarGen = useAvatarGenerator()

  const [selectedTab, setSelectedTab] = useState<TabId>('basics')

  // Trait state (reduced set for onboarding)
  const [gender, setGender] = useState(DEFAULT_TRAITS.gender)
  const [bodyType, setBodyType] = useState(DEFAULT_TRAITS.bodyType)
  const [skinTone, setSkinTone] = useState(DEFAULT_TRAITS.skinTone)
  const [faceShape, setFaceShape] = useState(DEFAULT_TRAITS.faceShape)
  const [eyeColor, setEyeColor] = useState(DEFAULT_TRAITS.eyeColor)
  const [eyeShape, setEyeShape] = useState(DEFAULT_TRAITS.eyeShape)
  const [hairStyle, setHairStyle] = useState(DEFAULT_TRAITS.hairStyle)
  const [hairTexture, setHairTexture] = useState(DEFAULT_TRAITS.hairTexture)
  const [hairColor, setHairColor] = useState(DEFAULT_TRAITS.hairColor)
  const [expression, setExpression] = useState(DEFAULT_TRAITS.expression)
  const [clothing, setClothing] = useState(DEFAULT_TRAITS.clothing)
  const [previewAvatar, setPreviewAvatar] = useState<GeneratedAvatar | null>(null)

  const getTraits = useCallback((): AvatarTraits => ({
    ...DEFAULT_TRAITS,
    gender, bodyType, skinTone, faceShape,
    eyeColor, eyeShape, hairStyle, hairTexture, hairColor,
    expression, clothing,
  }), [gender, bodyType, skinTone, faceShape, eyeColor, eyeShape,
    hairStyle, hairTexture, hairColor, expression, clothing])

  const handleGenerate = useCallback(async () => {
    const results = await avatarGen.generate(getTraits())
    if (results.length > 0) setPreviewAvatar(results[0])
  }, [avatarGen, getTraits])

  const handleComplete = useCallback(async () => {
    if (!previewAvatar) return
    const storedAvatar = createStoredAvatar(previewAvatar)
    onComplete(storedAvatar)
  }, [previewAvatar, onComplete])

  const renderTabContent = () => {
    switch (selectedTab) {
      case 'basics':
        return (
          <>
            <ChipSelector label="Gender Presentation" options={GENDER_OPTIONS} selected={gender} onSelect={setGender} />
            <ChipSelector label="Skin Tone" options={SKIN_TONE_OPTIONS} selected={skinTone} onSelect={setSkinTone} />
            <ChipSelector label="Body Type" options={BODY_TYPE_OPTIONS} selected={bodyType} onSelect={setBodyType} />
          </>
        )
      case 'face':
        return (
          <>
            <ChipSelector label="Face Shape" options={FACE_SHAPE_OPTIONS} selected={faceShape} onSelect={setFaceShape} />
            <ChipSelector label="Eye Color" options={EYE_COLOR_OPTIONS} selected={eyeColor} onSelect={setEyeColor} />
            <ChipSelector label="Eye Shape" options={EYE_SHAPE_OPTIONS} selected={eyeShape} onSelect={setEyeShape} />
          </>
        )
      case 'hair':
        return (
          <>
            <ChipSelector label="Hair Style" options={HAIR_STYLE_OPTIONS} selected={hairStyle} onSelect={setHairStyle} />
            <ChipSelector label="Hair Texture" options={HAIR_TEXTURE_OPTIONS} selected={hairTexture} onSelect={setHairTexture} />
            <ChipSelector label="Hair Color" options={HAIR_COLOR_OPTIONS} selected={hairColor} onSelect={setHairColor} />
          </>
        )
      case 'style':
        return (
          <>
            <ChipSelector label="Expression" options={EXPRESSION_OPTIONS} selected={expression} onSelect={setExpression} />
            <ChipSelector label="Clothing" options={CLOTHING_OPTIONS} selected={clothing} onSelect={setClothing} />
          </>
        )
      default:
        return null
    }
  }

  return (
    <SafeAreaView style={styles.container} testID="onboarding-avatar-step">
      <StatusBar barStyle="light-content" backgroundColor={darkTheme.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      {/* Avatar Preview */}
      <View style={styles.previewContainer}>
        <View style={styles.avatarWrapper}>
          <AvatarDisplay
            avatar={previewAvatar ? createStoredAvatar(previewAvatar) : null}
            size="xl"
          />
        </View>
        {avatarGen.error && (
          <Text style={styles.errorText}>{avatarGen.error}</Text>
        )}
      </View>

      {/* Tab Bar */}
      <TabBar
        tabs={ONBOARDING_TABS}
        selectedTab={selectedTab}
        onSelectTab={setSelectedTab}
      />

      {/* Tab Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderTabContent()}

        {/* Generate Button */}
        <View style={styles.generateContainer}>
          <TouchableOpacity
            style={[styles.generateButton, avatarGen.isGenerating && styles.generateButtonDisabled]}
            onPress={handleGenerate}
            disabled={avatarGen.isGenerating}
            activeOpacity={0.8}
          >
            <Ionicons name="sparkles" size={20} color="#FFF" />
            <Text style={styles.generateButtonText}>
              {previewAvatar ? 'Regenerate Avatar' : 'Generate Avatar'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Generating Overlay */}
      <AvatarGeneratingOverlay visible={avatarGen.isGenerating} />

      {/* Bottom Buttons */}
      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={[styles.saveButton, !previewAvatar && styles.saveButtonDisabled]}
          onPress={handleComplete}
          disabled={!previewAvatar || avatarGen.isSaving}
          activeOpacity={0.8}
        >
          <Text style={styles.saveButtonText}>
            {avatarGen.isSaving ? 'Saving...' : confirmLabel}
          </Text>
        </TouchableOpacity>
        {onSkip && (
          <TouchableOpacity style={styles.skipButton} onPress={onSkip} activeOpacity={0.7}>
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  )
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: darkTheme.background },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: darkTheme.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 14, color: darkTheme.textSecondary },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  previewContainer: { alignItems: 'center', paddingVertical: 16, backgroundColor: darkTheme.surface, borderBottomWidth: 1, borderBottomColor: darkTheme.glassBorder },
  avatarWrapper: { marginBottom: 12 },
  errorText: { fontSize: 13, color: '#EF4444', textAlign: 'center', marginTop: 8, paddingHorizontal: 20 },
  generateContainer: { paddingHorizontal: 16, paddingVertical: 24 },
  generateButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary[500], paddingVertical: 16, borderRadius: 14 },
  generateButtonDisabled: { opacity: 0.7 },
  generateButtonText: { fontSize: 17, fontWeight: '600', color: '#FFF' },
  bottomButtons: { paddingHorizontal: 16, paddingVertical: 16, backgroundColor: darkTheme.surface, borderTopWidth: 1, borderTopColor: darkTheme.glassBorder },
  saveButton: { backgroundColor: colors.primary[500], paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  saveButtonDisabled: { opacity: 0.4 },
  saveButtonText: { fontSize: 16, fontWeight: '600', color: colors.white },
  skipButton: { paddingVertical: 12, alignItems: 'center' },
  skipButtonText: { fontSize: 14, color: darkTheme.textMuted },
})

const tabBarStyles = StyleSheet.create({
  container: { backgroundColor: darkTheme.surface, borderBottomWidth: 1, borderBottomColor: darkTheme.glassBorder },
  scrollContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: darkTheme.surfaceElevated },
  tabSelected: { backgroundColor: `${colors.primary[500]}20`, borderWidth: 1, borderColor: colors.primary[500] },
  tabText: { fontSize: 14, fontWeight: '500', color: darkTheme.textSecondary },
  tabTextSelected: { color: colors.primary[500], fontWeight: '600' },
})

const chipStyles = StyleSheet.create({
  section: { paddingHorizontal: 16, paddingTop: 20 },
  label: { fontSize: 14, fontWeight: '600', color: darkTheme.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: darkTheme.surfaceElevated, borderWidth: 1, borderColor: 'transparent' },
  chipSelected: { backgroundColor: `${colors.primary[500]}20`, borderColor: colors.primary[500] },
  chipText: { fontSize: 13, fontWeight: '500', color: darkTheme.textSecondary },
  chipTextSelected: { color: colors.primary[500], fontWeight: '600' },
  colorDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
})

export default AvatarCreationStep
