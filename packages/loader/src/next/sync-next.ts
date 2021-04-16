/**
 * Next does not support any asynchronous workflow for plugins. This file is
 * meant to run as a fork, allowing us to retain asynchronous code for the
 * initial code syncing.
 */

import { initLoader, maybeAddToGitIgnore } from "../shared";
import * as gen from "../shared/gen";
import * as logger from "../shared/logger";
import * as cli from "../shared/cli";
import type { PlasmicOpts } from "../shared/types";
import path from "upath";
import { spawn } from "../shared/utils";

async function run() {
  const opts: PlasmicOpts = JSON.parse(process.argv[2]);
  const nextPageDir = path.join(opts.dir, "pages");
  await initLoader(opts);
  await maybeAddToGitIgnore(path.join(process.cwd(), ".gitignore"), ".plasmic");

  const config = await cli.readConfig(opts.plasmicDir);
  const pages = cli.getPagesFromConfig(opts.plasmicDir, config);

  return gen.generateNextPages(pages, nextPageDir, config);
}

if (require.main === module) {
  spawn(run().catch((e) => logger.crash(e.message, e)));
}
