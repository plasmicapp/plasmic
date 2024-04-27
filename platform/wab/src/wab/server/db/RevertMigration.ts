const { Command } = require("commander");
import { assert, ensure, spawn } from "@/wab/common";
import { DEFAULT_DATABASE_URI } from "@/wab/server/config";
import {
  ensureDbConnections,
  getDefaultConnection,
} from "@/wab/server/db/DbCon";
import { DbMgr, SUPER_USER } from "@/wab/server/db/DbMgr";
import { PkgVersion, ProjectRevision } from "@/wab/server/entities/Entities";
import { isEmptyBundle, parseBundle } from "@/wab/shared/bundles";

export async function main() {
  const opts = new Command("Assert site invariants")
    .option("-db, --dburi <dburi>", "Database uri", DEFAULT_DATABASE_URI)
    .option("--migration-name <migration>", "Migration name to revert")
    .option(
      "--bundle-checks",
      "Check the stamped version in the bundles (default)",
      true
    )
    .option(
      "--no-bundle-checks",
      "Do not check the stamped version in the bundles"
    )
    .parse(process.argv)
    .opts();

  await ensureDbConnections(opts.dburi, { useEnvPassword: true });
  const con = await getDefaultConnection();
  const migrationName = opts.migrationName;
  const checkBundles = !!opts.bundleChecks;

  console.log(
    `Reverting migration ${migrationName} (checkBundles: ${checkBundles})`
  );

  await con.transaction(async (em) => {
    const db = new DbMgr(em, SUPER_USER);

    const entityIds = await db.getEntityIdsFromBundleBackupsByMigration(
      migrationName
    );
    console.log(`${entityIds.length} bundles to revert`);

    for (const entityId of entityIds) {
      const entity =
        entityId.projectId != null
          ? await db.getLatestProjectRev(entityId.projectId)
          : await db.getPkgVersionById(entityId.pkgVersionId);

      console.log(
        `Reverting ${entity.constructor.name} ${entity.id}${
          entity instanceof ProjectRevision
            ? ` (projectId ${entity.projectId})`
            : ""
        }...`
      );

      const currentBundle = parseBundle(entity);
      const currentVersion = currentBundle.version || "0-new-version";
      // Maybe we should compare if `migrationName` is ahead `currentVersion`? For
      // now we are only accepting to revert one migration at a time.
      if (checkBundles && currentVersion !== migrationName) {
        // If the bundle has already been reverted, don't overwrite it with the backup
        // again to avoid unnecessary data loss.
        console.log(
          `Skipping ${entity.constructor.name} ${entity.id} because it's current version is ${currentVersion}`
        );
        continue;
      }

      // Save a backup
      await db.saveBundleBackupForEntity(
        migrationName + "--reverted",
        entity,
        JSON.stringify(currentBundle)
      );

      const backupBundle = ensure(
        await db.getBundleBackupForEntity(entity, migrationName),
        () => "Couldn't find bundle backup for entity " + entity.id
      );
      const newBundle = parseBundle(backupBundle);
      const newVersion = newBundle.version || "0-new-version";

      // Not traversing the bundle to make this operation cheaper; Since it's
      // just reverting to a previous version we rely on it being correct
      // checkExistingReferences(newBundle as Bundle);
      // checkBundleFields(newBundle as Bundle);

      if (entity instanceof PkgVersion) {
        assert(
          isEmptyBundle(newBundle as any) ||
            newBundle.map[newBundle.root].__type === "ProjectDependency",
          () =>
            "Expected ProjectDependency, but got: " +
            newBundle.map[newBundle.root].__type
        );
        await db.updatePkgVersion(
          entity.pkgId,
          entity.version,
          entity.branchId,
          {
            model: JSON.stringify(newBundle),
          }
        );
      } else {
        assert(
          isEmptyBundle(newBundle as any) ||
            newBundle.map[newBundle.root].__type === "Site",
          () =>
            "Expected Site, but got: " + newBundle.map[newBundle.root].__type
        );
        await db.updateProjectRev({
          projectId: entity.projectId,
          data: JSON.stringify(newBundle),
          revisionNum: entity.revision,
          branchId: entity.branchId ?? undefined,
        });
      }

      console.log(
        `Reverted ${entity.constructor.name} ${entity.id} from version ${currentVersion} to ${newVersion}`
      );
    }
  });
}

if (require.main === module) {
  spawn(
    main().catch((error) => {
      console.info("Found an error reverting the migration.");
      console.error(error);
      process.exit(1);
    })
  );
}
