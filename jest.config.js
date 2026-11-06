module.exports = {
  preset: 'jest-expo',
  clearMocks: true,
  setupFiles: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/_helpers/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
