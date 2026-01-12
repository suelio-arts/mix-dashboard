module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: ['js/**/*.js', '!js/__tests__/**'],
  coverageDirectory: 'coverage',
  verbose: true,
  setupFilesAfterEnv: ['jest-extended/all'],
};
