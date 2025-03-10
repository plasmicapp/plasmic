// Must initialize globals early so that imported code can detect what
// environment we're running in.
import { DEFAULT_DATABASE_URI } from "@/wab/server/config";
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
import {
  getBundleInfo,
  getDevflagForInsertableTemplateItem,
  PkgMgr,
} from "@/wab/server/pkg-mgr";
import { initializeGlobals } from "@/wab/server/svr-init";
import { Bundler } from "@/wab/shared/bundler";
import { ensureType, spawn } from "@/wab/shared/common";
import { createSite } from "@/wab/shared/core/sites";
import { InsertableTemplatesGroup, Installable } from "@/wab/shared/devflags";
import {
  InsertableId,
  PLEXUS_INSERTABLE_ID,
  PLUME_INSERTABLE_ID,
} from "@/wab/shared/insertables";
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
            projectId: getBundleInfo(PLEXUS_INSERTABLE_ID).projectId,
            imageUrl: "https://static1.plasmic.app/plasmic-logo.png",
            entryPoint: {
              type: "arena",
              name: "Index",
            },
          },
        ]),
        insertableTemplates: ensureType<InsertableTemplatesGroup | undefined>({
          type: "insertable-templates-group",
          name: "root",
          items: sysnames
            .map(getDevflagForInsertableTemplateItem)
            .filter((insertableGroup) => insertableGroup.items.length > 0),
        }),
        insertPanelContent: {
          aliases: {
            // Components provided by @plasmicapp/react-web
            dataFetcher: "builtincc:plasmic-data-source-fetcher",
            pageMeta: "builtincc:hostless-plasmic-head",

            // Default components
            button: "default:button",
            checkbox: "default:checkbox",
            checkboxGroup: "default:checkbox-group",
            combobox: "default:combobox",
            drawer: "default:drawer",
            input: "default:text-input",
            modal: "default:modal",
            popover: "default:popover",
            radio: "default:radio",
            radioGroup: "default:radio-group",
            rangeSlider: "default:range-slider",
            select: "default:select",
            slider: "default:slider",
            switch: "default:switch",
            textArea: "default:text-area",
            tooltip: "default:tooltip",
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
              "Starter components": [
                "button",
                "input",
                "select",
                "switch",
                "checkbox",
                "checkbox-group",
                "radio",
                "radio-group",
                "slider",
                "range-slider",
                "combobox",
                "modal",
                "drawer",
                "popover",
                "tooltip",
              ],
              Advanced: ["pageMeta", "dataFetcher"],
            },
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
