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
