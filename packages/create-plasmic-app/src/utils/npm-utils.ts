/*eslint
@typescript-eslint/no-var-requires: 0,
*/
import * as execa from "execa";
import { promises as fs } from "fs";
import path from "path";
import * as semver from "semver";
import updateNotifier from "update-notifier";
import { PackageManagerType } from "./types";

/**
 * Call this to check if there's an update available
 * and display to the user
 * @returns version
 */
export function updateNotify(): string {
  const pkg = require("../../package.json");
  const notifier = updateNotifier({
    pkg,
    updateCheckInterval: 1000 * 60 * 60, // Check once an hour
  });
  notifier.notify();
  return pkg.version;
}

/**
 * Call this to check if we match the engine policy
 */
export function checkEngineStrict(): boolean {
  const pkg = require("../../package.json");
  const minNodeVersion = pkg?.engines?.node;
  if (!!minNodeVersion && !semver.satisfies(process.version, minNodeVersion)) {
    console.error(`create-plasmic-app only works on Node ${minNodeVersion}`);
    return false;
  }
  return true;
}

/**
 * Run a command on the shell synchronously
 * @param cmd
 * @param workingDir
 * @returns boolean - true if success, false if fail
 */
export async function spawn(
  cmd: string,
  workingDir?: string
): Promise<boolean> {
  console.log(cmd);
  const cp = await execa.command(cmd, {
    shell: true,
    stdio: "inherit",
    cwd: workingDir,
  });
  return cp.exitCode === 0;
}

interface InstallOpts {
  global?: boolean;
  dev?: boolean;
  workingDir?: string;
  packageManager: PackageManagerType;
}

/**
 * Install a package using either `npm` or `yarn`
 * @param pkg - package name
 * @param opts
 * @returns
 */
export async function installUpgrade(
  pkg: string,
  opts: InstallOpts
): Promise<boolean> {
  const cmd = installCommand(pkg, opts);
  const r = await spawn(cmd, opts.workingDir);
  if (r) {
    console.log(`Successfully added ${pkg} dependency.`);
    return true;
  } else {
    console.warn(
      `Cannot add ${pkg} to your project dependencies. Please add it manually.`
    );
    return false;
  }
}

/**
 * Generate the installation command string for an npm package
 * @param pkg
 * @param opts
 * @returns
 */
function installCommand(pkg: string, opts: InstallOpts): string {
  const mgr = opts.packageManager;
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
      return `npm install -g ${pkg}`;
    } else if (opts.dev) {
      return `yarn add -D ${pkg}`;
    } else {
      return `yarn add ${pkg}`;
    }
  } else if (mgr === "pnpm") {
    if (opts.global) {
      return `pnpm add -g ${pkg}`;
    } else if (opts.dev) {
      return `pnpm add --save-dev --ignore-scripts ${pkg}`;
    } else {
      return `pnpm add --ignore-scripts ${pkg}`;
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

/**
 * The package manager to install with: the one requested, else the one we were run
 * with. `npx` overwrites npm_config_user_agent, so this must be read before spawning
 * nested create commands.
 */
export function resolvePackageManager(
  requested?: PackageManagerType
): PackageManagerType {
  if (requested) {
    return requested === "yarn"
      ? yarnVariant(installedYarnVersion())
      : requested;
  }
  const [name, version] = (process.env.npm_config_user_agent ?? "")
    .split(" ")[0]
    .split("/");
  if (name === "yarn") {
    return yarnVariant(version);
  }
  return name === "pnpm" ? "pnpm" : "npm";
}

function yarnVariant(version: string | undefined): PackageManagerType {
  const parsed = version ? semver.coerce(version) : null;
  return parsed && parsed.major >= 2 ? "yarn2" : "yarn";
}

function installedYarnVersion(): string | undefined {
  try {
    return execa.commandSync("yarn --version").stdout.trim();
  } catch {
    return undefined;
  }
}

/** Scaffolders and run scripts only know the `yarn` command. */
export function packageManagerCommand(
  mgr: PackageManagerType
): "npm" | "yarn" | "pnpm" {
  return mgr === "yarn2" ? "yarn" : mgr;
}

/** Run a locally installed bin. `npx` can't see Yarn Berry's PnP installs. */
export function packageManagerExec(mgr: PackageManagerType): string {
  const cmd = packageManagerCommand(mgr);
  return cmd === "yarn" ? "yarn" : cmd === "pnpm" ? "pnpm exec" : "npx";
}

/**
 * Make a freshly scaffolded app its own Yarn Berry project. Without a lockfile Berry
 * claims the app for the nearest ancestor project, and its default PnP linker can't
 * load CommonJS from Node 24's ESM resolver (EBADF), which breaks every framework we
 * scaffold. Must run before anything invokes yarn in `projectPath`.
 */
export async function initYarnBerryProject(projectPath: string): Promise<void> {
  await fs.writeFile(path.join(projectPath, "yarn.lock"), "");
  await fs.writeFile(
    path.join(projectPath, ".yarnrc.yml"),
    "nodeLinker: node-modules\n"
  );
}
