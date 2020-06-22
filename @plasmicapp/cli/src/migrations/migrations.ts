/**
 * Super simple migration framework for cli.
 *
 * If you want to run some migration script (say, to fix up the schema of plasmic.json, etc),
 * you should:
 *
 * 1. Bump your cli version.
 * 2. Add a [version]-[desc].ts file to the migrations folder, exporting a function that takes
 *    the previous version of plasmic.json blob, and returns the new version of plasmic.json blob.
 * 3. Add the migration function to the MIGRATIONS dict in this file.
 *
 * The framework will run migrations in sequence, so you are guaranteed that the plasmic.json blob
 * passed into your migration function is valid as of the previous version.
 */
import L from "lodash";
import { getCliVersion } from "../utils/npm-utils";
import fs from "fs";
import path from "path";
import semver from "semver";
import { writeFileContentRaw } from "../utils/file-utils";
import { migrateInit } from "./0.1.27-migrateInit";
import { tsToTsx } from "./0.1.28-tsToTsx";

export interface MigrateContext {
  absoluteSrcDir: string;
}

type MigrateFunc = (prev: any, context: MigrateContext) => any;

export const MIGRATIONS: Record<string, MigrateFunc> = {
  "0.1.27": migrateInit,
  "0.1.28": tsToTsx
};

export function runNecessaryMigrations(configFile: string) {
  const readConfig = () => JSON.parse(fs.readFileSync(configFile).toString());
  const writeConfig = (config: any) =>
    writeFileContentRaw(configFile, JSON.stringify(config, undefined, 2), {
      force: true
    });
  const cur = readConfig();

  const context: MigrateContext = {
    absoluteSrcDir: path.isAbsolute(cur.srcDir)
      ? cur.srcDir
      : path.resolve(path.dirname(configFile), cur.srcDir)
  };
  const curVersion: string | undefined = cur.cliVersion;
  const greaterVersions = semver.sort(
    L.keys(MIGRATIONS).filter(v => !curVersion || semver.gt(v, curVersion))
  );
  for (const version of greaterVersions) {
    console.log(`Migrating to plasmic.json version ${version}`);
    const prev = readConfig();
    const next = MIGRATIONS[version](prev, context);
    next.cliVersion = version;
    writeConfig(next);
  }

  // Finally, stamp the latest version
  const latestVersion = getCliVersion();
  const latestConfig = readConfig();
  if (latestConfig.cliVersion !== latestVersion) {
    latestConfig.cliVersion = latestVersion;
    writeConfig(latestConfig);
  }
}
