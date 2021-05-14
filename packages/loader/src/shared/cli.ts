import execa from "execa";
import { promises as fs } from "fs";
import path from "upath";
import * as api from "./api";
import * as config from "./config";
import * as logger from "./logger";
import { setMetadata } from "./metadata";
import * as semver from "./semver";
import { captureException, setUser } from "./sentry";
import type { PlasmicOpts } from "./types";
import { toCamelCase } from "./utils";

Object.assign(process.env, {
  QUIET: "1",
  PLASMIC_LOADER: "1",
  npm_config_yes: "1",
});

export function getEnv() {
  return {
    QUIET: "1",
    ...process.env,
    PLASMIC_LOADER: "1",
    npm_config_yes: "1",
    NODE_OPTIONS: process.env.LOADER_CLI_NODE_OPTIONS,
  };
}

async function runCommand(
  command: string,
  opts: { dir?: string; hideOutput?: boolean } = {}
) {
  if (!opts.dir) opts.dir = process.cwd();
  if (!opts.hideOutput) opts.hideOutput = false;
  const [file, ...args] = command.split(" ");
  return execa(file, args, {
    cwd: opts.dir,
    env: getEnv(),
    stdio: opts.hideOutput ? "pipe" : "inherit",
  });
}

function objToExecArgs(obj: object) {
  return Object.entries(obj)
    .map(
      ([param, value]) =>
        `--${param}=${Array.isArray(value) ? value.join(",") : value}`
    )
    .join(" ");
}

export function getCurrentUser(plasmicDir: string) {
  const userCli = require(path.join(
    plasmicDir,
    "node_modules",
    "@plasmicapp",
    "cli",
    "dist",
    "lib.js"
  ));
  try {
    return userCli.auth({ email: true });
  } catch (error) {
    const hasInvalidCredentials = error.message?.includes(
      "authentication credentials"
    );

    if (!hasInvalidCredentials) {
      captureException(error);
    }

    return "";
  }
}

export async function ensureRequiredLoaderVersion() {
  const requiredVersions = await api.getRequiredPackages().catch((error) => {
    let message = `Unable to verify loader version. Error: ${error.message}.`;
    if (error.response) {
      message += `\n\n${error.response.data}`;
    }
    throw new Error(message);
  });
  const version = config.packageJson.version;

  if (semver.gt(requiredVersions["@plasmicapp/loader"], version)) {
    logger.crash(
      "A newer version of @plasmicapp/loader is required. Please upgrade your current version and try again."
    );
  }
}

async function installPackages(plasmicDir: string) {
  await fs.writeFile(
    path.join(plasmicDir, "package.json"),
    `{
  "name":"plasmic-loader",
  "version":"0.0.1",
  "dependencies": {
    "@plasmicapp/react-web": "latest",
    "@plasmicapp/cli": "latest"
  }
}`
  );
  if (process.env.DO_YALC_ADD_CLI) {
    await runCommand("yalc add @plasmicapp/cli", {
      dir: plasmicDir,
      hideOutput: true,
    });
  }
  if (!process.env.NO_INSTALL) {
    await runCommand("npm update --no-package-lock --legacy-peer-deps", {
      dir: plasmicDir,
    });
  }
}

export async function tryInitializePlasmicDir(
  plasmicDir: string,
  initArgs: PlasmicOpts["initArgs"] = {}
) {
  await fs.mkdir(plasmicDir, { recursive: true });
  await installPackages(plasmicDir);
  const currentUser = await getCurrentUser(plasmicDir);

  if (currentUser) {
    setUser(currentUser);
  }

  const configPath = path.join(plasmicDir, "plasmic.json");
  const userCli = require(path.join(
    plasmicDir,
    "node_modules",
    "@plasmicapp",
    "cli",
    "dist",
    "lib.js"
  ));

  try {
    await fs.access(configPath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
    await userCli.initPlasmic({
      ...Object.fromEntries(
        Object.keys(initArgs).map((key) => [toCamelCase(key), initArgs[key]])
      ),
      enableSkipAuth: true,
      yes: true,
    });
  }
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

export async function fixImports(dir: string) {
  const userCli = require(path.join(
    dir,
    "node_modules",
    "@plasmicapp",
    "cli",
    "dist",
    "lib.js"
  ));

  return userCli.fixImports({ yes: true });
}

function getPageUrl(path: string) {
  // Convert a page path (like pages/my-page.tsx or ../pages/index.jsx) into their
  // corresponding path (/my-page).
  let [_, url] = path.split(/pages(.*)\..*$/);

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
  userDir: string,
  projects: string[]
) {
  setMetadata({
    source: "loader",
    scheme: "loader",
  });
  const userCli = require(path.join(
    dir,
    "node_modules",
    "@plasmicapp",
    "cli",
    "dist",
    "lib.js"
  ));

  return userCli.sync({
    yes: true,
    loaderConfig: path.join(userDir, "plasmic-loader.json"),
    projects,
  });
}
