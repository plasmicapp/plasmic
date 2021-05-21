import cp from "child_process";
import path from "upath";
import { watchForChanges } from "../shared";
import * as logger from "../shared/logger";
import type {
  PlasmicOpts,
  PluginOptions,
  Substitutions,
} from "../shared/types";
import { spawn } from "../shared/utils";
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

  let watch = process.env.NODE_ENV === "development";

  if (pluginOptions.watch != null) {
    watch = pluginOptions.watch;
  }

  const result = cp.spawnSync(
    "node",
    [
      path.join(__dirname, "sync-next.js"),
      JSON.stringify({ pluginOptions, defaultOptions }),
    ],
    { stdio: "inherit" }
  );

  // If it didn't succeed, there's likely an error that was logged. So we'll exit the process.
  if (result.status !== 0) {
    process.exit(1);
  }

  if (watch) {
    spawn(
      watchForChanges(undefined, (pages, config) =>
        generateNextPages(pages, nextPageDir, config)
      )
    );
  }
}

type NextConfigExport = (phase: string) => {};
type NextConfigExportCreator = (nextConfig: any) => NextConfigExport;

const plasmic =
  (pluginOptions: PluginOptions): NextConfigExportCreator =>
  (nextConfig = {}) =>
  (phase) => {
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
