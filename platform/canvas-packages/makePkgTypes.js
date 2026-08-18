/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require("fs");
const path = require("path");
const { createRequire } = require("module");

// For each hostless code library, we provide the TypeScript declaration files
// for the Studio code editor (Monaco) to use. `typedPkgsList` lists the NPM
// packages that need to be typed; we bundle each package's `.d.ts` files and
// `package.json` (plus those of its transitive dependencies) into
// `src/generated-types/<pkgName>.json` as `{ files: [{ fileName, contents }] }`.
//
// Monaco loads each entry as an extra-lib at `file:///<fileName>` (see
// FullCodeEditor.tsx), so `fileName` must be the *logical* module path that
// TypeScript resolves bare imports against, i.e. `./node_modules/<pkg>/...`.
// We therefore resolve each package's real location with `require.resolve`
// (which follows both yarn's flat layout and pnpm's symlinked `.pnpm` store)
// but emit files under `./node_modules/<pkg>/` rather than the physical path.
// When two different versions of the same package are reachable, the first one
// found keeps the flat path and the others are emitted nested under their
// dependent (`./node_modules/<parent>/node_modules/<pkg>/...`), which is
// exactly where TypeScript looks first when resolving from the parent.

// Resolve a package's install directory as seen from `fromDir`. Returns the
// absolute directory that contains its package.json, or null if not found.
const resolvePkgDir = (pkgName, fromDir) => {
  const req = createRequire(path.join(fromDir, "__resolve__.js"));
  try {
    return path.dirname(req.resolve(`${pkgName}/package.json`));
  } catch {
    // Packages with a restrictive "exports" map may not expose package.json.
    // Fall back to resolving the entry point and walking up to the package root.
    try {
      let dir = path.dirname(req.resolve(pkgName));
      while (dir !== path.dirname(dir)) {
        const pkgJsonPath = path.join(dir, "package.json");
        if (
          fs.existsSync(pkgJsonPath) &&
          JSON.parse(fs.readFileSync(pkgJsonPath, "utf8")).name === pkgName
        ) {
          return dir;
        }
        dir = path.dirname(dir);
      }
    } catch {
      // ignore
    }
    return null;
  }
};

// Recursively collect `.d.ts` files under `dir`, skipping the package's own
// nested node_modules.
const collectDtsFiles = (dir) => {
  const out = [];
  const walk = (current) => {
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules") {
          continue;
        }
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith(".d.ts")) {
        out.push(full);
      }
    }
  };
  walk(dir);
  return out;
};

// Collect the `{ fileName, contents }` entries for `rootPkg` and its
// transitive dependencies, resolving packages relative to `baseDir`.
const collectPackageTypes = (rootPkg, baseDir) => {
  const files = [];

  // Logical top-level name -> physical dir emitted at ./node_modules/<name>/.
  // A second physical dir for the same name is a version conflict and gets
  // emitted nested under its dependent instead.
  const topLevelDirByName = new Map();
  // "<prefix>|<dir>" pairs already emitted, so shared deps are emitted once.
  const emitted = new Set();

  const addPackageFiles = (prefix, dir) => {
    for (const dtsFile of collectDtsFiles(dir)) {
      files.push({
        fileName: `${prefix}${path
          .relative(dir, dtsFile)
          .split(path.sep)
          .join("/")}`,
        contents: fs.readFileSync(dtsFile, "utf8"),
      });
    }
    const pkgJsonPath = path.join(dir, "package.json");
    if (fs.existsSync(pkgJsonPath)) {
      files.push({
        fileName: `${prefix}package.json`,
        contents: fs.readFileSync(pkgJsonPath, "utf8"),
      });
    }
  };

  const emitTopLevel = (logicalName, dir) => {
    if (topLevelDirByName.has(logicalName)) {
      return;
    }
    topLevelDirByName.set(logicalName, dir);
    const prefix = `./node_modules/${logicalName}/`;
    emitted.add(`${prefix}|${dir}`);
    addPackageFiles(prefix, dir);
  };

  // `stack` holds the physical dirs on the current dependency chain, so
  // dependency cycles among conflicting versions terminate.
  const dfs = (pkgName, fromDir, parentPrefix, stack) => {
    // A package may ship no declarations of its own; TypeScript then resolves
    // its types from `@types/<pkg>`. Emit both when present. @types packages
    // are typically devDependencies of the workspace root, hence the baseDir
    // fallback.
    const typesPkgName = `@types/${pkgName
      .replace(/^@/, "")
      .replace(/\//g, "__")}`;
    const typesDir =
      resolvePkgDir(typesPkgName, fromDir) ||
      resolvePkgDir(typesPkgName, baseDir);
    if (typesDir) {
      emitTopLevel(typesPkgName, typesDir);
    }

    const pkgDir = resolvePkgDir(pkgName, fromDir);
    if (!pkgDir || stack.has(pkgDir)) {
      return;
    }

    const topDir = topLevelDirByName.get(pkgName);
    let prefix;
    if (topDir === undefined || topDir === pkgDir) {
      topLevelDirByName.set(pkgName, pkgDir);
      prefix = `./node_modules/${pkgName}/`;
    } else {
      prefix = `${parentPrefix}node_modules/${pkgName}/`;
    }
    if (emitted.has(`${prefix}|${pkgDir}`)) {
      return;
    }
    emitted.add(`${prefix}|${pkgDir}`);
    addPackageFiles(prefix, pkgDir);

    // Recurse into the real package's dependencies, resolving them from the
    // package's own directory so we get the version it actually uses.
    const pkgJson = JSON.parse(
      fs.readFileSync(path.join(pkgDir, "package.json"), "utf8")
    );
    const nextStack = new Set(stack);
    nextStack.add(pkgDir);
    for (const dep of Object.keys(pkgJson.dependencies ?? {})) {
      dfs(dep, pkgDir, prefix, nextStack);
    }
  };

  dfs(rootPkg, baseDir, "./", new Set());
  return files;
};

const genTsFiles = () => {
  const typedPkgNames = require("./typedPkgsList.json");
  for (const rootPkg of typedPkgNames) {
    const data = { files: collectPackageTypes(rootPkg, __dirname) };
    fs.mkdirSync(`./src/generated-types/${rootPkg.split("/").slice(0, -1)}`, {
      recursive: true,
    });
    fs.writeFileSync(
      `./src/generated-types/${rootPkg}.json`,
      JSON.stringify(data, undefined, 2)
    );
  }
};

module.exports = { collectPackageTypes, resolvePkgDir, collectDtsFiles };

if (require.main === module) {
  genTsFiles();
}
