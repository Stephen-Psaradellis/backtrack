/**
 * Avatar QA System
 *
 * Comprehensive visual quality assurance system for avatar assets.
 * Provides tools for systematically testing all style variants.
 *
 * Usage:
 * ```tsx
 * import { QANavigator } from './avatar/qa';
 *
 * // In your app - Full QA interface:
 * <QANavigator onClose={() => setShowQA(false)} />
 *
 * // Or individual screens:
 * import { QATestHarness, ColorPaletteQA, IntegrationTests } from './avatar/qa';
 * <QATestHarness onClose={() => setShowQA(false)} />
 * ```
 */

// Types
export * from './types';

// Enum utilities
export * from './EnumIterators';

// Main QA Navigator (combines all screens)
export { QANavigator } from './QANavigator';
export { default as QANavigatorScreen } from './QANavigator';

// Individual QA Components
export { QATestHarness } from './QATestHarness';
export { ColorPaletteQA } from './ColorPaletteQA';
export { IntegrationTests } from './IntegrationTests';

// Convenience re-export
export { default as QATestHarnessScreen } from './QATestHarness';
export { default as ColorPaletteQAScreen } from './ColorPaletteQA';
export { default as IntegrationTestsScreen } from './IntegrationTests';
