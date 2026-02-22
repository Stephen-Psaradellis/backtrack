/**
 * QA Types - Type definitions for the visual QA testing system
 */

// Test status for individual items
export type TestStatus = 'pending' | 'passed' | 'failed' | 'skipped';

// Test result for a single component/style combination
export interface TestResult {
  id: string;
  component: string;
  style: string;
  status: TestStatus;
  timestamp?: string;
  errorMessage?: string;
  screenshotPath?: string;
  baselinePath?: string;
  diffPath?: string;
  diffPercentage?: number;
}

// Test section grouping multiple test results
export interface TestSection {
  name: string;
  component: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  pendingTests: number;
  skippedTests: number;
  results: TestResult[];
}

// Overall test report
export interface TestReport {
  version: string;
  generatedAt: string;
  platform: string;
  phases: {
    phase1: PhaseReport;
    phase2: PhaseReport;
    phase3: PhaseReport;
    phase4: PhaseReport;
    phase5: PhaseReport;
  };
  summary: ReportSummary;
}

export interface PhaseReport {
  name: string;
  description: string;
  sections: TestSection[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  pendingTests: number;
  completionPercentage: number;
}

export interface ReportSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  pendingTests: number;
  skippedTests: number;
  completionPercentage: number;
  lastRun: string;
  duration?: number;
}

// Component test configuration
export interface ComponentTestConfig {
  component: string;
  configKey: keyof AvatarConfigKeys;
  enumValues: string[];
  baseConfig?: Partial<AvatarConfigKeys>;
  colorTests?: ColorTestConfig[];
}

export interface ColorTestConfig {
  name: string;
  colors: Array<{ name: string; hex: string }>;
  configKey: string;
}

// Avatar config keys for testing
export interface AvatarConfigKeys {
  hairStyle: string;
  hairColor: string;
  hairSecondaryColor: string;
  hairTreatment: string;
  eyeStyle: string;
  eyeColor: string;
  rightEyeColor: string;
  eyelashStyle: string;
  eyebrowStyle: string;
  eyebrowColor: string;
  noseStyle: string;
  mouthStyle: string;
  faceShape: string;
  facialHair: string;
  facialHairColor: string;
  skinTone: string;
  accessory: string;
  clothing: string;
  clothingColor: string;
  freckles: string;
  wrinkles: string;
  eyeBags: string;
  cheekStyle: string;
  skinDetail: string;
  faceTattoo: string;
  faceTattooColor: string;
  eyeshadowStyle: string;
  eyeshadowColor: string;
  eyelinerStyle: string;
  eyelinerColor: string;
  lipstickStyle: string;
  lipstickColor: string;
  blushStyle: string;
  blushColor: string;
  teethStyle: string;
}

// QA tracking state stored in AsyncStorage
export interface QATrackingState {
  lastUpdated: string;
  testResults: Record<string, TestResult>;
  sectionProgress: Record<string, SectionProgress>;
}

export interface SectionProgress {
  name: string;
  total: number;
  completed: number;
  passed: number;
  failed: number;
  lastTested: string;
}

// Visual comparison result
export interface ComparisonResult {
  match: boolean;
  diffPercentage: number;
  diffPixels: number;
  totalPixels: number;
  diffImagePath?: string;
}

// Style guide entry
export interface StyleGuideEntry {
  category: string;
  component: string;
  style: string;
  screenshotPath: string;
  svgData?: string;
  notes?: string;
}

// Test generation options
export interface GenerateOptions {
  component?: string;
  output?: string;
  format?: 'png' | 'svg' | 'both';
  size?: number;
  includeColors?: boolean;
  limit?: number;
}

// Compare options
export interface CompareOptions {
  baseline: string;
  current: string;
  output?: string;
  threshold?: number;
  generateReport?: boolean;
}

// Style guide options
export interface StyleGuideOptions {
  category?: string;
  output?: string;
  format?: 'html' | 'markdown' | 'json';
  includeNotes?: boolean;
}
