#!/usr/bin/env ts-node
/**
 * QA Report Generator
 *
 * Generates comprehensive progress reports based on the AVATAR_QA_PLAN.md structure.
 * Usage: npm run qa:report
 */

import * as fs from 'fs';
import * as path from 'path';
import { TestReport, PhaseReport, TestSection, TestResult, ReportSummary } from './types';

// QA Plan structure matching AVATAR_QA_PLAN.md
const QA_PLAN_STRUCTURE = {
  phase1: {
    name: 'Phase 1: Component Isolation Testing',
    description: 'Testing individual components in isolation',
    sections: [
      { name: 'Face Shapes', component: 'FaceShape', count: 25 },
      { name: 'Eyes', component: 'Eyes', count: 18 },
      { name: 'Eyelashes', component: 'Eyelashes', count: 9 },
      { name: 'Eyebrows', component: 'Eyebrows', count: 12 },
      { name: 'Nose', component: 'Nose', count: 11 },
      { name: 'Mouth', component: 'Mouth', count: 18 },
      { name: 'Teeth', component: 'Teeth', count: 32 },
      { name: 'Face Details - Freckles', component: 'Freckles', count: 6 },
      { name: 'Face Details - Wrinkles', component: 'Wrinkles', count: 14 },
      { name: 'Face Details - Eye Bags', component: 'EyeBags', count: 6 },
      { name: 'Face Details - Cheek Style', component: 'CheekStyle', count: 5 },
      { name: 'Face Details - Skin Details', component: 'SkinDetail', count: 35 },
      { name: 'Face Tattoos', component: 'FaceTattoo', count: 27 },
      { name: 'Makeup - Eyeshadow', component: 'Eyeshadow', count: 7 },
      { name: 'Makeup - Eyeliner', component: 'Eyeliner', count: 7 },
      { name: 'Makeup - Lipstick', component: 'Lipstick', count: 7 },
      { name: 'Makeup - Blush', component: 'Blush', count: 6 },
      { name: 'Facial Hair', component: 'FacialHair', count: 9 },
      { name: 'Hair Styles', component: 'Hair', count: 143 },
      { name: 'Hair Treatments', component: 'HairTreatment', count: 19 },
      { name: 'Body Types', component: 'BodyType', count: 6 },
      { name: 'Arm Poses', component: 'Arms', count: 50 },
      { name: 'Hand Gestures', component: 'Hands', count: 45 },
      { name: 'Leg Poses', component: 'Legs', count: 40 },
      { name: 'Clothing', component: 'Clothing', count: 190 },
      { name: 'Bottoms', component: 'Bottoms', count: 40 },
      { name: 'Shoes', component: 'Shoes', count: 45 },
      { name: 'Accessories', component: 'Accessories', count: 120 },
    ],
  },
  phase2: {
    name: 'Phase 2: Color Palette Verification',
    description: 'Verifying all color palettes render correctly',
    sections: [
      { name: 'Skin Tones', component: 'SkinTones', count: 37 },
      { name: 'Hair Colors', component: 'HairColors', count: 60 },
      { name: 'Eye Colors', component: 'EyeColors', count: 45 },
      { name: 'Eyeshadow Colors', component: 'EyeshadowColors', count: 20 },
      { name: 'Eyeliner Colors', component: 'EyelinerColors', count: 8 },
      { name: 'Lipstick Colors', component: 'LipstickColors', count: 20 },
      { name: 'Blush Colors', component: 'BlushColors', count: 10 },
      { name: 'Clothing Colors', component: 'ClothingColors', count: 18 },
    ],
  },
  phase3: {
    name: 'Phase 3: Layer Composition Testing',
    description: 'Testing correct z-ordering and layer interactions',
    sections: [
      { name: 'Avatar.tsx Layers', component: 'AvatarLayers', count: 16 },
      { name: 'FullBodyAvatar Layers', component: 'FullBodyLayers', count: 8 },
      { name: 'Layer Interactions', component: 'LayerInteractions', count: 12 },
    ],
  },
  phase4: {
    name: 'Phase 4: Combination Testing',
    description: 'Testing high-risk and edge case combinations',
    sections: [
      { name: 'Critical Combinations', component: 'CriticalCombos', count: 8 },
      { name: 'Edge Case Combinations', component: 'EdgeCaseCombos', count: 4 },
    ],
  },
  phase5: {
    name: 'Phase 5: Cross-Platform Testing',
    description: 'Testing across platforms and sizes',
    sections: [
      { name: 'iOS Testing', component: 'iOS', count: 6 },
      { name: 'Android Testing', component: 'Android', count: 6 },
      { name: 'Web Testing', component: 'Web', count: 6 },
    ],
  },
};

// Load test results from tracking file
function loadTestResults(): Record<string, TestResult> {
  const resultsPath = path.resolve('./scripts/qa/output/test-results.json');
  if (fs.existsSync(resultsPath)) {
    return JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
  }
  return {};
}

// Calculate phase statistics
function calculatePhaseStats(phase: typeof QA_PLAN_STRUCTURE.phase1, results: Record<string, TestResult>): PhaseReport {
  const sections: TestSection[] = phase.sections.map(section => {
    const sectionResults = Object.values(results).filter(r => r.component === section.component);
    const passed = sectionResults.filter(r => r.status === 'passed').length;
    const failed = sectionResults.filter(r => r.status === 'failed').length;
    const pending = section.count - passed - failed;

    return {
      name: section.name,
      component: section.component,
      totalTests: section.count,
      passedTests: passed,
      failedTests: failed,
      pendingTests: pending,
      skippedTests: 0,
      results: sectionResults,
    };
  });

  const totalTests = sections.reduce((sum, s) => sum + s.totalTests, 0);
  const passedTests = sections.reduce((sum, s) => sum + s.passedTests, 0);
  const failedTests = sections.reduce((sum, s) => sum + s.failedTests, 0);
  const pendingTests = totalTests - passedTests - failedTests;

  return {
    name: phase.name,
    description: phase.description,
    sections,
    totalTests,
    passedTests,
    failedTests,
    pendingTests,
    completionPercentage: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0,
  };
}

// Generate full report
function generateReport(): TestReport {
  const results = loadTestResults();

  const phases = {
    phase1: calculatePhaseStats(QA_PLAN_STRUCTURE.phase1, results),
    phase2: calculatePhaseStats(QA_PLAN_STRUCTURE.phase2, results),
    phase3: calculatePhaseStats(QA_PLAN_STRUCTURE.phase3, results),
    phase4: calculatePhaseStats(QA_PLAN_STRUCTURE.phase4, results),
    phase5: calculatePhaseStats(QA_PLAN_STRUCTURE.phase5, results),
  };

  const allPhases = Object.values(phases);
  const summary: ReportSummary = {
    totalTests: allPhases.reduce((sum, p) => sum + p.totalTests, 0),
    passedTests: allPhases.reduce((sum, p) => sum + p.passedTests, 0),
    failedTests: allPhases.reduce((sum, p) => sum + p.failedTests, 0),
    pendingTests: allPhases.reduce((sum, p) => sum + p.pendingTests, 0),
    skippedTests: 0,
    completionPercentage: 0,
    lastRun: new Date().toISOString(),
  };
  summary.completionPercentage = summary.totalTests > 0
    ? Math.round((summary.passedTests / summary.totalTests) * 100)
    : 0;

  return {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    platform: process.platform,
    phases,
    summary,
  };
}

// Print report to console
function printReport(report: TestReport): void {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║           AVATAR QA PROGRESS REPORT                            ║');
  console.log('╠════════════════════════════════════════════════════════════════╣');
  console.log(`║  Generated: ${report.generatedAt.padEnd(48)} ║`);
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // Overall summary
  console.log('┌─────────────────────────────────────────────────────────────────┐');
  console.log('│                        OVERALL SUMMARY                          │');
  console.log('├─────────────────────────────────────────────────────────────────┤');
  console.log(`│  Total Tests:     ${report.summary.totalTests.toString().padEnd(10)} Progress: ${createProgressBar(report.summary.completionPercentage)} │`);
  console.log(`│  Passed:          ${report.summary.passedTests.toString().padEnd(10)} (${report.summary.completionPercentage}% complete)${' '.repeat(16)} │`);
  console.log(`│  Failed:          ${report.summary.failedTests.toString().padEnd(10)}${' '.repeat(35)} │`);
  console.log(`│  Pending:         ${report.summary.pendingTests.toString().padEnd(10)}${' '.repeat(35)} │`);
  console.log('└─────────────────────────────────────────────────────────────────┘\n');

  // Phase details
  for (const [key, phase] of Object.entries(report.phases)) {
    const statusIcon = phase.failedTests > 0 ? '❌' : phase.pendingTests > 0 ? '🔶' : '✅';
    console.log(`\n${statusIcon} ${phase.name}`);
    console.log(`   ${phase.description}`);
    console.log(`   Progress: ${createProgressBar(phase.completionPercentage)} ${phase.completionPercentage}%`);
    console.log(`   Tests: ${phase.passedTests}/${phase.totalTests} passed, ${phase.failedTests} failed, ${phase.pendingTests} pending`);

    if (phase.failedTests > 0) {
      console.log('   Failed sections:');
      phase.sections
        .filter(s => s.failedTests > 0)
        .forEach(s => console.log(`     - ${s.name}: ${s.failedTests} failures`));
    }
  }

  console.log('\n');
}

// Create ASCII progress bar
function createProgressBar(percentage: number): string {
  const width = 20;
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
}

// Generate HTML report
function generateHTMLReport(report: TestReport): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Avatar QA Progress Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1a1a2e; color: #eee; padding: 2rem; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { text-align: center; margin-bottom: 2rem; background: linear-gradient(135deg, #667eea, #764ba2); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 2.5rem; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 2rem; }
    .stat-card { background: #16213e; border-radius: 12px; padding: 1.5rem; text-align: center; }
    .stat-value { font-size: 2.5rem; font-weight: bold; }
    .stat-value.passed { color: #4ade80; }
    .stat-value.failed { color: #f87171; }
    .stat-value.pending { color: #fbbf24; }
    .stat-label { color: #9ca3af; margin-top: 0.5rem; }
    .progress-bar { height: 24px; background: #374151; border-radius: 12px; overflow: hidden; margin: 1rem 0; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); border-radius: 12px; transition: width 0.5s; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; }
    .phase { background: #16213e; border-radius: 12px; padding: 1.5rem; margin-bottom: 1rem; }
    .phase-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .phase-title { font-size: 1.25rem; }
    .phase-stats { display: flex; gap: 1rem; font-size: 0.875rem; }
    .phase-stats span { padding: 0.25rem 0.75rem; border-radius: 9999px; }
    .phase-stats .passed { background: rgba(74, 222, 128, 0.2); color: #4ade80; }
    .phase-stats .failed { background: rgba(248, 113, 113, 0.2); color: #f87171; }
    .phase-stats .pending { background: rgba(251, 191, 36, 0.2); color: #fbbf24; }
    .sections { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.5rem; }
    .section { padding: 0.75rem; background: #0f3460; border-radius: 8px; font-size: 0.875rem; }
    .section-name { margin-bottom: 0.25rem; }
    .section-progress { display: flex; align-items: center; gap: 0.5rem; }
    .mini-bar { flex: 1; height: 6px; background: #374151; border-radius: 3px; overflow: hidden; }
    .mini-bar-fill { height: 100%; background: #667eea; }
    footer { text-align: center; margin-top: 2rem; color: #6b7280; font-size: 0.875rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Avatar QA Progress Report</h1>

    <div class="summary">
      <div class="stat-card">
        <div class="stat-value">${report.summary.totalTests}</div>
        <div class="stat-label">Total Tests</div>
      </div>
      <div class="stat-card">
        <div class="stat-value passed">${report.summary.passedTests}</div>
        <div class="stat-label">Passed</div>
      </div>
      <div class="stat-card">
        <div class="stat-value failed">${report.summary.failedTests}</div>
        <div class="stat-label">Failed</div>
      </div>
      <div class="stat-card">
        <div class="stat-value pending">${report.summary.pendingTests}</div>
        <div class="stat-label">Pending</div>
      </div>
    </div>

    <div class="progress-bar">
      <div class="progress-fill" style="width: ${report.summary.completionPercentage}%">
        ${report.summary.completionPercentage}%
      </div>
    </div>

    ${Object.values(report.phases).map(phase => `
    <div class="phase">
      <div class="phase-header">
        <div class="phase-title">${phase.name}</div>
        <div class="phase-stats">
          <span class="passed">${phase.passedTests} passed</span>
          <span class="failed">${phase.failedTests} failed</span>
          <span class="pending">${phase.pendingTests} pending</span>
        </div>
      </div>
      <div class="progress-bar" style="height: 12px;">
        <div class="progress-fill" style="width: ${phase.completionPercentage}%; font-size: 0.75rem;">
          ${phase.completionPercentage}%
        </div>
      </div>
      <div class="sections">
        ${phase.sections.map(section => `
        <div class="section">
          <div class="section-name">${section.name}</div>
          <div class="section-progress">
            <div class="mini-bar">
              <div class="mini-bar-fill" style="width: ${section.totalTests > 0 ? Math.round((section.passedTests / section.totalTests) * 100) : 0}%"></div>
            </div>
            <span>${section.passedTests}/${section.totalTests}</span>
          </div>
        </div>
        `).join('')}
      </div>
    </div>
    `).join('')}

    <footer>
      <p>Generated: ${report.generatedAt}</p>
      <p>React Native Bitmoji - Avatar QA System</p>
    </footer>
  </div>
</body>
</html>`;
}

// Main execution
function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
QA Report Generator

Usage: npm run qa:report -- [options]

Options:
  --format=FORMAT     Output format: console, html, json (default: console)
  --output=PATH       Output file path (for html/json)
  --update-plan       Update AVATAR_QA_PLAN.md with current progress

Examples:
  npm run qa:report
  npm run qa:report -- --format=html --output=./qa-report.html
    `);
    process.exit(0);
  }

  console.log('QA Report Generator');
  console.log('===================\n');

  const report = generateReport();
  const format = process.argv.find(a => a.startsWith('--format='))?.split('=')[1] || 'console';
  const outputPath = process.argv.find(a => a.startsWith('--output='))?.split('=')[1];

  switch (format) {
    case 'html': {
      const html = generateHTMLReport(report);
      const outPath = outputPath || './scripts/qa/output/qa-report.html';
      fs.writeFileSync(outPath, html);
      console.log(`HTML report saved: ${outPath}`);
      break;
    }
    case 'json': {
      const outPath = outputPath || './scripts/qa/output/qa-report.json';
      fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
      console.log(`JSON report saved: ${outPath}`);
      break;
    }
    case 'console':
    default:
      printReport(report);
      break;
  }
}

main();
