module.exports = {
  testRegex: '.(spec|test).(js|jsx|ts|tsx)$',
  transform: {
    '\\.tsx?$': '<rootDir>/jest-transform-esbuild.js',
  },
};
