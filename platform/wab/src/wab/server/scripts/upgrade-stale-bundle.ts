import {
  getAllMigrations,
  getLastBundleVersion,
  getMigrationsToExecute,
} from "@/wab/server/db/BundleMigrator";
import { unbundleSite } from "@/wab/server/db/bundle-migration-utils";
import { PkgVersion, ProjectRevision } from "@/wab/server/entities/Entities";
import { logger } from "@/wab/server/observability";
import { Bundler } from "@/wab/shared/bundler";
import { Bundle } from "@/wab/shared/bundles";
import { assert, last, spawn } from "@/wab/shared/common";
import { DEVFLAGS } from "@/wab/shared/devflags";
import execa from "execa";
import fs from "fs";
import inquirer from "inquirer";
import * as Prettier from "prettier";
import sh from "shellsync";

async function migrate() {
  const path = "cypress/bundles/stale-bundle.json";
  // Support both a single bundle or an array with bundles and their IDs
  const bundleArray = JSON.parse(
    fs.readFileSync(path, { encoding: "utf8" })
  ) as [string, Bundle][];
  assert(Array.isArray(bundleArray), "bundles is not an array");

  // Our backend is printing annoying logs, wait for them to be flushed
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const { targetMigration } = await inquirer.prompt({
    type: "input",
    name: "targetMigration",
    message: `
  Upgrading stale bundle. Please provide the migration name it
  should migrate to (the current bundle version is ${
    last(bundleArray)[1].version
  })

  IMPORTANT: The migration to input is possibly *not* the latest migration.

  You'll probably want to update it to the latest migration to which production bundles
  have been migrated. Please check for the last time migrate_bundles has succeeded to
  see which is the latest "finished" migration at: https://jenkins.aws.plasmic.app/job/migrate_bundles/

  Latest "safe" migration:
  `.trim(),
  });

  const bundles = Object.fromEntries(bundleArray);

  logger().info(`Migrating to ${targetMigration}...`);

  await execa.command(sh.quote`git checkout ${path}`, {
    shell: "bash",
  });
  for (const bundleId of [...Object.keys(bundles)]) {
    const bundle = bundles[bundleId];
    const allMigrations = await getAllMigrations();
    const targetMigrationIndex = allMigrations.findIndex(
      (m) => m.name === targetMigration
    );
    assert(
      targetMigrationIndex !== -1,
      () => `Couldn't find migration ${targetMigration}`
    );
    const migrationsToIgnore = new Set(
      allMigrations.slice(targetMigrationIndex + 1).map((m) => m.name)
    );
    const migrations = (await getMigrationsToExecute(bundle.version)).filter(
      (migration) => !migrationsToIgnore.has(migration.name)
    );
    for (const migration of migrations) {
      const entity = { id: "id" } as PkgVersion | ProjectRevision;
      const db = {
        getPkgVersionById: async (id: string) => {
          if (!bundles[id]) {
            throw new Error("Unknown id " + id);
          }
          return {
            id,
            model: JSON.stringify({
              ...bundles[id],
              version: await getLastBundleVersion(),
            }),
          };
        },
        tryGetDevFlagOverrides: () => undefined,
      } as any;
      await migration.migrate(bundle, db, entity);
      if (migration.name.includes("migrate-hostless")) {
        // Make sure the migrate hostless will try to unbundle the project
        // (otherwise they might just skip the bundle since there's no
        // dependency on hostless projects)
        const bundler = new Bundler();
        const { siteOrProjectDep } = await unbundleSite(
          bundler,
          bundle,
          db,
          entity
        );
        bundler.bundle(
          siteOrProjectDep,
          entity.id,
          bundle.version || "0-new-version"
        );
      }
      bundle.version = migration.name;
    }
    if (DEVFLAGS.autoUpgradeHostless) {
      // Ditto
      const entity = { id: "id" } as PkgVersion | ProjectRevision;
      const db = {
        getPkgVersionById: async (id: string) => {
          if (!bundles[id]) {
            throw new Error("Unknown id " + id);
          }
          return {
            id,
            model: JSON.stringify({
              ...bundles[id],
              version: await getLastBundleVersion(),
            }),
          };
        },
        tryGetDevFlagOverrides: () => undefined,
      } as any;
      const tmpBundler = new Bundler();
      const { siteOrProjectDep } = await unbundleSite(
        tmpBundler,
        bundle,
        db,
        entity
      );
      tmpBundler.bundle(
        siteOrProjectDep,
        entity.id,
        bundle.version || "0-new-version"
      );
    }
    bundle.version = allMigrations[targetMigrationIndex].name;
  }
  fs.writeFileSync(
    path,
    Prettier.format(JSON.stringify([...Object.entries(bundles)]), {
      parser: "json",
      trailingComma: "none",
    })
  );
  logger().info("All done!");
  process.exit(0);
}

if (require.main === module) {
  spawn(migrate());
}
