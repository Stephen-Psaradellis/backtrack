/**
 * Jest Configuration for Avatar Visual QA Testing
 */

module.exports = {
  preset: 'react-native',
  testEnvironment: 'node',
  testMatch: ['**/scripts/qa/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
      },
    }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFilesAfterEnv: ['<rootDir>/scripts/qa/setup.ts'],
  testTimeout: 30000,
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './scripts/qa/output/test-report',
      filename: 'report.html',
      expand: true,
    }],
  ],
  collectCoverageFrom: [
    'src/avatar/**/*.{ts,tsx}',
    '!src/avatar/**/*.d.ts',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: './scripts/qa/output/coverage',
};
