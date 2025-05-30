/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json'
    }]
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-reanimated|react-native-gesture-handler)'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/', 
    '<rootDir>/.expo/',
    '<rootDir>/packages/.*/dist/',
    '<rootDir>/packages/.*/lib/'
  ],
  collectCoverageFrom: [
    '**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/coverage/**',
    '!**/node_modules/**',
    '!**/.expo/**',
    '!**/dist/**',
    '!**/lib/**',
    '!**/vitest.config.ts',
    '!babel.config.js',
    '!jest.config.js'
  ],
  moduleNameMapper: {
    '^react-native$': 'react-native-web',
    '^react-native-reanimated$': '<rootDir>/jest.setup.js'
  }
};

module.exports = config; 