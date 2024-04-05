import { ProjectDependency } from "@/wab/classes";
import { assert, spawn, spawnWrapper } from "@/wab/common";
import { DEFAULT_DATABASE_URI } from "@/wab/server/config";
import { getLastBundleVersion } from "@/wab/server/db/BundleMigrator";
import { unbundleWithDeps } from "@/wab/server/db/DbBundleLoader";
import { ensureDbConnection } from "@/wab/server/db/DbCon";
import { DbMgr, SUPER_USER } from "@/wab/server/db/DbMgr";
import { Pkg, PkgVersion, User } from "@/wab/server/entities/Entities";
import { Bundle, Bundler } from "@/wab/shared/bundler";
import fs from "fs";
import fetch from "node-fetch";
import path from "path";
import yargs from "yargs";

// This is the right Plume PkgVersion.version to use. You can publish
// newer versions of Plume, but they will not be used until this
// constant is updated to point to them. This makes it possible to
// update Plume project, publish a new version, save the json to
// git, and run tests against it in cypress before it is live in prod.
export const REAL_PLUME_VERSION = "19.4.2";

export class PlumePkgMgr {
  constructor(private db: DbMgr) {}

  /**
   * Seeds a fresh database with an initial plume pkg
   */
  async seedPlumePkg() {
    assert(
      !(await this.tryGetPlumePkg()),
      "Not expecting a plume pkg to already exist"
    );

    // Create a new project for Plume, owned by the "oldest" user
    const user = await this.db
      .getEntMgr()
      .getRepository(User)
      .createQueryBuilder()
      .orderBy({
        '"createdAt"': "ASC",
      })
      .limit(1)
      .getOneOrFail();
    const { project } = await this.db.createProject({
      name: "[Plume] MASTER",
      ownerId: user.id,
    });
    console.log(
      `Created Plume master project ${project.id} for user ${user.email}`
    );

    // Create the Plume pkg linked to that project, so that the developer
    // can continue updating the project and publishing new changes locally
    const pkg = await this.db.createSysPkg("plume", project.id);

    await this.upsertLatestPlume(pkg);
  }

  /**
   * Updates the existing plume pkg to be the content of plume-master-pkg.json
   */
  async upgradePlumePkg() {
    console.log("Upgrading Plume...");
    const pkg = await this.tryGetPlumePkg();
    if (!pkg) {
      console.log("Creating Plume pkg for the first time...");
      await this.seedPlumePkg();
      return;
    }

    await this.upsertLatestPlume(pkg);
  }

  private async upsertLatestPlume(pkg: Pkg) {
    const rev = await this.db.getLatestProjectRev(pkg.projectId);

    const bundler = new Bundler();
    const pkgBundle = await this.getBundledPlumePkg();
    const dep = (await unbundleWithDeps(
      this.db,
      bundler,
      pkg.projectId,
      pkgBundle
    )) as ProjectDependency;

    const deleteRes = await this.db
      .getEntMgr()
      .getRepository(PkgVersion)
      .delete({
        pkgId: pkg.id,
      });
    console.log(`Deleting existing versions (there are ${deleteRes.affected})`);

    console.log("Updating to Plume package version", dep.version);
    const newRev = await this.db.saveProjectRev({
      projectId: rev.projectId,
      data: JSON.stringify(
        bundler.bundle(dep.site, rev.projectId, await getLastBundleVersion())
      ),
      revisionNum: rev.revision + 1,
    });
    await this.db.insertPkgVersion(
      pkg.id,
      dep.version,
      JSON.stringify(pkgBundle),
      [],
      "",
      newRev.revision
    );
  }

  async getBundledPlumePkg(): Promise<Bundle> {
    const bundle = parsePlumeMasterPkg();
    assert(bundle.deps.length === 0, "Unexpected plume bundle dep");
    return bundle;
  }

  private async tryGetPlumePkg() {
    return await this.db
      .getEntMgr()
      .getRepository(Pkg)
      .findOne({
        where: {
          sysname: "plume",
        },
      });
  }
}

function parsePlumeMasterPkg() {
  return JSON.parse(
    fs.readFileSync(path.join(__dirname, "plume-master-pkg.json")).toString()
  ) as Bundle;
}

async function updatePlumePkg() {
  const con = await ensureDbConnection(DEFAULT_DATABASE_URI, "default");
  await con.transaction(async (em) => {
    const db = new DbMgr(em, SUPER_USER);
    const mgr = new PlumePkgMgr(db);
    await mgr.upgradePlumePkg();
  });
}

async function checkPlumeVersion() {
  const bundle = parsePlumeMasterPkg();
  const depVersion = bundle.map[bundle.root].version;
  if (depVersion !== REAL_PLUME_VERSION) {
    throw new Error(
      `plume-master-pkg.json has version ${depVersion}, but REAL_PLUME_VERSION is ${REAL_PLUME_VERSION}; did you forget to update plume-master-pkg.json or REAL_PLUME_VERSION?`
    );
  }

  // TODO: replace with prod URL once supported on prod
  const resp = await fetch(
    "https://studio.plasmic.app/api/v1/plume-pkg/versions"
  );
  const data = await resp.json();
  if (!data.versions.includes(REAL_PLUME_VERSION)) {
    throw new Error(
      `REAL_PLUME_VERSION is not one of the published Plume pkg versions!`
    );
  }
}

export async function main() {
  await yargs
    .usage("Usage: $0 <command> [options]")
    .command(
      "update",
      "Updates the Plume pkg locally",
      spawnWrapper(updatePlumePkg)
    )
    .command(
      "check",
      "Checks that plume-master-pkg.json matches REAL_PLUME_VERSION",
      spawnWrapper(async () => {
        try {
          await checkPlumeVersion();
        } catch (err) {
          console.error(err);
          process.exit(1);
        }
      })
    )
    .demandCommand()
    .help("h")
    .alias("h", "help").argv;
}

if (require.main === module) {
  spawn(main());
}
