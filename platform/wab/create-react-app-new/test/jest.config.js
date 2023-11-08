'use strict';

module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/**/*.test.js'],
  testPathIgnorePatterns: ['/src/', 'node_modules'],
  transform: {
    '.(js|jsx|ts|tsx)': '@sucrase/jest-plugin',
  },
};
