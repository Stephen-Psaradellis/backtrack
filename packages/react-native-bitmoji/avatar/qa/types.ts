/**
 * QA System Types
 *
 * Type definitions for the visual QA testing system.
 */

import { AvatarConfig } from '../types';

// ============================================================================
// QA STATUS TYPES
// ============================================================================

export type QAStatus = 'not_tested' | 'passed' | 'failed' | 'needs_review';

export interface QAResult {
  styleKey: string;
  styleValue: string;
  status: QAStatus;
  issues: string[];
  timestamp: number;
  screenshotUri?: string;
}

export interface ComponentQAResults {
  componentName: string;
  totalVariants: number;
  testedCount: number;
  passedCount: number;
  failedCount: number;
  needsReviewCount: number;
  results: QAResult[];
  lastUpdated: number;
}

// ============================================================================
// ENUM METADATA
// ============================================================================

export interface EnumMetadata {
  name: string;
  displayName: string;
  enumObject: Record<string, string>;
  configKey: keyof AvatarConfig;
  category: QACategory;
  description?: string;
}

export type QACategory =
  | 'face'
  | 'eyes'
  | 'hair'
  | 'facial_details'
  | 'makeup'
  | 'clothing'
  | 'accessories'
  | 'body'
  | 'full_body';

// ============================================================================
// QA CHECKLIST TYPES
// ============================================================================

export interface QAChecklistItem {
  id: string;
  label: string;
  category: string;
  isChecked: boolean;
}

export interface ComponentChecklist {
  componentName: string;
  items: QAChecklistItem[];
}

// ============================================================================
// QA SESSION TYPES
// ============================================================================

export interface QASession {
  id: string;
  startedAt: number;
  lastUpdatedAt: number;
  currentComponent?: string;
  currentStyle?: string;
  progress: {
    totalComponents: number;
    completedComponents: number;
    totalStyles: number;
    testedStyles: number;
  };
  componentResults: Record<string, ComponentQAResults>;
}

// ============================================================================
// ERROR LOGGING TYPES
// ============================================================================

export interface RenderError {
  componentName: string;
  styleKey: string;
  styleValue: string;
  errorMessage: string;
  errorStack?: string;
  timestamp: number;
}

export interface QAErrorLog {
  errors: RenderError[];
  warnings: string[];
}

// ============================================================================
// EXPORT TYPES
// ============================================================================

export interface QAExportData {
  session: QASession;
  errors: QAErrorLog;
  exportedAt: number;
  version: string;
}

// ============================================================================
// TEST CONFIG
// ============================================================================

export interface QATestConfig {
  /** Size to render avatars at for testing */
  renderSize: number;
  /** Background color for consistent screenshots */
  backgroundColor: string;
  /** Whether to capture screenshots */
  captureScreenshots: boolean;
  /** Whether to log render warnings */
  logWarnings: boolean;
  /** Timeout for render operations in ms */
  renderTimeout: number;
}

export const DEFAULT_QA_CONFIG: QATestConfig = {
  renderSize: 200,
  backgroundColor: '#f0f0f0',
  captureScreenshots: false,
  logWarnings: true,
  renderTimeout: 5000,
};
