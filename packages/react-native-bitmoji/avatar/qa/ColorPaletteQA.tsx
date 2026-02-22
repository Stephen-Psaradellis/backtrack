/**
 * Color Palette QA Screen
 *
 * Visual QA testing for all color palettes used in the avatar system.
 * Tests skin tones, hair colors, eye colors, makeup colors, etc.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  useColorScheme,
} from 'react-native';
import { Avatar } from '../Avatar';
import { DEFAULT_MALE_CONFIG, AvatarConfig } from '../types';
import { COLOR_PALETTES, ColorPalette } from './EnumIterators';
import { QAStatus, DEFAULT_QA_CONFIG } from './types';

// ============================================================================
// THEME
// ============================================================================

const COLORS = {
  light: {
    background: '#f5f5f5',
    card: '#ffffff',
    text: '#1a1a1a',
    textSecondary: '#666666',
    border: '#e0e0e0',
    passed: '#4caf50',
    failed: '#f44336',
    needsReview: '#ff9800',
    primary: '#2196f3',
  },
  dark: {
    background: '#121212',
    card: '#1e1e1e',
    text: '#ffffff',
    textSecondary: '#aaaaaa',
    border: '#333333',
    passed: '#66bb6a',
    failed: '#ef5350',
    needsReview: '#ffb74d',
    primary: '#42a5f5',
  },
};

// ============================================================================
// COLOR SWATCH
// ============================================================================

interface ColorSwatchProps {
  color: { name: string; hex: string; [key: string]: unknown };
  isSelected: boolean;
  onPress: () => void;
  status?: QAStatus;
  colors: typeof COLORS.light;
}

function ColorSwatch({ color, isSelected, onPress, status, colors }: ColorSwatchProps) {
  const getStatusBorderColor = () => {
    switch (status) {
      case 'passed':
        return colors.passed;
      case 'failed':
        return colors.failed;
      case 'needs_review':
        return colors.needsReview;
      default:
        return 'transparent';
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.colorSwatch,
        { borderColor: isSelected ? colors.primary : getStatusBorderColor() },
        isSelected && { borderWidth: 3 },
        status && status !== 'not_tested' && { borderWidth: 2 },
      ]}
      onPress={onPress}
    >
      <View style={[styles.colorSwatchInner, { backgroundColor: color.hex }]} />
      <Text style={[styles.colorSwatchName, { color: colors.text }]} numberOfLines={1}>
        {color.name}
      </Text>
      <Text style={[styles.colorSwatchHex, { color: colors.textSecondary }]}>
        {color.hex}
      </Text>
    </TouchableOpacity>
  );
}

// ============================================================================
// COLOR DETAIL VIEW
// ============================================================================

interface ColorDetailViewProps {
  palette: ColorPalette;
  color: { name: string; hex: string; [key: string]: unknown };
  onStatusChange: (status: QAStatus) => void;
  colors: typeof COLORS.light;
}

function ColorDetailView({ palette, color, onStatusChange, colors }: ColorDetailViewProps) {
  // Generate test config with this color applied
  const testConfig = useMemo<AvatarConfig>(() => {
    const config = { ...DEFAULT_MALE_CONFIG };

    // Apply color to the correct config key
    switch (palette.configKey) {
      case 'skinTone':
        config.skinTone = color.hex;
        break;
      case 'hairColor':
        config.hairColor = color.hex;
        break;
      case 'eyeColor':
        config.eyeColor = color.hex;
        break;
      case 'clothingColor':
        config.clothingColor = color.hex;
        break;
      default:
        // For other color types, try to apply dynamically
        (config as Record<string, unknown>)[palette.configKey] = color.hex;
    }

    return config;
  }, [palette, color]);

  // Additional color info if available
  const hasAdditionalInfo = 'shadow' in color || 'highlight' in color || 'pupil' in color;

  return (
    <View style={[styles.detailContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.detailHeader}>
        <View style={[styles.detailColorPreview, { backgroundColor: color.hex }]} />
        <View style={styles.detailInfo}>
          <Text style={[styles.detailName, { color: colors.text }]}>{color.name}</Text>
          <Text style={[styles.detailHex, { color: colors.textSecondary }]}>{color.hex}</Text>
        </View>
      </View>

      {hasAdditionalInfo && (
        <View style={styles.additionalColors}>
          {'shadow' in color && (
            <View style={styles.additionalColorItem}>
              <View style={[styles.additionalColorSwatch, { backgroundColor: color.shadow as string }]} />
              <Text style={[styles.additionalColorLabel, { color: colors.textSecondary }]}>Shadow</Text>
            </View>
          )}
          {'highlight' in color && (
            <View style={styles.additionalColorItem}>
              <View style={[styles.additionalColorSwatch, { backgroundColor: color.highlight as string }]} />
              <Text style={[styles.additionalColorLabel, { color: colors.textSecondary }]}>Highlight</Text>
            </View>
          )}
          {'pupil' in color && (
            <View style={styles.additionalColorItem}>
              <View style={[styles.additionalColorSwatch, { backgroundColor: color.pupil as string }]} />
              <Text style={[styles.additionalColorLabel, { color: colors.textSecondary }]}>Pupil</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.detailPreview}>
        <Avatar
          config={testConfig}
          customSize={150}
          backgroundColor="#f0f0f0"
        />
      </View>

      <View style={styles.detailActions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.passed }]}
          onPress={() => onStatusChange('passed')}
        >
          <Text style={styles.actionButtonText}>Pass</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.needsReview }]}
          onPress={() => onStatusChange('needs_review')}
        >
          <Text style={styles.actionButtonText}>Review</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.failed }]}
          onPress={() => onStatusChange('failed')}
        >
          <Text style={styles.actionButtonText}>Fail</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================================================================
// PALETTE SECTION
// ============================================================================

interface PaletteSectionProps {
  palette: ColorPalette;
  selectedColor: { name: string; hex: string; [key: string]: unknown } | null;
  onSelectColor: (color: { name: string; hex: string; [key: string]: unknown }) => void;
  colorStatuses: Map<string, QAStatus>;
  colors: typeof COLORS.light;
  expanded: boolean;
  onToggleExpand: () => void;
}

function PaletteSection({
  palette,
  selectedColor,
  onSelectColor,
  colorStatuses,
  colors,
  expanded,
  onToggleExpand,
}: PaletteSectionProps) {
  const testedCount = Array.from(colorStatuses.values()).filter(s => s !== 'not_tested').length;
  const passedCount = Array.from(colorStatuses.values()).filter(s => s === 'passed').length;
  const failedCount = Array.from(colorStatuses.values()).filter(s => s === 'failed').length;

  return (
    <View style={[styles.paletteSection, { borderColor: colors.border }]}>
      <TouchableOpacity
        style={[styles.paletteSectionHeader, { backgroundColor: colors.card }]}
        onPress={onToggleExpand}
      >
        <View>
          <Text style={[styles.paletteSectionTitle, { color: colors.text }]}>{palette.name}</Text>
          <Text style={[styles.paletteSectionCount, { color: colors.textSecondary }]}>
            {palette.colors.length} colors | {testedCount} tested
            {passedCount > 0 && ` | ${passedCount} passed`}
            {failedCount > 0 && ` | ${failedCount} failed`}
          </Text>
        </View>
        <Text style={[styles.expandIcon, { color: colors.textSecondary }]}>
          {expanded ? '▼' : '▶'}
        </Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.paletteGrid}>
          {palette.colors.map((color, index) => (
            <ColorSwatch
              key={`${color.hex}-${index}`}
              color={color}
              isSelected={selectedColor?.hex === color.hex}
              onPress={() => onSelectColor(color)}
              status={colorStatuses.get(color.hex)}
              colors={colors}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ============================================================================
// MAIN COLOR PALETTE QA
// ============================================================================

interface ColorPaletteQAProps {
  onClose?: () => void;
}

export function ColorPaletteQA({ onClose }: ColorPaletteQAProps) {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? COLORS.dark : COLORS.light;

  const [selectedPalette, setSelectedPalette] = useState<ColorPalette | null>(null);
  const [selectedColor, setSelectedColor] = useState<{ name: string; hex: string; [key: string]: unknown } | null>(null);
  const [expandedPalettes, setExpandedPalettes] = useState<Set<string>>(new Set());
  const [colorStatuses, setColorStatuses] = useState<Map<string, Map<string, QAStatus>>>(new Map());

  // Total statistics
  const totalColors = useMemo(() => {
    return COLOR_PALETTES.reduce((sum, p) => sum + p.colors.length, 0);
  }, []);

  const handleToggleExpand = (paletteName: string) => {
    setExpandedPalettes(prev => {
      const next = new Set(prev);
      if (next.has(paletteName)) {
        next.delete(paletteName);
      } else {
        next.add(paletteName);
      }
      return next;
    });
  };

  const handleSelectColor = (palette: ColorPalette, color: { name: string; hex: string; [key: string]: unknown }) => {
    setSelectedPalette(palette);
    setSelectedColor(color);
  };

  const handleStatusChange = (status: QAStatus) => {
    if (!selectedPalette || !selectedColor) return;

    setColorStatuses(prev => {
      const next = new Map(prev);
      let paletteStatuses = next.get(selectedPalette.name);
      if (!paletteStatuses) {
        paletteStatuses = new Map();
        next.set(selectedPalette.name, paletteStatuses);
      }
      paletteStatuses.set(selectedColor.hex, status);
      return next;
    });

    // Move to next color
    const currentIndex = selectedPalette.colors.findIndex(c => c.hex === selectedColor.hex);
    if (currentIndex < selectedPalette.colors.length - 1) {
      setSelectedColor(selectedPalette.colors[currentIndex + 1]);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Color Palette QA</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {COLOR_PALETTES.length} palettes | {totalColors} total colors
          </Text>
        </View>
        {onClose && (
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: colors.textSecondary }]}
            onPress={onClose}
          >
            <Text style={styles.headerButtonText}>Close</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.content}>
        {/* Left side - palette list */}
        <ScrollView style={styles.paletteList}>
          {COLOR_PALETTES.map(palette => (
            <PaletteSection
              key={palette.name}
              palette={palette}
              selectedColor={selectedPalette?.name === palette.name ? selectedColor : null}
              onSelectColor={color => handleSelectColor(palette, color)}
              colorStatuses={colorStatuses.get(palette.name) ?? new Map()}
              colors={colors}
              expanded={expandedPalettes.has(palette.name)}
              onToggleExpand={() => handleToggleExpand(palette.name)}
            />
          ))}
        </ScrollView>

        {/* Right side - detail view */}
        {selectedPalette && selectedColor && (
          <ColorDetailView
            palette={selectedPalette}
            color={selectedColor}
            onStatusChange={handleStatusChange}
            colors={colors}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  headerButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  paletteList: {
    flex: 1,
  },
  paletteSection: {
    borderBottomWidth: 1,
  },
  paletteSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  paletteSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  paletteSectionCount: {
    fontSize: 11,
    marginTop: 2,
  },
  expandIcon: {
    fontSize: 12,
  },
  paletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    gap: 8,
  },
  colorSwatch: {
    width: 60,
    alignItems: 'center',
    padding: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  colorSwatchInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  colorSwatchName: {
    fontSize: 9,
    marginTop: 4,
    textAlign: 'center',
  },
  colorSwatchHex: {
    fontSize: 8,
    textAlign: 'center',
  },
  detailContainer: {
    width: 250,
    padding: 16,
    borderLeftWidth: 1,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailColorPreview: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  detailInfo: {
    marginLeft: 12,
    flex: 1,
  },
  detailName: {
    fontSize: 16,
    fontWeight: '600',
  },
  detailHex: {
    fontSize: 12,
    marginTop: 2,
  },
  additionalColors: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  additionalColorItem: {
    alignItems: 'center',
  },
  additionalColorSwatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  additionalColorLabel: {
    fontSize: 10,
    marginTop: 4,
  },
  detailPreview: {
    alignItems: 'center',
    marginBottom: 16,
  },
  detailActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default ColorPaletteQA;
