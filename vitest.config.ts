import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    // Enable global test functions (describe, it, expect) without imports
    globals: true,

    // Default environment for tests (jsdom for React components/hooks)
    // Vitest 4.x changed environmentMatchGlobs behavior, so we default to jsdom
    environment: 'jsdom',

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
      // Vitest 4.x: Alias react-native to our mock to avoid Flow type parsing errors
      'react-native': path.resolve(__dirname, './__tests__/mocks/react-native.ts'),
    },
  },
})