import {
  bundleHasStaleHostlessDeps,
  upgradeHostlessProject,
} from "@/wab/server/db/bundle-migration-utils";
import { getMigrationConnection } from "@/wab/server/db/DbCon";
import { DbMgr, SUPER_USER } from "@/wab/server/db/DbMgr";
import {
  DevFlagOverrides,
  PkgVersion,
  ProjectRevision,
} from "@/wab/server/entities/Entities";
import { withSpan } from "@/wab/server/util/apm-util";
import { DataSourceId, ProjectId } from "@/wab/shared/ApiSchema";
import {
  checkBundleFields,
  checkExistingReferences,
  checkRefsInBundle,
} from "@/wab/shared/bundler";
import {
  Bundle,
  getSerializedBundleSize,
  isEmptyBundle,
  isExpectedBundleVersion,
  parseBundle,
  setBundle,
  UnsafeBundle,
} from "@/wab/shared/bundles";
import { assert, mkShortId, unexpected } from "@/wab/shared/common";
import { DEVFLAGS } from "@/wab/shared/devflags";
import fs from "fs/promises";
import { partition } from "lodash";
import path from "path";

export const BUNDLE_MIGRATION_PATH = path.join(
  __dirname,
  "..",
  "bundle-migrations"
);

export type BundledMigrationFn = (
  bundle: UnsafeBundle,
  entity: PkgVersion | ProjectRevision
) => Promise<void>;

export interface MigrationDbMgr {
  getPkgVersionById: (id: string) => Promise<PkgVersion>;
  allowProjectToDataSources: (
    projectId: ProjectId,
    dataSourceIds: DataSourceId[],
    opts?: {
      skipPermissionCheck?: boolean;
    }
  ) => Promise<void>;
  tryGetDevFlagOverrides: () => Promise<DevFlagOverrides | undefined>;
  extendProjectIdAndTokens: (pkgVersionId: string) => Promise<void>;
  isDevBundle?: boolean;
  insertPkgVersion: (
    pkgId: string,
    version: string,
    model: string,
    tags: string[],
    description: string,
    revisionNum: number
  ) => Promise<PkgVersion>;
  listPkgVersions: (pkgId: string, opts: any) => Promise<PkgVersion[]>;
}

export type UnbundledMigrationFn = (
  bundle: UnsafeBundle,
  db: MigrationDbMgr,
  entity: PkgVersion | ProjectRevision
) => Promise<void>;

type Migration =
  | {
      name: string;
      migrate: BundledMigrationFn;
      type: "bundled";
    }
  | {
      name: string;
      migrate: UnbundledMigrationFn;
      type: "unbundled";
    };

const migrationSorter = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});
let bundleMigrations: Migration[];
export async function getAllMigrations() {
  if (bundleMigrations) {
    return bundleMigrations;
  }
  const files = await fs.readdir(BUNDLE_MIGRATION_PATH);
  files.sort(migrationSorter.compare);
  bundleMigrations = files.map<Migration>((file) => {
    const mod = require(path.join(BUNDLE_MIGRATION_PATH, file));
    return {
      name: file.replace(/\..*$/, ""),
      migrate: mod.migrate,
      type: mod.MIGRATION_TYPE,
    };
  });
  return bundleMigrations;
}

let lastBundleVersion: string;
export async function getLastBundleVersion() {
  if (lastBundleVersion == null) {
    const migrations = await getAllMigrations();
    lastBundleVersion = migrations[migrations.length - 1].name;
  }
  return lastBundleVersion;
}

export async function getMigrationsToExecute(version: string) {
  await getLastBundleVersion();
  const migrations = await getAllMigrations();
  const versionIndex = migrations.findIndex(({ name }) => name === version);
  const lastVersionIndex = migrations.findIndex(
    ({ name }) => name === lastBundleVersion
  );
  assert(
    versionIndex !== -1 && lastVersionIndex !== -1,
    `Could not safely determine migrations to execute: ${JSON.stringify({
      currentVersion: version,
      latestVersion: lastBundleVersion,
      currentVersionIndex: versionIndex,
      latestVersionIndex: lastVersionIndex,
    })}`
  );
  const todos = migrations.slice(versionIndex + 1, lastVersionIndex + 1);
  const [bundled, unbundled] = partition(
    todos,
    (todo) => todo.type === "bundled"
  );
  /*

    Bundled migrations: Migrations that do not unbundle the bundle. These migrations may update the model (e.g. add new fields).
    Unbundled migrations: Migrations that unbundle the bundle. These migrations should not update the model.

    Migrations should not run sequentially ("bundled" should run before "unbundled"),
    because "bundled" migrations make sure that the bundle is updated to the latest model before any unbundling happens in the "unbundled" migrations.

    If a migration is required to add new fields and also perform unbundling, then it should be broken into two migrations:
    - First migration should add the new fields, but not unbundle the bundle.
    - Second migration should unbundle the bundle to extract whatever data it needs from it.

  */
  return [...bundled, ...unbundled];
}

const TEN_MB = 10 * 1024 * 1024;

export async function getMigratedBundle(
  entity: PkgVersion | ProjectRevision
): Promise<Bundle> {
  return await withSpan("getMigratedBundle", async () => {
    const serializedSize = getSerializedBundleSize(entity);
    if (serializedSize > TEN_MB) {
      console.log(
        "Get migrated bundle",
        entity.constructor.name,
        entity.id,
        `${(serializedSize / (1024 * 1024)).toFixed(2)} MB`
      );
    }

    const bundle = parseBundle(entity);

    if (
      (!DEVFLAGS.autoUpgradeHostless || !DEVFLAGS.hostLessWorkspaceId) &&
      isExpectedBundleVersion(bundle, await getLastBundleVersion())
    ) {
      return bundle;
    }

    if (isEmptyBundle(bundle)) {
      console.log(
        `Detected empty bundle in ${entity.constructor.name} ${entity.id}. Will update to latest version and skip migrations.`
      );
      bundle.version = lastBundleVersion;
    }

    const currentVersion = bundle.version || "0-new-version";

    const conn = await getMigrationConnection();
    const fixedBundle = await conn.transaction(async (txMgr) => {
      const db = new DbMgr(txMgr, SUPER_USER);

      if (
        isExpectedBundleVersion(bundle, await getLastBundleVersion()) &&
        !(await bundleHasStaleHostlessDeps(bundle, db))
      ) {
        return bundle;
      }

      if (migrationSorter.compare(currentVersion, lastBundleVersion) == 1) {
        // Bundle version is higher than the current version. Rollback the bundle!
        console.log(
          `Bundle in ${entity.constructor.name} ${entity.id} has version ${currentVersion} which is ahead of the last version ${lastBundleVersion}!`
        );
      }

      const migrations = await getMigrationsToExecute(currentVersion);

      // Sequencially apply migrations
      console.log(
        `Migrating bundle in ${entity.constructor.name} ${entity.id} from version ${currentVersion} to ${lastBundleVersion}.`
      );

      for (const migration of migrations) {
        await db.saveBundleBackupForEntity(
          migration.name,
          entity,
          JSON.stringify(bundle)
        );

        if (migration.type === "bundled") {
          await migration.migrate(bundle, entity);
        } else {
          await migration.migrate(bundle, db, entity);
        }
        bundle.version = migration.name;
      }

      if (DEVFLAGS.autoUpgradeHostless) {
        if (await bundleHasStaleHostlessDeps(bundle, db)) {
          console.log(
            `Upgrading hostless dependencies in ${entity.constructor.name} ${entity.id}`
          );
          await db.saveBundleBackupForEntity(
            `hostless-auto-upgrade-${mkShortId()}`,
            entity,
            JSON.stringify(bundle)
          );
          await upgradeHostlessProject(bundle, entity, db);
        }
      }

      bundle.version = lastBundleVersion;
      checkExistingReferences(bundle as Bundle);
      checkBundleFields(bundle as Bundle);
      checkRefsInBundle(bundle as Bundle);

      if (!isExpectedBundleVersion(bundle, await getLastBundleVersion())) {
        unexpected();
      }

      if (entity instanceof PkgVersion) {
        assert(
          isEmptyBundle(bundle as any) ||
            bundle.map[bundle.root].__type === "ProjectDependency",
          () =>
            `The root of a PkgVersion bundle must be ProjectDependency, but got ${
              bundle.map[bundle.root].__type
            }`
        );
        await db.updatePkgVersion(
          entity.pkgId,
          entity.version,
          entity.branchId,
          {
            model: JSON.stringify(bundle),
          }
        );
      } else {
        assert(
          isEmptyBundle(bundle as any) ||
            bundle.map[bundle.root].__type === "Site",
          () =>
            `The root of a ProjectRevision bundle must be Site, but got ${
              bundle.map[bundle.root].__type
            }`
        );
        await db.updateProjectRev({
          projectId: entity.projectId,
          data: JSON.stringify(bundle),
          revisionNum: entity.revision,
          branchId: entity.branchId ?? undefined,
        });
      }

      setBundle(entity, bundle);
      return bundle;
    });

    return fixedBundle;
  });
}
