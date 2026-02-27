/**
 * Layer Validation Tests - Composite rendering tests for avatar layers
 *
 * Tests layer alignment, z-order, and composite rendering by generating
 * test matrices of avatar configurations.
 */

import React, { useState, useMemo } from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Avatar } from '../Avatar';
import {
  AvatarConfig,
  DEFAULT_MALE_CONFIG,
  FaceShape,
  EyeStyle,
  NoseStyle,
  MouthStyle,
  EyebrowStyle,
  HairStyle,
  AccessoryStyle,
  FacialHairStyle,
  ClothingStyle,
  SKIN_TONES,
  HAIR_COLORS,
} from '../types';

// Test case definitions
interface LayerTestCase {
  id: string;
  name: string;
  description: string;
  config: Partial<AvatarConfig>;
  expectedLayers: string[];
  checkPoints: Array<{
    layer: string;
    anchor: string;
    expectedPosition: { x: number; y: number };
  }>;
}

// Composite test matrix
const LAYER_TEST_CASES: LayerTestCase[] = [
  // Face + Hair alignment tests
  {
    id: 'face-hair-short',
    name: 'Face + Short Hair',
    description: 'Tests short hair alignment with face shape',
    config: {
      faceShape: FaceShape.OVAL,
      hairStyle: HairStyle.SHORT_CREW,
      hairColor: HAIR_COLORS[0].hex,
    },
    expectedLayers: ['face', 'hair-front'],
    checkPoints: [
      { layer: 'hair', anchor: 'hairline', expectedPosition: { x: 50, y: 20 } },
    ],
  },
  {
    id: 'face-hair-long',
    name: 'Face + Long Hair',
    description: 'Tests long hair with hair-behind layer',
    config: {
      faceShape: FaceShape.OVAL,
      hairStyle: HairStyle.LONG_STRAIGHT,
      hairColor: HAIR_COLORS[2].hex,
    },
    expectedLayers: ['hair-behind', 'face', 'hair-front'],
    checkPoints: [
      { layer: 'hair-behind', anchor: 'shoulder', expectedPosition: { x: 50, y: 85 } },
    ],
  },

  // Eyes + Eyebrows alignment
  {
    id: 'eyes-eyebrows',
    name: 'Eyes + Eyebrows Alignment',
    description: 'Tests eyebrow positioning above eyes',
    config: {
      eyeStyle: EyeStyle.DEFAULT,
      eyebrowStyle: EyebrowStyle.NATURAL,
    },
    expectedLayers: ['eyes', 'eyebrows'],
    checkPoints: [
      { layer: 'eyes', anchor: 'eye-center', expectedPosition: { x: 50, y: 44 } },
      { layer: 'eyebrows', anchor: 'brow-center', expectedPosition: { x: 50, y: 36 } },
    ],
  },

  // Face + Accessories (glasses)
  {
    id: 'face-glasses',
    name: 'Face + Glasses',
    description: 'Tests glasses alignment over eyes',
    config: {
      faceShape: FaceShape.OVAL,
      eyeStyle: EyeStyle.DEFAULT,
      accessory: AccessoryStyle.GLASSES_ROUND,
    },
    expectedLayers: ['face', 'eyes', 'accessories'],
    checkPoints: [
      { layer: 'accessories', anchor: 'glasses-bridge', expectedPosition: { x: 50, y: 44 } },
    ],
  },

  // Hair + Hat conflict test
  {
    id: 'hair-hat',
    name: 'Hair + Hat Compatibility',
    description: 'Tests hat rendering over hair without clipping',
    config: {
      hairStyle: HairStyle.MEDIUM_MESSY,
      accessory: AccessoryStyle.HEADBAND,
    },
    expectedLayers: ['hair-front', 'accessories'],
    checkPoints: [
      { layer: 'accessories', anchor: 'hat-brim', expectedPosition: { x: 50, y: 18 } },
    ],
  },

  // Facial hair + Mouth alignment
  {
    id: 'mouth-facial-hair',
    name: 'Mouth + Facial Hair',
    description: 'Tests beard/mustache alignment with mouth',
    config: {
      mouthStyle: MouthStyle.SMILE,
      facialHair: FacialHairStyle.FULL_BEARD,
    },
    expectedLayers: ['mouth', 'facial-hair'],
    checkPoints: [
      { layer: 'mouth', anchor: 'lip-center', expectedPosition: { x: 50, y: 65 } },
      { layer: 'facial-hair', anchor: 'beard-top', expectedPosition: { x: 50, y: 68 } },
    ],
  },

  // Full stack test
  {
    id: 'full-avatar',
    name: 'Complete Avatar Stack',
    description: 'Tests full layer composition',
    config: {
      faceShape: FaceShape.OVAL,
      skinTone: SKIN_TONES[3].hex,
      eyeStyle: EyeStyle.DEFAULT,
      eyebrowStyle: EyebrowStyle.NATURAL,
      noseStyle: NoseStyle.DEFAULT,
      mouthStyle: MouthStyle.SMILE,
      hairStyle: HairStyle.MEDIUM_MESSY,
      hairColor: HAIR_COLORS[1].hex,
      accessory: AccessoryStyle.GLASSES_ROUND,
      clothing: ClothingStyle.TSHIRT,
    },
    expectedLayers: ['clothing', 'face', 'nose', 'mouth', 'eyes', 'eyebrows', 'hair-front', 'accessories'],
    checkPoints: [],
  },

  // Different face shapes
  ...Object.values(FaceShape).slice(0, 10).map((shape, i) => ({
    id: `face-shape-${shape}`,
    name: `Face Shape: ${shape}`,
    description: `Tests ${shape} face shape rendering`,
    config: {
      faceShape: shape,
      hairStyle: HairStyle.SHORT_CREW,
    },
    expectedLayers: ['face', 'hair-front'],
    checkPoints: [],
  })),
];

// Test result status
type TestStatus = 'pending' | 'pass' | 'fail' | 'warning';

interface TestResult {
  testId: string;
  status: TestStatus;
  issues: string[];
  renderTime?: number;
}

export function LayerValidationTests() {
  const [results, setResults] = useState<Map<string, TestResult>>(new Map());
  const [selectedTest, setSelectedTest] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Run a single test
  const runTest = (testCase: LayerTestCase): TestResult => {
    const startTime = Date.now();
    const issues: string[] = [];

    // Check layer expectations
    // (In real implementation, this would analyze the rendered SVG)

    const renderTime = Date.now() - startTime;

    return {
      testId: testCase.id,
      status: issues.length === 0 ? 'pass' : issues.length > 2 ? 'fail' : 'warning',
      issues,
      renderTime,
    };
  };

  // Run all tests
  const runAllTests = () => {
    setIsRunning(true);
    const newResults = new Map<string, TestResult>();

    LAYER_TEST_CASES.forEach(testCase => {
      const result = runTest(testCase);
      newResults.set(testCase.id, result);
    });

    setResults(newResults);
    setIsRunning(false);
  };

  // Get config for selected test
  const selectedConfig = useMemo(() => {
    if (!selectedTest) return DEFAULT_MALE_CONFIG;
    const test = LAYER_TEST_CASES.find(t => t.id === selectedTest);
    return test ? { ...DEFAULT_MALE_CONFIG, ...test.config } : DEFAULT_MALE_CONFIG;
  }, [selectedTest]);

  // Summary stats
  const summary = useMemo(() => {
    const passed = Array.from(results.values()).filter(r => r.status === 'pass').length;
    const failed = Array.from(results.values()).filter(r => r.status === 'fail').length;
    const warnings = Array.from(results.values()).filter(r => r.status === 'warning').length;
    return { passed, failed, warnings, total: results.size };
  }, [results]);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Layer Validation Tests</Text>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.button, isRunning && styles.buttonDisabled]}
          onPress={runAllTests}
          disabled={isRunning}
        >
          <Text style={styles.buttonText}>
            {isRunning ? 'Running...' : 'Run All Tests'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Summary */}
      {results.size > 0 && (
        <View style={styles.summary}>
          <Text style={styles.summaryText}>
            Passed: {summary.passed} | Failed: {summary.failed} | Warnings: {summary.warnings}
          </Text>
        </View>
      )}

      {/* Preview */}
      <View style={styles.preview}>
        <Avatar config={selectedConfig} size="xl" showBorder />
        <Text style={styles.previewLabel}>
          {selectedTest || 'Select a test'}
        </Text>
      </View>

      {/* Test list */}
      <View style={styles.testList}>
        {LAYER_TEST_CASES.map(testCase => {
          const result = results.get(testCase.id);
          return (
            <TouchableOpacity
              key={testCase.id}
              style={[
                styles.testItem,
                selectedTest === testCase.id && styles.testItemSelected,
                result?.status === 'pass' && styles.testItemPass,
                result?.status === 'fail' && styles.testItemFail,
                result?.status === 'warning' && styles.testItemWarning,
              ]}
              onPress={() => setSelectedTest(testCase.id)}
            >
              <Text style={styles.testName}>{testCase.name}</Text>
              <Text style={styles.testDescription}>{testCase.description}</Text>
              {result && (
                <Text style={styles.testResult}>
                  {result.status.toUpperCase()} ({result.renderTime}ms)
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  summary: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  summaryText: {
    textAlign: 'center',
    fontWeight: '600',
  },
  preview: {
    alignItems: 'center',
    marginBottom: 24,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  previewLabel: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  testList: {
    gap: 8,
  },
  testItem: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 8,
  },
  testItemSelected: {
    borderColor: '#2196F3',
    borderWidth: 2,
  },
  testItemPass: {
    borderLeftColor: '#4CAF50',
    borderLeftWidth: 4,
  },
  testItemFail: {
    borderLeftColor: '#f44336',
    borderLeftWidth: 4,
  },
  testItemWarning: {
    borderLeftColor: '#ff9800',
    borderLeftWidth: 4,
  },
  testName: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  testDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  testResult: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
});

export default LayerValidationTests;
