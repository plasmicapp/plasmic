/** @type {import('jest').Config} */
module.exports = {
  modulePathIgnorePatterns: ["<rootDir>/verdaccio-storage/"],
  reporters: [
    process.env.CI ? ["github-actions", { silent: false }] : "default",
    "summary",
  ],
  testRegex:
    ".*\\/(packages|plasmicpkgs|platform)\\/.*\\.(spec|test)\\.(js|jsx|ts|tsx)$",
  testPathIgnorePatterns: [
    "<rootDir>/platform/integration-tests",
    "<rootDir>/platform/loader-tests",
    "<rootDir>/platform/wab",
    "<rootDir>/packages/plume-stories",
    "/node_modules/",
  ],
  transform: {
    "\\.tsx?$": "<rootDir>/jest-transform-esbuild.js",
  },
};
