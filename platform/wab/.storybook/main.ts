import type { StorybookConfig } from "storybook-react-rsbuild";

const config: StorybookConfig = {
  framework: {
    name: "storybook-react-rsbuild",
    options: {
      builder: {
        rsbuildConfigPath: "./.storybook/rsbuild.config.ts",
      },
    },
  },
  stories: ["../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  core: {
    disableTelemetry: true,
  },
  typescript: {
    reactDocgen: "react-docgen", // react-docgen-typescript is too slow
    check: false, // `pnpm typecheck` covers the stories
  },
};

export default config;
