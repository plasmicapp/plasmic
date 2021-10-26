import { execSync, spawnSync } from "child_process";
import glob from "fast-glob";
import findupSync from "findup-sync";
import latest from "latest-version";
import path from "path";
import semver from "semver";
import { logger } from "../deps";
import { PlasmicContext } from "./config-utils";
import { findFile, readFileText } from "./file-utils";
import { confirmWithUser } from "./user-utils";

export function getParsedCliPackageJson() {
  const packageJson = findupSync("package.json", { cwd: __dirname });
  if (!packageJson) {
    throw new Error(`Cannot find package.json in ancestors of ${__dirname}`);
  }
  return parsePackageJson(packageJson);
}

export function getCliVersion() {
  const j = getParsedCliPackageJson();
  return j.version as string;
}

/**
 * Call this to check if we match the engine policy
 */
export function checkEngineStrict(): boolean {
  const pkg = getParsedCliPackageJson();
  const minNodeVersion = pkg?.engines?.node;
  if (!!minNodeVersion && !semver.satisfies(process.version, minNodeVersion)) {
    logger.warn(`Plasmic only works on Node ${minNodeVersion}`);
    return false;
  }
  return true;
}

export function getParsedPackageJson() {
  const packageJson = findupSync("package.json");
  if (!packageJson) {
    throw new Error(`Cannot find package.json`);
  }
  return parsePackageJson(packageJson);
}

// @TODO: is this function still used?
export async function warnLatest(
  context: PlasmicContext,
  pkg: string,
  baseDir: string,
  msgs: {
    requiredMsg: () => string;
    updateMsg: (curVersion: string, latestVersion: string) => string;
  },
  yes?: boolean
) {
  const check = await checkVersion(context, baseDir, pkg);
  if (check.type === "up-to-date") {
    return;
  } else if (check.type === "wrong-npm-registry") {
    logger.warn(
      `${msgs.requiredMsg()} Unable to find this package in your npm registry. Please update this dependency manually.`
    );
    return;
  }

  if (
    await confirmWithUser(
      `${
        check.type === "not-installed"
          ? msgs.requiredMsg()
          : msgs.updateMsg(check.current, check.latest)
      }  Do you want to ${
        check.type === "not-installed" ? "add" : "update"
      } it now?`,
      yes
    )
  ) {
    installUpgrade(pkg, baseDir);
  }
}

async function checkVersion(
  context: PlasmicContext,
  baseDir: string,
  pkg: string
) {
  // Try to get the latest version from npm
  let last = null;
  try {
    last = await latest(pkg);
  } catch (e) {
    // This is likely because .npmrc is set to a different registry
    return { type: "wrong-npm-registry" } as const;
  }

  const cur = findInstalledVersion(context, baseDir, pkg);
  if (!cur) {
    return { type: "not-installed" } as const;
  }
  if (semver.gt(last, cur)) {
    return {
      type: "obsolete",
      latest: last,
      current: cur,
    } as const;
  }
  return { type: "up-to-date" } as const;
}

export function findInstalledVersion(
  context: PlasmicContext,
  baseDir: string,
  pkg: string
) {
  const pm = detectPackageManager(baseDir);
  if (pm === "yarn2") {
    try {
      const pkgInfo = JSON.parse(
        execSync(`yarn info --json ${pkg}`).toString().trim()
      );
      return pkgInfo?.children?.Version;
    } catch (_) {
      return undefined;
    }
  }

  const filename = findInstalledPackageJsonFile(context, pkg);
  if (filename) {
    const json = parsePackageJson(filename);
    if (json && json.name === pkg) {
      return json.version as string;
    }
  }
  return undefined;
}

/**
 * Detects if the cli is globally installed.  `rootDir` is the folder
 * where plasmic.json is
 */
export function isCliGloballyInstalled(rootDir: string) {
  const packageJsonFile = findPackageJsonPath(rootDir);
  if (!packageJsonFile) {
    // We assume global, as instructions state global and we can't really
    // do better
    return true;
  }
  const installedDir = __dirname;

  // Else, we assume it is local if the installedDir is a subfolder of
  // the root project dir
  return !installedDir.startsWith(path.dirname(packageJsonFile));
}

function findPackageJsonPath(dir: string) {
  return findFile(dir, (f) => f === "package.json", {
    traverseParents: true,
  });
}

export function findPackageJsonDir(rootDir: string) {
  const filePath = findPackageJsonPath(rootDir);
  return filePath ? path.dirname(filePath) : undefined;
}

function findInstalledPackageJsonFile(context: PlasmicContext, pkg: string) {
  const packageJsonPath = findPackageJsonPath(context.rootDir);
  const rootDir = packageJsonPath
    ? path.dirname(packageJsonPath)
    : context.rootDir;
  const files = glob.sync(`${rootDir}/**/node_modules/${pkg}/package.json`);
  return files.length > 0 ? files[0] : undefined;
}

function parsePackageJson(path: string) {
  try {
    return JSON.parse(readFileText(path));
  } catch (e) {
    return undefined;
  }
}

export function installUpgrade(
  pkg: string,
  baseDir: string,
  opts: { global?: boolean; dev?: boolean } = {}
) {
  const cmd = installCommand(pkg, baseDir, opts);
  if (!process.env.QUIET) {
    logger.info(cmd);
  }
  const r = spawnSync(cmd, {
    shell: true,
    stdio: process.env.QUIET ? "ignore" : "inherit",
    cwd: baseDir,
  });
  if (r.status === 0) {
    if (!process.env.QUIET) {
      logger.info(`Successfully added ${pkg} dependency.`);
    }
    return true;
  } else {
    logger.warn(
      `Cannot add ${pkg} to your project dependencies. Please add it manually.`
    );
    return false;
  }
}

export function installCommand(
  pkg: string,
  baseDir: string,
  opts: { global?: boolean; dev?: boolean } = {}
) {
  const mgr = detectPackageManager(baseDir);
  if (mgr === "yarn") {
    if (opts.global) {
      return `yarn global add ${pkg}`;
    } else if (opts.dev) {
      return `yarn add --dev --ignore-scripts -W ${pkg}`;
    } else {
      return `yarn add --ignore-scripts -W ${pkg}`;
    }
  } else if (mgr === "yarn2") {
    if (opts.global) {
      // yarn2 does not support global.
      return `npm install -g ${pkg}`;
    } else if (opts.dev) {
      return `yarn add -D ${pkg}`;
    } else {
      return `yarn add ${pkg}`;
    }
  } else {
    if (opts.global) {
      return `npm install -g ${pkg}`;
    } else if (opts.dev) {
      return `npm install --save-dev --ignore-scripts ${pkg}`;
    } else {
      return `npm install --ignore-scripts ${pkg}`;
    }
  }
}

export function detectPackageManager(baseDir: string) {
  const yarnLock = findupSync("yarn.lock", { cwd: baseDir });
  if (yarnLock) {
    const yarnVersion = execSync(`yarn --version`).toString().trim();
    return semver.gte(yarnVersion, "2.0.0") ? "yarn2" : "yarn";
  }

  return "npm";
}
