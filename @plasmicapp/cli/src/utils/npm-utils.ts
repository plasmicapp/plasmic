import fs from "fs";
import glob from "fast-glob";
import semver from "semver";
import latest from "latest-version";
import { findFile } from "./file-utils";
import { PlasmicContext } from "./config-utils";
import { execSync, spawnSync } from "child_process";
import inquirer from "inquirer";
import findupSync from "findup-sync";
import { logger } from "../deps";

export function getCliVersion() {
  const packageJson = findupSync("package.json", { cwd: __dirname });
  if (!packageJson) {
    throw new Error(`Cannot find package.json in ancestors of ${__dirname}`);
  }
  const j = parsePackageJson(packageJson);
  return j.version as string;
}

export async function warnLatestReactWeb(context: PlasmicContext) {
  await warnLatest(context, "@plasmicapp/react-web", {
    requiredMsg: () =>
      "@plasmicapp/react-web is required to use Plasmic-generated code.",
    updateMsg: (c, v) =>
      `A more recent version of @plasmicapp/react-web [${v}] is available; your exported code may not work unless you update`
  });
}

export async function warnLatest(
  context: PlasmicContext,
  pkg: string,
  msgs: {
    requiredMsg: () => string;
    updateMsg: (curVersion: string, latestVersion: string) => string;
  }
) {
  const check = await checkVersion(context, pkg);
  if (check.type === "up-to-date") {
    return;
  }
  const res = await inquirer.prompt([
    {
      name: "install",
      message: `${
        check.type === "not-installed"
          ? msgs.requiredMsg()
          : msgs.updateMsg(check.current, check.latest)
      }  Do you want to ${
        check.type === "not-installed" ? "add" : "update"
      } it now? (yes/no)`,
      default: "yes"
    }
  ]);
  if (res.install === "yes") {
    installUpgrade(pkg);
  }
}

async function checkVersion(context: PlasmicContext, pkg: string) {
  const last = await latest(pkg);
  const cur = findInstalledVersion(context, pkg);
  if (!cur) {
    return { type: "not-installed" } as const;
  }
  if (semver.gt(last, cur)) {
    return {
      type: "obsolete",
      latest: last,
      current: cur
    } as const;
  }
  return { type: "up-to-date" } as const;
}

export function findInstalledVersion(context: PlasmicContext, pkg: string) {
  const filename = findInstalledPackageJsonFile(pkg, context.rootDir);
  if (filename) {
    const json = parsePackageJson(filename);
    if (json && json.name === pkg) {
      return json.version as string;
    }
  }
  return undefined;
}

function findInstalledPackageJsonFile(pkg: string, dir: string) {
  const files = glob.sync(`${dir}/**/node_modules/${pkg}/package.json`);
  return files.length > 0 ? files[0] : undefined;
}

function parsePackageJson(path: string) {
  try {
    return JSON.parse(fs.readFileSync(path).toString());
  } catch (e) {
    return undefined;
  }
}

export function installUpgrade(pkg: string) {
  const mgr = detectPackageManager();
  const cmd =
    mgr === "yarn" ? `yarn add -W ${pkg}` : `npm install --save ${pkg}`;
  logger.info(cmd);
  const r = spawnSync(cmd, { shell: true, stdio: "inherit" });
  if (r.status === 0) {
    logger.info(`Successfully added ${pkg} dependency.`);
  } else {
    logger.warn(
      `Cannot add ${pkg} to your project dependency. Please add it manually.`
    );
  }
}

export function detectPackageManager() {
  const yarnLock = findupSync("yarn.lock", { cwd: process.cwd() });
  if (yarnLock) {
    return "yarn";
  } else {
    return "npm";
  }
}
