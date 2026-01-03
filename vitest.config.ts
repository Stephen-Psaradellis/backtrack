import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    // Enable global test functions (describe, it, expect) without imports
    globals: true,

    // Default environment for tests (node for server-side, utility tests)
    environment: 'node',

    // Setup files to run before tests (merged from jest.setup.ts and jest.setup.js)
    setupFiles: ['./vitest.setup.ts'],

    // Test file patterns - matches both __tests__ directory and co-located tests
    include: [
      '**/__tests__/**/*.(test|spec).(ts|tsx|js|jsx)',
      '**/*.(test|spec).(ts|tsx|js|jsx)',
    ],

    // Files to ignore
    exclude: [
      '**/node_modules/**',
      '.worktrees/**',
      '**/.next/**',
      '**/dist/**',
      // Note: e2e tests are excluded from unit test runs, run separately with test:e2e
      '**/__tests__/e2e/**',
      // Test utilities/helpers that are not actual test files
      '**/__tests__/mocks/**',
      '**/__tests__/utils/test-utils.ts',
    ],

    // Multi-environment support: assign different environments based on file patterns
    // - jsdom: React/DOM components (default for .tsx files)
    // - node: Server-side utilities and pure logic
    // - happy-dom: Alternative lightweight DOM for performance-critical tests
    environmentMatchGlobs: [
      // Component tests use jsdom for React DOM testing
      ['**/components/**/*.test.{ts,tsx}', 'jsdom'],
      ['**/__tests__/components/**/*.test.{ts,tsx}', 'jsdom'],
      // Hook tests with React use jsdom (both .ts and .tsx)
      ['**/hooks/**/*.test.{ts,tsx}', 'jsdom'],
      ['**/__tests__/hooks/**/*.test.{ts,tsx}', 'jsdom'],
      // Utils that need browser APIs (localStorage, etc.) use jsdom
      ['**/__tests__/utils/**/*.test.{ts,tsx}', 'jsdom'],
      // Services that need browser APIs use jsdom
      ['**/__tests__/services/**/*.test.{ts,tsx}', 'jsdom'],
      // Utility/library tests use node environment (for pure logic)
      ['**/lib/**/*.test.ts', 'node'],
      ['**/__tests__/lib/**/*.test.ts', 'node'],
      // Server-side tests use node
      ['**/app/api/**/*.test.ts', 'node'],
      // Happy-dom for tests that need DOM but want faster execution
      ['**/*.happy.test.{ts,tsx}', 'happy-dom'],
    ],

    // Clear mocks between tests for isolation
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,

    // Verbose output for better debugging
    reporters: ['verbose'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'components/**/*.{ts,tsx}',
        'lib/**/*.{ts,tsx}',
        'types/**/*.{ts,tsx}',
        'hooks/**/*.{ts,tsx}',
      ],
      exclude: [
        '**/*.d.ts',
        '**/node_modules/**',
        '**/__tests__/**',
        '**/coverage/**',
        '**/*.config.{js,ts}',
        '**/vitest.setup.tsx',
      ],
      // Coverage thresholds (aligned with Jest config baseline)
      thresholds: {
        global: {
          branches: 50,
          functions: 50,
          lines: 50,
          statements: 50,
        },
      },
    },

    // Timeout for tests (5 seconds default)
    testTimeout: 5000,

    // Pool configuration for better performance
    pool: 'forks',

    // Retry flaky tests once
    retry: 0,
  },
  resolve: {
    alias: {
      // Module path alias matching tsconfig.json
      '@': path.resolve(__dirname, './'),
    },
  },
})