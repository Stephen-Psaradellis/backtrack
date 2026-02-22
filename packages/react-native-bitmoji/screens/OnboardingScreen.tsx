/**
 * OnboardingScreen - Step-by-step avatar creation wizard
 *
 * Guides new users through creating their avatar:
 * 1. Welcome & gender/style selection
 * 2. Skin tone selection
 * 3. Face shape selection
 * 4. Hair style & color
 * 5. Eyes & eyebrows
 * 6. Finish & preview
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  useColorScheme,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Avatar } from '../avatar/Avatar';
import { ColorPicker } from '../avatar/editor/ColorPicker';
import { OptionGrid } from '../avatar/editor/OptionGrid';
import {
  AvatarConfig,
  DEFAULT_MALE_CONFIG,
  DEFAULT_FEMALE_CONFIG,
  SKIN_TONES,
  HAIR_COLORS,
  EYE_COLORS,
  HairStyle,
  FaceShape,
  EyeStyle,
  EyebrowStyle,
  AvatarSize,
} from '../avatar/types';
import { colors, darkTheme } from '../constants/theme';
import type { RootStackParamList } from '../navigation/AppNavigator';

// =============================================================================
// TYPES
// =============================================================================

type OnboardingStep =
  | 'welcome'
  | 'skin_tone'
  | 'face_shape'
  | 'hair'
  | 'hair_color'
  | 'eyes'
  | 'finish';

interface StepConfig {
  key: OnboardingStep;
  title: string;
  subtitle: string;
  showPreview: boolean;
}

const STEPS: StepConfig[] = [
  {
    key: 'welcome',
    title: 'Create Your Avatar',
    subtitle: 'Choose a starting style',
    showPreview: false,
  },
  {
    key: 'skin_tone',
    title: 'Skin Tone',
    subtitle: 'Select your skin tone',
    showPreview: true,
  },
  {
    key: 'face_shape',
    title: 'Face Shape',
    subtitle: 'Choose your face shape',
    showPreview: true,
  },
  {
    key: 'hair',
    title: 'Hairstyle',
    subtitle: 'Pick your hairstyle',
    showPreview: true,
  },
  {
    key: 'hair_color',
    title: 'Hair Color',
    subtitle: 'Choose your hair color',
    showPreview: true,
  },
  {
    key: 'eyes',
    title: 'Eyes',
    subtitle: 'Select your eye style and color',
    showPreview: true,
  },
  {
    key: 'finish',
    title: 'Looking Good!',
    subtitle: 'Your avatar is ready',
    showPreview: true,
  },
];

// =============================================================================
// STYLE PRESET OPTIONS
// =============================================================================

type StylePreset = 'masculine' | 'feminine' | 'neutral';

const STYLE_PRESETS: { id: StylePreset; label: string; icon: string }[] = [
  { id: 'masculine', label: 'Masculine', icon: 'man-outline' },
  { id: 'feminine', label: 'Feminine', icon: 'woman-outline' },
  { id: 'neutral', label: 'Neutral', icon: 'person-outline' },
];

// Popular hair styles for onboarding
const ONBOARDING_HAIR_STYLES = [
  { id: HairStyle.SHORT_SLICK, label: 'Short Straight' },
  { id: HairStyle.SHORT_CURLY, label: 'Short Curly' },
  { id: HairStyle.MEDIUM_STRAIGHT, label: 'Medium Straight' },
  { id: HairStyle.MEDIUM_WAVY, label: 'Medium Wavy' },
  { id: HairStyle.LONG_STRAIGHT, label: 'Long Straight' },
  { id: HairStyle.LONG_CURLY, label: 'Long Curly' },
  { id: HairStyle.MEDIUM_BOB, label: 'Bob' },
  { id: HairStyle.SHORT_PIXIE, label: 'Pixie' },
  { id: HairStyle.AFRO, label: 'Afro' },
  { id: HairStyle.SHORT_BUZZ, label: 'Buzz Cut' },
  { id: HairStyle.LONG_PONYTAIL_HIGH, label: 'Ponytail' },
  { id: HairStyle.BALD, label: 'Bald' },
];

const FACE_SHAPE_OPTIONS = [
  { id: FaceShape.OVAL, label: 'Oval' },
  { id: FaceShape.ROUND, label: 'Round' },
  { id: FaceShape.SQUARE, label: 'Square' },
  { id: FaceShape.HEART, label: 'Heart' },
  { id: FaceShape.OBLONG, label: 'Oblong' },
  { id: FaceShape.DIAMOND, label: 'Diamond' },
];

const EYE_STYLE_OPTIONS = [
  { id: EyeStyle.DEFAULT, label: 'Default' },
  { id: EyeStyle.ROUND, label: 'Round' },
  { id: EyeStyle.ALMOND, label: 'Almond' },
  { id: EyeStyle.NARROW, label: 'Narrow' },
  { id: EyeStyle.WIDE, label: 'Wide' },
];

// =============================================================================
// COMPONENTS
// =============================================================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  isDark: boolean;
}

function ProgressBar({ currentStep, totalSteps, isDark }: ProgressBarProps) {
  const progress = (currentStep / (totalSteps - 1)) * 100;

  return (
    <View style={styles.progressContainer}>
      <View
        style={[
          styles.progressTrack,
          { backgroundColor: isDark ? darkTheme.glassBorder : colors.neutral[200] },
        ]}
      >
        <LinearGradient
          colors={[colors.primary[400], colors.accent[500]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.progressFill, { width: `${progress}%` }]}
        />
      </View>
      <Text
        style={[
          styles.progressText,
          { color: isDark ? darkTheme.textSecondary : colors.neutral[500] },
        ]}
      >
        Step {currentStep + 1} of {totalSteps}
      </Text>
    </View>
  );
}

interface StylePresetCardProps {
  preset: typeof STYLE_PRESETS[0];
  isSelected: boolean;
  onPress: () => void;
  isDark: boolean;
}

function StylePresetCard({ preset, isSelected, onPress, isDark }: StylePresetCardProps) {
  return (
    <TouchableOpacity
      style={[
        styles.presetCard,
        isSelected && styles.presetCardSelected,
        isDark && styles.presetCardDark,
        isSelected && isDark && styles.presetCardSelectedDark,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons
        name={preset.icon as any}
        size={48}
        color={
          isSelected
            ? colors.primary[500]
            : isDark
            ? darkTheme.textSecondary
            : colors.neutral[600]
        }
      />
      <Text
        style={[
          styles.presetLabel,
          isSelected && styles.presetLabelSelected,
          isDark && styles.presetLabelDark,
        ]}
      >
        {preset.label}
      </Text>
    </TouchableOpacity>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function OnboardingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // State
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selectedPreset, setSelectedPreset] = useState<StylePreset>('neutral');
  const [config, setConfig] = useState<AvatarConfig>(DEFAULT_MALE_CONFIG);

  const currentStep = STEPS[currentStepIndex];

  // Update config
  const updateConfig = useCallback((updates: Partial<AvatarConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  // Handle preset selection
  const handlePresetSelect = useCallback((preset: StylePreset) => {
    setSelectedPreset(preset);
    if (preset === 'feminine') {
      setConfig(DEFAULT_FEMALE_CONFIG);
    } else {
      setConfig(DEFAULT_MALE_CONFIG);
    }
  }, []);

  // Navigation
  const goNext = useCallback(() => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  }, [currentStepIndex]);

  const goBack = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [currentStepIndex]);

  // Handle finish
  const handleFinish = useCallback(() => {
    navigation.replace('AvatarEditor', {
      initialConfig: config,
      isNewUser: true,
    });
  }, [navigation, config]);

  // Randomize avatar
  const handleRandomize = useCallback(() => {
    const randomSkinTone = SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)];
    const randomHairColor = HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)];
    const randomEyeColor = EYE_COLORS[Math.floor(Math.random() * EYE_COLORS.length)];
    const randomHairStyle =
      ONBOARDING_HAIR_STYLES[Math.floor(Math.random() * ONBOARDING_HAIR_STYLES.length)];
    const randomFaceShape =
      FACE_SHAPE_OPTIONS[Math.floor(Math.random() * FACE_SHAPE_OPTIONS.length)];

    setConfig((prev) => ({
      ...prev,
      skinTone: randomSkinTone.hex,
      hairColor: randomHairColor.hex,
      eyeColor: randomEyeColor.hex,
      hairStyle: randomHairStyle.id,
      faceShape: randomFaceShape.id,
    }));
  }, []);

  // Skin tone colors for picker (convert SkinTone to ColorOption format)
  const skinToneColors = useMemo(
    () => SKIN_TONES.map((tone) => ({ name: tone.name, hex: tone.hex })),
    []
  );

  // Hair colors for picker (already ColorOption compatible)
  const hairColorsList = useMemo(
    () => HAIR_COLORS.map((color) => ({ name: color.name, hex: color.hex })),
    []
  );

  // Eye colors for picker (already ColorOption compatible)
  const eyeColorsList = useMemo(
    () => EYE_COLORS.map((color) => ({ name: color.name, hex: color.hex })),
    []
  );

  // Render step content
  const renderStepContent = () => {
    switch (currentStep.key) {
      case 'welcome':
        return (
          <View style={styles.welcomeContent}>
            <View style={styles.presetsRow}>
              {STYLE_PRESETS.map((preset) => (
                <StylePresetCard
                  key={preset.id}
                  preset={preset}
                  isSelected={selectedPreset === preset.id}
                  onPress={() => handlePresetSelect(preset.id)}
                  isDark={isDark}
                />
              ))}
            </View>
            <TouchableOpacity
              style={styles.randomButton}
              onPress={handleRandomize}
              activeOpacity={0.7}
            >
              <Ionicons name="shuffle" size={20} color={colors.primary[500]} />
              <Text style={styles.randomButtonText}>Random Avatar</Text>
            </TouchableOpacity>
          </View>
        );

      case 'skin_tone':
        return (
          <View style={styles.optionContent}>
            <ColorPicker
              colors={skinToneColors}
              selectedColor={config.skinTone}
              onSelect={(color) => updateConfig({ skinTone: color })}
              columns={6}
              size="large"
            />
          </View>
        );

      case 'face_shape':
        return (
          <View style={styles.optionContent}>
            <OptionGrid
              options={FACE_SHAPE_OPTIONS}
              selectedId={config.faceShape}
              onSelect={(id) => updateConfig({ faceShape: id as FaceShape })}
              columns={3}
              showLabels
            />
          </View>
        );

      case 'hair':
        return (
          <View style={styles.optionContent}>
            <OptionGrid
              options={ONBOARDING_HAIR_STYLES}
              selectedId={config.hairStyle}
              onSelect={(id) => updateConfig({ hairStyle: id as HairStyle })}
              columns={4}
              showLabels
            />
          </View>
        );

      case 'hair_color':
        return (
          <View style={styles.optionContent}>
            <ColorPicker
              colors={hairColorsList}
              selectedColor={config.hairColor}
              onSelect={(color) => updateConfig({ hairColor: color })}
              columns={6}
              size="large"
            />
          </View>
        );

      case 'eyes':
        return (
          <View style={styles.optionContent}>
            <Text
              style={[
                styles.sectionLabel,
                { color: isDark ? darkTheme.textSecondary : colors.neutral[600] },
              ]}
            >
              Eye Style
            </Text>
            <OptionGrid
              options={EYE_STYLE_OPTIONS}
              selectedId={config.eyeStyle}
              onSelect={(id) => updateConfig({ eyeStyle: id as EyeStyle })}
              columns={5}
              showLabels
            />
            <Text
              style={[
                styles.sectionLabel,
                { color: isDark ? darkTheme.textSecondary : colors.neutral[600] },
              ]}
            >
              Eye Color
            </Text>
            <ColorPicker
              colors={eyeColorsList}
              selectedColor={config.eyeColor}
              onSelect={(color) => updateConfig({ eyeColor: color })}
              columns={6}
              size="medium"
            />
          </View>
        );

      case 'finish':
        return (
          <View style={styles.finishContent}>
            <View style={styles.finishAvatarContainer}>
              <Avatar config={config} size="xxl" showBorder />
            </View>
            <Text
              style={[
                styles.finishText,
                { color: isDark ? darkTheme.textSecondary : colors.neutral[600] },
              ]}
            >
              You can customize more features in the editor
            </Text>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      {/* Header */}
      <View style={styles.header}>
        {currentStepIndex > 0 ? (
          <TouchableOpacity style={styles.backButton} onPress={goBack}>
            <Ionicons
              name="arrow-back"
              size={24}
              color={isDark ? darkTheme.textPrimary : colors.neutral[700]}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.backButton} />
        )}
        <ProgressBar
          currentStep={currentStepIndex}
          totalSteps={STEPS.length}
          isDark={isDark}
        />
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleFinish}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.skipText,
              { color: isDark ? darkTheme.textSecondary : colors.neutral[500] },
            ]}
          >
            Skip
          </Text>
        </TouchableOpacity>
      </View>

      {/* Title */}
      <View style={styles.titleContainer}>
        <Text style={[styles.title, isDark && styles.titleDark]}>
          {currentStep.title}
        </Text>
        <Text
          style={[
            styles.subtitle,
            { color: isDark ? darkTheme.textSecondary : colors.neutral[500] },
          ]}
        >
          {currentStep.subtitle}
        </Text>
      </View>

      {/* Preview */}
      {currentStep.showPreview && currentStep.key !== 'finish' && (
        <View style={styles.previewContainer}>
          <Avatar config={config} size="xl" showBorder />
        </View>
      )}

      {/* Content */}
      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={styles.contentScrollInner}
        showsVerticalScrollIndicator={false}
      >
        {renderStepContent()}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, isDark && styles.footerDark]}>
        {currentStep.key === 'finish' ? (
          <TouchableOpacity
            style={styles.finishButton}
            onPress={handleFinish}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.primary[500], colors.accent[500]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.finishButtonGradient}
            >
              <Text style={styles.finishButtonText}>Start Customizing</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.nextButton}
            onPress={goNext}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.primary[500], colors.accent[500]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.nextButtonGradient}
            >
              <Text style={styles.nextButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  containerDark: {
    backgroundColor: darkTheme.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressContainer: {
    flex: 1,
    marginHorizontal: 16,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  titleContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.neutral[900],
    textAlign: 'center',
  },
  titleDark: {
    color: darkTheme.textPrimary,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  previewContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  contentScroll: {
    flex: 1,
  },
  contentScrollInner: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  welcomeContent: {
    alignItems: 'center',
    paddingTop: 24,
  },
  presetsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 32,
  },
  presetCard: {
    width: (SCREEN_WIDTH - 80) / 3,
    aspectRatio: 0.9,
    backgroundColor: colors.neutral[50],
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  presetCardSelected: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[400],
  },
  presetCardDark: {
    backgroundColor: darkTheme.surface,
  },
  presetCardSelectedDark: {
    backgroundColor: 'rgba(94, 108, 216, 0.15)',
  },
  presetLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    color: colors.neutral[700],
  },
  presetLabelSelected: {
    color: colors.primary[600],
  },
  presetLabelDark: {
    color: darkTheme.textSecondary,
  },
  randomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  randomButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary[600],
  },
  optionContent: {
    paddingTop: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 16,
    paddingHorizontal: 8,
  },
  finishContent: {
    alignItems: 'center',
    paddingTop: 24,
  },
  finishAvatarContainer: {
    marginBottom: 24,
  },
  finishText: {
    fontSize: 16,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 8 : 16,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  footerDark: {
    borderTopColor: darkTheme.glassBorder,
  },
  nextButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  nextButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  finishButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  finishButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  finishButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
});

export default OnboardingScreen;
