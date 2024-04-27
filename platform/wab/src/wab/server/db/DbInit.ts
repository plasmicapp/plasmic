// Must initialize globals early so that imported code can detect what
// environment we're running in.
import { spawn } from "@/wab/common";
import { DEFAULT_DATABASE_URI } from "@/wab/server/config";
import { getLastBundleVersion } from "@/wab/server/db/BundleMigrator";
import { ensureDbConnection } from "@/wab/server/db/DbCon";
import { initDb } from "@/wab/server/db/DbInitUtil";
import { DbMgr, normalActor, SUPER_USER } from "@/wab/server/db/DbMgr";
import { FeatureTier, Team, User } from "@/wab/server/entities/Entities";
import { PlumePkgMgr } from "@/wab/server/pkgs/plume-pkg-mgr";
import { initializeGlobals } from "@/wab/server/svr-init";
import { Bundler } from "@/wab/shared/bundler";
import { createSite } from "@/wab/sites";
import { EntityManager } from "typeorm";

initializeGlobals();

if (require.main === module) {
  spawn(main());
}

async function main() {
  const con = await ensureDbConnection(DEFAULT_DATABASE_URI, "default");
  await con.transaction(async (em) => {
    await initDb(em);
    await seedTestDb(em);
    console.log("done");
  });
}

export async function seedTestDb(em: EntityManager) {
  const db = new DbMgr(em, SUPER_USER);
  const bundler = new Bundler();

  const { user: adminUser } = await seedTestUserAndProjects(em, bundler, {
    email: "admin@example.com",
    firstName: "Plasmic",
    lastName: "Admin",
  });
  const { user: user1 } = await seedTestUserAndProjects(em, bundler, {
    email: "user@example.com",
    firstName: "Plasmic",
    lastName: "User",
  });
  const { user: user2 } = await seedTestUserAndProjects(em, bundler, {
    email: "user2@example.com",
    firstName: "Plasmic",
    lastName: "User 2",
  });

  const { enterpriseFt, teamFt, proFt, starterFt } = await seedTestFeatureTiers(
    em
  );

  const enterpriseOrg = await seedTeam(
    em,
    user1,
    "Test Enterprise Org",
    enterpriseFt
  );
  await seedTeam(
    em,
    user1,
    "Test Enterprise Child Org A",
    enterpriseFt,
    enterpriseOrg
  );
  await seedTeam(
    em,
    user1,
    "Test Enterprise Child Org B",
    enterpriseFt,
    enterpriseOrg
  );
  await seedTeam(em, user1, "Test Scale Org", teamFt);
  await seedTeam(em, user2, "Test Pro Org", proFt);
  await seedTeam(em, user2, "Test Starter Org", starterFt);

  await seedTestPromotionCodes(em);

  // Seed the Plume pkg, which must be done after some users have been created
  await new PlumePkgMgr(db).seedPlumePkg();
}

async function seedTestUserAndProjects(
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
    });
    await db.getLatestProjectRev(project.id);

    // Need to set this back to the normal placeholder.
    const site = createSite();
    const siteBundle = bundler.bundle(site, "", await getLastBundleVersion());
    await db.saveProjectRev({
      projectId: project.id,
      data: JSON.stringify(siteBundle),
      revisionNum: 3,
    });
  }

  const projects = await db.listProjectsForSelf();

  console.log(
    `Inserted user id=${user.id} email=${
      user.email
    } with projects ids=${projects.map((p) => p.id).join(",")}`
  );

  return { user, projects };
}

/**
 * These feature tiers have Stripe IDs that map to our Stripe testmode account.
 * See docs/contributing/platform/02-integrations.md
 */
async function seedTestFeatureTiers(em: EntityManager) {
  const db0 = new DbMgr(em, SUPER_USER);
  return {
    enterpriseFt: await db0.addFeatureTier({
      name: "Enterprise",
      monthlyBasePrice: null,
      monthlyBaseStripePriceId: null,
      annualBasePrice: null,
      annualBaseStripePriceId: null,
      monthlySeatPrice: 80,
      monthlySeatStripePriceId: "price_1Ji3EFHIopbCiFeiUCtiVOyB",
      annualSeatPrice: 768,
      annualSeatStripePriceId: "price_1Ji3EFHIopbCiFeiSj0U8o1K",
      minUsers: 30,
      maxUsers: 1_000,
      maxWorkspaces: 10_000,
      monthlyViews: 1_000_000,
      versionHistoryDays: 180,
      analytics: true,
      contentRole: true,
      designerRole: true,
      editContentCreatorMode: true,
      localization: true,
      splitContent: true,
      privateUsersIncluded: null,
      maxPrivateUsers: null,
      publicUsersIncluded: null,
      maxPublicUsers: null,
    }),
    teamFt: await db0.addFeatureTier({
      name: "Team",
      monthlyBasePrice: 499,
      monthlyBaseStripePriceId: "price_1N9VlSHIopbCiFeiTU6RyL48",
      annualBasePrice: 4_788,
      annualBaseStripePriceId: "price_1N9VlSHIopbCiFeibn88Ezt0",
      monthlySeatPrice: 40,
      monthlySeatStripePriceId: "price_1N9VlxHIopbCiFeiLf3ngIwB",
      annualSeatPrice: 384,
      annualSeatStripePriceId: "price_1N9VlxHIopbCiFeicxycQNAp",
      minUsers: 8,
      maxUsers: 30,
      maxWorkspaces: 300,
      monthlyViews: 500_000,
      versionHistoryDays: 180,
      analytics: true,
      contentRole: true,
      designerRole: true,
      editContentCreatorMode: true,
      localization: true,
      splitContent: true,
      privateUsersIncluded: null,
      maxPrivateUsers: null,
      publicUsersIncluded: null,
      maxPublicUsers: null,
    }),
    proFt: await db0.addFeatureTier({
      name: "Pro",
      monthlyBasePrice: 129,
      monthlyBaseStripePriceId: "price_1N9VkLHIopbCiFeiSChtf6dV",
      annualBasePrice: 1_236,
      annualBaseStripePriceId: "price_1N9VkLHIopbCiFeiFsiEryvl",
      monthlySeatPrice: 20,
      monthlySeatStripePriceId: "price_1N9VkpHIopbCiFeiNptqZ2BR",
      annualSeatPrice: 192,
      annualSeatStripePriceId: "price_1N9VkpHIopbCiFeiMi50AFEk",
      minUsers: 4,
      maxUsers: 10,
      maxWorkspaces: 100,
      monthlyViews: 250_000,
      versionHistoryDays: 90,
      analytics: false,
      contentRole: false,
      designerRole: false,
      editContentCreatorMode: false,
      localization: false,
      splitContent: false,
      privateUsersIncluded: null,
      maxPrivateUsers: null,
      publicUsersIncluded: null,
      maxPublicUsers: null,
    }),
    starterFt: await db0.addFeatureTier({
      name: "Starter",
      monthlyBasePrice: 49,
      monthlyBaseStripePriceId: "price_1N9VirHIopbCiFeicbMYaVhb",
      annualBasePrice: 468,
      annualBaseStripePriceId: "price_1N9VirHIopbCiFeiPRRXpINo",
      monthlySeatPrice: 0,
      monthlySeatStripePriceId: "price_1N9VjhHIopbCiFeic0V8lDJX",
      annualSeatPrice: 0,
      annualSeatStripePriceId: "price_1N9VjhHIopbCiFeiViCs7zEH",
      minUsers: 4,
      maxUsers: 10,
      maxWorkspaces: 100,
      monthlyViews: 250_000,
      versionHistoryDays: 90,
      analytics: false,
      contentRole: false,
      designerRole: false,
      editContentCreatorMode: false,
      localization: false,
      splitContent: false,
      privateUsersIncluded: null,
      maxPrivateUsers: null,
      publicUsersIncluded: null,
      maxPublicUsers: null,
    }),
  };
}

async function seedTeam(
  em: EntityManager,
  user: User,
  name: string,
  featureTier: FeatureTier,
  parentTeam?: Team
) {
  const db = new DbMgr(em, normalActor(user.id));
  let team = await db.createTeam(name);

  const db0 = new DbMgr(em, SUPER_USER);
  team = await db0.sudoUpdateTeam({
    id: team.id,
    featureTierId: featureTier.id,
    parentTeamId: parentTeam?.id,
  });

  console.log(
    `Inserted team id=${team.id} name=${team.name} owned by user id=${user.id} email=${user.email} with feature tier id=${featureTier.id} name=${featureTier.name}`
  );

  return team;
}

async function seedTestPromotionCodes(em: EntityManager) {
  const db0 = new DbMgr(em, SUPER_USER);
  await db0.createPromotionCode(
    "FREETESTING",
    "FREETESTING - Free trial for testing",
    30,
    null
  );
}
