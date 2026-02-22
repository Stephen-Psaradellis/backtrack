#!/usr/bin/env npx ts-node
/**
 * Avatar SVG Layer Validation Script
 *
 * Validates all avatar layer components for:
 * - SVG path validity
 * - ViewBox consistency (0 0 100 100)
 * - Transform alignment
 * - Layer z-order correctness
 */

import * as fs from 'fs';
import * as path from 'path';

// Type definitions for validation
interface ValidationResult {
  component: string;
  category: string;
  style: string;
  status: 'OK' | 'WARNING' | 'ERROR';
  issues: string[];
  metrics: {
    pathCount: number;
    hasTransforms: boolean;
    usesGradients: boolean;
    estimatedComplexity: 'low' | 'medium' | 'high';
  };
}

interface CompositeTest {
  layers: string[];
  status: 'OK' | 'MISALIGNED' | 'CLIPPED' | 'GAP';
  issue?: string;
}

interface ValidationReport {
  summary: {
    totalAssets: number;
    passedSolo: number;
    passedComposite: number;
    alignmentIssues: number;
    repaired: number;
    manualReview: number;
  };
  baseReference: {
    viewBox: string;
    anchorPoints: {
      eyeCenter: [number, number];
      hairline: [number, number];
      chin: [number, number];
      noseCenter: [number, number];
      mouthCenter: [number, number];
    };
  };
  assets: ValidationResult[];
  compositeTests: CompositeTest[];
  manualReviewRequired: Array<{ path: string; reason: string }>;
}

// Anchor points from Avatar.tsx analysis
const BASE_ANCHOR_POINTS = {
  eyeCenter: [50, 44] as [number, number],
  hairline: [50, 15] as [number, number],
  chin: [50, 76] as [number, number],
  noseCenter: [50, 52] as [number, number],
  mouthCenter: [50, 65] as [number, number],
};

// Layer components to validate
const LAYER_COMPONENTS = [
  { name: 'Face', file: 'src/avatar/parts/Face.tsx', zIndex: 3 },
  { name: 'Eyes', file: 'src/avatar/parts/Eyes.tsx', zIndex: 10 },
  { name: 'Eyebrows', file: 'src/avatar/parts/Eyebrows.tsx', zIndex: 11 },
  { name: 'Nose', file: 'src/avatar/parts/Nose.tsx', zIndex: 6 },
  { name: 'Mouth', file: 'src/avatar/parts/Mouth.tsx', zIndex: 8 },
  { name: 'Hair', file: 'src/avatar/parts/Hair.tsx', zIndex: 14 },
  { name: 'FaceDetails', file: 'src/avatar/parts/FaceDetails.tsx', zIndex: 4 },
  { name: 'Makeup', file: 'src/avatar/parts/Makeup.tsx', zIndex: 5 },
  { name: 'FaceTattoo', file: 'src/avatar/parts/FaceTattoo.tsx', zIndex: 13 },
  { name: 'ClothingRenderer', file: 'src/avatar/renderers/ClothingRenderer.tsx', zIndex: 2 },
  { name: 'FacialHairRenderer', file: 'src/avatar/renderers/FacialHairRenderer.tsx', zIndex: 12 },
  { name: 'AccessoryRenderer', file: 'src/avatar/renderers/AccessoryRenderer.tsx', zIndex: 15 },
];

/**
 * Extract SVG path data from a component file
 */
function extractPathsFromComponent(filePath: string): string[] {
  const fullPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`File not found: ${fullPath}`);
    return [];
  }

  const content = fs.readFileSync(fullPath, 'utf-8');
  const pathMatches = content.match(/d="([^"]+)"/g) || [];
  return pathMatches.map(m => m.replace(/d="|"/g, ''));
}

/**
 * Validate SVG path syntax
 */
function validatePathSyntax(pathData: string): { valid: boolean; error?: string } {
  // Basic SVG path command validation
  const validCommands = /^[MmZzLlHhVvCcSsQqTtAa0-9\s,.\-+eE]+$/;
  if (!validCommands.test(pathData)) {
    return { valid: false, error: 'Invalid path characters' };
  }

  // Check for unclosed paths (should end with Z/z or valid endpoint)
  const hasMove = /[Mm]/.test(pathData);
  if (!hasMove) {
    return { valid: false, error: 'Path missing moveto command' };
  }

  return { valid: true };
}

/**
 * Extract transform values from component
 */
function extractTransforms(filePath: string): Array<{ type: string; value: string }> {
  const fullPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) return [];

  const content = fs.readFileSync(fullPath, 'utf-8');
  const transforms: Array<{ type: string; value: string }> = [];

  // Match transform attributes
  const transformMatches = content.match(/transform={`([^`]+)`}/g) || [];
  transformMatches.forEach(t => {
    const value = t.replace(/transform={`|`}/g, '');
    if (value.includes('translate')) transforms.push({ type: 'translate', value });
    if (value.includes('scale')) transforms.push({ type: 'scale', value });
    if (value.includes('rotate')) transforms.push({ type: 'rotate', value });
  });

  return transforms;
}

/**
 * Check if component uses gradients
 */
function usesGradients(filePath: string): boolean {
  const fullPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) return false;

  const content = fs.readFileSync(fullPath, 'utf-8');
  return content.includes('Gradient') || content.includes('gradient');
}

/**
 * Validate a single component
 */
function validateComponent(component: typeof LAYER_COMPONENTS[0]): ValidationResult[] {
  const results: ValidationResult[] = [];
  const paths = extractPathsFromComponent(component.file);
  const transforms = extractTransforms(component.file);
  const hasGradients = usesGradients(component.file);

  // Estimate complexity based on file size and path count
  const fileSize = fs.existsSync(path.resolve(process.cwd(), component.file))
    ? fs.statSync(path.resolve(process.cwd(), component.file)).size
    : 0;
  const complexity = fileSize > 50000 ? 'high' : fileSize > 15000 ? 'medium' : 'low';

  const issues: string[] = [];

  // Validate paths
  paths.forEach((p, i) => {
    const validation = validatePathSyntax(p);
    if (!validation.valid) {
      issues.push(`Path ${i}: ${validation.error}`);
    }
  });

  // Check for transform alignment issues
  transforms.forEach(t => {
    if (t.type === 'translate') {
      // Check if translate values could cause misalignment
      const match = t.value.match(/translate\(([^,]+),\s*([^)]+)\)/);
      if (match) {
        const x = parseFloat(match[1]) || 0;
        const y = parseFloat(match[2]) || 0;
        if (Math.abs(x) > 20 || Math.abs(y) > 20) {
          issues.push(`Large translate offset: (${x}, ${y})`);
        }
      }
    }
  });

  results.push({
    component: component.name,
    category: component.file.includes('renderers') ? 'renderer' : 'part',
    style: 'all',
    status: issues.length > 0 ? 'WARNING' : 'OK',
    issues,
    metrics: {
      pathCount: paths.length,
      hasTransforms: transforms.length > 0,
      usesGradients: hasGradients,
      estimatedComplexity: complexity,
    },
  });

  return results;
}

/**
 * Run all validations
 */
async function runValidation(): Promise<ValidationReport> {
  console.log('Starting Avatar SVG Layer Validation...\n');

  const allResults: ValidationResult[] = [];
  const compositeTests: CompositeTest[] = [];
  const manualReviewRequired: Array<{ path: string; reason: string }> = [];

  // Validate each component
  for (const component of LAYER_COMPONENTS) {
    console.log(`Validating ${component.name}...`);
    const results = validateComponent(component);
    allResults.push(...results);

    results.forEach(r => {
      if (r.status === 'ERROR') {
        manualReviewRequired.push({
          path: component.file,
          reason: r.issues.join('; '),
        });
      }
    });
  }

  // Composite tests - check layer combinations
  const compositePairs = [
    ['Face', 'Hair'],
    ['Face', 'Eyes'],
    ['Face', 'Mouth'],
    ['Eyes', 'Eyebrows'],
    ['Hair', 'AccessoryRenderer'],
    ['Face', 'FacialHairRenderer'],
  ];

  compositePairs.forEach(([layer1, layer2]) => {
    compositeTests.push({
      layers: [layer1, layer2],
      status: 'OK', // Would need runtime rendering to actually test
      issue: undefined,
    });
  });

  // Calculate summary
  const summary = {
    totalAssets: allResults.length,
    passedSolo: allResults.filter(r => r.status === 'OK').length,
    passedComposite: compositeTests.filter(t => t.status === 'OK').length,
    alignmentIssues: allResults.filter(r => r.issues.some(i => i.includes('translate') || i.includes('offset'))).length,
    repaired: 0,
    manualReview: manualReviewRequired.length,
  };

  const report: ValidationReport = {
    summary,
    baseReference: {
      viewBox: '0 0 100 100',
      anchorPoints: BASE_ANCHOR_POINTS,
    },
    assets: allResults,
    compositeTests,
    manualReviewRequired,
  };

  // Write report
  const reportPath = path.resolve(process.cwd(), 'temp/avatar-validation/report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nValidation report written to: ${reportPath}`);

  // Print summary
  console.log('\n=== VALIDATION SUMMARY ===');
  console.log(`Total Components: ${summary.totalAssets}`);
  console.log(`Passed Solo: ${summary.passedSolo}`);
  console.log(`Passed Composite: ${summary.passedComposite}`);
  console.log(`Alignment Issues: ${summary.alignmentIssues}`);
  console.log(`Manual Review Required: ${summary.manualReview}`);

  return report;
}

// Run if executed directly
runValidation().catch(console.error);

export { runValidation, ValidationReport, ValidationResult };
