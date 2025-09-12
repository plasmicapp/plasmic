import { DEFAULT_DATABASE_URI } from "@/wab/server/config";
import { getMigratedBundle } from "@/wab/server/db/BundleMigrator";
import { getOrderedDepBundleIds } from "@/wab/server/db/DbBundleLoader";
import {
  ensureDbConnections,
  getDefaultConnection,
} from "@/wab/server/db/DbCon";
import { DbMgr, NotFoundError, SUPER_USER } from "@/wab/server/db/DbMgr";
import { PkgVersion, ProjectRevision } from "@/wab/server/entities/Entities";
import { logger } from "@/wab/server/observability";
import {
  Bundle,
  Bundler,
  FastBundler,
  checkBundleFields,
  checkExistingReferences,
  checkRefsInBundle,
} from "@/wab/shared/bundler";
import { isEmptyBundle } from "@/wab/shared/bundles";
import { assert, maybe, spawn } from "@/wab/shared/common";
import { observeModel } from "@/wab/shared/core/observable-model";
import { walkDependencyTree } from "@/wab/shared/core/project-deps";
import { taggedUnbundle } from "@/wab/shared/core/tagged-unbundle";
import { instUtil } from "@/wab/shared/model/InstUtil";
import {
  Site,
  ensureKnownProjectDependency,
  ensureKnownSite,
} from "@/wab/shared/model/classes";
import { meta } from "@/wab/shared/model/classes-metas";
import {
  InvariantError,
  assertSiteInvariants,
} from "@/wab/shared/site-invariants";
import L from "lodash";
const { Command } = require("commander");

export async function withDbModels(
  db: DbMgr,
  action: (bundle: Bundle, dbRow: PkgVersion | ProjectRevision) => Promise<void>
) {
  for (const pkgVersionId of await db.listAllPkgVersionIds()) {
    const pkgVersion = await db.getPkgVersionById(pkgVersionId.id);
    logger().info(
      `Checking PkgVersion ${pkgVersion.pkgId}/${pkgVersion.id} (${pkgVersion.version})`
    );
    let bundle: Bundle;
    try {
      bundle = await getMigratedBundle(pkgVersion);
    } catch (e) {
      logger().error(
        `Error migrating PkgVersion ${pkgVersion.pkgId}/${pkgVersion.id}`,
        e
      );
      continue;
    }
    await action(bundle, pkgVersion);
  }

  for (const project of await db.listAllProjects()) {
    try {
      const rev = await db.getLatestProjectRev(project.id);
      logger().info(
        `Checking ProjectRevision ${project.id}/${rev.id} (${rev.revision})`
      );
      let bundle: Bundle;
      try {
        bundle = await getMigratedBundle(rev);
      } catch (e) {
        logger().info(
          `Error migrating ProjectRevision ${project.id}/${rev.id}`,
          e
        );
        continue;
      }
      await action(bundle, rev);
    } catch (e) {
      if (e instanceof NotFoundError) {
        logger().error(
          `Project ${project.name} (${project.id}) has no revision. Skipping...`
        );
        continue;
      }
      throw e;
    }
  }
}

function assertObservabeModelInvariants(
  site: Site,
  bundler: Bundler,
  rootUuid: string
) {
  // Observable model also checks several invariants.
  // We should call it after `assertSiteInvariants`, otherwise the
  // results will be cached by `computedFn` causing a memory leak.
  const { dispose } = observeModel(site, {
    instUtil,
    listener: () => assert(false, ""),
    // We should keep it in sync with `DbCtx.createRecorder`:
    excludeFields: [meta.getFieldByName("ProjectDependency", "site")],
    isExternalRef: (obj) =>
      !!maybe(bundler.addrOf(obj), (addr) => addr.uuid !== rootUuid),
    quiet: true,
  });
  dispose();
}

export async function main() {
  const opts = new Command("Assert site invariants")
    .option("-db, --dburi <dburi>", "Database uri", DEFAULT_DATABASE_URI)
    .parse(process.argv)
    .opts();

  await ensureDbConnections(opts.dburi, { useEnvPassword: true });
  const con = await getDefaultConnection();

  logger().info("Checking invariants...");
  const em = con.manager;
  const db = new DbMgr(em, SUPER_USER);

  const pkgs = await db.listAllPkgs();
  const pkgIdToPkg = L.keyBy(pkgs, (pkg) => pkg.id);

  const getPkgVersionBundleFromId = async (pkgVersionId: string) => {
    const pkgVersion = await db.getPkgVersionById(pkgVersionId);
    return getMigratedBundle(pkgVersion);
  };

  const failedSummary: string[] = [];

  meta.setStrict(true);
  await withDbModels(
    db,
    async (bundle: Bundle, dbRow: PkgVersion | ProjectRevision) => {
      try {
        if (isEmptyBundle(bundle)) {
          logger().info(
            `Found empty bundle for entity ${dbRow.constructor.name} ${dbRow.id}. Skipping...`
          );
          return;
        }
        checkExistingReferences(bundle);
        checkBundleFields(bundle);
        checkRefsInBundle(bundle);

        if (dbRow instanceof PkgVersion) {
          const pkg = pkgIdToPkg[dbRow.pkgId];
          if (!pkg || !pkg.projectId) {
            logger().info(
              `No need to unbundle PkgVersion ${dbRow.pkgId}/${dbRow.id}`
            );
            return;
          }
        }

        const bundler = new FastBundler();

        // Next, unbundle all other dependent bundles in order
        const pkgVersionIdToBundle = await getOrderedDepBundleIds(
          bundle,
          getPkgVersionBundleFromId
        );
        for (const [depId, depBundle] of pkgVersionIdToBundle) {
          taggedUnbundle(bundler, depBundle, depId);
        }

        // Finally, unbundle the site
        let site: Site;
        let rootUuid: string;
        if (dbRow instanceof PkgVersion) {
          const projectDep = ensureKnownProjectDependency(
            bundler.unbundleAndRecomputeParents(bundle, dbRow.id)
          );
          site = projectDep.site;
          rootUuid = dbRow.id;
          (projectDep as any).__bundleId = rootUuid;
        } else {
          site = ensureKnownSite(
            bundler.unbundleAndRecomputeParents(bundle, dbRow.projectId)
          );
          rootUuid = dbRow.projectId;
          (site as any).__bundleId = rootUuid;
        }
        assertSiteInvariants(site);
        // We also assert that our site bundle doesn't contain any external
        // bundle reference that we don't expect. Currently we should only see
        // references any imported project's PkgVersion IDs.  If we see extraneous
        // ids, it's likely because of an unclean package upgrade.
        const expectedDepIds = [
          ...walkDependencyTree(site, "all").map((p) => (p as any).__bundleId),
        ];
        if (
          (bundle as Bundle).deps.some(
            (depId) => !expectedDepIds.includes(depId)
          )
        ) {
          throw new InvariantError(`Unexpected Bundle dependencies`, {
            siteBundle: bundle,
            expectedDepIds,
          });
        }

        assertObservabeModelInvariants(site, bundler, rootUuid);
      } catch (e) {
        let projectId: string;
        if (dbRow instanceof PkgVersion) {
          try {
            const pkg = await db.getPkgById(dbRow.pkgId);
            projectId = pkg.projectId;
          } catch {
            projectId = "Not found";
          }
        } else {
          projectId = dbRow.projectId;
        }
        const project = await db.getProjectById(projectId, true);
        const owner =
          project.createdById &&
          (await db.getUserById(project.createdById)).email;
        const failedRow =
          dbRow instanceof PkgVersion
            ? `PkgVersion (pkgId: ${dbRow.pkgId}, id: ${dbRow.id}, projectId: ${projectId}, owner: ${owner})`
            : `ProjectRevision (projectId: ${projectId}, revision: ${dbRow.revision}, owner: ${owner})`;
        failedSummary.push(failedRow);
        logger().error(`FAILED to assert site invariants for ${failedRow}:`, e);
      }
    }
  );

  if (failedSummary.length) {
    logger().info(`FAILED rows: (${failedSummary.length})`, {
      failedRows: failedSummary,
    });
    process.exit(1);
  } else {
    logger().info("All assertions passed!");
  }
}

if (require.main === module) {
  spawn(
    main().catch((error) => {
      logger().info(
        "Found an error while running assert site invariants.",
        error
      );
      process.exit(1);
    })
  );
}
