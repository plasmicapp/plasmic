import { updateHostlessPackage } from "@/wab/server/code-components/code-components";
import {
  MigrationDbMgr,
  getMigratedBundle,
} from "@/wab/server/db/BundleMigrator";
import { loadDepPackages } from "@/wab/server/db/DbBundleLoader";
import { DbMgr } from "@/wab/server/db/DbMgr";
import { PkgVersion, ProjectRevision } from "@/wab/server/entities/Entities";
import { sha256 } from "@/wab/server/util/hash";
import { ensureDevFlags } from "@/wab/server/workers/worker-utils";
import { Bundler } from "@/wab/shared/bundler";
import { UnsafeBundle } from "@/wab/shared/bundles";
import { assert, ensure, ensureInstance } from "@/wab/shared/common";
import {
  upgradeProjectDeps,
  walkDependencyTree,
} from "@/wab/shared/core/project-deps";
import { isHostLessPackage } from "@/wab/shared/core/sites";
import { trackComponentRoot, trackComponentSite } from "@/wab/shared/core/tpls";
import { DEVFLAGS } from "@/wab/shared/devflags";
import {
  ProjectDependency,
  Site,
  ensureKnownProjectDependency,
  isKnownSite,
} from "@/wab/shared/model/classes";
import { InvariantError } from "@/wab/shared/site-invariants";
import semver from "semver";

export async function unbundleSite(
  bundler: Bundler,
  bundle: UnsafeBundle,
  db: MigrationDbMgr,
  entity: PkgVersion | ProjectRevision
) {
  const deps = await loadDepPackages(db, bundle);

  deps.forEach((dep) => {
    const unbundled = bundler.unbundle(JSON.parse(dep.model), dep.id);
    (unbundled as any).__bundleId = dep.id;
  });
  const siteOrProjectDep = ensureInstance(
    bundler.unbundle(bundle, entity.id),
    Site,
    ProjectDependency
  );
  (siteOrProjectDep as any).__bundleId = entity.id;
  const site = isKnownSite(siteOrProjectDep)
    ? siteOrProjectDep
    : siteOrProjectDep.site;
  return { site, siteOrProjectDep };
}

export async function bundleHasStaleHostlessDeps(
  bundle: UnsafeBundle,
  db: MigrationDbMgr
) {
  if (process.env["DEV_BUNDLE_MIGRATION"]) {
    // For dev bundle migrations, we handle hostless upgrades specially
    return true;
  }
  const hostlessData = await getHostlessData(db);
  if (!hostlessData) {
    return false;
  }
  const { versionIdToLatestVersion, latestVersions } = hostlessData;
  const versionsToUpdate = bundle.deps.filter(
    (dep) => versionIdToLatestVersion.has(dep) && !latestVersions.has(dep)
  );
  return versionsToUpdate.length > 0;
}

export async function upgradeHostlessProject(
  bundle: UnsafeBundle,
  entity: PkgVersion | ProjectRevision,
  db: MigrationDbMgr
) {
  if (process.env["DEV_BUNDLE_MIGRATION"]) {
    // For dev bundle migrations, we handle hostless upgrades specially
    return upgradeHostlessProjectForDev(bundle, entity, db);
  }
  const hostlessData = await getHostlessData(db);
  if (!hostlessData) {
    return;
  }
  const { versionIdToLatestVersion, latestVersions } = hostlessData;
  const versionsToUpdate = bundle.deps.filter(
    (dep) => versionIdToLatestVersion.has(dep) && !latestVersions.has(dep)
  );
  if (versionsToUpdate.length === 0) {
    return;
  }
  const bundler = new Bundler();
  const { site, siteOrProjectDep } = await unbundleSite(
    bundler,
    bundle,
    db,
    entity
  );

  for (const component of site.components) {
    trackComponentRoot(component);
    trackComponentSite(component, site);
  }

  upgradeProjectDeps(
    site,
    await Promise.all(
      versionsToUpdate.map(async (dep) => {
        const latestPkgVersion = ensure(
          versionIdToLatestVersion.get(dep),
          () => "Expected to find latest version for " + dep
        );
        const pkgId = latestPkgVersion.pkgId;
        const oldDep = ensure(
          site.projectDependencies.find((d) => d.pkgId === pkgId),
          () =>
            `Expected to find project dependency (pkgId: ${pkgId}, dep: ${dep})`
        );
        const newDep = ensureKnownProjectDependency(
          (
            await unbundleSite(
              bundler,
              await getMigratedBundle(latestPkgVersion),
              db,
              latestPkgVersion
            )
          ).siteOrProjectDep
        );
        return { oldDep, newDep };
      })
    )
  );

  Object.assign(
    bundle,
    bundler.bundle(
      siteOrProjectDep,
      entity.id,
      bundle.version || "0-new-version"
    )
  );

  // Comment this for now to avoid big time spikes in the server.
  //
  // assertSiteInvariants(site);
  const expectedDepIds = [
    ...walkDependencyTree(site, "all").map((p) => (p as any).__bundleId),
  ];
  if (bundle.deps.some((depId) => !expectedDepIds.includes(depId))) {
    throw new InvariantError(`Unexpected Bundle dependencies`, {
      siteBundle: bundle,
      expectedDepIds,
      foundDepIds: bundle.deps,
    });
  }

  assert(
    !bundle.deps.some(
      (dep) => versionIdToLatestVersion.has(dep) && !latestVersions.has(dep)
    ),
    () => "Expected to have fixed all deps"
  );
}

export const getHostlessData = (() => {
  const fn = async (db: MigrationDbMgr) => {
    console.log("Refreshing hostless data");
    await ensureDevFlags(db);
    if (!(db instanceof DbMgr)) {
      console.log("No real DbMgr - nothing to do");
      return undefined;
    }
    const workspaceId = DEVFLAGS.hostLessWorkspaceId;
    if (!workspaceId) {
      console.log("No hostless workspace - nothing to upgrade");
      return undefined;
    }
    const hostlessProjects = await db.getProjectsByWorkspaces([workspaceId]);
    assert(
      hostlessProjects.length > 0,
      () => "No projects found for workspace " + workspaceId
    );
    const versionIdToLatestVersion = new Map<string, PkgVersion>();
    const latestVersions = new Set<string>();
    await Promise.all(
      hostlessProjects.map(async (p) => {
        const pkg = await db.getPkgByProjectId(p.id);
        // For hostless without a published version, just ignore it.
        // Needed when creating a new hostless project that does not have
        // a published version yet.
        if (!pkg) {
          return;
        }
        const latestVersion = await db.getPkgVersion(pkg.id);
        const allVersions = await db.listPkgVersions(pkg.id);
        allVersions.forEach((v) =>
          versionIdToLatestVersion.set(v.id, latestVersion)
        );
        latestVersions.add(latestVersion.id);
      })
    );
    return {
      versionIdToLatestVersion,
      latestVersions,
      hostlessVersionCount: (await db.getHostlessVersion()).versionCount,
    };
  };
  let cachedData: ReturnType<typeof fn> | undefined = undefined;
  let lastEvaluationTime = 0;
  const runAndCache = (db: MigrationDbMgr, opts?: { clearCache?: boolean }) => {
    if (
      !cachedData ||
      opts?.clearCache ||
      performance.now() - lastEvaluationTime >= 1000 * 60 * 10
    ) {
      cachedData = fn(db);
      lastEvaluationTime = performance.now();
    }
    return cachedData;
  };
  return async (db: MigrationDbMgr) => {
    const result = await runAndCache(db);
    if (
      db instanceof DbMgr &&
      result?.hostlessVersionCount !==
        (await db.getHostlessVersion()).versionCount
    ) {
      return runAndCache(db, { clearCache: true });
    }
    return result;
  };
})();

export async function getHostlessDataVersionsHash(mgr: DbMgr) {
  const hostlessData = await getHostlessData(mgr);
  if (!hostlessData) {
    return "NO_HOSTLESS_DATA";
  }
  return sha256(JSON.stringify(hostlessData));
}

export type BundleMigrationType = "bundled" | "unbundled";

/**
 * The equivalent of upgradeHostlessProject() for bundle migration, but for
 * dev bundles.  Typically, when a hostless package is updated, two things happen:
 *
 * 1. The upgrade-hostless-packages Jenkins job is run, which publishes new versions
 *    of changed hostless packages by running registerComponent() etc.
 * 2. A bundle migration is deployed that calls upgradeHostlessProject(), which
 *    upgrades hostless dependencies of projects that import hostless packages.
 *
 * For migrating dev bundles, we do both.  During dev bundle migration, when we see
 * upgradeHostlessProject(), then...
 *
 * - For bundles that correspond to hostless ProjectDependency, we perform the upgrade
 *   (by running registerComponent() etc) and save the upgraded dependency as a new
 *   bundle.
 * - For all other bundles, we check if there is an upgraded hostless project dependency,
 *   and if so, we upgradeProjectDeps() to swap to the new project dependency. This is like
 *   doing a normal upgradeHostlessProject().
 */
export async function upgradeHostlessProjectForDev(
  bundle: UnsafeBundle,
  entity: PkgVersion | ProjectRevision,
  db: MigrationDbMgr
) {
  const bundler = new Bundler();

  const { site, siteOrProjectDep } = await unbundleSite(
    bundler,
    bundle,
    db,
    entity
  );

  if (isHostLessPackage(site)) {
    const pkgVersion = entity as PkgVersion;
    // make up a new version number
    const newVersion = semver.inc(pkgVersion.version, "patch")!;
    const pkgVersions = await db.listPkgVersions(pkgVersion.pkgId, {});
    if (pkgVersions.length > 1) {
      // No need to upgrade; we've already been upgraded from a previous migration
      return;
    }
    // Run the new registerComponent() calls and update the site metadata
    await updateHostlessPackage(site, "", undefined as any);
    const newBundle = bundler.bundle(
      siteOrProjectDep,
      entity.id,
      bundle.version || "0-new-version"
    );
    newBundle.map[newBundle.root].version = newVersion;
    console.log(
      `\tPublishing new version of ${pkgVersion.pkgId}: ${pkgVersion.version} => ${newVersion}`
    );
    const newPkgVersion = await db.insertPkgVersion(
      pkgVersion.pkgId,
      newVersion,
      JSON.stringify(newBundle),
      [],
      "",
      0
    );
    console.log(
      `\tNew PkgVersion: ${newPkgVersion.id}@${newPkgVersion.version}`
    );

    // That's it; we don't need to touch `bundle`, as that `bundle` will retain the
    // same hostless metadata as the previous pkg version, and stamped with the new
    // bundle version by dev migrator.
  } else {
    const updatedDeps: {
      oldDep: ProjectDependency;
      newDep: ProjectDependency;
    }[] = [];
    for (const dep of site.projectDependencies) {
      if (isHostLessPackage(dep.site)) {
        const pkgVersions = await db.listPkgVersions(dep.pkgId, {});
        const newPkgVersion = pkgVersions.find((v) =>
          semver.gt(v.version, dep.version)
        );
        if (newPkgVersion) {
          const newDep = ensureKnownProjectDependency(
            (
              await unbundleSite(
                bundler,
                JSON.parse(newPkgVersion.model),
                db,
                newPkgVersion
              )
            ).siteOrProjectDep
          );
          updatedDeps.push({ oldDep: dep, newDep });
        }
      }
    }
    if (updatedDeps.length > 0) {
      console.log(
        `\tUpgrading project deps for ${entity.id}: ${updatedDeps
          .map(
            ({ oldDep, newDep }) =>
              `${oldDep.pkgId}: ${oldDep.version} => ${newDep.version}`
          )
          .join("; ")}; current deps: ${bundle.deps.join(", ")}`
      );
      for (const component of site.components) {
        trackComponentRoot(component);
        trackComponentSite(component, site);
      }
      upgradeProjectDeps(site, updatedDeps);
      const newBundle = bundler.bundle(
        siteOrProjectDep,
        entity.id,
        bundle.version || "0-new-version"
      );
      console.log(`\tNew deps for ${entity.id}: ${newBundle.deps.join(", ")}`);
      Object.assign(bundle, newBundle);
    }
  }
}
