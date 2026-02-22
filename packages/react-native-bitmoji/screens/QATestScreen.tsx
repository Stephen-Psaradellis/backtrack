/**
 * QATestScreen - Visual QA Testing Component with Progress Tracking
 *
 * Renders avatars with all style variations to verify:
 * - All enum values render correctly
 * - Gradient IDs are stable (no flickering)
 * - Color palettes display properly
 * - Z-layering is correct
 *
 * Features:
 * - Progress tracking with persistent storage
 * - Pass/fail marking for individual styles
 * - Section-level and overall progress indicators
 * - Export/import QA results
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '../avatar';
import {
  AvatarConfig,
  DEFAULT_MALE_CONFIG,
  HairStyle,
  EyeStyle,
  EyelashStyle,
  EyebrowStyle,
  NoseStyle,
  MouthStyle,
  FaceShape,
  FacialHairStyle,
  HairTreatment,
  FreckleStyle,
  WrinkleStyle,
  EyeBagsStyle,
  CheekStyle,
  SkinDetail,
  FaceTattooStyle,
  EyeshadowStyle,
  EyelinerStyle,
  LipstickStyle,
  BlushStyle,
  AccessoryStyle,
  ClothingStyle,
  SKIN_TONES,
  HAIR_COLORS,
  EYE_COLORS,
} from '../avatar/types';
import { colors, darkTheme } from '../constants/theme';
import { qaTracking, TestStatus, TestResult, QA_SECTIONS } from '../services/qaTracking';

// =============================================================================
// TYPES
// =============================================================================

interface TestSection {
  title: string;
  configKey: keyof AvatarConfig;
  values: string[];
  baseConfig?: Partial<AvatarConfig>;
  component: string; // Component name for tracking
}

interface OverallProgress {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  pendingTests: number;
  completionPercentage: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const AVATAR_SIZE = 80;
const GRID_COLUMNS = 4;

// Test sections covering all major enums
const TEST_SECTIONS: TestSection[] = [
  {
    title: 'Hair Styles',
    configKey: 'hairStyle',
    values: Object.values(HairStyle),
    component: 'Hair',
  },
  {
    title: 'Hair Treatments',
    configKey: 'hairTreatment',
    values: Object.values(HairTreatment),
    baseConfig: { hairStyle: HairStyle.LONG_WAVY },
    component: 'HairTreatment',
  },
  {
    title: 'Face Shapes',
    configKey: 'faceShape',
    values: Object.values(FaceShape),
    baseConfig: { hairStyle: HairStyle.SHORT_BUZZ },
    component: 'FaceShape',
  },
  {
    title: 'Eye Styles',
    configKey: 'eyeStyle',
    values: Object.values(EyeStyle),
    component: 'Eyes',
  },
  {
    title: 'Eyelash Styles',
    configKey: 'eyelashStyle',
    values: Object.values(EyelashStyle),
    component: 'Eyelashes',
  },
  {
    title: 'Eyebrow Styles',
    configKey: 'eyebrowStyle',
    values: Object.values(EyebrowStyle),
    baseConfig: { hairStyle: HairStyle.SHORT_BUZZ },
    component: 'Eyebrows',
  },
  {
    title: 'Nose Styles',
    configKey: 'noseStyle',
    values: Object.values(NoseStyle),
    baseConfig: { hairStyle: HairStyle.SHORT_BUZZ },
    component: 'Nose',
  },
  {
    title: 'Mouth Styles',
    configKey: 'mouthStyle',
    values: Object.values(MouthStyle),
    baseConfig: { hairStyle: HairStyle.SHORT_BUZZ },
    component: 'Mouth',
  },
  {
    title: 'Facial Hair',
    configKey: 'facialHair',
    values: Object.values(FacialHairStyle),
    baseConfig: { hairStyle: HairStyle.SHORT_CREW },
    component: 'FacialHair',
  },
  {
    title: 'Accessories',
    configKey: 'accessory',
    values: Object.values(AccessoryStyle),
    component: 'Accessories',
  },
  {
    title: 'Clothing Styles',
    configKey: 'clothing',
    values: Object.values(ClothingStyle).slice(0, 30), // Limit for performance
    component: 'Clothing',
  },
  {
    title: 'Freckles',
    configKey: 'freckles',
    values: Object.values(FreckleStyle),
    baseConfig: { skinTone: '#f5d7c3' },
    component: 'Freckles',
  },
  {
    title: 'Wrinkles',
    configKey: 'wrinkles',
    values: Object.values(WrinkleStyle),
    component: 'Wrinkles',
  },
  {
    title: 'Eye Bags',
    configKey: 'eyeBags',
    values: Object.values(EyeBagsStyle),
    component: 'EyeBags',
  },
  {
    title: 'Cheek Styles',
    configKey: 'cheekStyle',
    values: Object.values(CheekStyle),
    component: 'CheekStyle',
  },
  {
    title: 'Skin Details',
    configKey: 'skinDetail',
    values: Object.values(SkinDetail),
    component: 'SkinDetail',
  },
  {
    title: 'Face Tattoos',
    configKey: 'faceTattoo',
    values: Object.values(FaceTattooStyle),
    baseConfig: { hairStyle: HairStyle.SHORT_BUZZ },
    component: 'FaceTattoo',
  },
  {
    title: 'Eyeshadow',
    configKey: 'eyeshadowStyle',
    values: Object.values(EyeshadowStyle),
    baseConfig: { eyeshadowColor: '#8e4585' },
    component: 'Eyeshadow',
  },
  {
    title: 'Eyeliner',
    configKey: 'eyelinerStyle',
    values: Object.values(EyelinerStyle),
    baseConfig: { eyelinerColor: '#0a0a0a' },
    component: 'Eyeliner',
  },
  {
    title: 'Lipstick',
    configKey: 'lipstickStyle',
    values: Object.values(LipstickStyle),
    baseConfig: { lipstickColor: '#c41e3a' },
    component: 'Lipstick',
  },
  {
    title: 'Blush',
    configKey: 'blushStyle',
    values: Object.values(BlushStyle),
    baseConfig: { blushColor: '#f0b8c8' },
    component: 'Blush',
  },
];

// =============================================================================
// PROGRESS DASHBOARD COMPONENT
// =============================================================================

interface ProgressDashboardProps {
  progress: OverallProgress;
  isDark: boolean;
  onClearAll: () => void;
}

function ProgressDashboard({ progress, isDark, onClearAll }: ProgressDashboardProps) {
  const progressWidth = `${progress.completionPercentage}%` as `${number}%`;

  return (
    <View style={[styles.dashboard, isDark && styles.dashboardDark]}>
      <View style={styles.dashboardHeader}>
        <Text style={[styles.dashboardTitle, isDark && styles.dashboardTitleDark]}>
          QA Progress
        </Text>
        <TouchableOpacity onPress={onClearAll} style={styles.clearButton}>
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: progressWidth }]} />
        <Text style={styles.progressText}>{progress.completionPercentage}%</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#4ade80' }]}>{progress.passedTests}</Text>
          <Text style={[styles.statLabel, isDark && styles.statLabelDark]}>Passed</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#f87171' }]}>{progress.failedTests}</Text>
          <Text style={[styles.statLabel, isDark && styles.statLabelDark]}>Failed</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#fbbf24' }]}>{progress.pendingTests}</Text>
          <Text style={[styles.statLabel, isDark && styles.statLabelDark]}>Pending</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, isDark && styles.statValueDark]}>{progress.totalTests}</Text>
          <Text style={[styles.statLabel, isDark && styles.statLabelDark]}>Total</Text>
        </View>
      </View>
    </View>
  );
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

interface AvatarCellProps {
  config: AvatarConfig;
  label: string;
  isDark: boolean;
  component: string;
  style: string;
  testResult?: TestResult;
  onMarkPassed: (component: string, style: string) => void;
  onMarkFailed: (component: string, style: string) => void;
}

function AvatarCell({
  config,
  label,
  isDark,
  component,
  style,
  testResult,
  onMarkPassed,
  onMarkFailed,
}: AvatarCellProps) {
  const status = testResult?.status || 'pending';

  const getBorderColor = () => {
    switch (status) {
      case 'passed': return '#4ade80';
      case 'failed': return '#f87171';
      default: return isDark ? '#444' : '#ddd';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'passed': return 'P';
      case 'failed': return 'F';
      default: return '';
    }
  };

  return (
    <View style={styles.avatarCell}>
      <View style={styles.avatarWrapper}>
        <Avatar
          config={config}
          customSize={AVATAR_SIZE}
          backgroundColor={isDark ? '#2a2a2a' : '#f0f0f0'}
          showBorder
          borderColor={getBorderColor()}
          borderWidth={status !== 'pending' ? 3 : 1}
        />
        {status !== 'pending' && (
          <View style={[
            styles.statusBadge,
            status === 'passed' ? styles.statusBadgePassed : styles.statusBadgeFailed
          ]}>
            <Text style={styles.statusBadgeText}>{getStatusIcon()}</Text>
          </View>
        )}
      </View>
      <Text
        style={[styles.avatarLabel, isDark && styles.avatarLabelDark]}
        numberOfLines={2}
      >
        {label}
      </Text>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.passButton]}
          onPress={() => onMarkPassed(component, style)}
        >
          <Text style={styles.actionButtonText}>Pass</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.failButton]}
          onPress={() => onMarkFailed(component, style)}
        >
          <Text style={styles.actionButtonText}>Fail</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Simple cell for color palette testing (no action buttons)
interface ColorCellProps {
  config: AvatarConfig;
  label: string;
  isDark: boolean;
}

function ColorCell({ config, label, isDark }: ColorCellProps) {
  return (
    <View style={styles.avatarCell}>
      <View style={styles.avatarWrapper}>
        <Avatar
          config={config}
          customSize={AVATAR_SIZE}
          backgroundColor={isDark ? '#2a2a2a' : '#f0f0f0'}
          showBorder
          borderColor={isDark ? '#444' : '#ddd'}
          borderWidth={1}
        />
      </View>
      <Text
        style={[styles.avatarLabel, isDark && styles.avatarLabelDark]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </View>
  );
}

interface TestSectionViewProps {
  section: TestSection;
  isDark: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  testResults: Record<string, TestResult>;
  onMarkPassed: (component: string, style: string) => void;
  onMarkFailed: (component: string, style: string) => void;
  onMarkAllPassed: (component: string, styles: string[]) => void;
}

function TestSectionView({
  section,
  isDark,
  isExpanded,
  onToggle,
  testResults,
  onMarkPassed,
  onMarkFailed,
  onMarkAllPassed,
}: TestSectionViewProps) {
  const avatarConfigs = useMemo(() => {
    return section.values.map((value) => ({
      config: {
        ...DEFAULT_MALE_CONFIG,
        ...section.baseConfig,
        [section.configKey]: value,
      } as AvatarConfig,
      label: value.replace(/_/g, ' '),
      style: value,
    }));
  }, [section]);

  // Calculate section progress
  const sectionProgress = useMemo(() => {
    const total = section.values.length;
    const passed = section.values.filter(v =>
      testResults[`${section.component}-${v}`]?.status === 'passed'
    ).length;
    const failed = section.values.filter(v =>
      testResults[`${section.component}-${v}`]?.status === 'failed'
    ).length;
    return { total, passed, failed, pending: total - passed - failed };
  }, [section, testResults]);

  const progressPercentage = sectionProgress.total > 0
    ? Math.round((sectionProgress.passed / sectionProgress.total) * 100)
    : 0;

  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={[styles.sectionHeader, isDark && styles.sectionHeaderDark]}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles.sectionHeaderLeft}>
          <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
            {section.title}
          </Text>
          <View style={styles.sectionStats}>
            <Text style={[styles.sectionStatText, { color: '#4ade80' }]}>{sectionProgress.passed}</Text>
            <Text style={[styles.sectionStatText, { color: '#f87171' }]}>{sectionProgress.failed}</Text>
            <Text style={[styles.sectionStatText, { color: '#fbbf24' }]}>{sectionProgress.pending}</Text>
          </View>
        </View>
        <View style={styles.sectionHeaderRight}>
          <View style={styles.miniProgressBar}>
            <View style={[styles.miniProgressFill, { width: `${progressPercentage}%` }]} />
          </View>
          <Text style={[styles.expandIcon, isDark && styles.expandIconDark]}>
            {isExpanded ? '−' : '+'}
          </Text>
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View>
          <View style={styles.sectionActions}>
            <TouchableOpacity
              style={styles.markAllButton}
              onPress={() => onMarkAllPassed(section.component, section.values)}
            >
              <Text style={styles.markAllButtonText}>Mark All Passed</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.avatarGrid, isDark && styles.avatarGridDark]}>
            {avatarConfigs.map(({ config, label, style }, index) => (
              <AvatarCell
                key={index}
                config={config}
                label={label}
                isDark={isDark}
                component={section.component}
                style={style}
                testResult={testResults[`${section.component}-${style}`]}
                onMarkPassed={onMarkPassed}
                onMarkFailed={onMarkFailed}
              />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

// =============================================================================
// SPECIAL TEST SECTIONS
// =============================================================================

interface ColorPaletteTestProps {
  isDark: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}

function SkinToneTest({ isDark, isExpanded, onToggle }: ColorPaletteTestProps) {
  const configs = useMemo(() => {
    return SKIN_TONES.map((tone) => ({
      config: {
        ...DEFAULT_MALE_CONFIG,
        skinTone: tone.hex,
        hairStyle: HairStyle.SHORT_BUZZ,
      } as AvatarConfig,
      label: tone.name,
    }));
  }, []);

  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={[styles.sectionHeader, isDark && styles.sectionHeaderDark]}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
          Skin Tones ({SKIN_TONES.length})
        </Text>
        <Text style={[styles.expandIcon, isDark && styles.expandIconDark]}>
          {isExpanded ? '−' : '+'}
        </Text>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.avatarGrid}>
          {configs.map(({ config, label }, index) => (
            <ColorCell key={index} config={config} label={label} isDark={isDark} />
          ))}
        </View>
      )}
    </View>
  );
}

function HairColorTest({ isDark, isExpanded, onToggle }: ColorPaletteTestProps) {
  const configs = useMemo(() => {
    return HAIR_COLORS.map((color) => ({
      config: {
        ...DEFAULT_MALE_CONFIG,
        hairColor: color.hex,
        hairStyle: HairStyle.MEDIUM_WAVY,
      } as AvatarConfig,
      label: color.name,
    }));
  }, []);

  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={[styles.sectionHeader, isDark && styles.sectionHeaderDark]}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
          Hair Colors ({HAIR_COLORS.length})
        </Text>
        <Text style={[styles.expandIcon, isDark && styles.expandIconDark]}>
          {isExpanded ? '−' : '+'}
        </Text>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.avatarGrid}>
          {configs.map(({ config, label }, index) => (
            <ColorCell key={index} config={config} label={label} isDark={isDark} />
          ))}
        </View>
      )}
    </View>
  );
}

function EyeColorTest({ isDark, isExpanded, onToggle }: ColorPaletteTestProps) {
  const configs = useMemo(() => {
    return EYE_COLORS.map((color) => ({
      config: {
        ...DEFAULT_MALE_CONFIG,
        eyeColor: color.hex,
        hairStyle: HairStyle.SHORT_BUZZ,
        eyeStyle: EyeStyle.ROUND,
      } as AvatarConfig,
      label: color.name,
    }));
  }, []);

  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={[styles.sectionHeader, isDark && styles.sectionHeaderDark]}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
          Eye Colors ({EYE_COLORS.length})
        </Text>
        <Text style={[styles.expandIcon, isDark && styles.expandIconDark]}>
          {isExpanded ? '−' : '+'}
        </Text>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.avatarGrid}>
          {configs.map(({ config, label }, index) => (
            <ColorCell key={index} config={config} label={label} isDark={isDark} />
          ))}
        </View>
      )}
    </View>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function QATestScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Track expanded sections
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['Hair Styles']) // Start with one section expanded
  );

  // Test results state
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [overallProgress, setOverallProgress] = useState<OverallProgress>({
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    pendingTests: 0,
    completionPercentage: 0,
  });

  // Load test results on mount
  useEffect(() => {
    loadTestResults();
  }, []);

  const loadTestResults = useCallback(async () => {
    try {
      const state = await qaTracking.getState();
      setTestResults(state.results);
      setOverallProgress(qaTracking.getOverallProgress());
    } catch (error) {
      console.error('Error loading test results:', error);
    }
  }, []);

  // Mark a single test as passed
  const handleMarkPassed = useCallback(async (component: string, style: string) => {
    try {
      await qaTracking.recordResult(component, style, 'passed');
      await loadTestResults();
    } catch (error) {
      console.error('Error marking test as passed:', error);
    }
  }, [loadTestResults]);

  // Mark a single test as failed
  const handleMarkFailed = useCallback(async (component: string, style: string) => {
    try {
      await qaTracking.recordResult(component, style, 'failed');
      await loadTestResults();
    } catch (error) {
      console.error('Error marking test as failed:', error);
    }
  }, [loadTestResults]);

  // Mark all tests in a section as passed
  const handleMarkAllPassed = useCallback(async (component: string, styles: string[]) => {
    try {
      await qaTracking.markSectionPassed(component, styles);
      await loadTestResults();
    } catch (error) {
      console.error('Error marking section as passed:', error);
    }
  }, [loadTestResults]);

  // Clear all test results
  const handleClearAll = useCallback(() => {
    Alert.alert(
      'Clear All Results',
      'Are you sure you want to clear all QA test results? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await qaTracking.clearAll();
            await loadTestResults();
          },
        },
      ]
    );
  }, [loadTestResults]);

  const toggleSection = useCallback((sectionTitle: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionTitle)) {
        next.delete(sectionTitle);
      } else {
        next.add(sectionTitle);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    const allTitles = [
      ...TEST_SECTIONS.map((s) => s.title),
      'Skin Tones',
      'Hair Colors',
      'Eye Colors',
    ];
    setExpandedSections(new Set(allTitles));
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedSections(new Set());
  }, []);

  return (
    <SafeAreaView
      style={[styles.container, isDark && styles.containerDark]}
      edges={['top']}
    >
      {/* Header */}
      <View style={[styles.header, isDark && styles.headerDark]}>
        <Text style={[styles.headerTitle, isDark && styles.headerTitleDark]}>
          Avatar QA Testing
        </Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.headerButton} onPress={expandAll}>
            <Text style={[styles.headerButtonText, isDark && styles.headerButtonTextDark]}>
              Expand All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={collapseAll}>
            <Text style={[styles.headerButtonText, isDark && styles.headerButtonTextDark]}>
              Collapse
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress Dashboard */}
      <ProgressDashboard
        progress={overallProgress}
        isDark={isDark}
        onClearAll={handleClearAll}
      />

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Color Palette Tests */}
        <SkinToneTest
          isDark={isDark}
          isExpanded={expandedSections.has('Skin Tones')}
          onToggle={() => toggleSection('Skin Tones')}
        />
        <HairColorTest
          isDark={isDark}
          isExpanded={expandedSections.has('Hair Colors')}
          onToggle={() => toggleSection('Hair Colors')}
        />
        <EyeColorTest
          isDark={isDark}
          isExpanded={expandedSections.has('Eye Colors')}
          onToggle={() => toggleSection('Eye Colors')}
        />

        {/* Enum Tests */}
        {TEST_SECTIONS.map((section) => (
          <TestSectionView
            key={section.title}
            section={section}
            isDark={isDark}
            isExpanded={expandedSections.has(section.title)}
            onToggle={() => toggleSection(section.title)}
            testResults={testResults}
            onMarkPassed={handleMarkPassed}
            onMarkFailed={handleMarkFailed}
            onMarkAllPassed={handleMarkAllPassed}
          />
        ))}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, isDark && styles.footerTextDark]}>
            Total test sections: {TEST_SECTIONS.length + 3}
          </Text>
          <Text style={[styles.footerText, isDark && styles.footerTextDark]}>
            Tap Pass/Fail to record test results. Progress is saved automatically.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  containerDark: {
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  headerDark: {
    backgroundColor: '#2a2a2a',
    borderBottomColor: '#444',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerTitleDark: {
    color: '#fff',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: '#e0e0e0',
  },
  headerButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
  },
  headerButtonTextDark: {
    color: '#fff',
  },
  // Dashboard styles
  dashboard: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  dashboardDark: {
    backgroundColor: '#2a2a2a',
    borderBottomColor: '#444',
  },
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dashboardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  dashboardTitleDark: {
    color: '#fff',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#f87171',
    borderRadius: 4,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  progressBar: {
    height: 24,
    backgroundColor: '#e0e0e0',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#667eea',
    borderRadius: 12,
  },
  progressText: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    textAlign: 'center',
    lineHeight: 24,
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  statValueDark: {
    color: '#fff',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  statLabelDark: {
    color: '#aaa',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionHeaderDark: {
    backgroundColor: '#2a2a2a',
    borderBottomColor: '#444',
  },
  sectionHeaderLeft: {
    flex: 1,
  },
  sectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  sectionTitleDark: {
    color: '#fff',
  },
  sectionStats: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  sectionStatText: {
    fontSize: 11,
    fontWeight: '600',
  },
  miniProgressBar: {
    width: 60,
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    backgroundColor: '#4ade80',
    borderRadius: 3,
  },
  expandIcon: {
    fontSize: 24,
    fontWeight: '300',
    color: '#666',
  },
  expandIconDark: {
    color: '#aaa',
  },
  sectionActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 8,
    backgroundColor: '#f0f0f0',
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#4ade80',
    borderRadius: 4,
  },
  markAllButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    backgroundColor: '#fafafa',
  },
  avatarGridDark: {
    backgroundColor: '#1f1f1f',
  },
  avatarCell: {
    width: `${100 / GRID_COLUMNS}%`,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  avatarWrapper: {
    position: 'relative',
  },
  statusBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadgePassed: {
    backgroundColor: '#4ade80',
  },
  statusBadgeFailed: {
    backgroundColor: '#f87171',
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  avatarLabel: {
    fontSize: 9,
    textAlign: 'center',
    color: '#666',
    marginTop: 4,
    height: 20,
  },
  avatarLabelDark: {
    color: '#aaa',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  actionButton: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
  },
  passButton: {
    backgroundColor: '#4ade80',
  },
  failButton: {
    backgroundColor: '#f87171',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginBottom: 4,
  },
  footerTextDark: {
    color: '#666',
  },
});

export default QATestScreen;
