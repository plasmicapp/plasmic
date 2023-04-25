/** @type {import('jest').Config} */
module.exports = {
  testRegex: "\\.(spec|test)\\.(js|jsx|ts|tsx)$",
  transform: {
    "\\.tsx?$": "<rootDir>/jest-transform-esbuild.js",
  },
};
