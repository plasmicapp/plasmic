// From: https://github.com/vercel/next.js/blob/canary/packages/next/next-server/lib/constants.ts.
const PHASE_PRODUCTION_BUILD = "phase-production-build";
const PHASE_DEVELOPMENT_SERVER = "phase-development-server";

import path from "path";
import { generateEntrypoint, PlamicOpts } from "../shared";

type PluginOptions = Omit<PlamicOpts, "pageDir"> & { pageDir?: string };

// Check to make sure it only runs once.
let firstTime = true;

module.exports = (pluginOptions: PluginOptions) => {
  const buildPhase = [PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD];

  return (nextConfig: any = {}, composePlugins: any = {}) => {
    const { nextComposePlugins, phase } = composePlugins;

    function nextConfigMethod(phase: string, args: any = {}) {
      if (!firstTime) {
        return;
      }
      firstTime = false;
      if (pluginOptions.watch === undefined) {
        pluginOptions.watch = phase === PHASE_DEVELOPMENT_SERVER;
      }
      if (buildPhase.includes(phase)) {
        generateEntrypoint({
          initArgs: {
            platform: "nextjs",
            "pages-dir": "../pages",
          },
          pageDir: path.join(pluginOptions.dir, "./pages"),
          ...pluginOptions,
        });
      }
      return typeof nextConfig === "function"
        ? nextConfig(phase, args)
        : nextConfig;
    }
    return nextComposePlugins ? nextConfigMethod(phase) : nextConfigMethod;
  };
};
