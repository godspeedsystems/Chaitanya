module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globals: {
    'ts-jest': {
      diagnostics: false,
    },
  },
  testMatch: ['<rootDir>/test/functional/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
};