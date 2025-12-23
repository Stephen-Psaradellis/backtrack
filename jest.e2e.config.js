/**
 * Jest E2E configuration for Love Ledger mobile app
 *
 * Configuration specifically for end-to-end integration tests.
 */

module.exports = {
  ...require('./jest.config.js'),
  testMatch: [
    '**/__tests__/e2e/**/*.test.{ts,tsx}',
    '**/*.e2e.test.{ts,tsx}',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
  ],
  // Longer timeout for E2E tests
  testTimeout: 30000,
}
