import fs from "fs";
import path from "path";
import { defineConfig } from "vitest/config";

// Root test runner for `packages/` and `plasmicpkgs/`, used by `pnpm test`.
// Each package owns its own vitest settings (environment, setup files, ...).
//
// Named `vitest.root.ts`, since vitest searches parent directories for config, so a root
// `vitest.config.ts` would be used by package with no config, and they'd try to run the
// whole workspace.

// Plain `packages/*` globs would match files such as `plasmicpkgs/README.md`, which
// vitest rejects as a project, so list the package directories explicitly.
function packageDirs(...parents: string[]) {
  return parents.flatMap((parent) =>
    fs
      .readdirSync(path.join(__dirname, parent), { withFileTypes: true })
      .filter(
        (entry) =>
          entry.isDirectory() &&
          fs.existsSync(
            path.join(__dirname, parent, entry.name, "package.json")
          )
      )
      .map((entry) => `${parent}/${entry.name}`)
  );
}

export default defineConfig({
  test: {
    projects: packageDirs(
      "packages",
      "plasmicpkgs",
      "plasmicpkgs/commerce-providers"
    ),
  },
});
