/**
 * Avatar2DCreator Component
 *
 * Full-screen avatar editor with customization options for:
 * - Gender
 * - Skin tone
 * - Hair style and color
 * - Eyes, eyebrows, mouth
 * - Facial hair (optional)
 * - Accessories (optional)
 * - Clothing
 *
 * Returns a StoredAvatar2D on completion.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import {
  Avatar2DConfig,
  StoredAvatar2D,
  DEFAULT_AVATAR_CONFIG,
  DEFAULT_FEMALE_CONFIG,
  SKIN_TONE_PRESETS,
  HAIR_COLOR_PRESETS,
  CLOTHING_COLOR_PRESETS,
  HAIR_STYLES,
  EYE_TYPES,
  EYEBROW_TYPES,
  MOUTH_TYPES,
  FACIAL_HAIR_TYPES,
  ACCESSORIES_TYPES,
  CLOTHING_TYPES,
} from './types';
import { Avatar2DDisplay } from './Avatar2DDisplay';
import { createStoredAvatar } from '@/lib/avatar2d/storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Avatar2DCreatorProps {
  initialConfig?: Avatar2DConfig;
  onComplete: (avatar: StoredAvatar2D) => void;
  onCancel?: () => void;
}

type EditorSection =
  | 'gender'
  | 'skinTone'
  | 'hair'
  | 'hairColor'
  | 'eyes'
  | 'eyebrows'
  | 'mouth'
  | 'facialHair'
  | 'accessories'
  | 'clothing'
  | 'clothingColor';

const SECTIONS: { key: EditorSection; label: string; icon: string }[] = [
  { key: 'gender', label: 'Gender', icon: '⚧' },
  { key: 'skinTone', label: 'Skin', icon: '🎨' },
  { key: 'hair', label: 'Hair', icon: '💇' },
  { key: 'hairColor', label: 'Hair Color', icon: '🖌️' },
  { key: 'eyes', label: 'Eyes', icon: '👁️' },
  { key: 'eyebrows', label: 'Brows', icon: '🤨' },
  { key: 'mouth', label: 'Mouth', icon: '👄' },
  { key: 'facialHair', label: 'Facial Hair', icon: '🧔' },
  { key: 'accessories', label: 'Glasses', icon: '👓' },
  { key: 'clothing', label: 'Clothing', icon: '👕' },
  { key: 'clothingColor', label: 'Shirt Color', icon: '🎨' },
];

export function Avatar2DCreator({
  initialConfig,
  onComplete,
  onCancel,
}: Avatar2DCreatorProps) {
  const [config, setConfig] = useState<Avatar2DConfig>(
    initialConfig || DEFAULT_AVATAR_CONFIG
  );
  const [activeSection, setActiveSection] = useState<EditorSection>('gender');

  const updateConfig = useCallback((updates: Partial<Avatar2DConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleGenderChange = useCallback(
    (gender: 'male' | 'female') => {
      // Apply default config for selected gender
      const defaultConfig = gender === 'male' ? DEFAULT_AVATAR_CONFIG : DEFAULT_FEMALE_CONFIG;
      setConfig({
        ...defaultConfig,
        skinTone: config.skinTone, // Preserve skin tone
      });
    },
    [config.skinTone]
  );

  const handleComplete = useCallback(() => {
    const avatar = createStoredAvatar(config);
    onComplete(avatar);
  }, [config, onComplete]);

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'gender':
        return (
          <View style={styles.optionsRow}>
            <TouchableOpacity
              style={[
                styles.genderOption,
                config.gender === 'male' && styles.optionSelected,
              ]}
              onPress={() => handleGenderChange('male')}
            >
              <Text style={styles.genderIcon}>👨</Text>
              <Text style={styles.genderLabel}>Male</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.genderOption,
                config.gender === 'female' && styles.optionSelected,
              ]}
              onPress={() => handleGenderChange('female')}
            >
              <Text style={styles.genderIcon}>👩</Text>
              <Text style={styles.genderLabel}>Female</Text>
            </TouchableOpacity>
          </View>
        );

      case 'skinTone':
        return (
          <View style={styles.colorGrid}>
            {SKIN_TONE_PRESETS.map((tone) => (
              <TouchableOpacity
                key={tone.hex}
                style={[
                  styles.colorOption,
                  { backgroundColor: tone.hex },
                  config.skinTone === tone.hex && styles.colorSelected,
                ]}
                onPress={() => updateConfig({ skinTone: tone.hex })}
              />
            ))}
          </View>
        );

      case 'hair':
        return (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.optionsRow}>
              {HAIR_STYLES.map((style) => (
                <TouchableOpacity
                  key={style}
                  style={[
                    styles.textOption,
                    config.hairStyle === style && styles.optionSelected,
                  ]}
                  onPress={() => updateConfig({ hairStyle: style })}
                >
                  <Text style={styles.textOptionLabel}>
                    {formatOptionLabel(style)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        );

      case 'hairColor':
        return (
          <View style={styles.colorGrid}>
            {HAIR_COLOR_PRESETS.map((color) => (
              <TouchableOpacity
                key={color.hex}
                style={[
                  styles.colorOption,
                  { backgroundColor: color.hex },
                  config.hairColor === color.hex && styles.colorSelected,
                ]}
                onPress={() => updateConfig({ hairColor: color.hex })}
              />
            ))}
          </View>
        );

      case 'eyes':
        return (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.optionsRow}>
              {EYE_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.textOption,
                    config.eyeType === type && styles.optionSelected,
                  ]}
                  onPress={() => updateConfig({ eyeType: type })}
                >
                  <Text style={styles.textOptionLabel}>
                    {formatOptionLabel(type)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        );

      case 'eyebrows':
        return (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.optionsRow}>
              {EYEBROW_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.textOption,
                    config.eyebrowType === type && styles.optionSelected,
                  ]}
                  onPress={() => updateConfig({ eyebrowType: type })}
                >
                  <Text style={styles.textOptionLabel}>
                    {formatOptionLabel(type)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        );

      case 'mouth':
        return (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.optionsRow}>
              {MOUTH_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.textOption,
                    config.mouthType === type && styles.optionSelected,
                  ]}
                  onPress={() => updateConfig({ mouthType: type })}
                >
                  <Text style={styles.textOptionLabel}>
                    {formatOptionLabel(type)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        );

      case 'facialHair':
        return (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.optionsRow}>
              {FACIAL_HAIR_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.textOption,
                    config.facialHair === type && styles.optionSelected,
                  ]}
                  onPress={() => updateConfig({ facialHair: type })}
                >
                  <Text style={styles.textOptionLabel}>
                    {formatOptionLabel(type)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        );

      case 'accessories':
        return (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.optionsRow}>
              {ACCESSORIES_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.textOption,
                    config.accessories === type && styles.optionSelected,
                  ]}
                  onPress={() => updateConfig({ accessories: type })}
                >
                  <Text style={styles.textOptionLabel}>
                    {formatOptionLabel(type)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        );

      case 'clothing':
        return (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.optionsRow}>
              {CLOTHING_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.textOption,
                    config.clothing === type && styles.optionSelected,
                  ]}
                  onPress={() => updateConfig({ clothing: type })}
                >
                  <Text style={styles.textOptionLabel}>
                    {formatOptionLabel(type)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        );

      case 'clothingColor':
        return (
          <View style={styles.colorGrid}>
            {CLOTHING_COLOR_PRESETS.map((color) => (
              <TouchableOpacity
                key={color.hex}
                style={[
                  styles.colorOption,
                  { backgroundColor: color.hex },
                  config.clothingColor === color.hex && styles.colorSelected,
                ]}
                onPress={() => updateConfig({ clothingColor: color.hex })}
              />
            ))}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {onCancel && (
          <TouchableOpacity onPress={onCancel} style={styles.headerButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Create Avatar</Text>
        <TouchableOpacity onPress={handleComplete} style={styles.headerButton}>
          <Text style={styles.doneText}>Done</Text>
        </TouchableOpacity>
      </View>

      {/* Avatar Preview */}
      <View style={styles.previewContainer}>
        <Avatar2DDisplay avatar={config} size="xl" />
      </View>

      {/* Section Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        {SECTIONS.map((section) => (
          <TouchableOpacity
            key={section.key}
            style={[
              styles.tab,
              activeSection === section.key && styles.tabActive,
            ]}
            onPress={() => setActiveSection(section.key)}
          >
            <Text style={styles.tabIcon}>{section.icon}</Text>
            <Text
              style={[
                styles.tabLabel,
                activeSection === section.key && styles.tabLabelActive,
              ]}
            >
              {section.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Options Panel */}
      <View style={styles.optionsContainer}>{renderSectionContent()}</View>
    </SafeAreaView>
  );
}

// Format camelCase to readable label
function formatOptionLabel(str: string): string {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .replace(/^\s+/, '')
    .replace('Short Hair', 'Short')
    .replace('Long Hair', 'Long')
    .replace('Shirt', '')
    .trim();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4a',
  },
  headerButton: {
    minWidth: 60,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  cancelText: {
    fontSize: 16,
    color: '#888',
  },
  doneText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5e6cd8',
    textAlign: 'right',
  },
  previewContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    backgroundColor: '#12121f',
  },
  tabsContainer: {
    maxHeight: 70,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4a',
  },
  tabsContent: {
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  tab: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#2a2a4a',
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 11,
    color: '#888',
  },
  tabLabelActive: {
    color: '#fff',
  },
  optionsContainer: {
    flex: 1,
    padding: 16,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  genderOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#2a2a4a',
    minWidth: 120,
  },
  genderIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  genderLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  optionSelected: {
    backgroundColor: '#5e6cd8',
    borderWidth: 2,
    borderColor: '#7b8ce8',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSelected: {
    borderColor: '#fff',
    transform: [{ scale: 1.1 }],
  },
  textOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#2a2a4a',
    marginRight: 8,
    marginBottom: 8,
  },
  textOptionLabel: {
    fontSize: 14,
    color: '#fff',
  },
});

export default Avatar2DCreator;
