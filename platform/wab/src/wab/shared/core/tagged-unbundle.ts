import { ensureInstance } from "@/wab/shared/common";
import { Bundle, FastBundler } from "@/wab/shared/bundler";
import {
  ensureKnownProjectDependency,
  isKnownSite,
  ProjectDependency,
  Site,
} from "@/wab/shared/model/classes";
import { PkgVersionInfo } from "@/wab/shared/SharedApi";

export function unbundleSite(
  bundler: FastBundler,
  projectId: string,
  bundle: Bundle,
  depPkgInfos: PkgVersionInfo[]
) {
  const depPkgs = depPkgInfos.map(
    (info) => taggedUnbundle(bundler, info.model, info.id) as ProjectDependency
  );
  const siteOrDep = ensureInstance(
    taggedUnbundle(bundler, bundle, projectId, { updateDynamicBundle: true }),
    Site,
    ProjectDependency
  );
  return {
    site: isKnownSite(siteOrDep) ? siteOrDep : siteOrDep.site,
    depPkgs,
  };
}

export function unbundleProjectDependency(
  bundler: FastBundler,
  pkgInfo: PkgVersionInfo,
  depPkgInfos: PkgVersionInfo[]
) {
  const depPkgs = depPkgInfos.map(
    (info) => taggedUnbundle(bundler, info.model, info.id) as ProjectDependency
  );
  const projectDependency = ensureKnownProjectDependency(
    taggedUnbundle(bundler, pkgInfo.model, pkgInfo.id)
  );
  return { projectDependency, depPkgs };
}

/**
 * Unbundles and tags the `id` onto the unbundled object as `__bundleId`. Helps
 * with debugging only.
 */
export function taggedUnbundle(
  bundler: FastBundler,
  bundle: Bundle,
  id: string,
  opts?: { updateDynamicBundle: boolean }
) {
  const unbundled = opts?.updateDynamicBundle
    ? bundler.unbundleAndRecomputeParents(bundle, id)
    : bundler.unbundle(bundle, id);
  (unbundled as any).__bundleId = id;
  return unbundled;
}
