const { startDevServer } = require("@cypress/webpack-dev-server");
const findReactScriptsWebpackConfig = require("@cypress/react/plugins/react-scripts/findReactScriptsWebpackConfig");

module.exports = (on, config) => {
  if (config.testingType === "component") {
    on("dev-server:start", async (options) => {
      const webpackConfig = findReactScriptsWebpackConfig(config);
      if (process.env.CI) {
        console.log("Removing ForkTsCheckerWebpackPlugin");
        webpackConfig.plugins = webpackConfig.plugins.filter(
          (p) => p.constructor?.name !== "ForkTsCheckerWebpackPlugin"
        );
      }
      return startDevServer({ options, webpackConfig });
    });
  }

  return config;
};
