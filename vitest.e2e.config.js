import { defineConfig, mergeConfig } from 'vitest/config'
import vitestConfig from './vitest.config'

/**
 * Vitest E2E Configuration
 *
 * Extends the base vitest.config.ts for end-to-end tests.
 * E2E tests are longer-running integration tests that simulate full user flows.
 */
export default mergeConfig(
  vitestConfig,
  defineConfig({
    test: {
      // Only include E2E test files
      include: ['__tests__/e2e/**/*.e2e.test.{ts,tsx}'],

      // Exclude unit tests
      exclude: [
        '**/node_modules/**',
        '.worktrees/**',
        '**/.next/**',
        '**/dist/**',
        '**/__tests__/mocks/**',
        '**/__tests__/utils/**',
        // Exclude all non-e2e tests
        '**/__tests__/**/*.test.{ts,tsx}',
        '**/*.test.{ts,tsx}',
      ],

      // Longer timeout for E2E tests (30 seconds)
      testTimeout: 30000,

      // E2E tests should run sequentially to avoid race conditions
      pool: 'forks',
      poolOptions: {
        forks: {
          singleFork: true,
        },
      },

      // Retry flaky E2E tests
      retry: 1,

      // Enable verbose output for debugging E2E flows
      reporters: ['verbose'],
    },
  })
)
