#!/usr/bin/env npx ts-node
/**
 * Layer Alignment Analysis Script
 *
 * Analyzes SVG component alignment by:
 * - Extracting transform values
 * - Calculating anchor point positions
 * - Detecting potential misalignments
 * - Suggesting fixes
 */

import * as fs from 'fs';
import * as path from 'path';

// Anchor point definitions (from Avatar.tsx analysis)
interface AnchorPoint {
  name: string;
  defaultX: number;
  defaultY: number;
  tolerance: number; // Maximum allowed deviation in pixels
}

const ANCHOR_POINTS: Record<string, AnchorPoint> = {
  faceCenter: { name: 'Face Center', defaultX: 50, defaultY: 46, tolerance: 2 },
  eyeCenter: { name: 'Eye Center', defaultX: 50, defaultY: 44, tolerance: 3 },
  noseCenter: { name: 'Nose Center', defaultX: 50, defaultY: 52, tolerance: 2 },
  mouthCenter: { name: 'Mouth Center', defaultX: 50, defaultY: 65, tolerance: 2 },
  eyebrowCenter: { name: 'Eyebrow Center', defaultX: 50, defaultY: 36, tolerance: 3 },
  hairline: { name: 'Hairline', defaultX: 50, defaultY: 15, tolerance: 5 },
  chinBottom: { name: 'Chin Bottom', defaultX: 50, defaultY: 76, tolerance: 3 },
  neckBase: { name: 'Neck Base', defaultX: 50, defaultY: 92, tolerance: 2 },
  earLeft: { name: 'Left Ear', defaultX: 20, defaultY: 50, tolerance: 4 },
  earRight: { name: 'Right Ear', defaultX: 80, defaultY: 50, tolerance: 4 },
};

// Layer transform configurations
interface LayerConfig {
  file: string;
  anchorPoint: string;
  transformPattern: RegExp;
  zIndex: number;
}

const LAYER_CONFIGS: Record<string, LayerConfig> = {
  face: {
    file: 'src/avatar/parts/Face.tsx',
    anchorPoint: 'faceCenter',
    transformPattern: /transform={`scale\(([^)]+)\)`}/g,
    zIndex: 3,
  },
  eyes: {
    file: 'src/avatar/parts/Eyes.tsx',
    anchorPoint: 'eyeCenter',
    transformPattern: /transform={`translate\(([^,]+),\s*([^)]+)\)\s*scale\(([^)]+)\)`}/g,
    zIndex: 10,
  },
  eyebrows: {
    file: 'src/avatar/parts/Eyebrows.tsx',
    anchorPoint: 'eyebrowCenter',
    transformPattern: /transform={`translate\(([^,]+),\s*([^)]+)\)`}/g,
    zIndex: 11,
  },
  nose: {
    file: 'src/avatar/parts/Nose.tsx',
    anchorPoint: 'noseCenter',
    transformPattern: /transform={`translate\(([^,]+),\s*([^)]+)\)\s*scale\(([^)]+)\)`}/g,
    zIndex: 6,
  },
  mouth: {
    file: 'src/avatar/parts/Mouth.tsx',
    anchorPoint: 'mouthCenter',
    transformPattern: /transform={`translate\(([^,]+),\s*([^)]+)\)\s*scale\(([^)]+)\)`}/g,
    zIndex: 8,
  },
  hair: {
    file: 'src/avatar/parts/Hair.tsx',
    anchorPoint: 'hairline',
    transformPattern: /transform/g,
    zIndex: 14,
  },
};

interface AlignmentIssue {
  layer: string;
  anchorPoint: string;
  expectedPosition: { x: number; y: number };
  actualOffset: { x: number; y: number };
  deviation: number;
  severity: 'low' | 'medium' | 'high';
  suggestedFix?: string;
}

interface AlignmentReport {
  timestamp: string;
  totalLayers: number;
  issuesFound: AlignmentIssue[];
  summary: {
    low: number;
    medium: number;
    high: number;
  };
  recommendations: string[];
}

/**
 * Extract transform offsets from a component file
 */
function extractTransformOffsets(
  filePath: string,
  pattern: RegExp
): Array<{ x: number; y: number; scale?: number }> {
  const fullPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`File not found: ${fullPath}`);
    return [];
  }

  const content = fs.readFileSync(fullPath, 'utf-8');
  const offsets: Array<{ x: number; y: number; scale?: number }> = [];

  // Look for translate patterns in Avatar.tsx
  const translateMatches = content.matchAll(/translate\(([^,]+),\s*([^)]+)\)/g);
  for (const match of translateMatches) {
    const x = parseFloat(match[1]) || 0;
    const y = parseFloat(match[2]) || 0;
    offsets.push({ x, y });
  }

  // Look for scale patterns
  const scaleMatches = content.matchAll(/scale\(([^)]+)\)/g);
  for (const match of scaleMatches) {
    const scale = parseFloat(match[1]) || 1;
    if (offsets.length > 0) {
      offsets[offsets.length - 1].scale = scale;
    }
  }

  return offsets;
}

/**
 * Calculate deviation from expected anchor point
 */
function calculateDeviation(
  actualX: number,
  actualY: number,
  expectedX: number,
  expectedY: number
): number {
  return Math.sqrt(
    Math.pow(actualX - expectedX, 2) + Math.pow(actualY - expectedY, 2)
  );
}

/**
 * Determine severity based on deviation
 */
function getSeverity(deviation: number, tolerance: number): 'low' | 'medium' | 'high' {
  if (deviation <= tolerance) return 'low';
  if (deviation <= tolerance * 2) return 'medium';
  return 'high';
}

/**
 * Analyze alignment for all layers
 */
function analyzeAlignment(): AlignmentReport {
  const issues: AlignmentIssue[] = [];
  const recommendations: string[] = [];

  // Read Avatar.tsx to get the main transform patterns
  const avatarPath = path.resolve(process.cwd(), 'src/avatar/Avatar.tsx');
  const avatarContent = fs.existsSync(avatarPath)
    ? fs.readFileSync(avatarPath, 'utf-8')
    : '';

  // Analyze each layer
  Object.entries(LAYER_CONFIGS).forEach(([layerName, config]) => {
    const anchorPoint = ANCHOR_POINTS[config.anchorPoint];
    if (!anchorPoint) return;

    // Extract transforms from Avatar.tsx for this layer
    const offsets = extractTransformOffsets('src/avatar/Avatar.tsx', config.transformPattern);

    offsets.forEach((offset, index) => {
      const deviation = calculateDeviation(
        offset.x,
        offset.y,
        0, // Expected offset is 0 (no deviation from default)
        0
      );

      if (deviation > anchorPoint.tolerance) {
        const severity = getSeverity(deviation, anchorPoint.tolerance);
        issues.push({
          layer: layerName,
          anchorPoint: config.anchorPoint,
          expectedPosition: { x: anchorPoint.defaultX, y: anchorPoint.defaultY },
          actualOffset: { x: offset.x, y: offset.y },
          deviation,
          severity,
          suggestedFix: `Adjust translate to (${-offset.x}, ${-offset.y}) to center on anchor`,
        });

        if (severity === 'high') {
          recommendations.push(
            `${layerName}: Large misalignment detected (${deviation.toFixed(1)}px). Review transforms.`
          );
        }
      }
    });
  });

  // Check for z-order issues
  const zOrders = Object.entries(LAYER_CONFIGS)
    .map(([name, config]) => ({ name, zIndex: config.zIndex }))
    .sort((a, b) => a.zIndex - b.zIndex);

  // Generate summary
  const summary = {
    low: issues.filter(i => i.severity === 'low').length,
    medium: issues.filter(i => i.severity === 'medium').length,
    high: issues.filter(i => i.severity === 'high').length,
  };

  // Add general recommendations
  if (summary.high > 0) {
    recommendations.push('Priority: Fix high-severity alignment issues first');
  }
  if (summary.medium > 3) {
    recommendations.push('Consider reviewing facial proportion transform calculations');
  }

  return {
    timestamp: new Date().toISOString(),
    totalLayers: Object.keys(LAYER_CONFIGS).length,
    issuesFound: issues,
    summary,
    recommendations,
  };
}

/**
 * Generate fix suggestions
 */
function generateFixes(report: AlignmentReport): Record<string, string> {
  const fixes: Record<string, string> = {};

  report.issuesFound
    .filter(issue => issue.severity !== 'low')
    .forEach(issue => {
      const key = `${issue.layer}-${issue.anchorPoint}`;
      fixes[key] = issue.suggestedFix || 'Manual review required';
    });

  return fixes;
}

/**
 * Main analysis function
 */
async function runAnalysis(): Promise<void> {
  console.log('Starting Layer Alignment Analysis...\n');

  const report = analyzeAlignment();
  const fixes = generateFixes(report);

  // Write report
  const reportPath = path.resolve(process.cwd(), 'temp/avatar-validation/alignment-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({ report, fixes }, null, 2));

  // Print summary
  console.log('=== ALIGNMENT ANALYSIS SUMMARY ===');
  console.log(`Total Layers Analyzed: ${report.totalLayers}`);
  console.log(`Issues Found: ${report.issuesFound.length}`);
  console.log(`  - Low: ${report.summary.low}`);
  console.log(`  - Medium: ${report.summary.medium}`);
  console.log(`  - High: ${report.summary.high}`);
  console.log('\nRecommendations:');
  report.recommendations.forEach(r => console.log(`  • ${r}`));
  console.log(`\nFull report saved to: ${reportPath}`);
}

// Run if executed directly
runAnalysis().catch(console.error);

export { runAnalysis, AlignmentReport, AlignmentIssue };
