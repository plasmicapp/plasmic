import { updateHostlessPackage } from "@/wab/server/code-components/code-components";
import { DEFAULT_DATABASE_URI } from "@/wab/server/config";
import { unbundleSite } from "@/wab/server/db/bundle-migration-utils";
import {
  getLastBundleVersion,
  getMigratedBundle,
} from "@/wab/server/db/BundleMigrator";
import {
  ensureDbConnections,
  getDefaultConnection,
} from "@/wab/server/db/DbCon";
import { DbMgr, SUPER_USER } from "@/wab/server/db/DbMgr";
import { ensureDevFlags } from "@/wab/server/workers/worker-utils";
import { ProjectId } from "@/wab/shared/ApiSchema";
import { Bundler } from "@/wab/shared/bundler";
import { assert, ensure, spawn } from "@/wab/shared/common";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { ensureKnownProjectDependency, Site } from "@/wab/shared/model/classes";
import { assertSiteInvariants } from "@/wab/shared/site-invariants";
import semver from "semver";
import { EntityManager } from "typeorm";

const { Command } = require("commander");

async function publishHostlessProjects(em: EntityManager) {
  const db = new DbMgr(em, SUPER_USER);
  await ensureDevFlags(db);
  const hostLessWorkspaceId = DEVFLAGS.hostLessWorkspaceId;
  if (!hostLessWorkspaceId) {
    console.log("No hostless workspace ID");
    return;
  }
  const hostlessProjects = await db.getProjectsByWorkspaces([
    hostLessWorkspaceId,
  ]);
  assert(
    hostlessProjects.length > 0,
    () => "No projects found for workspace " + hostLessWorkspaceId
  );
  const plumeSite = await loadPlumeSite(db);

  const updatedProjects: string[] = [];

  for (const project of hostlessProjects) {
    const projectId = project.id;
    console.log("=====================================");
    console.log(`Updating project ${project.name} - ${projectId}`);

    if (DEVFLAGS.manuallyUpdatedHostLessProjectIds.includes(projectId)) {
      console.log(
        `Skipping project ${project.name} - ${projectId} (marked for manual updating)`
      );
      updatedProjects.push(project.name);
      continue;
    }

    if (await publishHostlessProject(db, projectId, { plumeSite })) {
      console.log("\tProject updated");
      updatedProjects.push(project.name);
    } else {
      console.log("\tNo changes detected");
    }
  }
}

export async function publishHostlessProject(
  db: DbMgr,
  projectId: ProjectId,
  opts?: {
    plumeSite?: Site;
  }
) {
  const project = await db.getProjectById(projectId);
  const plumeSite = opts?.plumeSite ?? (await loadPlumeSite(db));

  const pkgId = ensure(
    await db.getPkgByProjectId(projectId),
    () =>
      "Expected pkgId to exist - should manually publish the first version of hostless projects"
  ).id;
  const latestVersion = await db.getPkgVersion(pkgId);
  const bundler = new Bundler();
  const bundle = await getMigratedBundle(latestVersion);
  const { siteOrProjectDep } = await unbundleSite(
    bundler,
    bundle,
    db,
    latestVersion
  );
  const site = ensureKnownProjectDependency(siteOrProjectDep).site;
  await updateHostlessPackage(site, project.name, plumeSite);
  const newBundle = bundler.bundle(
    siteOrProjectDep,
    latestVersion.id,
    await getLastBundleVersion()
  );

  if (JSON.stringify(bundle) === JSON.stringify(newBundle)) {
    return false;
  }

  // Make sure the new bundle isn't broken
  assertSiteInvariants(site);
  console.log("Saving new version and publishing...");
  // Make sure we're able to identify whether the project changed or not
  await updateHostlessPackage(site, project.name, plumeSite);
  const newBundle2 = bundler.bundle(
    siteOrProjectDep,
    latestVersion.id,
    await getLastBundleVersion()
  );

  assert(
    JSON.stringify(newBundle) === JSON.stringify(newBundle2),
    () => "Re-applying the changes resulted in a different bundle!"
  );

  const projectBundle = bundler.bundle(
    site,
    // We use the pkgVersion id because that's what we used to unbundle
    latestVersion.id,
    await getLastBundleVersion()
  );

  const rev = await db.getLatestProjectRev(projectId);
  await db.saveProjectRev({
    projectId,
    data: JSON.stringify(projectBundle),
    revisionNum: rev.revision + 1,
  });

  await db.publishProject(
    projectId,
    semver.inc(latestVersion.version, "minor") ?? undefined,
    [],
    ""
  );
  return true;
}

async function loadPlumeSite(db: DbMgr) {
  const plumePkgVersion = await db.getPlumePkgVersion();
  const plumeSite = ensureKnownProjectDependency(
    (
      await unbundleSite(
        new Bundler(),
        await getMigratedBundle(plumePkgVersion),
        db,
        plumePkgVersion
      )
    ).siteOrProjectDep
  ).site;
  return plumeSite;
}

async function main() {
  console.log("Start script...");
  const opts = new Command("custom-script")
    .option("-db, --dburi <dburi>", "Database uri", DEFAULT_DATABASE_URI)
    .parse(process.argv)
    .opts();
  await ensureDbConnections(opts.dburi, {
    useEnvPassword: true,
  });
  const con = await getDefaultConnection();

  await con.transaction(async (em) => {
    await publishHostlessProjects(em);
  });
}

if (require.main === module) {
  spawn(
    main().catch((err) => {
      console.error(err);
      process.exit(1);
    })
  );
}
