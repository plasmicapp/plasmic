import cp from "child_process";
import fs from "fs/promises";
import path from "upath";
import * as cli from "./cli";
import * as gen from "./gen";
import * as logger from "./logger";
import * as substitutions from "./substitutions";
import type { PlasmicOpts } from "./types";
import { PlasmicOptsSchema } from "./validation";

type onRegisterPages = (
  pages: { name: string; projectId: string; path: string; url: string }[],
  config: any
) => void;

async function watchForChanges(
  { plasmicDir, pageDir }: PlasmicOpts,
  onRegisterPages?: onRegisterPages
) {
  const cliPath = path.join(plasmicDir, "node_modules", ".bin", "plasmic");
  let currentConfig = await cli.readConfig(plasmicDir);
  const watchCmd = cp.spawn(
    "node",
    [cliPath, "watch", "--yes", "--metadata", "source=loader"],
    {
      cwd: plasmicDir,
      env: { ...process.env, PLASMIC_LOADER: "1" },
      stdio: "pipe",
    }
  );
  watchCmd.stdout.on("data", async function (data: Buffer) {
    const content = data.toString();
    content
      .split("\n")
      .filter(Boolean)
      .forEach((text) => logger.cliInfo(text));

    // Once the CLI output this message, we know the components & configs were updated.
    const didUpdate = content.includes("updated to revision");
    if (didUpdate) {
      await gen.generateAll({ dir: plasmicDir, pageDir });
      currentConfig = await cli.readConfig(plasmicDir);
      if (onRegisterPages) {
        onRegisterPages(
          cli.getPagesFromConfig(plasmicDir, currentConfig),
          currentConfig
        );
      }
    }
  });
}

export async function initLoader(userOpts: PlasmicOpts) {
  const opts: PlasmicOpts = await PlasmicOptsSchema.validateAsync(
    userOpts
  ).catch((error) => {
    logger.error(error.message);
    process.exit(1);
  });

  const { dir, pageDir, projects, plasmicDir, initArgs = {} } = opts;
  logger.info("Checking that your loader version is up to date.");
  await cli.ensureRequiredLoaderVersion();
  logger.info(`Syncing plasmic projects: ${projects.join(", ")}`);
  const plasmicExecPath = path.join(
    plasmicDir,
    "node_modules",
    ".bin",
    "plasmic"
  );

  await cli.tryInitializePlasmicDir(plasmicDir, initArgs);
  await cli.syncProject(plasmicDir, dir, plasmicExecPath, projects);

  if (opts.substitutions) {
    logger.info("Registering substitutions...");
    const config = await cli.readConfig(plasmicDir);
    substitutions.registerSubstitutions(plasmicDir, config, opts.substitutions);
    await cli.saveConfig(plasmicDir, config);
    await cli.fixImports(plasmicDir, plasmicExecPath);
  }

  logger.info("Generating loader...");

  await gen.generateAll({ dir: plasmicDir, pageDir });
}

export async function onPostInit(
  opts: PlasmicOpts,
  onRegisterPages?: onRegisterPages
) {
  if (onRegisterPages) {
    const config = await cli.readConfig(opts.plasmicDir);
    onRegisterPages(cli.getPagesFromConfig(opts.plasmicDir, config), config);
  }
  if (opts.watch) {
    watchForChanges(opts, onRegisterPages);
  }
}

export async function maybeAddToGitIgnore(gitIgnorePath: string, name: string) {
  const file = await fs
    .readFile(gitIgnorePath)
    .then((content) => content.toString())
    .catch((err) => {
      logger.info(
        `Found error while trying to read .gitignore: ${err.message}\nPlease add "${name}" to your .gitignore.`
      );
      return "";
    });

  if (!file || file.includes(name)) return;
  await fs.writeFile(
    gitIgnorePath,
    `${file}\n# Plasmic loader code\n${name}\n`
  );
  logger.info(`Added "${name}" to your .gitignore.`);
}
