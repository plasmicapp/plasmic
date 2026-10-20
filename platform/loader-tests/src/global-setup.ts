import fs from "fs";
import path from "path";
import tmp from "tmp";

// One npm content store per run, shared by all workers. Fresh each run, so
// e2e's prefer-offline can't serve packages from an earlier verdaccio publish.
export default function globalSetup() {
  const { name, removeCallback } = tmp.dirSync({ unsafeCleanup: true });
  process.env.E2E_NPM_CACACHE = path.join(name, "_cacache");
  fs.mkdirSync(process.env.E2E_NPM_CACACHE);
  return removeCallback;
}
