/**
 * QA Navigator
 *
 * Main navigation component for the QA testing system.
 * Provides access to all QA tools in a single interface.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  useColorScheme,
  ScrollView,
} from 'react-native';
import { QATestHarness } from './QATestHarness';
import { ColorPaletteQA } from './ColorPaletteQA';
import { IntegrationTests } from './IntegrationTests';
import { getQAStatistics } from './EnumIterators';

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
    primary: '#2196f3',
    passed: '#4caf50',
    warning: '#ff9800',
  },
  dark: {
    background: '#121212',
    card: '#1e1e1e',
    text: '#ffffff',
    textSecondary: '#aaaaaa',
    border: '#333333',
    primary: '#42a5f5',
    passed: '#66bb6a',
    warning: '#ffb74d',
  },
};

// ============================================================================
// SCREEN TYPE
// ============================================================================

type QAScreen = 'home' | 'style_variants' | 'color_palettes' | 'integration_tests';

// ============================================================================
// HOME SCREEN
// ============================================================================

interface HomeScreenProps {
  onNavigate: (screen: QAScreen) => void;
  onClose?: () => void;
  colors: typeof COLORS.light;
}

function HomeScreen({ onNavigate, onClose, colors }: HomeScreenProps) {
  const stats = getQAStatistics();

  const menuItems = [
    {
      id: 'style_variants' as const,
      title: 'Style Variant QA',
      description: 'Test all style enums (face, eyes, hair, etc.)',
      stats: `${stats.totalEnums} enums | ${stats.totalVariants} variants`,
      icon: '🎭',
    },
    {
      id: 'color_palettes' as const,
      title: 'Color Palette QA',
      description: 'Test all color palettes (skin, hair, etc.)',
      stats: `${stats.totalColors} colors`,
      icon: '🎨',
    },
    {
      id: 'integration_tests' as const,
      title: 'Integration Tests',
      description: 'Cross-component and edge case tests',
      stats: 'Layer order, proportions, combinations',
      icon: '🔬',
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Avatar QA System</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Visual Quality Assurance Tools
          </Text>
        </View>
        {onClose && (
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.textSecondary }]}
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Statistics Card */}
      <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.statsTitle, { color: colors.text }]}>Total Assets to Test</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.totalEnums}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Enums</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.totalVariants}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Style Variants</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.totalColors}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Colors</Text>
          </View>
        </View>
      </View>

      {/* Menu Items */}
      <ScrollView style={styles.menuContainer}>
        {menuItems.map(item => (
          <TouchableOpacity
            key={item.id}
            style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => onNavigate(item.id)}
          >
            <Text style={styles.menuItemIcon}>{item.icon}</Text>
            <View style={styles.menuItemContent}>
              <Text style={[styles.menuItemTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.menuItemDesc, { color: colors.textSecondary }]}>
                {item.description}
              </Text>
              <Text style={[styles.menuItemStats, { color: colors.primary }]}>{item.stats}</Text>
            </View>
            <Text style={[styles.menuItemArrow, { color: colors.textSecondary }]}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Instructions */}
      <View style={[styles.instructionsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.instructionsTitle, { color: colors.text }]}>QA Workflow</Text>
        <Text style={[styles.instructionsText, { color: colors.textSecondary }]}>
          1. Start with Style Variant QA to test individual features{'\n'}
          2. Use Color Palette QA to verify color rendering{'\n'}
          3. Run Integration Tests for cross-component checks{'\n'}
          4. Mark items as Pass/Fail/Review as you go
        </Text>
      </View>
    </SafeAreaView>
  );
}

// ============================================================================
// MAIN QA NAVIGATOR
// ============================================================================

interface QANavigatorProps {
  onClose?: () => void;
}

export function QANavigator({ onClose }: QANavigatorProps) {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? COLORS.dark : COLORS.light;
  const [currentScreen, setCurrentScreen] = useState<QAScreen>('home');

  const handleNavigate = (screen: QAScreen) => {
    setCurrentScreen(screen);
  };

  const handleBack = () => {
    setCurrentScreen('home');
  };

  switch (currentScreen) {
    case 'style_variants':
      return <QATestHarness onClose={handleBack} />;
    case 'color_palettes':
      return <ColorPaletteQA onClose={handleBack} />;
    case 'integration_tests':
      return <IntegrationTests onClose={handleBack} />;
    default:
      return <HomeScreen onNavigate={handleNavigate} onClose={onClose} colors={colors} />;
  }
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
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  closeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  statsCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  menuContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  menuItemIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  menuItemDesc: {
    fontSize: 14,
    marginTop: 4,
  },
  menuItemStats: {
    fontSize: 12,
    marginTop: 4,
  },
  menuItemArrow: {
    fontSize: 24,
    marginLeft: 8,
  },
  instructionsCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 12,
    lineHeight: 20,
  },
});

export default QANavigator;
