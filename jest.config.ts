/* eslint-disable */
export default {
  displayName: 'pg-testing',
  collectCoverage: true,
  coverageReporters: ['text', 'lcov'],
  coverageDirectory: './dist/coverage',
  testEnvironment: 'node',
  preset: 'ts-jest',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
};
