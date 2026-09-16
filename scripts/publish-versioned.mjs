#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// Usage: node scripts/publish-versioned.mjs <pre-version-lerna-list.json>
// Capture `lerna list --all --json > FILENAME.json` before running `lerna version`.
// Only publish bumped packages, others may not have been built, so publishing could
// shadow valid upstream releases with packages missing dist files.
const snapshot = process.argv[2];
if (!snapshot) {
  throw new Error(
    "Usage: node scripts/publish-versioned.mjs <pre-version-lerna-list.json>",
  );
}
const before = JSON.parse(fs.readFileSync(snapshot, "utf8"));
const changed = before.filter((pkg) => {
  const current = JSON.parse(
    fs.readFileSync(path.join(pkg.location, "package.json"), "utf8"),
  );
  return !current.private && current.version !== pkg.version;
});
if (changed.length === 0) {
  console.log("No versioned packages to publish");
  process.exit(0);
}

// pnpm 11 ignores NPM_CONFIG_REGISTRY, so pass it explicitly.
const registry = process.env.NPM_CONFIG_REGISTRY;
if (!registry) {
  throw new Error("NPM_CONFIG_REGISTRY must be set");
}
execFileSync(
  "pnpm",
  [
    ...changed.flatMap((pkg) => ["--filter", pkg.name]),
    "-r",
    "publish",
    "--access",
    "public",
    "--no-git-checks",
    "--ignore-scripts",
    `--registry=${registry}`,
  ],
  { stdio: "inherit" },
);
