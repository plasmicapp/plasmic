import cp from "child_process";
import fs from "fs/promises";
import path from "upath";
import util from "util";
import * as api from "./api";
import * as logger from "./logger";
import * as semver from "./semver";
import type { PlasmicOpts } from "./types";
import * as utils from "./utils";

const exec = util.promisify(cp.exec);
const execFile = util.promisify(cp.execFile);

function handleExitError(message: string) {
  logger.error(message);
  process.exit(1);
}

async function doOrFail(doit: () => Promise<unknown>, message: string) {
  try {
    await doit();
  } catch (e) {
    handleExitError(message);
  }
}

async function execOrFail(dir: string, command: string, message: string) {
  return doOrFail(
    () =>
      exec(command, {
        cwd: dir,
        env: getEnv(),
      }),
    message
  );
}

async function execFileOrFail(
  dir: string,
  file: string,
  args: string[],
  message: string
) {
  return doOrFail(
    () =>
      execFile(file, args, {
        cwd: dir,
        env: getEnv(),
      }),
    message
  );
}

function getEnv() {
  return {
    ...process.env,
    PLASMIC_LOADER: "1",
    NODE_OPTIONS: process.env.LOADER_CLI_NODE_OPTIONS,
  };
}

/**
 * Spawn lets us see the output. Helpful for debugging.
 */
async function spawnOrFail(
  dir: string,
  file: string,
  args: string[],
  message: string
) {
  const { status } = cp.spawnSync(file, args, {
    cwd: dir,
    env: getEnv(),
    stdio: "inherit",
  });
  if (status !== 0) {
    handleExitError(message);
  }
}

function objToExecArgs(obj: object) {
  return Object.entries(obj).map(
    ([param, value]) =>
      `--${param}=${Array.isArray(value) ? value.join(",") : value}`
  );
}

async function getCurrentLoaderVersion() {
  try {
    const packageJsonPath = path.join(__dirname, "..", "package.json");
    const packageJsonFile = await fs.readFile(packageJsonPath);
    const version: string | undefined = JSON.parse(packageJsonFile.toString())
      .version;
    return utils.ensure(version);
  } catch (e) {
    logger.error(e);
    process.exit(1);
  }
}

export async function ensureRequiredLoaderVersion() {
  const requiredVersions = await api.getRequiredPackages();
  const version = await getCurrentLoaderVersion();

  if (semver.gt(requiredVersions["@plasmicapp/loader"], version)) {
    logger.info(
      "A newer version of @plasmicapp/loader is required. Please upgrade your current version and try again."
    );
    process.exit(1);
  }
}

async function installPackages(plasmicDir: string) {
  await fs.writeFile(
    path.join(plasmicDir, "package.json"),
    `{
  "name":"plasmic-loader",
  "version":"0.0.1",
  "dependencies": {
    "@plasmicapp/cli": "latest",
    "@plasmicapp/react-web": "latest"
  }
}`
  );
  if (process.env.DO_YALC_ADD_CLI) {
    await execOrFail(plasmicDir, "yalc add @plasmicapp/cli", "");
  }
  if (!process.env.NO_INSTALL) {
    await execOrFail(
      plasmicDir,
      "npm install --no-package-lock",
      `Unable to install plasmic dependencies. Please delete ${plasmicDir} and try again.`
    );
  }
}

export async function tryInitializePlasmicDir(
  plasmicDir: string,
  initArgs: PlasmicOpts["initArgs"] = {}
) {
  await fs.mkdir(plasmicDir, { recursive: true });
  await installPackages(plasmicDir);

  const plasmicExecPath = path.join(
    plasmicDir,
    "node_modules",
    ".bin",
    "plasmic"
  );
  const configPath = path.join(plasmicDir, "plasmic.json");

  try {
    await fs.access(configPath);
  } catch {
    await spawnOrFail(
      plasmicDir,
      plasmicExecPath,
      ["init", "--yes=true", ...objToExecArgs(initArgs)],
      "Unable to initialize Plasmic. Please check the above error and try again."
    );
  }
}

export function checkAuth(dir: string, execPath: string) {
  return execOrFail(
    dir,
    `${execPath} auth --check`,
    "Unable to authenticate Plasmic. Please run `plasmic auth` or check your ~/.plasmic.auth file, and try again."
  );
}

export async function readConfig(dir: string) {
  const configPath = path.join(dir, "plasmic.json");
  const configData = await fs.readFile(configPath);
  return JSON.parse(configData.toString());
}

export async function saveConfig(dir: string, config: any) {
  const configPath = path.join(dir, "plasmic.json");
  return fs.writeFile(configPath, JSON.stringify(config, undefined, 2));
}

export async function fixImports(dir: string, plasmicExecPath: string) {
  return execOrFail(
    dir,
    `${plasmicExecPath} fix-imports`,
    `Plasmic was unable to fix the imports for this project. Please delete ${dir} and try again.`
  );
}

function getPageUrl(path: string) {
  // Convert a page path (like pages/my-page.tsx) into their corresponding path (/my-page).
  let [_, url] = path.split(/^pages(.*)\..*$/);

  // Remove the ending "/index" path, which is required for file routing but not for URLs.
  // Examples:
  // /index -> /
  // /index/index -> /index

  if (url.endsWith("index")) {
    url = url.slice(0, -6);
  }
  return url === "" ? "/" : url;
}

export function getPagesFromConfig(plasmicDir: string, config: any) {
  const componentData: {
    name: string;
    projectId: string;
    path: string;
    url: string;
  }[] = [];
  for (const project of config.projects) {
    for (const component of project.components) {
      if (component.componentType !== "page") {
        continue;
      }
      componentData.push({
        name: component.name,
        projectId: project.projectId,
        path: path.join(plasmicDir, component.importSpec.modulePath),
        url: getPageUrl(component.importSpec.modulePath),
      });
    }
  }

  return componentData;
}

export async function syncProject(
  dir: string,
  pageDir: string,
  execPath: string,
  projects: string[]
) {
  return spawnOrFail(
    dir,
    execPath,
    [
      ..."sync --yes --metadata source=loader".split(/ /g),
      "--projects",
      projects.join(" "),
    ],
    "Unable to sync Plasmic project. Please check the above error and try again."
  );
}
