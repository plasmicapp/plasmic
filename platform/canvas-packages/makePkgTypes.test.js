/* eslint-disable @typescript-eslint/no-var-requires */
// Run with: pnpm test (node --test makePkgTypes.test.js)
//
// Verifies that collectPackageTypes emits the same logical
// `./node_modules/<pkg>/...` file set regardless of the physical node_modules
// layout: the flat layout yarn produced (which the pre-pnpm implementation
// walked directly) and the symlinked `.pnpm` store layout pnpm produces.
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { collectPackageTypes } = require("./makePkgTypes");

const writeJson = (file, data) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, undefined, 2));
};

const writeFile = (file, contents) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
};

// The dependency graph used by both fixtures:
//   liba@1 -> libb@^1 (typed), libc@^1 (untyped; @types/libc exists),
//             libd@^1, libe@^1 (restrictive "exports", no package.json export)
//   libd@1 -> libb@^2 (conflicts with liba's libb@1)
const PKGS = {
  liba: {
    version: "1.0.0",
    deps: { libb: "^1.0.0", libc: "^1.0.0", libd: "^1.0.0", libe: "^1.0.0" },
    dts: { "index.d.ts": "export declare const a: number;" },
  },
  "libb@1": {
    name: "libb",
    version: "1.0.0",
    dts: { "index.d.ts": "export declare const b: 1;" },
  },
  "libb@2": {
    name: "libb",
    version: "2.0.0",
    dts: { "index.d.ts": "export declare const b: 2;" },
  },
  libc: { version: "1.0.0", dts: {} },
  "@types/libc": {
    version: "1.0.0",
    dts: { "index.d.ts": "export declare const c: string;" },
  },
  libd: {
    version: "1.0.0",
    deps: { libb: "^2.0.0" },
    dts: { "index.d.ts": "export declare const d: number;" },
  },
  libe: {
    version: "1.0.0",
    exports: { ".": "./dist/index.js" },
    dts: { "dist/index.d.ts": "export declare const e: number;" },
  },
};

const pkgJsonFor = (key) => {
  const spec = PKGS[key];
  const json = {
    name: spec.name ?? key,
    version: spec.version,
    ...(spec.deps ? { dependencies: spec.deps } : {}),
    ...(spec.exports ? { exports: spec.exports, main: "./dist/index.js" } : {}),
  };
  return json;
};

// Writes package `key` at `dir` (its package root).
const writePkg = (dir, key) => {
  writeJson(path.join(dir, "package.json"), pkgJsonFor(key));
  if (PKGS[key].exports) {
    // The entry point must exist for require.resolve's exports-map fallback.
    writeFile(path.join(dir, "dist/index.js"), "module.exports = {};");
  }
  for (const [rel, contents] of Object.entries(PKGS[key].dts)) {
    writeFile(path.join(dir, rel), contents);
  }
};

// What every layout must produce for root package "liba". libb@1 wins the flat
// path (first found via liba); libd's libb@2 must be nested under libd the same
// way the physical conflict was laid out on disk under yarn.
const expectedFiles = () => {
  const entries = {};
  const add = (fileName, contents) => {
    entries[fileName] = contents;
  };
  add("./node_modules/liba/index.d.ts", PKGS.liba.dts["index.d.ts"]);
  add(
    "./node_modules/liba/package.json",
    JSON.stringify(pkgJsonFor("liba"), undefined, 2)
  );
  add("./node_modules/libb/index.d.ts", PKGS["libb@1"].dts["index.d.ts"]);
  add(
    "./node_modules/libb/package.json",
    JSON.stringify(pkgJsonFor("libb@1"), undefined, 2)
  );
  add(
    "./node_modules/@types/libc/index.d.ts",
    PKGS["@types/libc"].dts["index.d.ts"]
  );
  add(
    "./node_modules/@types/libc/package.json",
    JSON.stringify(pkgJsonFor("@types/libc"), undefined, 2)
  );
  // libc ships no .d.ts but its package.json is still emitted.
  add(
    "./node_modules/libc/package.json",
    JSON.stringify(pkgJsonFor("libc"), undefined, 2)
  );
  add("./node_modules/libd/index.d.ts", PKGS.libd.dts["index.d.ts"]);
  add(
    "./node_modules/libd/package.json",
    JSON.stringify(pkgJsonFor("libd"), undefined, 2)
  );
  add(
    "./node_modules/libd/node_modules/libb/index.d.ts",
    PKGS["libb@2"].dts["index.d.ts"]
  );
  add(
    "./node_modules/libd/node_modules/libb/package.json",
    JSON.stringify(pkgJsonFor("libb@2"), undefined, 2)
  );
  add("./node_modules/libe/dist/index.d.ts", PKGS.libe.dts["dist/index.d.ts"]);
  add(
    "./node_modules/libe/package.json",
    JSON.stringify(pkgJsonFor("libe"), undefined, 2)
  );
  return entries;
};

const toMap = (files) => {
  const map = {};
  for (const { fileName, contents } of files) {
    assert.equal(
      map[fileName],
      undefined,
      `duplicate fileName emitted: ${fileName}`
    );
    map[fileName] = contents;
  }
  return map;
};

// Flat layout, as produced by yarn v1: everything hoisted to the top-level
// node_modules, with libd's conflicting libb@2 nested under libd.
const makeYarnLayout = (root) => {
  const nm = path.join(root, "node_modules");
  writeJson(path.join(root, "package.json"), {
    name: "fixture-root",
    version: "1.0.0",
    dependencies: { liba: "^1.0.0" },
  });
  writePkg(path.join(nm, "liba"), "liba");
  writePkg(path.join(nm, "libb"), "libb@1");
  writePkg(path.join(nm, "libc"), "libc");
  writePkg(path.join(nm, "@types/libc"), "@types/libc");
  writePkg(path.join(nm, "libd"), "libd");
  writePkg(path.join(nm, "libd/node_modules/libb"), "libb@2");
  writePkg(path.join(nm, "libe"), "libe");
};

// Symlinked layout, as produced by pnpm: physical packages live under
// node_modules/.pnpm/<pkg>@<version>/node_modules/<pkg>, each package's deps
// are sibling symlinks in its .pnpm dir, and the project's direct deps are
// symlinks in the top-level node_modules.
const makePnpmLayout = (root) => {
  const nm = path.join(root, "node_modules");
  const store = path.join(nm, ".pnpm");
  const physDir = (key) => {
    const name = PKGS[key].name ?? key;
    const id = `${name.replace("/", "+")}@${PKGS[key].version}`;
    return path.join(store, id, "node_modules", name);
  };
  writeJson(path.join(root, "package.json"), {
    name: "fixture-root",
    version: "1.0.0",
    dependencies: { liba: "^1.0.0" },
  });
  for (const key of Object.keys(PKGS)) {
    writePkg(physDir(key), key);
  }
  const link = (from, toKey) => {
    fs.mkdirSync(path.dirname(from), { recursive: true });
    fs.symlinkSync(physDir(toKey), from, "dir");
  };
  // Sibling symlinks for each physical package's dependencies.
  link(path.join(path.dirname(physDir("liba")), "libb"), "libb@1");
  link(path.join(path.dirname(physDir("liba")), "libc"), "libc");
  link(path.join(path.dirname(physDir("liba")), "libd"), "libd");
  link(path.join(path.dirname(physDir("liba")), "libe"), "libe");
  link(path.join(path.dirname(physDir("libd")), "libb"), "libb@2");
  // The project's direct deps, plus the hoisted @types devDep.
  link(path.join(nm, "liba"), "liba");
  link(path.join(nm, "@types/libc"), "@types/libc");
};

const runFixture = (t, makeLayout) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "makePkgTypes-test-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  makeLayout(root);
  return toMap(collectPackageTypes("liba", root));
};

test("collects types from a yarn-style flat node_modules layout", (t) => {
  assert.deepEqual(runFixture(t, makeYarnLayout), expectedFiles());
});

test("collects types from a pnpm-style symlinked node_modules layout", (t) => {
  assert.deepEqual(runFixture(t, makePnpmLayout), expectedFiles());
});

test("yarn and pnpm layouts produce identical output", (t) => {
  assert.deepEqual(
    runFixture(t, makeYarnLayout),
    runFixture(t, makePnpmLayout)
  );
});
