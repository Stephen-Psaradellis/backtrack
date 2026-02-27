/**
 * QA Test Harness
 *
 * Main component for visual QA testing of all avatar style variants.
 * Provides navigation through all enums and allows marking styles as
 * passed, failed, or needing review.
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  useColorScheme,
  Alert,
} from 'react-native';
import Svg, { Rect, Line } from 'react-native-svg';
import { Avatar } from '../Avatar';
import { DEFAULT_MALE_CONFIG, AvatarConfig, BodyType } from '../types';
import {
  ENUM_METADATA,
  getEnumValues,
  getEnumCount,
  getAllCategories,
  getEnumsByCategory,
  getQAStatistics,
  generateTestConfig,
  StyleVariant,
  iterateEnumStyles,
} from './EnumIterators';
import type { EnumMetadata } from './types';
import {
  QAStatus,
  QAResult,
  ComponentQAResults,
  QASession,
  QACategory,
  DEFAULT_QA_CONFIG,
  QATestConfig,
} from './types';

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
    notTested: '#9e9e9e',
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
    notTested: '#757575',
    primary: '#42a5f5',
  },
};

// ============================================================================
// QA STATUS BADGE
// ============================================================================

interface StatusBadgeProps {
  status: QAStatus;
  colors: typeof COLORS.light;
}

function StatusBadge({ status, colors }: StatusBadgeProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'passed':
        return colors.passed;
      case 'failed':
        return colors.failed;
      case 'needs_review':
        return colors.needsReview;
      default:
        return colors.notTested;
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'passed':
        return 'PASS';
      case 'failed':
        return 'FAIL';
      case 'needs_review':
        return 'REVIEW';
      default:
        return 'N/A';
    }
  };

  return (
    <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
      <Text style={styles.statusBadgeText}>{getStatusLabel()}</Text>
    </View>
  );
}

// ============================================================================
// VIEWBOX OVERLAY
// Renders a red border at the viewBox edges (x=0,y=0 to x=100,y=200) and
// optional grid lines every 20 units, scaled to fit the container.
// ============================================================================

interface ViewBoxOverlayProps {
  /** Pixel size of the container that the avatar fills. */
  containerSize: number;
  showBoundary: boolean;
  showGrid: boolean;
}

function ViewBoxOverlay({ containerSize, showBoundary, showGrid }: ViewBoxOverlayProps) {
  if (!showBoundary && !showGrid) return null;

  // The viewBox is 100 x 200. The container is square (aspect 1:1), so the
  // avatar is letterboxed vertically. Scale so width=containerSize.
  const scaleX = containerSize / 100;
  const scaleY = containerSize / 200;
  const svgWidth = containerSize;
  const svgHeight = containerSize;

  const gridLines: React.ReactElement[] = [];
  if (showGrid) {
    // Vertical lines every 20 viewBox units
    for (let x = 0; x <= 100; x += 20) {
      gridLines.push(
        <Line
          key={`vx${x}`}
          x1={x * scaleX}
          y1={0}
          x2={x * scaleX}
          y2={svgHeight}
          stroke="rgba(0,150,255,0.3)"
          strokeWidth={0.5}
        />
      );
    }
    // Horizontal lines every 20 viewBox units
    for (let y = 0; y <= 200; y += 20) {
      gridLines.push(
        <Line
          key={`vy${y}`}
          x1={0}
          y1={y * scaleY}
          x2={svgWidth}
          y2={y * scaleY}
          stroke="rgba(0,150,255,0.3)"
          strokeWidth={0.5}
        />
      );
    }
  }

  return (
    <View
      style={[
        StyleSheet.absoluteFillObject,
        { pointerEvents: 'none' },
      ]}
    >
      <Svg width={svgWidth} height={svgHeight}>
        {gridLines}
        {showBoundary && (
          <Rect
            x={0}
            y={0}
            width={svgWidth}
            height={svgHeight}
            fill="none"
            stroke="red"
            strokeWidth={1.5}
          />
        )}
      </Svg>
    </View>
  );
}

// ============================================================================
// CATEGORY SELECTOR
// ============================================================================

interface CategorySelectorProps {
  categories: QACategory[];
  selectedCategory: QACategory | null;
  onSelectCategory: (category: QACategory | null) => void;
  colors: typeof COLORS.light;
}

function CategorySelector({
  categories,
  selectedCategory,
  onSelectCategory,
  colors,
}: CategorySelectorProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.categoryScroll}
      contentContainerStyle={styles.categoryScrollContent}
    >
      <TouchableOpacity
        style={[
          styles.categoryChip,
          { borderColor: colors.border },
          selectedCategory === null && { backgroundColor: colors.primary },
        ]}
        onPress={() => onSelectCategory(null)}
      >
        <Text
          style={[
            styles.categoryChipText,
            { color: selectedCategory === null ? '#ffffff' : colors.text },
          ]}
        >
          All
        </Text>
      </TouchableOpacity>
      {categories.map(category => (
        <TouchableOpacity
          key={category}
          style={[
            styles.categoryChip,
            { borderColor: colors.border },
            selectedCategory === category && { backgroundColor: colors.primary },
          ]}
          onPress={() => onSelectCategory(category)}
        >
          <Text
            style={[
              styles.categoryChipText,
              { color: selectedCategory === category ? '#ffffff' : colors.text },
            ]}
          >
            {category.replace('_', ' ').toUpperCase()}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ============================================================================
// ENUM LIST ITEM
// ============================================================================

interface EnumListItemProps {
  metadata: EnumMetadata;
  results: ComponentQAResults | undefined;
  onPress: () => void;
  colors: typeof COLORS.light;
}

function EnumListItem({ metadata, results, onPress, colors }: EnumListItemProps) {
  const count = getEnumCount(metadata.enumObject);
  const testedCount = results?.testedCount ?? 0;
  const passedCount = results?.passedCount ?? 0;
  const failedCount = results?.failedCount ?? 0;

  return (
    <TouchableOpacity
      style={[styles.enumItem, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
    >
      <View style={styles.enumItemHeader}>
        <Text style={[styles.enumItemTitle, { color: colors.text }]}>{metadata.displayName}</Text>
        <Text style={[styles.enumItemCount, { color: colors.textSecondary }]}>
          {count} variants
        </Text>
      </View>
      {metadata.description && (
        <Text style={[styles.enumItemDesc, { color: colors.textSecondary }]}>
          {metadata.description}
        </Text>
      )}
      <View style={styles.enumItemProgress}>
        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${(testedCount / count) * 100}%`,
                backgroundColor: failedCount > 0 ? colors.failed : colors.passed,
              },
            ]}
          />
        </View>
        <Text style={[styles.progressText, { color: colors.textSecondary }]}>
          {testedCount}/{count} tested
          {passedCount > 0 && ` | ${passedCount} passed`}
          {failedCount > 0 && ` | ${failedCount} failed`}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// STYLE PREVIEW CARD
// ============================================================================

interface StylePreviewCardProps {
  variant: StyleVariant;
  config: AvatarConfig;
  result: QAResult | undefined;
  onStatusChange: (status: QAStatus) => void;
  colors: typeof COLORS.light;
  qaConfig: QATestConfig;
  showBoundary: boolean;
  showGrid: boolean;
}

function StylePreviewCard({
  variant,
  config,
  result,
  onStatusChange,
  colors,
  qaConfig,
  showBoundary,
  showGrid,
}: StylePreviewCardProps) {
  const [renderError, setRenderError] = useState<string | null>(null);

  const status = result?.status ?? 'not_tested';

  return (
    <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.previewHeader}>
        <Text style={[styles.previewTitle, { color: colors.text }]} numberOfLines={1}>
          {variant.styleKey}
        </Text>
        <StatusBadge status={status} colors={colors} />
      </View>
      <View style={[styles.previewAvatarContainer, { backgroundColor: qaConfig.backgroundColor }]}>
        {renderError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Render Error</Text>
          </View>
        ) : (
          <Avatar
            config={config}
            size="md"
            customSize={qaConfig.renderSize}
            backgroundColor={qaConfig.backgroundColor}
          />
        )}
        <ViewBoxOverlay
          containerSize={qaConfig.renderSize}
          showBoundary={showBoundary}
          showGrid={showGrid}
        />
      </View>
      <Text style={[styles.previewValue, { color: colors.textSecondary }]} numberOfLines={1}>
        {variant.styleValue}
      </Text>
      <View style={styles.previewActions}>
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
// STYLE GRID VIEW
// ============================================================================

interface StyleGridViewProps {
  metadata: EnumMetadata;
  results: Map<string, QAResult>;
  onStatusChange: (styleKey: string, styleValue: string, status: QAStatus) => void;
  onBack: () => void;
  colors: typeof COLORS.light;
  qaConfig: QATestConfig;
  showBoundary: boolean;
  showGrid: boolean;
}

function StyleGridView({
  metadata,
  results,
  onStatusChange,
  onBack,
  colors,
  qaConfig,
  showBoundary,
  showGrid,
}: StyleGridViewProps) {
  const variants = useMemo(() => {
    return Array.from(iterateEnumStyles(metadata));
  }, [metadata]);

  const renderItem = useCallback(
    ({ item }: { item: StyleVariant }) => {
      const config = generateTestConfig(item);
      const result = results.get(item.styleValue);

      return (
        <StylePreviewCard
          variant={item}
          config={config}
          result={result}
          onStatusChange={status => onStatusChange(item.styleKey, item.styleValue, status)}
          colors={colors}
          qaConfig={qaConfig}
          showBoundary={showBoundary}
          showGrid={showGrid}
        />
      );
    },
    [results, onStatusChange, colors, qaConfig, showBoundary, showGrid]
  );

  return (
    <View style={[styles.gridContainer, { backgroundColor: colors.background }]}>
      <View style={[styles.gridHeader, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: colors.primary }]}>Back</Text>
        </TouchableOpacity>
        <View style={styles.gridHeaderInfo}>
          <Text style={[styles.gridHeaderTitle, { color: colors.text }]}>
            {metadata.displayName}
          </Text>
          <Text style={[styles.gridHeaderCount, { color: colors.textSecondary }]}>
            {variants.length} variants
          </Text>
        </View>
      </View>
      <FlatList
        data={variants}
        renderItem={renderItem}
        keyExtractor={item => item.styleValue}
        numColumns={2}
        contentContainerStyle={styles.gridContent}
        columnWrapperStyle={styles.gridRow}
      />
    </View>
  );
}

// ============================================================================
// MAIN QA TEST HARNESS
// ============================================================================

interface QATestHarnessProps {
  onClose?: () => void;
}

export function QATestHarness({ onClose }: QATestHarnessProps) {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? COLORS.dark : COLORS.light;

  const [selectedCategory, setSelectedCategory] = useState<QACategory | null>(null);
  const [selectedEnum, setSelectedEnum] = useState<EnumMetadata | null>(null);
  const [qaResults, setQAResults] = useState<Map<string, Map<string, QAResult>>>(new Map());
  const [qaConfig] = useState<QATestConfig>(DEFAULT_QA_CONFIG);

  // Overlay toggles
  const [showBoundary, setShowBoundary] = useState(false);
  const [showGrid, setShowGrid] = useState(false);

  // Cycle All: auto-advance through BodyType values every 2 seconds
  const allBodyTypes = useMemo(() => Object.values(BodyType), []);
  const [isCycling, setIsCycling] = useState(false);
  const [cycleIndex, setCycleIndex] = useState(0);
  const cycleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCycling = useCallback(() => {
    if (cycleIntervalRef.current) return;
    setIsCycling(true);
    cycleIntervalRef.current = setInterval(() => {
      setCycleIndex(prev => (prev + 1) % allBodyTypes.length);
    }, 2000);
  }, [allBodyTypes.length]);

  const stopCycling = useCallback(() => {
    if (cycleIntervalRef.current) {
      clearInterval(cycleIntervalRef.current);
      cycleIntervalRef.current = null;
    }
    setIsCycling(false);
  }, []);

  const toggleCycling = useCallback(() => {
    if (isCycling) {
      stopCycling();
    } else {
      startCycling();
    }
  }, [isCycling, startCycling, stopCycling]);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (cycleIntervalRef.current) {
        clearInterval(cycleIntervalRef.current);
      }
    };
  }, []);

  // Get statistics
  const stats = useMemo(() => getQAStatistics(), []);
  const categories = useMemo(() => getAllCategories(), []);

  // Filter enums by selected category
  const filteredEnums = useMemo(() => {
    if (selectedCategory === null) {
      return ENUM_METADATA;
    }
    return getEnumsByCategory(selectedCategory);
  }, [selectedCategory]);

  // Get component results for display
  const getComponentResults = useCallback(
    (enumName: string): ComponentQAResults | undefined => {
      const enumResults = qaResults.get(enumName);
      if (!enumResults) return undefined;

      const metadata = ENUM_METADATA.find(m => m.name === enumName);
      if (!metadata) return undefined;

      const totalVariants = getEnumCount(metadata.enumObject);
      const results = Array.from(enumResults.values());

      return {
        componentName: enumName,
        totalVariants,
        testedCount: results.length,
        passedCount: results.filter(r => r.status === 'passed').length,
        failedCount: results.filter(r => r.status === 'failed').length,
        needsReviewCount: results.filter(r => r.status === 'needs_review').length,
        results,
        lastUpdated: Date.now(),
      };
    },
    [qaResults]
  );

  // Handle status change
  const handleStatusChange = useCallback(
    (enumName: string, styleKey: string, styleValue: string, status: QAStatus) => {
      setQAResults(prev => {
        const newResults = new Map(prev);
        let enumResults = newResults.get(enumName);
        if (!enumResults) {
          enumResults = new Map();
          newResults.set(enumName, enumResults);
        }

        enumResults.set(styleValue, {
          styleKey,
          styleValue,
          status,
          issues: [],
          timestamp: Date.now(),
        });

        return newResults;
      });
    },
    []
  );

  // Export results
  const handleExport = useCallback(() => {
    const exportData = {
      timestamp: Date.now(),
      results: Object.fromEntries(
        Array.from(qaResults.entries()).map(([enumName, results]) => [
          enumName,
          Array.from(results.values()),
        ])
      ),
      stats: {
        totalEnums: stats.totalEnums,
        totalVariants: stats.totalVariants,
      },
    };

    Alert.alert('Export Results', JSON.stringify(exportData, null, 2).substring(0, 500) + '...');
  }, [qaResults, stats]);

  // Render enum list or style grid
  if (selectedEnum) {
    const enumResults = qaResults.get(selectedEnum.name) ?? new Map();
    return (
      <StyleGridView
        metadata={selectedEnum}
        results={enumResults}
        onStatusChange={(styleKey, styleValue, status) =>
          handleStatusChange(selectedEnum.name, styleKey, styleValue, status)
        }
        onBack={() => setSelectedEnum(null)}
        colors={colors}
        qaConfig={qaConfig}
        showBoundary={showBoundary}
        showGrid={showGrid}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Avatar QA Test Harness</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {stats.totalEnums} enums | {stats.totalVariants} variants | {stats.totalColors} colors
          </Text>
          {isCycling && (
            <Text style={[styles.headerCycleLabel, { color: colors.primary }]}>
              Cycling: {allBodyTypes[cycleIndex]}
            </Text>
          )}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[
              styles.headerButton,
              { backgroundColor: isCycling ? colors.needsReview : colors.primary },
            ]}
            onPress={toggleCycling}
          >
            <Text style={styles.headerButtonText}>{isCycling ? 'Stop' : 'Cycle All'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.headerButton,
              { backgroundColor: showBoundary ? colors.failed : colors.textSecondary },
            ]}
            onPress={() => setShowBoundary(prev => !prev)}
          >
            <Text style={styles.headerButtonText}>Bounds</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.headerButton,
              { backgroundColor: showGrid ? colors.passed : colors.textSecondary },
            ]}
            onPress={() => setShowGrid(prev => !prev)}
          >
            <Text style={styles.headerButtonText}>Grid</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: colors.primary }]}
            onPress={handleExport}
          >
            <Text style={styles.headerButtonText}>Export</Text>
          </TouchableOpacity>
          {onClose && (
            <TouchableOpacity
              style={[styles.headerButton, { backgroundColor: colors.textSecondary }]}
              onPress={onClose}
            >
              <Text style={styles.headerButtonText}>Close</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category selector */}
      <CategorySelector
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        colors={colors}
      />

      {/* Enum list */}
      <FlatList
        data={filteredEnums}
        renderItem={({ item }) => (
          <EnumListItem
            metadata={item}
            results={getComponentResults(item.name)}
            onPress={() => setSelectedEnum(item)}
            colors={colors}
          />
        )}
        keyExtractor={item => item.name}
        contentContainerStyle={styles.listContent}
      />
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
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  headerCycleLabel: {
    fontSize: 11,
    marginTop: 2,
    fontStyle: 'italic',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
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
  categoryScroll: {
    maxHeight: 48,
  },
  categoryScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  enumItem: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  enumItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  enumItemTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  enumItemCount: {
    fontSize: 12,
  },
  enumItemDesc: {
    fontSize: 12,
    marginTop: 4,
  },
  enumItemProgress: {
    marginTop: 12,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  progressText: {
    fontSize: 10,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  gridContainer: {
    flex: 1,
  },
  gridHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  gridHeaderInfo: {
    flex: 1,
  },
  gridHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  gridHeaderCount: {
    fontSize: 12,
  },
  gridContent: {
    padding: 8,
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  previewCard: {
    width: '48%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 8,
    marginBottom: 12,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  previewAvatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    overflow: 'hidden',
    aspectRatio: 1,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#f44336',
    fontSize: 12,
  },
  previewValue: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 4,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 4,
    borderRadius: 4,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
});

export default QATestHarness;
