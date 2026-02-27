/**
 * Integration Tests Screen
 *
 * Cross-component integration tests for the avatar system.
 * Tests layer ordering, proportion interactions, and color combinations.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  useColorScheme,
} from 'react-native';
import { Avatar } from '../Avatar';
import {
  AvatarConfig,
  DEFAULT_MALE_CONFIG,
  DEFAULT_FEMALE_CONFIG,
  FaceShape,
  EyeStyle,
  EyebrowStyle,
  MouthStyle,
  HairStyle,
  AccessoryStyle,
  FacialHairStyle,
  TeethStyle,
  ClothingStyle,
  SKIN_TONES,
  HAIR_COLORS,
  DEFAULT_FACIAL_PROPORTIONS,
  FacialProportions,
} from '../types';
import { QAStatus } from './types';

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
// TEST CASE DEFINITIONS
// ============================================================================

interface IntegrationTestCase {
  id: string;
  name: string;
  description: string;
  category: 'layer_order' | 'proportions' | 'color_combinations' | 'edge_cases';
  configs: AvatarConfig[];
  expectedBehavior: string;
}

// Layer ordering tests
const LAYER_ORDER_TESTS: IntegrationTestCase[] = [
  {
    id: 'layer_hair_face',
    name: 'Hair + Face',
    description: 'Hair should render on top of face',
    category: 'layer_order',
    configs: [
      { ...DEFAULT_MALE_CONFIG, hairStyle: HairStyle.SHORT_TEXTURED_CROP },
      { ...DEFAULT_FEMALE_CONFIG, hairStyle: HairStyle.LONG_STRAIGHT },
    ],
    expectedBehavior: 'Hair covers face edges, no gaps visible',
  },
  {
    id: 'layer_eyes_eyebrows',
    name: 'Eyes + Eyebrows',
    description: 'Eyebrows should render above eyes',
    category: 'layer_order',
    configs: [
      { ...DEFAULT_MALE_CONFIG, eyeStyle: EyeStyle.DEFAULT, eyebrowStyle: EyebrowStyle.THICK },
      { ...DEFAULT_MALE_CONFIG, eyeStyle: EyeStyle.SURPRISED, eyebrowStyle: EyebrowStyle.RAISED },
    ],
    expectedBehavior: 'Eyebrows visible above eyes, correct positioning',
  },
  {
    id: 'layer_accessories_hair',
    name: 'Accessories + Hair',
    description: 'Glasses should render above hair/face',
    category: 'layer_order',
    configs: [
      { ...DEFAULT_MALE_CONFIG, accessory: AccessoryStyle.GLASSES_ROUND },
      { ...DEFAULT_FEMALE_CONFIG, hairStyle: HairStyle.LONG_STRAIGHT, accessory: AccessoryStyle.SUNGLASSES_AVIATOR },
    ],
    expectedBehavior: 'Glasses render on top of everything',
  },
  {
    id: 'layer_mouth_teeth',
    name: 'Mouth + Teeth',
    description: 'Teeth should render inside mouth for open styles',
    category: 'layer_order',
    configs: [
      { ...DEFAULT_MALE_CONFIG, mouthStyle: MouthStyle.BIG_SMILE, teethStyle: TeethStyle.PERFECT },
      { ...DEFAULT_MALE_CONFIG, mouthStyle: MouthStyle.LAUGH, teethStyle: TeethStyle.GRILLZ },
    ],
    expectedBehavior: 'Teeth visible inside open mouths',
  },
  {
    id: 'layer_facial_hair',
    name: 'Face + Facial Hair',
    description: 'Beard should render on face, below hair',
    category: 'layer_order',
    configs: [
      { ...DEFAULT_MALE_CONFIG, facialHair: FacialHairStyle.FULL_BEARD },
      { ...DEFAULT_MALE_CONFIG, facialHair: FacialHairStyle.MUSTACHE, hairStyle: HairStyle.SHORT_SLICK },
    ],
    expectedBehavior: 'Beard on face, hair above beard',
  },
  {
    id: 'layer_long_hair_clothing',
    name: 'Long Hair + Clothing',
    description: 'Long hair back should render behind body',
    category: 'layer_order',
    configs: [
      { ...DEFAULT_FEMALE_CONFIG, hairStyle: HairStyle.LONG_STRAIGHT, clothing: ClothingStyle.TSHIRT },
      { ...DEFAULT_FEMALE_CONFIG, hairStyle: HairStyle.BOX_BRAIDS, clothing: ClothingStyle.HOODIE },
    ],
    expectedBehavior: 'HairBehind layer visible behind clothing',
  },
];

// Proportion interaction tests
const PROPORTION_TESTS: IntegrationTestCase[] = [
  {
    id: 'prop_max_eye_spacing',
    name: 'Max Eye Spacing + Wide Face',
    description: 'Maximum eye spacing with wide face shape',
    category: 'proportions',
    configs: [
      {
        ...DEFAULT_MALE_CONFIG,
        faceShape: FaceShape.WIDE,
        facialProportions: { ...DEFAULT_FACIAL_PROPORTIONS, eyeSpacing: 1 },
      },
    ],
    expectedBehavior: 'Eyes positioned at edges but still on face',
  },
  {
    id: 'prop_min_eye_spacing',
    name: 'Min Eye Spacing + Narrow Face',
    description: 'Minimum eye spacing with narrow face shape',
    category: 'proportions',
    configs: [
      {
        ...DEFAULT_MALE_CONFIG,
        faceShape: FaceShape.NARROW,
        facialProportions: { ...DEFAULT_FACIAL_PROPORTIONS, eyeSpacing: -1 },
      },
    ],
    expectedBehavior: 'Eyes close together but not overlapping',
  },
  {
    id: 'prop_large_nose_small_mouth',
    name: 'Large Nose + Small Mouth',
    description: 'Testing nose/mouth collision',
    category: 'proportions',
    configs: [
      {
        ...DEFAULT_MALE_CONFIG,
        facialProportions: { ...DEFAULT_FACIAL_PROPORTIONS, noseSize: 1, mouthSize: -1 },
      },
    ],
    expectedBehavior: 'Nose and mouth should not overlap',
  },
  {
    id: 'prop_all_max',
    name: 'All Max Proportions',
    description: 'All facial proportions at maximum',
    category: 'proportions',
    configs: [
      {
        ...DEFAULT_MALE_CONFIG,
        facialProportions: {
          eyeSpacing: 1,
          eyeHeight: 1,
          eyeSize: 1,
          eyebrowHeight: 1,
          eyebrowSpacing: 1,
          eyebrowThickness: 1,
          eyebrowArch: 1,
          eyebrowLength: 1,
          eyebrowTilt: 1,
          nosePosition: 1,
          noseSize: 1,
          mouthPosition: 1,
          mouthSize: 1,
          faceWidth: 1,
          jawWidth: 1,
          foreheadHeight: 1,
          chinShape: 1,
        },
      },
    ],
    expectedBehavior: 'All features visible without severe clipping',
  },
  {
    id: 'prop_all_min',
    name: 'All Min Proportions',
    description: 'All facial proportions at minimum',
    category: 'proportions',
    configs: [
      {
        ...DEFAULT_MALE_CONFIG,
        facialProportions: {
          eyeSpacing: -1,
          eyeHeight: -1,
          eyeSize: -1,
          eyebrowHeight: -1,
          eyebrowSpacing: -1,
          eyebrowThickness: -1,
          eyebrowArch: -1,
          eyebrowLength: -1,
          eyebrowTilt: -1,
          nosePosition: -1,
          noseSize: -1,
          mouthPosition: -1,
          mouthSize: -1,
          faceWidth: -1,
          jawWidth: -1,
          foreheadHeight: -1,
          chinShape: -1,
        },
      },
    ],
    expectedBehavior: 'All features visible without severe clipping',
  },
];

// Color combination tests
const COLOR_TESTS: IntegrationTestCase[] = [
  {
    id: 'color_light_skin_light_hair',
    name: 'Very Light Skin + Light Hair',
    description: 'Testing contrast with light colors',
    category: 'color_combinations',
    configs: [
      {
        ...DEFAULT_MALE_CONFIG,
        skinTone: SKIN_TONES[0].hex,
        hairColor: HAIR_COLORS[HAIR_COLORS.length - 5].hex,
      },
    ],
    expectedBehavior: 'Hair and face edges should be distinguishable',
  },
  {
    id: 'color_dark_skin_dark_hair',
    name: 'Very Dark Skin + Dark Hair',
    description: 'Testing contrast with dark colors',
    category: 'color_combinations',
    configs: [
      {
        ...DEFAULT_MALE_CONFIG,
        skinTone: SKIN_TONES[SKIN_TONES.length - 1].hex,
        hairColor: HAIR_COLORS[0].hex,
      },
    ],
    expectedBehavior: 'Hair and face edges should be distinguishable',
  },
  {
    id: 'color_heterochromia',
    name: 'Heterochromia (Different Eye Colors)',
    description: 'Testing different colors for each eye',
    category: 'color_combinations',
    configs: [
      {
        ...DEFAULT_MALE_CONFIG,
        eyeColor: '#4a90d9',
        rightEyeColor: '#8b5a2b',
      },
    ],
    expectedBehavior: 'Both eye colors render correctly',
  },
  {
    id: 'color_matching_clothing_accessory',
    name: 'Matching Clothing + Accessory Colors',
    description: 'Same color for clothing and accessories',
    category: 'color_combinations',
    configs: [
      {
        ...DEFAULT_MALE_CONFIG,
        clothingColor: '#ff5722',
        accessory: AccessoryStyle.GLASSES_ROUND,
        accessoryColor: '#ff5722',
      },
    ],
    expectedBehavior: 'Both items visible with same color',
  },
];

// Edge case tests
const EDGE_CASE_TESTS: IntegrationTestCase[] = [
  {
    id: 'edge_bald_with_headwear',
    name: 'Bald + Hat',
    description: 'Bald head with hat accessory',
    category: 'edge_cases',
    configs: [
      {
        ...DEFAULT_MALE_CONFIG,
        hairStyle: HairStyle.BALD,
        accessory: AccessoryStyle.HEADBAND,
      },
    ],
    expectedBehavior: 'Hat renders correctly on bald head',
  },
  {
    id: 'edge_closed_eyes_makeup',
    name: 'Closed Eyes + Eye Makeup',
    description: 'Eye makeup with closed eyes',
    category: 'edge_cases',
    configs: [
      {
        ...DEFAULT_FEMALE_CONFIG,
        eyeStyle: EyeStyle.CLOSED,
        eyeshadowStyle: 'shimmer',
        eyelinerStyle: 'wing',
      } as AvatarConfig,
    ],
    expectedBehavior: 'Makeup visible on closed eyelids',
  },
  {
    id: 'edge_all_accessories',
    name: 'Multiple Features Active',
    description: 'Many features enabled simultaneously',
    category: 'edge_cases',
    configs: [
      {
        ...DEFAULT_MALE_CONFIG,
        accessory: AccessoryStyle.GLASSES_ROUND,
        facialHair: FacialHairStyle.FULL_BEARD,
        hairStyle: HairStyle.LONG_PONYTAIL,
        mouthStyle: MouthStyle.BIG_SMILE,
        teethStyle: TeethStyle.GRILLZ,
      },
    ],
    expectedBehavior: 'All features render without conflicts',
  },
];

const ALL_TESTS: IntegrationTestCase[] = [
  ...LAYER_ORDER_TESTS,
  ...PROPORTION_TESTS,
  ...COLOR_TESTS,
  ...EDGE_CASE_TESTS,
];

// ============================================================================
// TEST CASE CARD
// ============================================================================

interface TestCaseCardProps {
  testCase: IntegrationTestCase;
  status: QAStatus;
  onStatusChange: (status: QAStatus) => void;
  colors: typeof COLORS.light;
}

function TestCaseCard({ testCase, status, onStatusChange, colors }: TestCaseCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'passed':
        return colors.passed;
      case 'failed':
        return colors.failed;
      case 'needs_review':
        return colors.needsReview;
      default:
        return colors.border;
    }
  };

  return (
    <View
      style={[
        styles.testCard,
        { backgroundColor: colors.card, borderColor: getStatusColor(), borderWidth: status !== 'not_tested' ? 2 : 1 },
      ]}
    >
      <View style={styles.testCardHeader}>
        <Text style={[styles.testCardTitle, { color: colors.text }]}>{testCase.name}</Text>
        <View style={[styles.categoryBadge, { backgroundColor: colors.primary }]}>
          <Text style={styles.categoryBadgeText}>
            {testCase.category.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
      </View>
      <Text style={[styles.testCardDesc, { color: colors.textSecondary }]}>
        {testCase.description}
      </Text>

      <View style={styles.testCardPreviews}>
        {testCase.configs.map((config, index) => (
          <View key={index} style={styles.testCardPreview}>
            <Avatar config={config} customSize={100} backgroundColor="#f0f0f0" />
          </View>
        ))}
      </View>

      <Text style={[styles.expectedBehavior, { color: colors.text }]}>
        Expected: {testCase.expectedBehavior}
      </Text>

      <View style={styles.testCardActions}>
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
// MAIN INTEGRATION TESTS
// ============================================================================

interface IntegrationTestsProps {
  onClose?: () => void;
}

export function IntegrationTests({ onClose }: IntegrationTestsProps) {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? COLORS.dark : COLORS.light;

  const [selectedCategory, setSelectedCategory] = useState<IntegrationTestCase['category'] | null>(null);
  const [testStatuses, setTestStatuses] = useState<Map<string, QAStatus>>(new Map());

  const filteredTests = useMemo(() => {
    if (selectedCategory === null) return ALL_TESTS;
    return ALL_TESTS.filter(t => t.category === selectedCategory);
  }, [selectedCategory]);

  const handleStatusChange = (testId: string, status: QAStatus) => {
    setTestStatuses(prev => {
      const next = new Map(prev);
      next.set(testId, status);
      return next;
    });
  };

  const categories: Array<IntegrationTestCase['category'] | null> = [
    null,
    'layer_order',
    'proportions',
    'color_combinations',
    'edge_cases',
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Integration Tests</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {ALL_TESTS.length} test cases
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

      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryScrollContent}
      >
        {categories.map(category => (
          <TouchableOpacity
            key={category ?? 'all'}
            style={[
              styles.categoryChip,
              { borderColor: colors.border },
              selectedCategory === category && { backgroundColor: colors.primary },
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text
              style={[
                styles.categoryChipText,
                { color: selectedCategory === category ? '#ffffff' : colors.text },
              ]}
            >
              {category === null ? 'All' : category.replace('_', ' ').toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Test list */}
      <ScrollView style={styles.testList} contentContainerStyle={styles.testListContent}>
        {filteredTests.map(testCase => (
          <TestCaseCard
            key={testCase.id}
            testCase={testCase}
            status={testStatuses.get(testCase.id) ?? 'not_tested'}
            onStatusChange={status => handleStatusChange(testCase.id, status)}
            colors={colors}
          />
        ))}
      </ScrollView>
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
  testList: {
    flex: 1,
  },
  testListContent: {
    padding: 16,
    gap: 16,
  },
  testCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  testCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  testCardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  testCardDesc: {
    fontSize: 12,
    marginBottom: 12,
  },
  testCardPreviews: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 12,
  },
  testCardPreview: {
    alignItems: 'center',
  },
  expectedBehavior: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  testCardActions: {
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

export default IntegrationTests;
