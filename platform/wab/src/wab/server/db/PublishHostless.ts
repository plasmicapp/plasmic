import { ensureKnownProjectDependency, Site } from "@/wab/classes";
import { assert, ensure, spawn } from "@/wab/common";
import { DEVFLAGS } from "@/wab/devflags";
import { updateHostlessPackage } from "@/wab/server/code-components/code-components";
import { DEFAULT_DATABASE_URI } from "@/wab/server/config";
import { ensureDevFlags } from "@/wab/server/workers/worker-utils";
import { ProjectId } from "@/wab/shared/ApiSchema";
import { Bundler } from "@/wab/shared/bundler";
import { assertSiteInvariants } from "@/wab/shared/site-invariants";
import fs from "fs";
import path from "path";
import semver from "semver";
import { EntityManager } from "typeorm";
import { unbundleSite } from "./bundle-migration-utils";
import {
  BUNDLE_MIGRATION_PATH,
  getAllMigrations,
  getLastBundleVersion,
  getMigratedBundle,
} from "./BundleMigrator";
import { ensureDbConnections, getDefaultConnection } from "./DbCon";
import { DbMgr, SUPER_USER } from "./DbMgr";

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

  if (updatedProjects.length > 0) {
    if (DEVFLAGS.autoUpgradeHostless) {
      console.log(
        "No migration needed since we're auto-upgrading the hostless projects."
      );
    } else {
      const migrations = await getAllMigrations();
      assert(
        migrations[migrations.length - 1].name.startsWith(
          `${migrations.length}-`
        ),
        () =>
          `${migrations.length}-th migration has unexpected format: ${
            migrations[migrations.length - 1].name
          }`
      );
      const newMigrationIndex = migrations.length + 1;
      assert(
        !migrations.some(({ name }) =>
          name.startsWith(`${newMigrationIndex}-`)
        ),
        () =>
          `Found unexpected migration: ${
            migrations.find(({ name }) =>
              name.startsWith(`${newMigrationIndex}-`)
            )?.name
          }`
      );
      const migrationFileName = `${newMigrationIndex}-migrate-hostless.ts`;
      const migrationContents = `import { upgradeHostlessProject, BundleMigrationType } from "../db/bundle-migration-utils";
import { UnbundledMigrationFn } from "../db/BundleMigrator";

// ${`migrates ${updatedProjects.join(", ")}`.trim()}
export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
  await upgradeHostlessProject(bundle, entity, db);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
`;
      console.log(`Creating migration script ${migrationFileName}`);
      fs.writeFileSync(
        path.join(BUNDLE_MIGRATION_PATH, migrationFileName),
        migrationContents
      );
    }
  } else {
    console.log("No migration needed");
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
