import path from "path";
import { generateEntrypoint, PlamicOpts } from "../shared";
import { ensure } from "../shared/utils";

// From: https://github.com/vercel/next.js/blob/canary/packages/next/next-server/lib/constants.ts.
const PHASE_PRODUCTION_BUILD = "phase-production-build";
const PHASE_DEVELOPMENT_SERVER = "phase-development-server";
const buildPhase = [PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD];

type PluginOptions = Omit<PlamicOpts, "pageDir"> & { pageDir?: string };

async function initPlasmicLoader(pluginOptions: PluginOptions) {
  return generateEntrypoint({
    initArgs: {
      platform: "nextjs",
      "pages-dir": "../pages",
      "src-dir": "./components",
    },
    pageDir: path.join(pluginOptions.dir, "./pages"),
    ...pluginOptions,
  });
}

/*
 * Next does not support any asynchronous workflow for plugins. What we're doing here
 * is running PlasmicLoader in a promise and registering an ad-hoc Webpack plugin that
 * hooks into Webpack's "beforeCompile" hook (from where we can add async code).
 *
 * Next also runs Webpack twice (one for the server and another for the client) where
 * both runs are asynchronous. What we do is saving the PlasmicLoader promise as a
 * module-scoped variable and hook to it from both runs.
 */

let initPlasmicPromise: Promise<void> | undefined;
module.exports = (pluginOptions: PluginOptions) => {
  return (nextConfig: any = {}) => {
    return function (phase: string) {
      if (!buildPhase.includes(phase)) {
        return nextConfig;
      }

      if (!initPlasmicPromise) {
        initPlasmicPromise = initPlasmicLoader({
          ...pluginOptions,
          watch: pluginOptions.watch || phase === PHASE_DEVELOPMENT_SERVER,
        });
      }

      return Object.assign({}, nextConfig, {
        webpack(config: any, options: any) {
          config.plugins.push({
            __plugin: "PlasmicLoaderPlugin",
            apply(compiler: any) {
              compiler.hooks.beforeCompile.tapAsync(
                "PlasmicLoaderPlugin",
                (params: any, callback: () => {}) => {
                  ensure(initPlasmicPromise).then(callback);
                }
              );
            },
          });

          if (typeof nextConfig.webpack === "function") {
            return nextConfig.webpack(config, options);
          }
          return config;
        },
      });
    };
  };
};
