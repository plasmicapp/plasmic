const { getJestConfig } = require("@storybook/test-runner");

/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  // https://jestjs.io/docs/configuration
  // Use defaults from @storybook/test-runner
  ...getJestConfig(),

  // The default `rootDir` is the git root.
  // Override to `__dirname` so it only looks in platform/wab.
  rootDir: __dirname,
  testTimeout: 15000,
};
