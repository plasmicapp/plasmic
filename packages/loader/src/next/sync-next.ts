/**
 * Next does not support any asynchronous workflow for plugins. This file is
 * meant to run as a fork, allowing us to retain asynchronous code for the
 * initial code syncing.
 */

import {
  convertOptsToLoaderConfig,
  initLoader,
  maybeAddToGitIgnore,
} from "../shared";
import * as logger from "../shared/logger";
import * as cli from "../shared/cli";
import type { PlasmicOpts } from "../shared/types";
import path from "upath";
import { spawn } from "../shared/utils";
import { generateNextPages } from "./pages";

async function run() {
  const opts: {
    pluginOptions: PlasmicOpts;
    defaultOptions: PlasmicOpts;
  } = JSON.parse(process.argv[2]);

  const config = await convertOptsToLoaderConfig(
    opts.pluginOptions,
    opts.defaultOptions
  );
  await initLoader(config);
  await maybeAddToGitIgnore(path.join(process.cwd(), ".gitignore"), ".plasmic");

  const cliConfig = await cli.readConfig(config.plasmicDir);
  const pages = cli.getPagesFromConfig(config.plasmicDir, cliConfig);

  return generateNextPages(pages, config.pageDir, cliConfig);
}

if (require.main === module) {
  spawn(run().catch((e) => logger.crash(e.message, e)));
}
