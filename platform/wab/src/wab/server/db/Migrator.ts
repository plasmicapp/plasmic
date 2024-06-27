import { tuple } from "@/wab/shared/common";
import {
  getLastBundleVersion,
  getMigratedBundle,
} from "@/wab/server/db/BundleMigrator";
import { getOrderedDepBundleIds } from "@/wab/server/db/DbBundleLoader";
import { DbMgr, NotFoundError, SUPER_USER } from "@/wab/server/db/DbMgr";
import { PkgVersion, ProjectRevision } from "@/wab/server/entities/Entities";
import { initializeGlobals } from "@/wab/server/svr-init";
import {
  Bundle,
  Bundler,
  checkBundleFields,
  checkExistingReferences,
  checkRefsInBundle,
} from "@/wab/shared/bundler";
import {
  ensureKnownProjectDependency,
  ensureKnownSite,
  Site,
} from "@/wab/shared/model/classes";
import { meta } from "@/wab/shared/model/classes-metas";
import L from "lodash";
import { EntityManager } from "typeorm";
import * as util from "util";

/**
 * Scan the DB for all models and perform some action on each.
 *
 * Besides being used in migrateDbModels, it's useful for one-off scripts to
 * analyze all our projects or scan for occurrences of something.
 */
export async function withDbModels(
  em: EntityManager,
  action: (
    db: DbMgr,
    bundle: Bundle,
    dbRow: PkgVersion | ProjectRevision
  ) => Promise<void>,
  projectIdsAndPkgVersionIds?: Set<string>
) {
  const db = new DbMgr(em, SUPER_USER);

  for (const pkgVersionId of await db.listAllPkgVersionIds()) {
    if (
      projectIdsAndPkgVersionIds &&
      !projectIdsAndPkgVersionIds.has(pkgVersionId.id)
    ) {
      continue;
    }
    try {
      const pkgVersion = await db.getPkgVersionById(pkgVersionId.id);
      console.log(
        `Migrating PkgVersion ${pkgVersion.pkgId}/${pkgVersion.id} (${pkgVersion.version})`
      );
      await action(db, await getMigratedBundle(pkgVersion), pkgVersion);
    } catch (e) {
      console.log(`Error migration pkg of id ${pkgVersionId.id}`);
      throw e;
    }
  }

  for (const project of await db.listAllProjects()) {
    const branches = [
      undefined,
      ...(await db.listBranchesForProject(project.id)).map(
        (branch) => branch.id
      ),
    ];

    for (const branchId of branches) {
      if (
        projectIdsAndPkgVersionIds &&
        !projectIdsAndPkgVersionIds.has(project.id)
      ) {
        continue;
      }
      try {
        const rev = await db.getLatestProjectRev(project.id, { branchId });
        console.log(
          `Migrating ProjectRevision ${project.id}/${rev.id} (${rev.revision}, branchId: ${branchId})`
        );
        const bundle = await getMigratedBundle(rev);
        await action(db, bundle, rev);
      } catch (e) {
        if (e instanceof NotFoundError) {
          console.log(
            `Revisions not found for project ${project.id}, branchId: ${branchId}`
          );
        } else {
          console.log(
            `Error with migrating project ${project.id}, branchId: ${branchId}`
          );
          throw e;
        }
      }
    }
  }
}

/**
 * Utility to help with migrating schemas for model objects in the DB.
 *
 * Note that this only migrates the latest revisions of each project, and not
 * the full revisions.
 *
 * migrationName is used for backup/revert purposes. It should be filled
 * with the migration class name (this.constructor.name).
 */
export async function migrateDbModels(
  em: EntityManager,
  migrationName: string,
  f: (
    bundle: Bundle,
    dbRow: PkgVersion | ProjectRevision
  ) => Bundle | Promise<Bundle>,
  projectIdsAndPkgVersionIds?: Set<string>
) {
  console.log(`Running migration ${migrationName}`);
  const migratedIds: [string, string][] = [];
  const dbMgr = new DbMgr(em, SUPER_USER);
  await dbMgr.saveBundleBackups(migrationName, projectIdsAndPkgVersionIds);
  await withDbModels(
    em,
    async (db: DbMgr, bundle: Bundle, dbRow: PkgVersion | ProjectRevision) => {
      if (!L.isEmpty(bundle)) {
        const newBundle = await f(bundle, dbRow);
        checkExistingReferences(newBundle);
        checkBundleFields(newBundle);
        checkRefsInBundle(newBundle);
        if (dbRow instanceof PkgVersion) {
          await db.updatePkgVersion(
            dbRow.pkgId,
            dbRow.version,
            dbRow.branchId,
            {
              model: JSON.stringify(newBundle),
            }
          );
        } else {
          await db.updateProjectRev({
            projectId: dbRow.projectId,
            data: JSON.stringify(newBundle),
            revisionNum: dbRow.revision,
            branchId: dbRow.branchId ?? undefined,
          });
          migratedIds.push(tuple(dbRow.projectId, dbRow.id));
        }
      }
    },
    projectIdsAndPkgVersionIds
  );

  console.log(
    "Migrated projects:",
    util.inspect(migratedIds, { maxArrayLength: null })
  );
}

/**
 * Reverts migrateDbModels using the saved bundle backups.
 */
export async function revertMigrateDbModels(
  em: EntityManager,
  migrationName: string
) {
  const db = new DbMgr(em, SUPER_USER);
  await db.restoreBundleBackups(migrationName);
}

/**
 * Utility to help with migrating schemas for model objects, but where the
 * migration needs to operate on the unbundled model structure.
 *
 * Limited to ProjectRevisions.  We only process the latest revision.
 */
export async function migrateDbModelsUnbundled(
  em: EntityManager,
  migrationName: string,
  f: (site: Site, dbRow: ProjectRevision | PkgVersion) => void,
  projectIdsAndPkgVersionIds?: Set<string>
) {
  console.log(`Running migration ${migrationName}`);
  initializeGlobals();
  const db = new DbMgr(em, SUPER_USER);
  const pkgs = await db.listAllPkgs();
  const pkgIdToPkg = L.keyBy(pkgs, (pkg) => pkg.id);

  const getPkgVersionBundleFromId = async (pkgVersionId: string) => {
    const pkgVersion = await db.getPkgVersionById(pkgVersionId);
    return getMigratedBundle(pkgVersion);
  };

  meta.setStrict(false);
  await migrateDbModels(
    em,
    migrationName,
    async (bundle, row) => {
      if (row instanceof PkgVersion) {
        const pkg = pkgIdToPkg[row.pkgId];
        if (!pkg || !pkg.projectId) {
          console.log(`No need to migrate PkgVersion ${row.pkgId}/${row.id}`);
          return bundle;
        }
      }
      const bundler = new Bundler();

      // Next, unbundle all other dependent bundles in order
      const pkgVersionIdToBundle = await getOrderedDepBundleIds(
        bundle,
        getPkgVersionBundleFromId
      );
      for (const [depId, depBundle] of pkgVersionIdToBundle) {
        bundler.unbundle(depBundle, depId);
      }

      // Finally, unbundle the site
      if (row instanceof PkgVersion) {
        const projectDep = ensureKnownProjectDependency(
          bundler.unbundle(bundle, row.id)
        );
        f(projectDep.site, row);
        return bundler.bundle(projectDep, row.id, await getLastBundleVersion());
      } else {
        const site = ensureKnownSite(bundler.unbundle(bundle, row.projectId));
        f(site, row);
        return bundler.bundle(
          site,
          row.projectId,
          await getLastBundleVersion()
        );
      }
    },
    projectIdsAndPkgVersionIds
  );
}
