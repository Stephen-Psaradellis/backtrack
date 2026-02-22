/**
 * Jest Setup for Visual QA Testing
 */

import { toMatchImageSnapshot } from 'jest-image-snapshot';

// Extend Jest matchers with image snapshot support
expect.extend({ toMatchImageSnapshot });

// Configure image snapshot options
const customConfig = {
  customSnapshotsDir: './scripts/qa/baselines',
  customDiffDir: './scripts/qa/output/diffs',
  failureThreshold: 0.1, // 10% threshold
  failureThresholdType: 'percent' as const,
};

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toMatchImageSnapshot(options?: object): R;
    }
  }

  var qaConfig: typeof customConfig;
}

globalThis.qaConfig = customConfig;

// Clean up test artifacts on test suite completion
afterAll(() => {
  // Log test completion
  console.log('Visual QA tests completed');
});
