import { upgradeProjectDeps } from "@/wab/shared/core/project-deps";
import { unbundleSite } from "@/wab/server/db/bundle-migration-utils";
import {
  getLastBundleVersion,
  getMigratedBundle,
} from "@/wab/server/db/BundleMigrator";
import { DbMgr } from "@/wab/server/db/DbMgr";
import { publishHostlessProject } from "@/wab/server/db/PublishHostless";
import { ProjectId } from "@/wab/shared/ApiSchema";
import { Bundler } from "@/wab/shared/bundler";
import {
  ensureKnownProjectDependency,
  ProjectDependency,
} from "@/wab/shared/model/classes";
import { isHostLessPackage } from "@/wab/shared/core/sites";
import { trackComponentRoot, trackComponentSite } from "@/wab/shared/core/tpls";

/**
 * Upgrades the hostless projects imported by `projectId` by running the
 * upgrade-hostless-projects code (running the registerAll() functions and
 * updating the metadata), and then updating the project to use the latest
 * hostless versions.  This works for any imported dep that is a hostless project,
 * and doesn't have to be a project that is in the hostless workspace.
 *
 * This is mainly used for dev and for testing, where you may have imported
 * a JSON bundle that includes a bunch of hostless packages, and you want to
 * update those.
 */
export async function upgradeReferencedHostlessDeps(
  db: DbMgr,
  projectId: ProjectId
) {
  const projectRev = await db.getLatestProjectRev(projectId);
  const bundler = new Bundler();
  const { site, siteOrProjectDep } = await unbundleSite(
    bundler,
    JSON.parse(projectRev.data),
    db,
    projectRev
  );

  const updatedDeps: {
    oldDep: ProjectDependency;
    newDep: ProjectDependency;
  }[] = [];
  for (const dep of site.projectDependencies) {
    if (isHostLessPackage(dep.site)) {
      if (await publishHostlessProject(db, dep.projectId as ProjectId)) {
        const oldDep = dep;
        const pkgVersion = await db.getPkgVersion(dep.pkgId);
        console.log(
          `Upgrading ${dep.name} from ${oldDep.version} to ${pkgVersion.version}`
        );
        const newDep = ensureKnownProjectDependency(
          (
            await unbundleSite(
              bundler,
              await getMigratedBundle(pkgVersion),
              db,
              pkgVersion
            )
          ).siteOrProjectDep
        );
        updatedDeps.push({ oldDep, newDep });
      }
    }
  }

  if (updatedDeps.length > 0) {
    for (const component of site.components) {
      trackComponentRoot(component);
      trackComponentSite(component, site);
    }
    upgradeProjectDeps(site, updatedDeps);
    const newBundle = bundler.bundle(
      siteOrProjectDep,
      projectRev.id,
      await getLastBundleVersion()
    );
    await db.saveProjectRev({
      projectId,
      data: JSON.stringify(newBundle),
      revisionNum: projectRev.revision + 1,
    });
  }
}
