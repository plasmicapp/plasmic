// Must initialize globals early so that imported code can detect what
// environment we're running in.
import { loadConfig } from "@/wab/server/config";
import { getLastBundleVersion } from "@/wab/server/db/BundleMigrator";
import { ensureDbConnection } from "@/wab/server/db/DbCon";
import { initDb } from "@/wab/server/db/DbInitUtil";
import {
  DbMgr,
  DEFAULT_DEV_PASSWORD,
  normalActor,
  SUPER_USER,
} from "@/wab/server/db/DbMgr";
import { seedTestFeatureTiers } from "@/wab/server/db/seed/feature-tier";
import { FeatureTier, Team, User } from "@/wab/server/entities/Entities";
import { getBundleInfo, PkgMgr } from "@/wab/server/pkg-mgr";
import { initializeGlobals } from "@/wab/server/svr-init";
import { Bundler } from "@/wab/shared/bundler";
import { ensureType, spawn } from "@/wab/shared/common";
import { defaultComponentKinds } from "@/wab/shared/core/components";
import { createSite } from "@/wab/shared/core/sites";
import { InsertableTemplatesGroup, Installable } from "@/wab/shared/devflags";
import {
  InsertableId,
  PLEXUS_INSERTABLE_ID,
  PLUME_INSERTABLE_ID,
} from "@/wab/shared/insertables";
import { kebabCase, startCase } from "lodash";
import { EntityManager } from "typeorm";

initializeGlobals();

if (require.main === module) {
  spawn(main());
}

async function main() {
  const config = loadConfig();
  const con = await ensureDbConnection(config.databaseUri, "default");
  await con.transaction(async (em) => {
    await initDb(em);
    await seedTestDb(em);
    console.log("done");
  });
}

export async function seedTestDb(em: EntityManager) {
  const db = new DbMgr(em, SUPER_USER);

  // admin@admin.example.com is an admin user because of its admin.com domain name
  // (see `isCoreTeamEmail`), meaning it will receive elevated privileges and
  // doesn't behave like normal accounts.
  // AVOID TESTING WITH THIS ACCOUNT.
  const { user: adminUser } = await seedTestUserAndProjects(em, {
    email: "admin@admin.example.com",
    firstName: "Plasmic",
    lastName: "Admin",
  });
  // user@example.com and user2@example.com behave like normal accounts.
  const { user: user1 } = await seedTestUserAndProjects(em, {
    email: "user@example.com",
    firstName: "Plasmic",
    lastName: "User",
  });
  const { user: user2 } = await seedTestUserAndProjects(em, {
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

  // Seed the special pkgs, which must be done after some users have been created
  const sysnames: InsertableId[] = [PLUME_INSERTABLE_ID, PLEXUS_INSERTABLE_ID];
  await Promise.all(
    sysnames.map(async (sysname) => await new PkgMgr(db, sysname).seedPkg())
  );

  const plexusBundleInfo = getBundleInfo(PLEXUS_INSERTABLE_ID);

  await db.setDevFlagOverrides(
    JSON.stringify(
      {
        plexus: true,
        installables: ensureType<Installable[] | undefined>([
          {
            type: "ui-kit",
            isInstallOnly: true,
            isNew: true,
            name: "Plasmic Design System",
            projectId: plexusBundleInfo.projectId,
            imageUrl: "https://static1.plasmic.app/plasmic-logo.png",
            entryPoint: {
              type: "arena",
              name: "Components",
            },
          },
        ]),
        insertableTemplates: ensureType<InsertableTemplatesGroup | undefined>({
          type: "insertable-templates-group",
          name: "root",
          // The below achieves the following for each plexus component:
          // {
          //   "type": "insertable-templates-component",
          //   "projectId": "mSQqkNd8CL5vNdDTXJPXfU",
          //   "componentName": "Plexus Button",
          //   "templateName": "plexus/button",
          //   "imageUrl": "https://static1.plasmic.app/antd_button.svg"
          // }
          items: [
            {
              type: "insertable-templates-group" as const,
              name: "Components",
              items: Object.keys(defaultComponentKinds).map((item) => ({
                componentName: startCase(item),
                templateName: `${plexusBundleInfo.sysname}/${kebabCase(item)}`,
                imageUrl: `https://static1.plasmic.app/insertables/${kebabCase(
                  item
                )}.svg`,
                type: "insertable-templates-component" as const,
                projectId: plexusBundleInfo.projectId,
                tokenResolution: "reuse-by-name" as const,
              })),
            },
          ].filter((insertableGroup) => insertableGroup.items.length > 0),
        }),
        insertPanelContent: {
          aliases: {
            // Components provided by @plasmicapp/react-web
            dataFetcher: "builtincc:plasmic-data-source-fetcher",
            pageMeta: "builtincc:hostless-plasmic-head",

            // Default components
            ...Object.keys(defaultComponentKinds).reduce((acc, defaultKind) => {
              acc[defaultKind] = `default:${defaultKind}`;
              return acc;
            }, {}),
          },
          builtinSections: {
            Home: {
              Basic: [
                "text",
                "heading",
                "link",
                "linkContainer",
                "section",
                "columns",
                "vstack",
                "hstack",
                "grid",
                "box",
                "image",
                "icon",
              ],
              // This may use Plexus or Plume depending on the `plexus` devflag
              "Customizable components": Object.keys(defaultComponentKinds),
              Advanced: ["pageMeta", "dataFetcher"],
            },
          },
          // Install all button
          builtinSectionsInstallables: {
            // We only need it for Plexus
            "Customizable components": plexusBundleInfo.projectId,
          },
        },
      },
      null,
      2
    )
  );
}

export async function seedTestUserAndProjects(
  em: EntityManager,
  userInfo: {
    email: string;
    password?: string;
    firstName?: string;
    lastName?: string;
  },
  numProjects = 2
) {
  const db0 = new DbMgr(em, SUPER_USER);

  const user = await db0.createUser({
    email: userInfo.email,
    password: userInfo.password || DEFAULT_DEV_PASSWORD,
    firstName: userInfo.firstName || "Plasmic",
    lastName: userInfo.lastName || "User",
    needsIntroSplash: false,
    needsSurvey: false,
    needsTeamCreationPrompt: false,
  });
  await db0.markEmailAsVerified(user);
  const db = new DbMgr(em, normalActor(user.id));
  for (let projectNum = 1; projectNum <= numProjects; ++projectNum) {
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
    const siteBundle = new Bundler().bundle(
      site,
      "",
      await getLastBundleVersion()
    );
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
