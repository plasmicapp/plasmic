import type { RsbuildConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { pluginSass } from "@rsbuild/plugin-sass";
import { DefinePlugin, ProvidePlugin } from "@rspack/core";
import { execSync } from "child_process";
import {
  OPTIONAL_VAR,
  REQUIRED_VAR,
  mkDefinePluginOptsForEnv,
} from "./mkDefinePluginOptsForEnv";

export function getCommitHash(): string {
  return execSync("git rev-parse HEAD").toString().slice(0, 6);
}

/**
 * Base rsbuild config to bundle our code.
 *
 * Used by:
 * - App build ./rsbuild.config.ts
 * - Storybook .storybook/rsbuild.config.ts
 */
export function mkSharedRsbuildConfig(opts: {
  commitHash: string;
}): RsbuildConfig {
  const { commitHash } = opts;
  return {
    resolve: {
      alias: {
        // Force a single jquery instance in the bundle. jquery plugins
        // (jquery-serializejson) import "jquery" themselves, and under pnpm's
        // isolated node_modules they can resolve a different copy than the app
        // (the workspace has both 3.5.1 and 3.7.1), so the plugin registers
        // itself on an instance the app never sees.
        jquery: "./node_modules/jquery",
        // data-urls.ts only falls back to xmldom when there is no window.
        "@xmldom/xmldom": false,
      },
    },
    plugins: [pluginReact(), pluginSass()],
    tools: {
      rspack: {
        plugins: [
          new ProvidePlugin({
            process: [require.resolve("process/browser")],
            Buffer: ["buffer", "Buffer"],
          }),
          new DefinePlugin(
            mkDefinePluginOptsForEnv({
              NODE_ENV: REQUIRED_VAR,
              COMMITHASH: commitHash,
              STATIC_URL: OPTIONAL_VAR,
              POSTHOG_API_KEY: OPTIONAL_VAR,
              POSTHOG_HOST: OPTIONAL_VAR,
              POSTHOG_REVERSE_PROXY_HOST: OPTIONAL_VAR,
              SENTRY_DSN: OPTIONAL_VAR,
              SENTRY_ORG_ID: OPTIONAL_VAR,
              SENTRY_PROJECT_ID: OPTIONAL_VAR,
              STRIPE_PUBLISHABLE_KEY: OPTIONAL_VAR,
            }),
          ),
        ],
      },
    },
  };
}
