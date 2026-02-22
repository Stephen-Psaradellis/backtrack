/**
 * QA Tracking Service
 *
 * Provides persistent storage for QA test results and progress tracking.
 * Uses AsyncStorage to persist data between sessions.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const QA_STORAGE_KEY = '@qa/tracking';
const QA_RESULTS_KEY = '@qa/results';
const QA_PROGRESS_KEY = '@qa/progress';

// Test status types
export type TestStatus = 'pending' | 'passed' | 'failed' | 'skipped';

// Individual test result
export interface TestResult {
  id: string;
  component: string;
  style: string;
  status: TestStatus;
  testedAt: string;
  notes?: string;
}

// Section progress
export interface SectionProgress {
  name: string;
  total: number;
  passed: number;
  failed: number;
  pending: number;
  lastUpdated: string;
}

// Overall QA state
export interface QAState {
  version: string;
  lastUpdated: string;
  results: Record<string, TestResult>;
  sections: Record<string, SectionProgress>;
}

// Default state
const DEFAULT_STATE: QAState = {
  version: '1.0.0',
  lastUpdated: new Date().toISOString(),
  results: {},
  sections: {},
};

// QA Section definitions matching the plan
export const QA_SECTIONS = {
  // Phase 1: Component Isolation
  FaceShape: { name: 'Face Shapes', total: 25, phase: 1 },
  Eyes: { name: 'Eye Styles', total: 18, phase: 1 },
  Eyelashes: { name: 'Eyelash Styles', total: 9, phase: 1 },
  Eyebrows: { name: 'Eyebrow Styles', total: 12, phase: 1 },
  Nose: { name: 'Nose Styles', total: 11, phase: 1 },
  Mouth: { name: 'Mouth Styles', total: 18, phase: 1 },
  Teeth: { name: 'Teeth Styles', total: 32, phase: 1 },
  FacialHair: { name: 'Facial Hair', total: 9, phase: 1 },
  Freckles: { name: 'Freckles', total: 6, phase: 1 },
  Wrinkles: { name: 'Wrinkles', total: 14, phase: 1 },
  EyeBags: { name: 'Eye Bags', total: 6, phase: 1 },
  CheekStyle: { name: 'Cheek Style', total: 5, phase: 1 },
  SkinDetail: { name: 'Skin Details', total: 35, phase: 1 },
  FaceTattoo: { name: 'Face Tattoos', total: 27, phase: 1 },
  Eyeshadow: { name: 'Eyeshadow', total: 7, phase: 1 },
  Eyeliner: { name: 'Eyeliner', total: 7, phase: 1 },
  Lipstick: { name: 'Lipstick', total: 7, phase: 1 },
  Blush: { name: 'Blush', total: 6, phase: 1 },
  Hair: { name: 'Hair Styles', total: 143, phase: 1 },
  HairTreatment: { name: 'Hair Treatments', total: 19, phase: 1 },
  Clothing: { name: 'Clothing', total: 190, phase: 1 },
  Accessories: { name: 'Accessories', total: 120, phase: 1 },
  // Phase 2: Color Palettes
  SkinTones: { name: 'Skin Tones', total: 37, phase: 2 },
  HairColors: { name: 'Hair Colors', total: 60, phase: 2 },
  EyeColors: { name: 'Eye Colors', total: 45, phase: 2 },
} as const;

class QATrackingService {
  private state: QAState = DEFAULT_STATE;
  private loaded: boolean = false;

  /**
   * Load QA state from AsyncStorage
   */
  async load(): Promise<QAState> {
    try {
      const data = await AsyncStorage.getItem(QA_STORAGE_KEY);
      if (data) {
        this.state = JSON.parse(data);
      } else {
        this.state = DEFAULT_STATE;
      }
      this.loaded = true;
      return this.state;
    } catch (error) {
      console.error('Error loading QA state:', error);
      this.state = DEFAULT_STATE;
      return this.state;
    }
  }

  /**
   * Save QA state to AsyncStorage
   */
  async save(): Promise<void> {
    try {
      this.state.lastUpdated = new Date().toISOString();
      await AsyncStorage.setItem(QA_STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.error('Error saving QA state:', error);
    }
  }

  /**
   * Get current state (load if needed)
   */
  async getState(): Promise<QAState> {
    if (!this.loaded) {
      await this.load();
    }
    return this.state;
  }

  /**
   * Record a test result
   */
  async recordResult(
    component: string,
    style: string,
    status: TestStatus,
    notes?: string
  ): Promise<void> {
    const id = `${component}-${style}`;
    this.state.results[id] = {
      id,
      component,
      style,
      status,
      testedAt: new Date().toISOString(),
      notes,
    };

    // Update section progress
    await this.updateSectionProgress(component);
    await this.save();
  }

  /**
   * Batch record multiple test results
   */
  async recordResults(
    component: string,
    results: Array<{ style: string; status: TestStatus; notes?: string }>
  ): Promise<void> {
    for (const result of results) {
      const id = `${component}-${result.style}`;
      this.state.results[id] = {
        id,
        component,
        style: result.style,
        status: result.status,
        testedAt: new Date().toISOString(),
        notes: result.notes,
      };
    }

    await this.updateSectionProgress(component);
    await this.save();
  }

  /**
   * Get test result for a specific component/style
   */
  getResult(component: string, style: string): TestResult | undefined {
    const id = `${component}-${style}`;
    return this.state.results[id];
  }

  /**
   * Get all results for a component
   */
  getComponentResults(component: string): TestResult[] {
    return Object.values(this.state.results).filter(r => r.component === component);
  }

  /**
   * Update section progress based on current results
   */
  private async updateSectionProgress(component: string): Promise<void> {
    const sectionDef = QA_SECTIONS[component as keyof typeof QA_SECTIONS];
    if (!sectionDef) return;

    const results = this.getComponentResults(component);
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const pending = sectionDef.total - passed - failed;

    this.state.sections[component] = {
      name: sectionDef.name,
      total: sectionDef.total,
      passed,
      failed,
      pending,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Get section progress
   */
  getSectionProgress(component: string): SectionProgress | undefined {
    return this.state.sections[component];
  }

  /**
   * Get all section progress
   */
  getAllSectionProgress(): Record<string, SectionProgress> {
    return this.state.sections;
  }

  /**
   * Get overall progress statistics
   */
  getOverallProgress(): {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    pendingTests: number;
    completionPercentage: number;
  } {
    const totalTests = Object.values(QA_SECTIONS).reduce((sum, s) => sum + s.total, 0);
    const passedTests = Object.values(this.state.results).filter(r => r.status === 'passed').length;
    const failedTests = Object.values(this.state.results).filter(r => r.status === 'failed').length;
    const pendingTests = totalTests - passedTests - failedTests;

    return {
      totalTests,
      passedTests,
      failedTests,
      pendingTests,
      completionPercentage: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0,
    };
  }

  /**
   * Get progress by phase
   */
  getPhaseProgress(phase: number): {
    name: string;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    pendingTests: number;
    completionPercentage: number;
  } {
    const phaseSections = Object.entries(QA_SECTIONS).filter(([_, s]) => s.phase === phase);
    const totalTests = phaseSections.reduce((sum, [_, s]) => sum + s.total, 0);

    const phaseName = phase === 1 ? 'Component Isolation' : phase === 2 ? 'Color Palettes' : `Phase ${phase}`;

    let passedTests = 0;
    let failedTests = 0;

    for (const [component, _] of phaseSections) {
      const results = this.getComponentResults(component);
      passedTests += results.filter(r => r.status === 'passed').length;
      failedTests += results.filter(r => r.status === 'failed').length;
    }

    const pendingTests = totalTests - passedTests - failedTests;

    return {
      name: phaseName,
      totalTests,
      passedTests,
      failedTests,
      pendingTests,
      completionPercentage: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0,
    };
  }

  /**
   * Clear all QA data
   */
  async clearAll(): Promise<void> {
    this.state = DEFAULT_STATE;
    await AsyncStorage.removeItem(QA_STORAGE_KEY);
  }

  /**
   * Export state to JSON
   */
  exportToJSON(): string {
    return JSON.stringify(this.state, null, 2);
  }

  /**
   * Import state from JSON
   */
  async importFromJSON(json: string): Promise<void> {
    try {
      const imported = JSON.parse(json);
      this.state = {
        ...DEFAULT_STATE,
        ...imported,
      };
      await this.save();
    } catch (error) {
      console.error('Error importing QA state:', error);
      throw error;
    }
  }

  /**
   * Mark entire section as passed
   */
  async markSectionPassed(component: string, styles: string[]): Promise<void> {
    await this.recordResults(
      component,
      styles.map(style => ({ style, status: 'passed' }))
    );
  }

  /**
   * Mark entire section as failed
   */
  async markSectionFailed(component: string, styles: string[], notes?: string): Promise<void> {
    await this.recordResults(
      component,
      styles.map(style => ({ style, status: 'failed', notes }))
    );
  }
}

// Export singleton instance
export const qaTracking = new QATrackingService();

// Export hook for React components
export function useQATracking() {
  return qaTracking;
}
