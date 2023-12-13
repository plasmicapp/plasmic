/** @type {import('jest').Config} */
module.exports = {
  reporters: [
    process.env.CI ? ["github-actions", { silent: false }] : "default",
    "summary",
  ],
  testRegex:
    ".*\\/(packages|plasmicpkgs)\\/.*\\.(spec|test)\\.(js|jsx|ts|tsx)$",
  // TODO Should really be running jest from each package rather than the root.
  testPathIgnorePatterns: [
    "<rootDir>/platform/.*",
    "<rootDir>/packages/plume-stories",
    "/node_modules/",
  ],
  transform: {
    "\\.tsx?$": "<rootDir>/jest-transform-esbuild.js",
  },
};
