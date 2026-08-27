#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const stateFileName = ".plasmic-local-link.json";

function usage() {
  console.error(`Usage:
  pnpm local-link:setup <package-name> <consumer-project>
  pnpm local-link:build <package-name>
  pnpm local-link:teardown <consumer-project>

The consumer must use pnpm 11 or newer. Pass its workspace root when it is
part of a pnpm workspace.`);
}

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function run(command, args, options = {}) {
  const { cwd = repoRoot, capture = false } = options;
  const result = spawnSync(command, args, {
    cwd,
    encoding: capture ? "utf8" : undefined,
    stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
  });

  if (result.error) {
    fail(`Could not run ${command}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    fail(`${command} ${args.join(" ")} exited with status ${result.status}`);
  }

  return capture ? result.stdout.trim() : "";
}

function runPnpm(args, options = {}) {
  return run("pnpm", args, options);
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, "utf8"));
}

function writeJson(filename, value) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const temporary = `${filename}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(temporary, filename);
}

function workspacePackages() {
  const listed = JSON.parse(
    runPnpm(["list", "-r", "--depth", "-1", "--json"], {
      capture: true,
    })
  );
  return new Map(
    listed
      .filter((pkg) => pkg.name && pkg.path !== repoRoot)
      .map((pkg) => [pkg.name, pkg])
  );
}

function productionClosure(packageName) {
  const packages = workspacePackages();
  if (!packages.has(packageName)) {
    fail(`No workspace package named ${packageName} was found`);
  }

  const found = new Map();
  const pending = [packageName];
  while (pending.length > 0) {
    const name = pending.pop();
    if (found.has(name)) {
      continue;
    }

    const workspacePackage = packages.get(name);
    found.set(name, workspacePackage);
    const manifest = readJson(path.join(workspacePackage.path, "package.json"));
    const dependencies = {
      ...manifest.dependencies,
      ...manifest.optionalDependencies,
    };
    for (const dependencyName of Object.keys(dependencies)) {
      if (packages.has(dependencyName)) {
        pending.push(dependencyName);
      }
    }
  }

  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function build(packageName) {
  // Match local-publish: pnpm builds the selected package's dependency graph
  // topologically and skips workspace packages without a build script.
  runPnpm(["--filter", `${packageName}...`, "run", "build"]);
}

function containingWorkspaceRoot(start) {
  let current = start;
  while (true) {
    if (fs.existsSync(path.join(current, "pnpm-workspace.yaml"))) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return undefined;
    }
    current = parent;
  }
}

function consumerRoot(input) {
  const root = path.resolve(input);
  const manifestPath = path.join(root, "package.json");
  if (!fs.existsSync(manifestPath)) {
    fail(`${root} does not contain a package.json`);
  }

  const workspaceRoot = containingWorkspaceRoot(root);
  if (
    workspaceRoot &&
    fs.realpathSync(workspaceRoot) !== fs.realpathSync(root)
  ) {
    fail(
      `${root} belongs to the pnpm workspace at ${workspaceRoot}; pass that workspace root instead`
    );
  }
  if (fs.realpathSync(root) === fs.realpathSync(repoRoot)) {
    fail("The consumer project must be outside this monorepo");
  }

  const declaredPackageManager = readJson(manifestPath).packageManager;
  if (declaredPackageManager) {
    const match = /^pnpm@(\d+)(?:\.|$)/.exec(declaredPackageManager);
    if (!match || Number.parseInt(match[1], 10) < 11) {
      fail(
        `${root} declares ${declaredPackageManager}; local file overrides require pnpm 11 or newer`
      );
    }
  }

  const pnpmVersion = runPnpm(["--version"], { cwd: root, capture: true });
  const major = Number.parseInt(pnpmVersion.split(".")[0], 10);
  if (!Number.isFinite(major) || major < 11) {
    fail(
      `The consumer resolved pnpm ${pnpmVersion}; local file overrides require pnpm 11 or newer`
    );
  }

  return root;
}

function statePath(root) {
  return path.join(root, "node_modules", stateFileName);
}

function getOverrides(root) {
  const output = runPnpm(
    ["config", "get", "--json", "overrides", "--location=project"],
    {
      cwd: root,
      capture: true,
    }
  );
  if (!output) {
    return {};
  }

  const overrides = JSON.parse(output);
  if (!overrides || Array.isArray(overrides) || typeof overrides !== "object") {
    fail(`Expected overrides in ${root}/pnpm-workspace.yaml to be a map`);
  }
  return overrides;
}

function setOverrides(root, overrides) {
  const names = Object.keys(overrides);
  if (names.length === 0) {
    runPnpm(["config", "delete", "overrides", "--location=project"], {
      cwd: root,
    });
    return;
  }

  const sorted = Object.fromEntries(
    names.sort().map((name) => [name, overrides[name]])
  );
  runPnpm(
    [
      "config",
      "set",
      "overrides",
      JSON.stringify(sorted),
      "--json",
      "--location=project",
    ],
    { cwd: root }
  );
}

function install(root) {
  runPnpm(["install", "--no-frozen-lockfile"], { cwd: root });
}

function setup(packageName, consumerInput) {
  const closure = productionClosure(packageName);
  const root = consumerRoot(consumerInput);
  const filename = statePath(root);
  if (fs.existsSync(filename)) {
    const existing = readJson(filename);
    fail(
      `${root} already has an active local-link session for ${existing.packageName}; run teardown first`
    );
  }

  console.log(
    `Building ${packageName} and using local files for this production workspace closure:\n${closure
      .map((pkg) => `  ${pkg.name}`)
      .join("\n")}`
  );
  build(packageName);

  const originalOverrides = getOverrides(root);
  const managedOverrides = Object.fromEntries(
    closure.map((pkg) => [pkg.name, `file:${pkg.path}`])
  );
  const previousOverrides = Object.fromEntries(
    Object.keys(managedOverrides).map((name) => [
      name,
      Object.hasOwn(originalOverrides, name)
        ? { exists: true, value: originalOverrides[name] }
        : { exists: false },
    ])
  );
  const state = {
    version: 1,
    phase: "setting-up",
    packageName,
    repoRoot,
    consumerRoot: root,
    managedOverrides,
    previousOverrides,
  };
  writeJson(filename, state);

  setOverrides(root, { ...originalOverrides, ...managedOverrides });
  state.phase = "linked";
  writeJson(filename, state);
  install(root);

  console.log(
    `\n${packageName} is now consumed from this checkout by ${root}.`
  );
  console.log(`After editing, run: pnpm local-link:build ${packageName}`);
  console.log(`When finished, run: pnpm local-link:teardown ${root}`);
}

function teardown(consumerInput) {
  const root = consumerRoot(consumerInput);
  const filename = statePath(root);
  if (!fs.existsSync(filename)) {
    fail(`No local-link state was found for ${root}`);
  }

  const state = readJson(filename);
  if (state.version !== 1 || state.consumerRoot !== root) {
    fail(`The local-link state in ${filename} is invalid`);
  }

  if (state.phase !== "restored") {
    const currentOverrides = getOverrides(root);
    const restoredOverrides = { ...currentOverrides };
    const conflicts = [];

    for (const [name, localValue] of Object.entries(state.managedOverrides)) {
      const previous = state.previousOverrides[name];
      const hasCurrent = Object.hasOwn(currentOverrides, name);
      const currentValue = currentOverrides[name];
      const alreadyRestored = previous.exists
        ? hasCurrent && currentValue === previous.value
        : !hasCurrent;

      if (alreadyRestored) {
        continue;
      }
      if (!hasCurrent || currentValue !== localValue) {
        conflicts.push(name);
        continue;
      }

      if (previous.exists) {
        restoredOverrides[name] = previous.value;
      } else {
        delete restoredOverrides[name];
      }
    }

    if (conflicts.length > 0) {
      fail(
        `Refusing to overwrite overrides changed during local consumption: ${conflicts.join(
          ", "
        )}`
      );
    }

    setOverrides(root, restoredOverrides);
    state.phase = "restored";
    writeJson(filename, state);
  }

  install(root);
  fs.rmSync(filename);
  console.log(`Restored registry dependencies in ${root}.`);
}

const [command, ...args] = process.argv.slice(2);
if (command === "setup" && args.length === 2) {
  setup(args[0], args[1]);
} else if (command === "build" && args.length === 1) {
  productionClosure(args[0]);
  build(args[0]);
} else if (command === "teardown" && args.length === 1) {
  teardown(args[0]);
} else {
  usage();
  process.exit(1);
}
