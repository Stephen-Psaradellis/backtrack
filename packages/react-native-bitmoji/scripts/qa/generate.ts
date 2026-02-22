#!/usr/bin/env ts-node
/**
 * QA Generate Script
 *
 * Generates test configurations for all avatar component combinations.
 * Usage: npm run qa:generate -- --component=Eyes --output=./qa-output/
 */

import * as fs from 'fs';
import * as path from 'path';
import { GenerateOptions, ComponentTestConfig } from './types';

// Import avatar types (relative path for ts-node)
const typesPath = path.resolve(__dirname, '../../src/avatar/types.ts');

// Parse command line arguments
function parseArgs(): GenerateOptions {
  const args = process.argv.slice(2);
  const options: GenerateOptions = {
    output: './scripts/qa/output',
    format: 'png',
    size: 200,
    includeColors: true,
  };

  for (const arg of args) {
    const [key, value] = arg.replace('--', '').split('=');
    switch (key) {
      case 'component':
        options.component = value;
        break;
      case 'output':
        options.output = value;
        break;
      case 'format':
        options.format = value as 'png' | 'svg' | 'both';
        break;
      case 'size':
        options.size = parseInt(value, 10);
        break;
      case 'limit':
        options.limit = parseInt(value, 10);
        break;
      case 'no-colors':
        options.includeColors = false;
        break;
    }
  }

  return options;
}

// All component configurations for testing
const COMPONENT_CONFIGS: ComponentTestConfig[] = [
  // Face Components (Phase 1.1)
  {
    component: 'FaceShape',
    configKey: 'faceShape',
    enumValues: [
      'oval', 'round', 'square', 'heart', 'oblong', 'diamond', 'triangle',
      'inverted_triangle', 'rectangle', 'pear', 'long', 'wide', 'angular',
      'soft_square', 'narrow', 'baby_face', 'mature', 'high_cheekbones',
      'full_cheeks', 'hollow_cheeks', 'strong_jaw', 'strong_jaw_wide',
      'soft_features', 'defined_features', 'chiseled'
    ],
  },
  {
    component: 'Eyes',
    configKey: 'eyeStyle',
    enumValues: [
      'default', 'round', 'narrow', 'wide', 'almond', 'closed', 'happy',
      'wink', 'wink_left', 'sleepy', 'surprised', 'hearts', 'stars', 'cry',
      'squint', 'side', 'dizzy', 'roll'
    ],
    colorTests: [{
      name: 'Eye Colors',
      colors: [], // Will be populated from types.ts
      configKey: 'eyeColor',
    }],
  },
  {
    component: 'Eyelashes',
    configKey: 'eyelashStyle',
    enumValues: [
      'none', 'natural', 'light', 'medium', 'full', 'dramatic', 'wispy',
      'cat_eye', 'doll'
    ],
  },
  {
    component: 'Eyebrows',
    configKey: 'eyebrowStyle',
    enumValues: [
      'default', 'natural', 'thick', 'thin', 'arched', 'flat', 'angry',
      'sad', 'raised', 'unibrow', 'concerned', 'skeptical'
    ],
  },
  {
    component: 'Nose',
    configKey: 'noseStyle',
    enumValues: [
      'default', 'small', 'medium', 'large', 'pointed', 'rounded', 'button',
      'hooked', 'flat', 'wide', 'narrow'
    ],
  },
  {
    component: 'Mouth',
    configKey: 'mouthStyle',
    enumValues: [
      'default', 'smile', 'big_smile', 'grin', 'laugh', 'smirk', 'sad',
      'frown', 'serious', 'open', 'tongue', 'kiss', 'surprised', 'eating',
      'grimace', 'concerned', 'scream', 'bite'
    ],
  },
  {
    component: 'Teeth',
    configKey: 'teethStyle',
    enumValues: [
      'default', 'perfect', 'slightly_crooked', 'gap_front', 'gap_multiple',
      'overbite', 'underbite', 'buck_teeth', 'small', 'large', 'missing_front',
      'missing_side', 'missing_multiple', 'baby_teeth_missing', 'braces_metal',
      'braces_ceramic', 'braces_lingual', 'invisalign', 'retainer', 'gold_tooth',
      'gold_teeth_multiple', 'grillz', 'grillz_diamond', 'grillz_colorful',
      'silver_tooth', 'fangs', 'vampire_fangs', 'yellowed', 'stained',
      'chipped', 'worn', 'dentures'
    ],
  },
  {
    component: 'FacialHair',
    configKey: 'facialHair',
    enumValues: [
      'none', 'stubble', 'light_beard', 'medium_beard', 'full_beard',
      'goatee', 'mustache', 'mustache_fancy', 'sideburns'
    ],
  },
  // Face Details (Phase 1.1)
  {
    component: 'Freckles',
    configKey: 'freckles',
    enumValues: ['none', 'light', 'medium', 'heavy', 'nose_only', 'cheeks_only'],
  },
  {
    component: 'Wrinkles',
    configKey: 'wrinkles',
    enumValues: [
      'none', 'forehead_light', 'forehead', 'forehead_deep', 'crow_feet',
      'crow_feet_deep', 'smile_lines', 'smile_lines_deep', 'under_eye',
      'under_eye_deep', 'full_light', 'full', 'full_heavy', 'mature'
    ],
  },
  {
    component: 'EyeBags',
    configKey: 'eyeBags',
    enumValues: ['none', 'light', 'moderate', 'heavy', 'dark_circles', 'puffy'],
  },
  {
    component: 'CheekStyle',
    configKey: 'cheekStyle',
    enumValues: ['none', 'dimples', 'high_cheekbones', 'round', 'hollow'],
  },
  {
    component: 'SkinDetail',
    configKey: 'skinDetail',
    enumValues: [
      'none', 'mole_left_cheek', 'mole_right_cheek', 'mole_chin', 'beauty_mark',
      'scar_eyebrow', 'scar_cheek', 'mole_lip', 'mole_nose', 'mole_forehead',
      'mole_temple', 'mole_neck', 'beauty_marks_multiple', 'scar_forehead',
      'scar_chin', 'scar_lip', 'scar_nose', 'scar_temple', 'scar_neck',
      'scar_lightning', 'scar_surgical', 'scar_burns', 'scar_acne',
      'birthmark_cheek', 'birthmark_forehead', 'birthmark_chin', 'birthmark_neck',
      'birthmark_temple', 'birthmark_port_wine', 'birthmark_cafe_au_lait',
      'vitiligo_face', 'vitiligo_patches', 'rosacea', 'acne_light', 'acne_moderate'
    ],
  },
  {
    component: 'FaceTattoo',
    configKey: 'faceTattoo',
    enumValues: [
      'none', 'teardrop_single', 'teardrop_multiple', 'cross_under_eye',
      'star_face', 'heart_cheek', 'spider_web', 'rose_face', 'butterfly_face',
      'snake_face', 'flames_face', 'tribal_face', 'number_face', 'word_face',
      'barcode_face', 'soundwave_face', 'money_sign', 'lightning_bolt_face',
      'maori_moko', 'polynesian_face', 'dotwork_face', 'geometric_face',
      'forehead_tattoo', 'temple_tattoo', 'neck_front', 'neck_side', 'behind_ear'
    ],
  },
  // Makeup (Phase 1.1)
  {
    component: 'Eyeshadow',
    configKey: 'eyeshadowStyle',
    enumValues: ['none', 'natural', 'smoky', 'cut_crease', 'wing', 'shimmer', 'glitter'],
  },
  {
    component: 'Eyeliner',
    configKey: 'eyelinerStyle',
    enumValues: ['none', 'thin', 'wing', 'cat_eye', 'thick', 'smudged', 'graphic'],
  },
  {
    component: 'Lipstick',
    configKey: 'lipstickStyle',
    enumValues: ['none', 'natural', 'matte', 'glossy', 'ombre', 'bold', 'stained'],
  },
  {
    component: 'Blush',
    configKey: 'blushStyle',
    enumValues: ['none', 'subtle', 'rosy', 'sun_kissed', 'contour', 'draping'],
  },
  // Hair System (Phase 1.2)
  {
    component: 'Hair',
    configKey: 'hairStyle',
    enumValues: [], // Will be populated - very large enum
  },
  {
    component: 'HairTreatment',
    configKey: 'hairTreatment',
    enumValues: [
      'none', 'ombre_subtle', 'ombre_dramatic', 'ombre_reverse',
      'highlights_babylights', 'highlights_balayage', 'highlights_chunky',
      'highlights_face_framing', 'tips_colored', 'tips_frosted',
      'roots_grown_out', 'roots_dark', 'streak_single', 'streaks_multiple',
      'streak_skunk', 'two_tone_split', 'two_tone_under', 'rainbow_tips',
      'peekaboo'
    ],
  },
  // Accessories (Phase 1.3)
  {
    component: 'Accessories',
    configKey: 'accessory',
    enumValues: [], // Will be populated - very large enum
  },
  // Clothing (Phase 1.2)
  {
    component: 'Clothing',
    configKey: 'clothing',
    enumValues: [], // Will be populated - very large enum
  },
];

// Generate test configuration file
function generateTestConfig(options: GenerateOptions): void {
  console.log('QA Generate - Avatar Visual Testing Tool');
  console.log('=========================================\n');

  const outputDir = path.resolve(options.output || './scripts/qa/output');

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Filter components if specified
  let configs = COMPONENT_CONFIGS;
  if (options.component) {
    configs = configs.filter(c =>
      c.component.toLowerCase() === options.component?.toLowerCase()
    );
    if (configs.length === 0) {
      console.error(`Component "${options.component}" not found.`);
      console.log('Available components:', COMPONENT_CONFIGS.map(c => c.component).join(', '));
      process.exit(1);
    }
  }

  // Generate test manifest
  const manifest = {
    generatedAt: new Date().toISOString(),
    options,
    components: configs.map(config => ({
      component: config.component,
      configKey: config.configKey,
      styleCount: config.enumValues.length,
      styles: config.enumValues,
    })),
    totalStyles: configs.reduce((sum, c) => sum + c.enumValues.length, 0),
  };

  // Write manifest
  const manifestPath = path.join(outputDir, 'test-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`Generated test manifest: ${manifestPath}`);

  // Generate individual component test files
  for (const config of configs) {
    const componentFile = path.join(outputDir, `${config.component.toLowerCase()}-tests.json`);
    const componentTests = {
      component: config.component,
      configKey: config.configKey,
      generatedAt: new Date().toISOString(),
      tests: config.enumValues.map((style, index) => ({
        id: `${config.component}-${style}`,
        index,
        style,
        baseConfig: config.baseConfig || {},
        status: 'pending',
      })),
    };
    fs.writeFileSync(componentFile, JSON.stringify(componentTests, null, 2));
    console.log(`Generated: ${componentFile} (${config.enumValues.length} tests)`);
  }

  // Summary
  console.log('\n--- Summary ---');
  console.log(`Total components: ${configs.length}`);
  console.log(`Total test styles: ${manifest.totalStyles}`);
  console.log(`Output directory: ${outputDir}`);
}

// Generate React Native test component for visual verification
function generateTestComponent(options: GenerateOptions): void {
  const componentTemplate = `/**
 * Auto-generated QA Test Component
 * Generated: ${new Date().toISOString()}
 *
 * This component renders all avatar variations for visual QA testing.
 */

import React from 'react';
import { View, ScrollView, Text, StyleSheet } from 'react-native';
import { Avatar } from '../../src/avatar';
import { DEFAULT_MALE_CONFIG } from '../../src/avatar/types';

interface TestCase {
  id: string;
  style: string;
  config: any;
}

const TEST_CASES: TestCase[] = ${JSON.stringify(
  COMPONENT_CONFIGS.flatMap(config =>
    config.enumValues.slice(0, options.limit || Infinity).map(style => ({
      id: `${config.component}-${style}`,
      style,
      config: {
        ...config.baseConfig,
        [config.configKey]: style,
      },
    }))
  ),
  null,
  2
)};

export function GeneratedQATests() {
  return (
    <ScrollView style={styles.container}>
      {TEST_CASES.map(test => (
        <View key={test.id} style={styles.testCase}>
          <Text style={styles.label}>{test.id}</Text>
          <Avatar
            config={{ ...DEFAULT_MALE_CONFIG, ...test.config }}
            customSize={100}
          />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 8 },
  testCase: { alignItems: 'center', margin: 8, padding: 8, backgroundColor: '#f0f0f0', borderRadius: 8 },
  label: { fontSize: 10, marginBottom: 4, color: '#666' },
});
`;

  const outputPath = path.join(options.output || './scripts/qa/output', 'GeneratedQATests.tsx');
  fs.writeFileSync(outputPath, componentTemplate);
  console.log(`Generated test component: ${outputPath}`);
}

// Main execution
const options = parseArgs();

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
QA Generate - Avatar Visual Testing Tool

Usage: npm run qa:generate -- [options]

Options:
  --component=NAME    Generate tests for specific component
  --output=PATH       Output directory (default: ./scripts/qa/output)
  --format=FORMAT     Output format: png, svg, both (default: png)
  --size=NUMBER       Avatar size in pixels (default: 200)
  --limit=NUMBER      Limit number of tests per component
  --no-colors         Skip color variation tests

Available Components:
  ${COMPONENT_CONFIGS.map(c => c.component).join(', ')}

Examples:
  npm run qa:generate
  npm run qa:generate -- --component=Eyes
  npm run qa:generate -- --component=Hair --limit=10
  `);
  process.exit(0);
}

generateTestConfig(options);
generateTestComponent(options);
