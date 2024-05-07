import { withoutUids } from "@/wab/model/model-meta";
import {
  unbundlePkgVersion,
  unbundleProjectFromData,
} from "@/wab/server/db/DbBundleLoader";
import { DbMgr } from "@/wab/server/db/DbMgr";
import { ProjectId } from "@/wab/shared/ApiSchema";
import { Bundler } from "@/wab/shared/bundler";
import {
  calculateSemVer,
  compareSites,
  INITIAL_VERSION_NUMBER,
} from "@/wab/shared/site-diffs";
import semver from "semver";

export async function createBranchFromBase(
  mgr: DbMgr,
  projectId: ProjectId,
  branchName: string,
  base: "new" | "latest" = "latest"
) {
  const maybePublishProjectForBranching = async () => {
    if (base === "latest") {
      return;
    }
    const latestRev = await mgr.getLatestProjectRev(projectId);
    const latestPkg = await mgr.getPkgByProjectId(projectId);
    const bundler = new Bundler();
    const latestRevSite = await unbundleProjectFromData(
      mgr,
      bundler,
      latestRev,
      `rev-${projectId}`
    );
    const pkgVersion = latestPkg
      ? await mgr.getPkgVersion(latestPkg.id)
      : undefined;
    const latestPkgSite = pkgVersion
      ? (await unbundlePkgVersion(mgr, bundler, pkgVersion)).site
      : undefined;

    // The newest version is equal to the latest PkgVersion
    if (
      pkgVersion &&
      JSON.stringify(withoutUids(latestRevSite)) ===
        JSON.stringify(withoutUids(latestPkgSite))
    ) {
      return;
    }

    const version =
      pkgVersion && latestPkgSite
        ? semver.inc(
            pkgVersion.version,
            calculateSemVer(compareSites(latestRevSite, latestPkgSite))
          )
        : INITIAL_VERSION_NUMBER;
    if (!version) {
      throw new Error("Invalid version number found: " + pkgVersion?.version);
    }
    await mgr.publishProject(
      projectId,
      version,
      [],
      "Auto-generated publish for branching"
    );
  };

  await maybePublishProjectForBranching();
  return await mgr.createBranchFromLatestPkgVersion(projectId, {
    name: branchName,
  });
}
