#!/usr/bin/env ts-node
/**
 * QA Compare Script
 *
 * Compares current screenshots against baseline images for visual regression testing.
 * Usage: npm run qa:compare -- --baseline=./baseline/ --current=./qa-output/
 */

import * as fs from 'fs';
import * as path from 'path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { CompareOptions, ComparisonResult, TestResult, TestReport } from './types';

// Parse command line arguments
function parseArgs(): CompareOptions {
  const args = process.argv.slice(2);
  const options: CompareOptions = {
    baseline: './scripts/qa/baselines',
    current: './scripts/qa/output',
    output: './scripts/qa/diffs',
    threshold: 0.1, // 10% difference threshold
    generateReport: true,
  };

  for (const arg of args) {
    const [key, value] = arg.replace('--', '').split('=');
    switch (key) {
      case 'baseline':
        options.baseline = value;
        break;
      case 'current':
        options.current = value;
        break;
      case 'output':
        options.output = value;
        break;
      case 'threshold':
        options.threshold = parseFloat(value);
        break;
      case 'no-report':
        options.generateReport = false;
        break;
    }
  }

  return options;
}

// Compare two PNG images
async function comparePNGs(
  baselinePath: string,
  currentPath: string,
  diffPath: string,
  threshold: number
): Promise<ComparisonResult> {
  // Read baseline image
  const baselineData = fs.readFileSync(baselinePath);
  const baselinePng = PNG.sync.read(baselineData);

  // Read current image
  const currentData = fs.readFileSync(currentPath);
  const currentPng = PNG.sync.read(currentData);

  // Check dimensions match
  if (baselinePng.width !== currentPng.width || baselinePng.height !== currentPng.height) {
    return {
      match: false,
      diffPercentage: 100,
      diffPixels: baselinePng.width * baselinePng.height,
      totalPixels: baselinePng.width * baselinePng.height,
    };
  }

  // Create diff image
  const { width, height } = baselinePng;
  const diff = new PNG({ width, height });

  // Compare pixels
  const diffPixels = pixelmatch(
    baselinePng.data,
    currentPng.data,
    diff.data,
    width,
    height,
    { threshold: 0.1 } // Per-pixel color threshold
  );

  const totalPixels = width * height;
  const diffPercentage = (diffPixels / totalPixels) * 100;
  const match = diffPercentage <= threshold * 100;

  // Save diff image if there are differences
  if (!match) {
    const diffDir = path.dirname(diffPath);
    if (!fs.existsSync(diffDir)) {
      fs.mkdirSync(diffDir, { recursive: true });
    }
    fs.writeFileSync(diffPath, PNG.sync.write(diff));
  }

  return {
    match,
    diffPercentage,
    diffPixels,
    totalPixels,
    diffImagePath: match ? undefined : diffPath,
  };
}

// Find all PNG files in a directory
function findPNGs(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findPNGs(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.png')) {
      files.push(fullPath);
    }
  }

  return files;
}

// Main comparison function
async function runComparison(options: CompareOptions): Promise<TestResult[]> {
  console.log('QA Compare - Visual Regression Testing');
  console.log('======================================\n');

  const baselineDir = path.resolve(options.baseline);
  const currentDir = path.resolve(options.current);
  const outputDir = path.resolve(options.output || './scripts/qa/diffs');

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Find all baseline images
  const baselineImages = findPNGs(baselineDir);
  console.log(`Found ${baselineImages.length} baseline images`);

  // Find all current images
  const currentImages = findPNGs(currentDir);
  console.log(`Found ${currentImages.length} current images\n`);

  const results: TestResult[] = [];

  // Compare each baseline against current
  for (const baselinePath of baselineImages) {
    const relativePath = path.relative(baselineDir, baselinePath);
    const currentPath = path.join(currentDir, relativePath);
    const diffPath = path.join(outputDir, relativePath.replace('.png', '-diff.png'));

    const testId = relativePath.replace('.png', '').replace(/[\/\\]/g, '-');

    if (!fs.existsSync(currentPath)) {
      // Current image missing
      results.push({
        id: testId,
        component: path.dirname(relativePath) || 'root',
        style: path.basename(relativePath, '.png'),
        status: 'failed',
        errorMessage: 'Current image not found',
        baselinePath,
      });
      console.log(`MISSING: ${relativePath}`);
      continue;
    }

    try {
      const comparison = await comparePNGs(
        baselinePath,
        currentPath,
        diffPath,
        options.threshold || 0.1
      );

      results.push({
        id: testId,
        component: path.dirname(relativePath) || 'root',
        style: path.basename(relativePath, '.png'),
        status: comparison.match ? 'passed' : 'failed',
        baselinePath,
        screenshotPath: currentPath,
        diffPath: comparison.diffImagePath,
        diffPercentage: comparison.diffPercentage,
      });

      if (comparison.match) {
        console.log(`PASS: ${relativePath} (${comparison.diffPercentage.toFixed(2)}% diff)`);
      } else {
        console.log(`FAIL: ${relativePath} (${comparison.diffPercentage.toFixed(2)}% diff)`);
      }
    } catch (error) {
      results.push({
        id: testId,
        component: path.dirname(relativePath) || 'root',
        style: path.basename(relativePath, '.png'),
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        baselinePath,
        screenshotPath: currentPath,
      });
      console.log(`ERROR: ${relativePath} - ${error}`);
    }
  }

  // Check for new images not in baseline
  for (const currentPath of currentImages) {
    const relativePath = path.relative(currentDir, currentPath);
    const baselinePath = path.join(baselineDir, relativePath);

    if (!fs.existsSync(baselinePath)) {
      const testId = relativePath.replace('.png', '').replace(/[\/\\]/g, '-');
      results.push({
        id: testId,
        component: path.dirname(relativePath) || 'root',
        style: path.basename(relativePath, '.png'),
        status: 'pending',
        errorMessage: 'No baseline (new image)',
        screenshotPath: currentPath,
      });
      console.log(`NEW: ${relativePath} (no baseline)`);
    }
  }

  return results;
}

// Generate comparison report
function generateReport(results: TestResult[], options: CompareOptions): void {
  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const pending = results.filter(r => r.status === 'pending').length;

  const report = {
    generatedAt: new Date().toISOString(),
    options,
    summary: {
      total: results.length,
      passed,
      failed,
      pending,
      passRate: results.length > 0 ? ((passed / results.length) * 100).toFixed(2) + '%' : 'N/A',
    },
    results,
    failedTests: results.filter(r => r.status === 'failed'),
    newTests: results.filter(r => r.status === 'pending'),
  };

  const reportPath = path.join(options.output || './scripts/qa/diffs', 'comparison-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nReport saved: ${reportPath}`);

  // Print summary
  console.log('\n--- Comparison Summary ---');
  console.log(`Total tests: ${results.length}`);
  console.log(`Passed: ${passed} (${report.summary.passRate})`);
  console.log(`Failed: ${failed}`);
  console.log(`New (no baseline): ${pending}`);
}

// Main execution
async function main() {
  const options = parseArgs();

  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
QA Compare - Visual Regression Testing

Usage: npm run qa:compare -- [options]

Options:
  --baseline=PATH     Baseline images directory (default: ./scripts/qa/baselines)
  --current=PATH      Current images directory (default: ./scripts/qa/output)
  --output=PATH       Output directory for diffs (default: ./scripts/qa/diffs)
  --threshold=NUMBER  Diff threshold 0-1 (default: 0.1 = 10%)
  --no-report         Skip report generation

Examples:
  npm run qa:compare
  npm run qa:compare -- --baseline=./baselines --current=./screenshots
  npm run qa:compare -- --threshold=0.05
    `);
    process.exit(0);
  }

  const results = await runComparison(options);

  if (options.generateReport) {
    generateReport(results, options);
  }

  // Exit with error code if any tests failed
  const failedCount = results.filter(r => r.status === 'failed').length;
  process.exit(failedCount > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Error running comparison:', error);
  process.exit(1);
});
