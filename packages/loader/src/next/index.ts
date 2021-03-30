import { initLoader, maybeAddToGitIgnore, onPostInit } from "../shared";
import { ensure } from "../shared/utils";
import * as gen from "../shared/gen";
import * as logger from "../shared/logger";
import type { PlasmicOpts } from "../shared/types";
import path from "upath";

// From: https://github.com/vercel/next.js/blob/canary/packages/next/next-server/lib/constants.ts.
const PHASE_PRODUCTION_BUILD = "phase-production-build";
const PHASE_DEVELOPMENT_SERVER = "phase-development-server";
const buildPhase = [PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD];

type PluginOptions = Partial<PlasmicOpts>;

async function initPlasmicLoader(pluginOptions: PluginOptions) {
  const defaultDir = pluginOptions.dir || process.cwd();

  // Attempted to select a hidden location (like .next/.plasmic or inside node modules)
  // But ran into issues. We'll choose .plasmic and add this to their .gitignore.
  const plasmicDir = path.join(defaultDir, ".plasmic");
  const nextPageDir = path.join(defaultDir, "pages");
  const defaultOptions = {
    watch: process.env.NODE_ENV === "development",
    initArgs: {
      platform: "nextjs",
      "pages-dir": "./pages",
      "images-public-dir": path.join(process.cwd(), "public"),
      "src-dir": "./components",
    },
    dir: defaultDir,
    plasmicDir,
    pageDir: path.join(plasmicDir, "pages"),
  };

  const opts = {
    ...defaultOptions,
    ...pluginOptions,
  } as PlasmicOpts;

  await maybeAddToGitIgnore(path.join(process.cwd(), ".gitignore"), ".plasmic");
  await initLoader(opts);

  return onPostInit(opts, async (pages, config) =>
    gen
      .generateNextPages(pages, nextPageDir, config)
      .catch((e) => logger.crash(e.message, e))
  );
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
function processNextPhase(
  pluginOptions: PluginOptions,
  nextConfig: any,
  phase: string
) {
  if (!buildPhase.includes(phase)) {
    return nextConfig;
  }

  if (!initPlasmicPromise) {
    initPlasmicPromise = initPlasmicLoader({
      ...pluginOptions,
      watch:
        pluginOptions.watch !== undefined
          ? pluginOptions.watch
          : phase === PHASE_DEVELOPMENT_SERVER,
    }).catch((e) => logger.crash(e.message, e));
  }

  return Object.assign({}, nextConfig, {
    webpackDevMiddleware: (config: any) => {
      // Ignore .next, but don't ignore .next/.plasmic.
      config.watchOptions.ignored = config.watchOptions.ignored.filter(
        (ignore: any) => !ignore.toString().includes(".next")
      );
      config.watchOptions.ignored.push(/.next\/(?!.plasmic)/);
      return config;
    },
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
}

module.exports = (pluginOptions: PluginOptions) => (nextConfig: any = {}) => (
  phase: string
) => {
  try {
    return processNextPhase(pluginOptions, nextConfig, phase);
  } catch (e) {
    logger.crash(e.message, e);
  }
};
