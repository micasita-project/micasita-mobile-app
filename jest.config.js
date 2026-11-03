module.exports = {
  preset: 'jest-expo',
  clearMocks: true,
  testPathIgnorePatterns: ['/node_modules/', '/_helpers/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
