module.exports = {
  preset: '@react-native/jest-preset',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: ['<rootDir>/__tests__/**/*.test.[jt]s?(x)'],
  // React Navigation, TanStack Query and NetInfo ship ES modules; the default
  // preset excludes node_modules from transformation, so they must be opted in.
  transformIgnorePatterns: [
    'node_modules/(?!(?:.pnpm/)?(' + [
      '@react-native',
      'react-native',
      '@react-navigation',
      '@tanstack',
      'react-native-.*',
    ].join('|') + ')/)',
  ],
};
