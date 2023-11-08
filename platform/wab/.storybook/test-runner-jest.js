const { getJestConfig } = require("@storybook/test-runner");

/**
 * @type {import('@jest/types').Config.InitialOptions}
 */
module.exports = {
  // https://jestjs.io/docs/configuration

  // Use defaults from @storybook/test-runner
  ...getJestConfig(),

  // Overrides
  testTimeout: 15000,
};
