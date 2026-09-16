import { defineConfig } from "@rsbuild/core";
import {
  getCommitHash,
  mkSharedRsbuildConfig,
} from "../tools/webpack/sharedRsbuildConfig";

// The storybook:build script forces NODE_ENV=development, since a production
// build requires the deploy-only env vars.
export default defineConfig(
  mkSharedRsbuildConfig({ commitHash: getCommitHash() }),
);
