/**
 * ProportionSliderGroup Component
 *
 * A group of sliders for editing facial proportions.
 * Organized into logical sections (Eyes, Nose, Mouth, Face).
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { colors, darkTheme } from '../../constants/theme';
import { ProportionSlider } from './ProportionSlider';
import { FacialProportions, DEFAULT_FACIAL_PROPORTIONS } from '../types';

// =============================================================================
// TYPES
// =============================================================================

export interface ProportionSliderGroupProps {
  proportions: FacialProportions;
  onChange: (proportions: FacialProportions) => void;
}

interface SliderConfig {
  key: keyof FacialProportions;
  label: string;
  minLabel: string;
  maxLabel: string;
}

// =============================================================================
// SLIDER CONFIGURATIONS
// =============================================================================

const EYE_SLIDERS: SliderConfig[] = [
  { key: 'eyeSpacing', label: 'Eye Spacing', minLabel: 'Closer', maxLabel: 'Wider' },
  { key: 'eyeSize', label: 'Eye Size', minLabel: 'Smaller', maxLabel: 'Larger' },
  { key: 'eyeHeight', label: 'Eye Position', minLabel: 'Lower', maxLabel: 'Higher' },
];

const EYEBROW_SLIDERS: SliderConfig[] = [
  { key: 'eyebrowHeight', label: 'Height', minLabel: 'Lower', maxLabel: 'Higher' },
  { key: 'eyebrowSpacing', label: 'Spacing', minLabel: 'Closer', maxLabel: 'Wider' },
  { key: 'eyebrowThickness', label: 'Thickness', minLabel: 'Thinner', maxLabel: 'Thicker' },
  { key: 'eyebrowArch', label: 'Arch', minLabel: 'Flat', maxLabel: 'High Arch' },
  { key: 'eyebrowLength', label: 'Length', minLabel: 'Shorter', maxLabel: 'Longer' },
  { key: 'eyebrowTilt', label: 'Tilt', minLabel: 'Down', maxLabel: 'Up' },
];

const NOSE_SLIDERS: SliderConfig[] = [
  { key: 'noseSize', label: 'Nose Size', minLabel: 'Smaller', maxLabel: 'Larger' },
  { key: 'nosePosition', label: 'Nose Position', minLabel: 'Higher', maxLabel: 'Lower' },
];

const MOUTH_SLIDERS: SliderConfig[] = [
  { key: 'mouthSize', label: 'Mouth Size', minLabel: 'Smaller', maxLabel: 'Larger' },
  { key: 'mouthPosition', label: 'Mouth Position', minLabel: 'Higher', maxLabel: 'Lower' },
];

const FACE_SLIDERS: SliderConfig[] = [
  { key: 'faceWidth', label: 'Face Width', minLabel: 'Narrower', maxLabel: 'Wider' },
  { key: 'jawWidth', label: 'Jaw Width', minLabel: 'Narrower', maxLabel: 'Wider' },
  { key: 'foreheadHeight', label: 'Forehead Height', minLabel: 'Shorter', maxLabel: 'Taller' },
  { key: 'chinShape', label: 'Chin Shape', minLabel: 'Pointed', maxLabel: 'Round' },
];

// =============================================================================
// COMPONENT
// =============================================================================

export function ProportionSliderGroup({
  proportions,
  onChange,
}: ProportionSliderGroupProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Use defaults if proportions is undefined
  const currentProportions = proportions || DEFAULT_FACIAL_PROPORTIONS;

  const handleSliderChange = (key: keyof FacialProportions) => (value: number) => {
    onChange({
      ...currentProportions,
      [key]: value,
    });
  };

  const renderSection = (title: string, sliders: SliderConfig[]) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
        {title}
      </Text>
      {sliders.map((slider) => (
        <ProportionSlider
          key={slider.key}
          label={slider.label}
          value={currentProportions[slider.key]}
          onChange={handleSliderChange(slider.key)}
          minLabel={slider.minLabel}
          maxLabel={slider.maxLabel}
        />
      ))}
    </View>
  );

  return (
    <ScrollView
      style={[styles.container, isDark && styles.containerDark]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {renderSection('Eyes', EYE_SLIDERS)}
      {renderSection('Eyebrows', EYEBROW_SLIDERS)}
      {renderSection('Nose', NOSE_SLIDERS)}
      {renderSection('Mouth', MOUTH_SLIDERS)}
      {renderSection('Face Shape', FACE_SLIDERS)}
    </ScrollView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  containerDark: {
    backgroundColor: darkTheme.background,
  },
  content: {
    paddingBottom: 24,
  },
  section: {
    paddingTop: 12,
    paddingBottom: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  sectionTitleDark: {
    color: darkTheme.textMuted,
  },
});

export default ProportionSliderGroup;
