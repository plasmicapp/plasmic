import * as classes from "@/wab/classes";
import { ensure, strictZip } from "@/wab/common";
import {
  getMigratedBundle,
  MigrationDbMgr,
} from "@/wab/server/db/BundleMigrator";
import { DbMgr } from "@/wab/server/db/DbMgr";
import { PkgVersion, ProjectRevision } from "@/wab/server/entities/Entities";
import { Bundle, Bundler } from "@/wab/shared/bundler";
import { parseBundle, UnsafeBundle } from "@/wab/shared/bundles";
import L from "lodash";

/**
 * Returns all PkgVersion entities that the argument `bundle` transitively
 * depends on.  Returns them in the order that they should be unbundled in.
 *
 * If extendTokens is set to be true, the dbMgr projectIdAndTokens will be
 * incremented before accessing data of dependency packages, it's expected
 * this to be true only it was previously checked if the request has auth
 * to the bundle package and the request was made using projectIdAndTokens
 */
export async function loadDepPackages(
  dbMgr: MigrationDbMgr,
  bundle: UnsafeBundle | UnsafeBundle[],
  opts?: {
    extendTokens?: boolean;
    dontMigrateBundle?: boolean;
  }
) {
  const deps: string[] = [];
  const loadedPkgs: Record<string, PkgVersion> = {};
  const pkg2DirectDeps: Record<string, string[]> = {};
  let bundlesToCheck = Array.isArray(bundle) ? [...bundle] : [bundle];
  while (bundlesToCheck.length > 0) {
    const newDeps = L.uniq(L.flatten(bundlesToCheck.map((b) => b.deps))).filter(
      (id) => !deps.includes(id)
    );
    if (newDeps.length === 0) {
      break;
    }
    deps.push(...newDeps);
    if (opts?.extendTokens) {
      // TODO: do a single query to the db, instead of N
      await Promise.all(
        newDeps.map((id) => dbMgr.extendProjectIdAndTokens(id))
      );
    }
    const depPkgs = await Promise.all(
      newDeps.map((id) => dbMgr.getPkgVersionById(id))
    );

    bundlesToCheck = [];
    for (const [id, depPkg] of strictZip(newDeps, depPkgs)) {
      loadedPkgs[id] = depPkg;
      const pkgBundle = opts?.dontMigrateBundle
        ? parseBundle(depPkg)
        : await getMigratedBundle(depPkg);
      bundlesToCheck.push(pkgBundle);
      pkg2DirectDeps[id] = pkgBundle.deps;
    }
  }

  const orderedDeps = flattenDeps(pkg2DirectDeps);
  return orderedDeps.map((id) => loadedPkgs[id]);
}

/**
 * Given a Bundle, and a function from pkgVersion/id to bundle, returns an
 * ordered list of PkgVersion.ids that need to be unbundled before `bundle`
 * can be unbundled and their bundles.
 */
export async function getOrderedDepBundleIds(
  bundle: Bundle,
  getPkgVersionBundleFromId: (id: string) => Promise<Bundle>
) {
  const pkg2DirectDeps: Record<string, string[]> = {};
  const pkgVersionIdToBundle: Record<string, Bundle> = {};

  const recordBundleDeps = async (id: string) => {
    if (id in pkg2DirectDeps) {
      // already seen this id before
      return;
    }
    const bund = await ensure(
      getPkgVersionBundleFromId(id),
      "pkg version bundle must exist at this point"
    );
    pkgVersionIdToBundle[id] = bund;
    pkg2DirectDeps[id] = [...bund.deps];
    for (const dep of bund.deps) {
      await recordBundleDeps(dep);
    }
  };

  for (const dep of bundle.deps) {
    await recordBundleDeps(dep);
  }

  return flattenDeps(pkg2DirectDeps).map(
    (id) =>
      [
        id,
        ensure(
          pkgVersionIdToBundle[id],
          "pkg version id to bundle must exist at this point"
        ),
      ] as const
  );
}

/**
 * Given a map from id to ids of its dependencies, returns a list
 * of strings in "loading order" -- if you load from the start to
 * the end of the string, then each id's dependencies would've been
 * loaded when you got to it.
 */
export function flattenDeps(id2deps: Record<string, string[]>) {
  const result: string[] = [];

  const addDeps = (id: string, seen: Set<string>) => {
    const deps = id2deps[id];
    if (deps) {
      for (const dep of deps) {
        if (seen.has(dep)) {
          throw new Error(`Cycle detected for ${id}`);
        }
        if (!result.includes(dep)) {
          addDeps(dep, seen);
        }
      }
    }
    result.push(id);
  };

  for (const id of L.keys(id2deps)) {
    if (!result.includes(id)) {
      addDeps(id, new Set([id]));
    }
  }
  return result;
}

export async function unbundleWithDeps(
  dbMgr: DbMgr,
  bundler: Bundler,
  id: string,
  bundle: Bundle
) {
  console.log(`Unbundling with deps ${id}`);
  const depPkgs = await loadDepPackages(dbMgr, bundle);
  for (const depPkg of depPkgs) {
    const depBundle = await getMigratedBundle(depPkg);
    bundler.unbundle(depBundle, depPkg.id);
  }
  return bundler.unbundle(bundle, id);
}

export async function unbundleProjectFromData(
  dbMgr: DbMgr,
  bundler: Bundler,
  rev: ProjectRevision,
  unbundleId?: string
) {
  return unbundleProjectFromBundle(dbMgr, bundler, {
    bundle: await getMigratedBundle(rev),
    projectId: unbundleId ?? rev.projectId,
  });
}

export async function unbundleProjectFromBundle(
  dbMgr: DbMgr,
  bundler: Bundler,
  rev: { bundle: Bundle; projectId: string }
) {
  const site = await unbundleWithDeps(
    dbMgr,
    bundler,
    rev.projectId,
    rev.bundle
  );
  return site as classes.Site;
}

export async function unbundlePkgVersion(
  dbMgr: DbMgr,
  bundler: Bundler,
  pkgVersion: PkgVersion
) {
  const bundle = await getMigratedBundle(pkgVersion);
  const result = await unbundleWithDeps(dbMgr, bundler, pkgVersion.id, bundle);
  return result as classes.ProjectDependency;
}
