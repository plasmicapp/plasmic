import chalk from "chalk";
import cp from "child_process";
import fs from "fs/promises";
import path from "upath";
import util from "util";
import * as api from "./api";
import * as semver from "./semver";
import * as utils from "./utils";
import * as logger from "./logger";
import type { PlasmicOpts } from "./types";

const exec = util.promisify(cp.exec);

async function execOrFail(dir: string, command: string, message: string) {
  try {
    await exec(command, {
      cwd: dir,
      env: { ...process.env, PLASMIC_LOADER: "1" },
    });
  } catch (e) {
    logger.error(chalk.bold(chalk.redBright("Plasmic error: ")) + message);
    process.exit(1);
  }
}

function objToExecArgs(obj: object) {
  return Object.entries(obj)
    .map(
      ([param, value]) =>
        `--${param}=${Array.isArray(value) ? value.join(",") : value}`
    )
    .join(" ");
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
  await execOrFail(
    plasmicDir,
    "npm install --no-package-lock",
    `Unable to install plasmic dependencies. Please delete ${plasmicDir} and try again.`
  );
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
    await execOrFail(
      plasmicDir,
      `${plasmicExecPath} init --yes=true ${objToExecArgs(initArgs)}`,
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
  return execOrFail(
    dir,
    `${execPath} sync --yes --metadata source=loader --projects ${projects.join(
      " "
    )}`,
    "Unable to sync Plasmic project. Please check the above error and try again."
  );
}
