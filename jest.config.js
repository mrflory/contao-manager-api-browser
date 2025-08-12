/** @type {import('jest').Config} */
module.exports = {
  // Test environment for different test types
  projects: [
    {
      displayName: 'node',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/test/integration/**/!(polling|errorScenarios|workflow).test.ts', '<rootDir>/src/test/mockServer/**/*.test.ts'],
      transform: {
        '^.+\\.ts$': ['ts-jest', {
          tsconfig: {
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
            moduleResolution: 'node',
          },
        }],
      },
      moduleFileExtensions: ['ts', 'js', 'json'],
      collectCoverageFrom: [
        'src/utils/**/*.ts',
        'src/hooks/**/*.ts',
        '!src/**/*.d.ts',
      ],
    },
    {
      displayName: 'jsdom',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/src/test/components/**/*.test.tsx', '<rootDir>/src/test/components/**/*.test.ts', '<rootDir>/src/test/integration/polling.test.ts', '<rootDir>/src/test/integration/errorScenarios.test.ts', '<rootDir>/src/test/integration/workflow.test.ts'],
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: {
            jsx: 'react-jsx',
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
            moduleResolution: 'node',
          },
        }],
      },
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
      setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
      setupFiles: ['<rootDir>/src/test/jest.d.ts'],
      moduleNameMapper: {
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
      },
      collectCoverageFrom: [
        'src/components/**/*.{ts,tsx}',
        'src/hooks/**/*.ts',
        '!src/**/*.d.ts',
      ],
    },
  ],
  // Global Jest configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/test/**/*',
    '!src/main.tsx',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 10000,
  verbose: true,
  // Global test setup
  globalSetup: '<rootDir>/src/test/globalSetup.ts',
  globalTeardown: '<rootDir>/src/test/globalTeardown.ts',
};