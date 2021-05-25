import { promises as fs } from "fs";
import rmfr from "rmfr";
import path from "upath";
import * as cli from "./cli";
import * as gen from "./gen";
import * as logger from "./logger";
import { setMetadata } from "./metadata";
import { captureException, initSentry } from "./sentry";
import * as substitutions from "./substitutions";
import type { PlasmicLoaderConfig, PlasmicOpts } from "./types";
import { spawn } from "./utils";
import { PlasmicOptsSchema } from "./validation";

const ABOUT_PAGE_URL = "https://docs.plasmic.app/learn/loader-config";

type onRegisterPages = (
  pages: { name: string; projectId: string; path: string; url: string }[],
  config: any
) => Promise<void>;

export async function watchForChanges(
  opts: PlasmicLoaderConfig,
  onRegisterPages?: onRegisterPages
) {
  const { plasmicDir, pageDir } = opts;
  let currentConfig = await cli.readConfig(plasmicDir);

  // Initialize sentry again, as this may not have been
  // initialized in next.
  await initSentry(opts);
  setMetadata({
    source: "loader",
    scheme: "loader",
  });

  const userCli = require(path.join(
    plasmicDir,
    "node_modules",
    "@plasmicapp",
    "cli",
    "dist",
    "lib.js"
  ));

  spawn(
    userCli.watchProjects(
      {
        yes: true,
        projects: opts.projects.map(({ projectId }) => projectId),
        baseDir: plasmicDir,
      },
      {},
      async function () {
        await gen.generateAll({ dir: plasmicDir, pageDir });
        currentConfig = await cli.readConfig(plasmicDir);
        if (onRegisterPages) {
          await onRegisterPages(
            cli.getPagesFromConfig(plasmicDir, currentConfig),
            currentConfig
          ).catch((e) => logger.crash(e.message, e));
        }
      }
    )
  );
}

export async function ensurePlasmicIsNotStale(
  plasmicDir: string,
  opts: Partial<PlasmicOpts>
) {
  const savedConfigPath = path.join(plasmicDir, ".plasmic-loader-config.json");

  const currentConfig = JSON.stringify({ ...opts, watch: false });
  const savedConfig = await fs
    .readFile(savedConfigPath)
    .then((file) => file.toString())
    .catch((error) => {
      if (error.code === "ENOENT") {
        return undefined;
      }
      throw error;
    });

  if (savedConfig === currentConfig) {
    return;
  }

  if (savedConfig !== undefined) {
    logger.info(
      "Detected a change in the previous config. Deleting .plasmic directory..."
    );
  }

  // Settings changed, so delete .plasmic dir.
  await rmfr(plasmicDir).catch((error) => {
    if (error.code !== "ENOTEMPTY" && error.code !== "EBUSY") {
      throw error;
    }
    logger.warn(
      `Unable to clear ${opts.plasmicDir}. Error: ${error.message}\n` +
        "If you made changes to your plasmic configuration, please delete this directory."
    );
  });
  await fs.mkdir(plasmicDir, { recursive: true });
  await fs.writeFile(savedConfigPath, currentConfig);
}

function readLoaderConfig(configPath: string): Promise<PlasmicLoaderConfig> {
  return fs
    .readFile(configPath)
    .then((file) => JSON.parse(file.toString()))
    .catch((error) => {
      if (error.code === "ENOENT") {
        return {};
      }
      throw error;
    });
}

export async function convertOptsToLoaderConfig(
  userOpts: Partial<PlasmicOpts>,
  defaultOpts: PlasmicOpts
): Promise<PlasmicLoaderConfig> {
  await PlasmicOptsSchema.validateAsync({ ...defaultOpts, ...userOpts }).catch(
    (error) => logger.crash(error.message)
  );

  const configPath = path.join(
    userOpts.dir || defaultOpts.dir,
    "plasmic-loader.json"
  );
  const currentConfig: Partial<PlasmicLoaderConfig> = await readLoaderConfig(
    configPath
  );
  const currentProjects = Object.fromEntries(
    (currentConfig.projects || []).map((project) => [
      project.projectId,
      project,
    ])
  );

  // Assigning all the user-assigned props, except projects (since the signature is different)
  // We'll handle projects below.
  Object.assign(currentConfig, { ...userOpts, projects: [] });

  userOpts.projects
    ?.filter((projectId) => !currentProjects[projectId])
    .forEach((projectId) => (currentProjects[projectId] = { projectId }));

  currentConfig.projects = Object.values(currentProjects);
  currentConfig.aboutThisFile = ""; // Will be defined below.

  // Save user configuration.
  await fs.writeFile(
    configPath,
    // Sorting trick to have "aboutThisFile" be the first key.
    JSON.stringify(
      { aboutThisFile: ABOUT_PAGE_URL, ...currentConfig },
      undefined,
      2
    )
  );

  // Now create a new configuration, including defaults.

  const config: PlasmicLoaderConfig = {
    aboutThisFile: currentConfig.aboutThisFile,
    projects: currentConfig.projects,
    watch: currentConfig.watch || defaultOpts.watch,
    dir: userOpts.dir || currentConfig.dir || defaultOpts.dir,
    plasmicDir:
      userOpts.plasmicDir || currentConfig.plasmicDir || defaultOpts.plasmicDir,
    pageDir: userOpts.pageDir || currentConfig.pageDir || defaultOpts.pageDir,
    initArgs: {
      ...(defaultOpts.initArgs || {}),
      ...(currentConfig.initArgs || {}),
      ...(userOpts.initArgs || {}),
    },
    substitutions:
      userOpts.substitutions ||
      currentConfig.substitutions ||
      defaultOpts.substitutions,
  };

  // Check if the user opts are up to date
  await ensurePlasmicIsNotStale(config.plasmicDir, userOpts);

  return config;
}

export async function initLoader(config: PlasmicLoaderConfig) {
  await initSentry(config);
  const { dir, pageDir, projects, plasmicDir, initArgs = {} } = config;

  logger.info("Checking that your loader version is up to date.");
  await cli.ensureRequiredLoaderVersion();
  const projectIds = config.projects.map(({ projectId }) => projectId);
  logger.info(`Syncing plasmic projects: ${projectIds.join(", ")}`);

  await cli.tryInitializePlasmicDir(plasmicDir, initArgs);
  await cli.syncProject(plasmicDir, dir, projectIds);

  if (config.substitutions) {
    logger.info("Registering substitutions...");
    const cliConfig = await cli.readConfig(plasmicDir);
    substitutions.registerSubstitutions(
      plasmicDir,
      cliConfig,
      config.substitutions
    );
    await cli.saveConfig(plasmicDir, cliConfig);
    await cli.fixImports(plasmicDir);
  }

  logger.info("Generating loader...");

  await gen.generateAll({ dir: plasmicDir, pageDir });
}

export async function onPostInit(
  config: PlasmicLoaderConfig,
  watch: boolean,
  onRegisterPages?: onRegisterPages
) {
  if (onRegisterPages) {
    const userConfig = await cli.readConfig(config.plasmicDir);
    await onRegisterPages(
      cli.getPagesFromConfig(config.plasmicDir, userConfig),
      config
    ).catch((e) => logger.crash(e.message, e));
  }
  if (watch) {
    await watchForChanges(config, onRegisterPages);
  }
}

export async function maybeAddToGitIgnore(gitIgnorePath: string, name: string) {
  const file = await fs
    .readFile(gitIgnorePath)
    .then((content) => content.toString())
    .catch(async (error) => {
      if (error.code === "ENOENT") {
        logger.warn(
          ".gitignore not found. Plasmic loader creates multiple files that are not meant to be checked into your repository. To silence this warning, please add a .gitignore."
        );
        return;
      }
      // For other errors, capture them but do not crash the process.
      await captureException(error);
      logger.warn(
        `Found error while trying to read .gitignore:\n\n ${error.message}\n\nPlease add "${name}" to your .gitignore.`
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
