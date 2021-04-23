import { watchForChanges } from "../shared";
import { spawn } from "../shared/utils";
import * as logger from "../shared/logger";
import type {
  PlasmicOpts,
  PluginOptions,
  Substitutions,
} from "../shared/types";
import path from "upath";
import cp from "child_process";
import { generateNextPages } from "./pages";

// From: https://github.com/vercel/next.js/blob/canary/packages/next/next-server/lib/constants.ts.
const PHASE_PRODUCTION_BUILD = "phase-production-build";
const PHASE_DEVELOPMENT_SERVER = "phase-development-server";
const buildPhase = [PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD];

let isFirstTime = true;
function initPlasmicLoader(pluginOptions: PluginOptions) {
  if (!isFirstTime) {
    return;
  }
  isFirstTime = false;
  const defaultDir = pluginOptions.dir || process.cwd();
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
    substitutions: {} as Substitutions,
  };

  const opts: PlasmicOpts = {
    ...defaultOptions,
    ...pluginOptions,
  };

  const result = cp.spawnSync(
    "node",
    [path.join(__dirname, "sync-next.js"), JSON.stringify(opts)],
    { stdio: "inherit" }
  );

  if (result.status !== 0) {
    logger.crash(
      "Unable to sync plasmic code. Please check the above error and try again."
    );
  }

  if (opts.watch) {
    spawn(
      watchForChanges(opts, (pages, config) =>
        generateNextPages(pages, nextPageDir, config)
      )
    );
  }
}

type NextConfigExport = (phase: string) => {};
type NextConfigExportCreator = (nextConfig: any) => NextConfigExport;

const plasmic = (pluginOptions: PluginOptions): NextConfigExportCreator => (
  nextConfig = {}
) => (phase) => {
  try {
    if (buildPhase.includes(phase)) {
      initPlasmicLoader(pluginOptions);
    }
    return nextConfig;
  } catch (e) {
    logger.crash(e.message, e);
  }
};

export = plasmic;
