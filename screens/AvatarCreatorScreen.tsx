/**
 * AvatarCreatorScreen
 *
 * Guided prompt-based avatar creation using Recraft AI.
 * Tab-based UI with 5 categories, sticky generate button,
 * and trait description preview.
 */

import React, { useCallback, useMemo, useState } from 'react'
import {
  StyleSheet,
  View,
  StatusBar,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

import { darkTheme } from '../constants/glassStyles'
import { colors } from '../constants/theme'
import type { MainStackParamList } from '../navigation/types'
import { useAvatarGenerator } from '../hooks/useAvatarGenerator'
import { AvatarGeneratingOverlay } from '../components/AvatarGeneratingOverlay'
import {
  type AvatarTraits,
  type TabId,
  DEFAULT_TRAITS,
  AVATAR_TABS,
  GENDER_OPTIONS,
  AGE_RANGE_OPTIONS,
  BODY_TYPE_OPTIONS,
  HEIGHT_OPTIONS,
  SKIN_TONE_OPTIONS,
  FACE_SHAPE_OPTIONS,
  EYEBROW_SHAPE_OPTIONS,
  EYE_COLOR_OPTIONS,
  EYE_SHAPE_OPTIONS,
  NOSE_OPTIONS,
  LIP_STYLE_OPTIONS,
  FACIAL_HAIR_OPTIONS,
  FRECKLES_MARKS_OPTIONS,
  HAIR_STYLE_OPTIONS,
  HAIR_TEXTURE_OPTIONS,
  HAIR_COLOR_OPTIONS,
  EXPRESSION_OPTIONS,
  CLOTHING_OPTIONS,
  CLOTHING_COLOR_OPTIONS,
  ACCESSORY_OPTIONS,
  GLASSES_TYPE_OPTIONS,
  MAKEUP_OPTIONS,
  TATTOOS_OPTIONS,
  BACKGROUND_COLOR_OPTIONS,
} from '../lib/recraftApi'

// =============================================================================
// TYPES
// =============================================================================

type Props = NativeStackScreenProps<MainStackParamList, 'AvatarCreator'>

// =============================================================================
// TRAIT SELECTOR COMPONENTS
// =============================================================================

interface ChipSelectorProps {
  label: string
  options: Array<{ id: string; label: string; color?: string }>
  selected: string | string[]
  onSelect: (id: string) => void
  multiSelect?: boolean
}

function ChipSelector({ label, options, selected, onSelect, multiSelect }: ChipSelectorProps) {
  const isSelected = (id: string) =>
    Array.isArray(selected) ? selected.includes(id) : selected === id

  return (
    <View style={selectorStyles.section}>
      <Text style={selectorStyles.label}>{label}</Text>
      <View style={selectorStyles.chips}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.id}
            style={[
              selectorStyles.chip,
              isSelected(opt.id) && selectorStyles.chipSelected,
            ]}
            onPress={() => onSelect(opt.id)}
            activeOpacity={0.7}
          >
            {opt.color && (
              <View style={[selectorStyles.colorDot, { backgroundColor: opt.color }]} />
            )}
            <Text
              style={[
                selectorStyles.chipText,
                isSelected(opt.id) && selectorStyles.chipTextSelected,
              ]}
            >
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
  customizedTabs: Set<TabId>
}

function TabBar({ tabs, selectedTab, onSelectTab, customizedTabs }: TabBarProps) {
  return (
    <View style={tabStyles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={tabStyles.scrollContent}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[tabStyles.tab, selectedTab === tab.id && tabStyles.tabSelected]}
            onPress={() => onSelectTab(tab.id)}
            activeOpacity={0.7}
          >
            <Text style={[tabStyles.tabText, selectedTab === tab.id && tabStyles.tabTextSelected]}>
              {tab.label}
            </Text>
            {customizedTabs.has(tab.id) && selectedTab !== tab.id && (
              <View style={tabStyles.dot} />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function AvatarCreatorScreen({
  navigation,
  route,
}: Props): React.JSX.Element {
  const avatarGen = useAvatarGenerator()

  const isRequired = route.params?.required ?? false

  const [selectedTab, setSelectedTab] = useState<TabId>('basics')

  // Trait state
  const [gender, setGender] = useState(DEFAULT_TRAITS.gender)
  const [ageRange, setAgeRange] = useState(DEFAULT_TRAITS.ageRange)
  const [bodyType, setBodyType] = useState(DEFAULT_TRAITS.bodyType)
  const [height, setHeight] = useState(DEFAULT_TRAITS.height)
  const [skinTone, setSkinTone] = useState(DEFAULT_TRAITS.skinTone)
  const [faceShape, setFaceShape] = useState(DEFAULT_TRAITS.faceShape)
  const [eyebrowShape, setEyebrowShape] = useState(DEFAULT_TRAITS.eyebrowShape)
  const [eyeColor, setEyeColor] = useState(DEFAULT_TRAITS.eyeColor)
  const [eyeShape, setEyeShape] = useState(DEFAULT_TRAITS.eyeShape)
  const [nose, setNose] = useState(DEFAULT_TRAITS.nose)
  const [lipStyle, setLipStyle] = useState(DEFAULT_TRAITS.lipStyle)
  const [facialHair, setFacialHair] = useState(DEFAULT_TRAITS.facialHair)
  const [frecklesMarks, setFrecklesMarks] = useState(DEFAULT_TRAITS.frecklesMarks)
  const [hairStyle, setHairStyle] = useState(DEFAULT_TRAITS.hairStyle)
  const [hairTexture, setHairTexture] = useState(DEFAULT_TRAITS.hairTexture)
  const [hairColor, setHairColor] = useState(DEFAULT_TRAITS.hairColor)
  const [expression, setExpression] = useState(DEFAULT_TRAITS.expression)
  const [clothing, setClothing] = useState(DEFAULT_TRAITS.clothing)
  const [clothingColor, setClothingColor] = useState(DEFAULT_TRAITS.clothingColor)
  const [accessories, setAccessories] = useState<string[]>([])
  const [glassesType, setGlassesType] = useState(DEFAULT_TRAITS.glassesType)
  const [makeup, setMakeup] = useState(DEFAULT_TRAITS.makeup)
  const [tattoos, setTattoos] = useState(DEFAULT_TRAITS.tattoos)
  const [backgroundColor, setBackgroundColor] = useState(DEFAULT_TRAITS.backgroundColor)

  const toggleAccessory = useCallback((id: string) => {
    setAccessories((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    )
  }, [])

  const getTraits = useCallback((): AvatarTraits => ({
    gender, ageRange, bodyType, height, skinTone, faceShape, eyebrowShape,
    eyeColor, eyeShape, nose, lipStyle, facialHair, frecklesMarks,
    hairStyle, hairTexture, hairColor, expression, clothing, clothingColor,
    accessories, glassesType, makeup, tattoos, backgroundColor,
  }), [gender, ageRange, bodyType, height, skinTone, faceShape, eyebrowShape,
    eyeColor, eyeShape, nose, lipStyle, facialHair, frecklesMarks,
    hairStyle, hairTexture, hairColor, expression, clothing, clothingColor,
    accessories, glassesType, makeup, tattoos, backgroundColor])

  // Track which tabs have been customized (non-default values)
  const customizedTabs = useMemo(() => {
    const tabs = new Set<TabId>()
    if (gender !== DEFAULT_TRAITS.gender || ageRange !== DEFAULT_TRAITS.ageRange ||
        bodyType !== DEFAULT_TRAITS.bodyType || height !== DEFAULT_TRAITS.height ||
        skinTone !== DEFAULT_TRAITS.skinTone) tabs.add('basics')
    if (faceShape !== DEFAULT_TRAITS.faceShape || eyebrowShape !== DEFAULT_TRAITS.eyebrowShape ||
        eyeColor !== DEFAULT_TRAITS.eyeColor || eyeShape !== DEFAULT_TRAITS.eyeShape ||
        nose !== DEFAULT_TRAITS.nose || lipStyle !== DEFAULT_TRAITS.lipStyle ||
        facialHair !== DEFAULT_TRAITS.facialHair || frecklesMarks !== DEFAULT_TRAITS.frecklesMarks) tabs.add('face')
    if (hairStyle !== DEFAULT_TRAITS.hairStyle || hairTexture !== DEFAULT_TRAITS.hairTexture ||
        hairColor !== DEFAULT_TRAITS.hairColor) tabs.add('hair')
    if (expression !== DEFAULT_TRAITS.expression || clothing !== DEFAULT_TRAITS.clothing ||
        clothingColor !== DEFAULT_TRAITS.clothingColor || makeup !== DEFAULT_TRAITS.makeup ||
        accessories.length > 0 || glassesType !== DEFAULT_TRAITS.glassesType) tabs.add('style')
    if (tattoos !== DEFAULT_TRAITS.tattoos || backgroundColor !== DEFAULT_TRAITS.backgroundColor) tabs.add('extras')
    return tabs
  }, [gender, ageRange, bodyType, height, skinTone, faceShape, eyebrowShape,
    eyeColor, eyeShape, nose, lipStyle, facialHair, frecklesMarks,
    hairStyle, hairTexture, hairColor, expression, clothing, clothingColor,
    accessories, glassesType, makeup, tattoos, backgroundColor])

  // Build a short description preview
  const previewText = useMemo(() => {
    const parts = [bodyType, gender]
    if (hairStyle !== 'bald') parts.push(`with ${hairTexture} ${hairColor} hair`)
    return parts.join(' ')
  }, [bodyType, gender, hairStyle, hairTexture, hairColor])

  const handleGenerate = useCallback(async () => {
    const traits = getTraits()
    const avatars = await avatarGen.generate(traits)
    if (avatars.length > 0) {
      navigation.navigate('AvatarSelection', {
        avatars,
        traits,
        required: isRequired,
      })
    }
  }, [avatarGen, getTraits, navigation, isRequired])

  const handleCancel = useCallback(() => {
    if (isRequired) return
    navigation.goBack()
  }, [navigation, isRequired])

  // Render tab content
  const renderTabContent = () => {
    switch (selectedTab) {
      case 'basics':
        return (
          <>
            <ChipSelector label="Gender Presentation" options={GENDER_OPTIONS} selected={gender} onSelect={setGender} />
            <ChipSelector label="Age Range" options={AGE_RANGE_OPTIONS} selected={ageRange} onSelect={setAgeRange} />
            <ChipSelector label="Body Type" options={BODY_TYPE_OPTIONS} selected={bodyType} onSelect={setBodyType} />
            <ChipSelector label="Height" options={HEIGHT_OPTIONS} selected={height} onSelect={setHeight} />
            <ChipSelector label="Skin Tone" options={SKIN_TONE_OPTIONS} selected={skinTone} onSelect={setSkinTone} />
          </>
        )
      case 'face':
        return (
          <>
            <ChipSelector label="Face Shape" options={FACE_SHAPE_OPTIONS} selected={faceShape} onSelect={setFaceShape} />
            <ChipSelector label="Eyebrow Shape" options={EYEBROW_SHAPE_OPTIONS} selected={eyebrowShape} onSelect={setEyebrowShape} />
            <ChipSelector label="Eye Color" options={EYE_COLOR_OPTIONS} selected={eyeColor} onSelect={setEyeColor} />
            <ChipSelector label="Eye Shape" options={EYE_SHAPE_OPTIONS} selected={eyeShape} onSelect={setEyeShape} />
            <ChipSelector label="Nose" options={NOSE_OPTIONS} selected={nose} onSelect={setNose} />
            <ChipSelector label="Lip Style" options={LIP_STYLE_OPTIONS} selected={lipStyle} onSelect={setLipStyle} />
            <ChipSelector label="Facial Hair" options={FACIAL_HAIR_OPTIONS} selected={facialHair} onSelect={setFacialHair} />
            <ChipSelector label="Freckles & Marks" options={FRECKLES_MARKS_OPTIONS} selected={frecklesMarks} onSelect={setFrecklesMarks} />
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
            <ChipSelector label="Expression / Vibe" options={EXPRESSION_OPTIONS} selected={expression} onSelect={setExpression} />
            <ChipSelector label="Clothing" options={CLOTHING_OPTIONS} selected={clothing} onSelect={setClothing} />
            <ChipSelector label="Clothing Color" options={CLOTHING_COLOR_OPTIONS} selected={clothingColor} onSelect={setClothingColor} />
            <ChipSelector label="Makeup" options={MAKEUP_OPTIONS} selected={makeup} onSelect={setMakeup} />
            <ChipSelector label="Accessories" options={ACCESSORY_OPTIONS} selected={accessories} onSelect={toggleAccessory} multiSelect />
            <ChipSelector label="Glasses" options={GLASSES_TYPE_OPTIONS} selected={glassesType} onSelect={setGlassesType} />
          </>
        )
      case 'extras':
        return (
          <>
            <ChipSelector label="Tattoos" options={TATTOOS_OPTIONS} selected={tattoos} onSelect={setTattoos} />
            <ChipSelector label="Background Color" options={BACKGROUND_COLOR_OPTIONS} selected={backgroundColor} onSelect={setBackgroundColor} />
          </>
        )
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={darkTheme.background} />

      {/* Loading Overlay */}
      <AvatarGeneratingOverlay visible={avatarGen.isGenerating} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          testID="header-cancel-button"
          style={styles.headerButton}
          onPress={handleCancel}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelText}>{isRequired ? '' : 'Cancel'}</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Create Avatar</Text>

        <View style={styles.headerButton} />
      </View>

      {/* Preview description */}
      <View style={styles.previewBar}>
        <Text style={styles.previewText} numberOfLines={1}>
          {previewText}
        </Text>
      </View>

      {/* Tab Bar */}
      <TabBar
        tabs={AVATAR_TABS}
        selectedTab={selectedTab}
        onSelectTab={setSelectedTab}
        customizedTabs={customizedTabs}
      />

      {/* Error */}
      {avatarGen.error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{avatarGen.error}</Text>
        </View>
      )}

      {/* Tab Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderTabContent()}
      </ScrollView>

      {/* Sticky Generate Button */}
      <View style={styles.generateContainer}>
        <TouchableOpacity
          style={[styles.generateButton, avatarGen.isGenerating && styles.generateButtonDisabled]}
          onPress={handleGenerate}
          disabled={avatarGen.isGenerating}
          activeOpacity={0.8}
          testID="generate-avatar-button"
        >
          <Ionicons name="sparkles" size={20} color="#FFF" />
          <Text style={styles.generateButtonText}>Generate Avatar</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
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
  previewBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: darkTheme.surface,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.glassBorder,
  },
  previewText: {
    fontSize: 13,
    color: darkTheme.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  errorContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    textAlign: 'center',
  },
  generateContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: darkTheme.surface,
    borderTopWidth: 1,
    borderTopColor: darkTheme.glassBorder,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary[500],
    paddingVertical: 16,
    borderRadius: 14,
  },
  generateButtonDisabled: {
    opacity: 0.7,
  },
  generateButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFF',
  },
})

const tabStyles = StyleSheet.create({
  container: {
    backgroundColor: darkTheme.surface,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.glassBorder,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: darkTheme.surfaceElevated,
  },
  tabSelected: {
    backgroundColor: `${colors.primary[500]}20`,
    borderWidth: 1,
    borderColor: colors.primary[500],
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: darkTheme.textSecondary,
  },
  tabTextSelected: {
    color: colors.primary[500],
    fontWeight: '600',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary[500],
    marginLeft: 6,
  },
})

const selectorStyles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: darkTheme.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: darkTheme.surfaceElevated,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: `${colors.primary[500]}20`,
    borderColor: colors.primary[500],
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: darkTheme.textSecondary,
  },
  chipTextSelected: {
    color: colors.primary[500],
    fontWeight: '600',
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
})
