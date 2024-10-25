import { execSync, spawnSync } from "child_process";
import findupSync from "findup-sync";
import path from "path";
import semver from "semver";
import { logger } from "../deps";
import { PlasmicConfig } from "./config-utils";
import { findFile, readFileText } from "./file-utils";

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

export function findInstalledVersion(
  config: PlasmicConfig,
  baseDir: string,
  pkg: string
): string | undefined {
  const pm = detectPackageManager(config, baseDir);
  try {
    if (pm === "yarn2") {
      const output = execSync(`yarn info --json ${pkg}`).toString().trim();
      const info = JSON.parse(output);
      return info?.children?.Version;
    } else if (pm === "yarn") {
      const output = execSync(`yarn list --json --pattern ${pkg}`)
        .toString()
        .trim()
        .split("\n");
      for (const line of output) {
        const info = JSON.parse(line);
        if (
          info?.type === "tree" &&
          info?.data?.trees?.[0]?.name?.startsWith(`${pkg}@`)
        ) {
          return info.data.trees[0].name.replace(`${pkg}@`, "");
        }
      }
    } else if (pm === "npm") {
      const output = execSync(`npm list --package-lock-only --json ${pkg}`)
        .toString()
        .trim();
      const info = JSON.parse(output);
      return info?.dependencies?.[pkg]?.version;
    } else if (pm === "pnpm") {
      const output = execSync(`pnpm list --json ${pkg}`).toString().trim();
      const info = JSON.parse(output);
      return (
        info?.dependencies?.[pkg]?.version ||
        info?.[0]?.dependencies?.[pkg]?.version
      );
    } else {
      // Unknown package manager (e.g. pnpm).
      const output = execSync(`npm list --json ${pkg}`).toString().trim();
      const info = JSON.parse(output);
      return info?.dependencies?.[pkg]?.version;
    }
  } catch (err) {
    logger.warn(
      `Could not detect installed version of ${pkg} using ${pm}: ${err}`
    );
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

function parsePackageJson(path: string) {
  try {
    return JSON.parse(readFileText(path));
  } catch (e) {
    return undefined;
  }
}

export function installUpgrade(
  config: PlasmicConfig,
  pkg: string,
  baseDir: string,
  opts: { global?: boolean; dev?: boolean } = {}
) {
  const cmd = installCommand(config, pkg, baseDir, opts);
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
  config: PlasmicConfig,
  pkg: string,
  baseDir: string,
  opts: { global?: boolean; dev?: boolean } = {}
) {
  const mgr = detectPackageManager(config, baseDir);
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
  } else if (mgr === "pnpm") {
    if (opts.global) {
      return `pnpm install -g ${pkg}`;
    } else if (opts.dev) {
      return `pnpm install --dev --ignore-scripts ${pkg}`;
    } else {
      return `pnpm install --ignore-scripts ${pkg}`;
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

export function detectPackageManager(config: PlasmicConfig, baseDir: string) {
  if (config.packageManager) {
    return config.packageManager;
  }
  const yarnLock = findupSync("yarn.lock", { cwd: baseDir });
  if (yarnLock) {
    const yarnVersion = execSync(`yarn --version`).toString().trim();
    if (semver.gte(yarnVersion, "2.0.0")) {
      return "yarn2";
    } else {
      return "yarn";
    }
  }
  const pnpmLock = findupSync("pnpm-lock.yaml", { cwd: baseDir });
  if (pnpmLock) {
    return "pnpm";
  }

  const npmLock = findupSync("package-lock.json", { cwd: baseDir });
  if (npmLock) {
    return "npm";
  }

  return "unknown";
}
