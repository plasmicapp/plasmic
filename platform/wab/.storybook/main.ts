import type { StorybookConfig } from "@storybook/react-webpack5";
import type { Options } from "@storybook/types";
import { dirname, join } from "path";
import type { Configuration } from "webpack";

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [
    "@storybook/preset-create-react-app",
    "@storybook/addon-links",
    "@storybook/addon-essentials",
    "@storybook/addon-onboarding",
    "@storybook/addon-interactions",
  ],
  framework: {
    name: "@storybook/react-webpack5",
    options: {},
  },
  docs: {
    autodocs: "tag",
  },
  typescript: {
    reactDocgen: "react-docgen", // react-docgen-typescript is too slow
    skipBabel: true, // our custom webpack uses sucrase instead of babel
  },
  webpack: (config, options) => {
    // Pull some webpack config from our create-react-app-new
    // that @storybook/preset-create-react-app doesn't do.
    const craWebpackConfig = loadCraWebpackConfig(config.mode, options);
    return {
      ...config,
      module: {
        ...config.module,
        rules: config.module.rules.map((rule) => {
          if (typeof rule !== "object" || !("oneOf" in rule)) {
            return rule;
          }

          return {
            oneOf: rule.oneOf.map((oneOfRule) => {
              if (
                typeof oneOfRule === "object" &&
                oneOfRule.test instanceof RegExp &&
                oneOfRule.test.test(".tsx")
              ) {
                return {
                  ...oneOfRule,
                  include: [
                    ...(Array.isArray(oneOfRule.include)
                      ? oneOfRule.include
                      : [oneOfRule.include]),
                    options.configDir,
                  ],
                };
              } else {
                return oneOfRule;
              }
            }),
          };
        }),
      },
      resolve: {
        ...config.resolve,
        alias: {
          ...config.resolve.alias,
          ...craWebpackConfig.resolve.alias,
        },
      },
    };
  },
};
export default config;

/**
 * Loads our CRA webpack config.
 *
 * Based on this code in @storybook/preset-create-react-app
 * https://github.com/storybookjs/storybook/blob/main/code/presets/create-react-app/src/index.ts
 */
function loadCraWebpackConfig(mode: Configuration["mode"], options: Options) {
  const scriptsPath = dirname(
    require.resolve(`react-scripts/package.json`, {
      paths: [options.configDir],
    })
  );

  // Require the CRA config and set the appropriate mode.
  const craWebpackConfigPath = join(scriptsPath, "config", "webpack.config");
  return require(craWebpackConfigPath)(mode) as Configuration;
}
