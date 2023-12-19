// Must initialize globals early so that imported code can detect what
// environment we're running in.
import { spawn } from "@/wab/common";
import { DEFAULT_DATABASE_URI } from "@/wab/server/config";
import { PlumePkgMgr } from "@/wab/server/pkgs/plume-pkg-mgr";
import { initializeGlobals } from "@/wab/server/svr-init";
import { Bundler } from "@/wab/shared/bundler";
import { createSite } from "@/wab/sites";
import { EntityManager } from "typeorm";
import { getLastBundleVersion } from "./BundleMigrator";
import { ensureDbConnection } from "./DbCon";
import { initDb } from "./DbInitUtil";
import { DbMgr, normalActor, SUPER_USER } from "./DbMgr";

initializeGlobals();

async function createFakeUser(
  em: EntityManager,
  bundler: Bundler,
  userInfo: {
    firstName: string;
    lastName: string;
    email: string;
  }
) {
  const db0 = new DbMgr(em, SUPER_USER);

  const user = await db0.createUser({
    email: userInfo.email,
    firstName: userInfo.firstName,
    lastName: userInfo.lastName,
    password: "!53kr3tz!",
    needsIntroSplash: false,
    needsSurvey: false,
    needsTeamCreationPrompt: false,
  });
  await db0.markEmailAsVerified(user);
  const db = new DbMgr(em, normalActor(user.id));
  for (const projectNum of [1, 2]) {
    const { project } = await db.createProject({
      name: `Plasmic Project ${projectNum}`,
    });
    await db.updateProject({
      id: project.id,
      name: `The real Plasmic project ${projectNum}`,
    });
    await db.saveProjectRev({
      projectId: project.id,
      data: '{"hello": "world"}',
      revisionNum: 2,
      seqIdAssign: undefined,
    });
    const latest = await db.getLatestProjectRev(project.id);
    console.log(latest);
    // Need to set this back to the normal placeholder.
    const site = createSite();
    const siteBundle = bundler.bundle(site, "", await getLastBundleVersion());
    await db.saveProjectRev({
      projectId: project.id,
      data: JSON.stringify(siteBundle),
      revisionNum: 3,
      seqIdAssign: undefined,
    });
  }

  const projects = await db.listProjectsForSelf();
  return { user, projects };
}

export async function createDummyDb(em: EntityManager) {
  const db = new DbMgr(em, SUPER_USER);
  const bundler = new Bundler();

  await createFakeUser(em, bundler, {
    email: "admin@example.com",
    firstName: "Plasmic",
    lastName: "Admin",
  });
  await createFakeUser(em, bundler, {
    email: "user@example.com",
    firstName: "Plasmic",
    lastName: "User",
  });
  await createFakeUser(em, bundler, {
    email: "user2@example.com",
    firstName: "Plasmic",
    lastName: "User 2",
  });

  // Seed the Plume pkg, which must be done after some users have been created
  await new PlumePkgMgr(db).seedPlumePkg();
}

export async function main() {
  const con = await ensureDbConnection(DEFAULT_DATABASE_URI);
  await con.transaction(async (em) => {
    await initDb(em);
    await createDummyDb(em);
    console.log("done");
  });
}

if (require.main === module) {
  spawn(main());
}
