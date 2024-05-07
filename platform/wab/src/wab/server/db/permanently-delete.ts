import { spawn } from "@/wab/common";
import { createDbConnection } from "@/wab/server/db/dbcli-utils";
import { DbMgr, SUPER_USER } from "@/wab/server/db/DbMgr";
import {
  CmsDatabase,
  DataSource,
  Project,
  Team,
  User,
  Workspace,
} from "@/wab/server/entities/Entities";
import { Command } from "commander";
import inquirer from "inquirer";
import { groupBy } from "lodash";

async function main() {
  const opts = new Command("permanently-delete")
    .option(
      "-d, --days <days>",
      "Number of days after soft-deletion to permanently delete",
      parseInt,
      28
    )
    .option(
      "-f, --force",
      "Force delete related entities even if they have not been soft-deleted"
    )
    .option("--id [ids...]", "Specify entity IDs to delete")
    .parse(process.argv)
    .opts();

  const days = opts.days ?? 28;
  console.log(
    `PERMANENTLY deleting things that have been soft-deleted since ${days} ago... Force: ${opts.force}`
  );

  const ids = opts.id as string[] | undefined;
  console.log("FILTERED TO", ids);

  const maybeFiltered = <T extends { id: string }>(items: T[]) =>
    !ids || ids.length === 0 ? items : items.filter((x) => ids.includes(x.id));

  const con = await createDbConnection(opts.dburi);
  await con.transaction(async (em) => {
    const dbMgr = new DbMgr(em, SUPER_USER);

    const workspaceJoins = [
      ["x.workspace", "w"],
      ["w.team", "t"],
    ] as [string, string][];

    const listWorkspaceItems = (
      items: { workspace: Workspace | null; name: string; id: string }[]
    ) => {
      const strings: string[] = [];
      const groupedByTeam = groupBy(items, (item) => item.workspace?.team?.id);
      for (const teamGroup of Object.values(groupedByTeam)) {
        const team = teamGroup[0].workspace?.team;
        strings.push(`Team: "${team?.name}" (${team?.id}):`);
        const groupedByWorkspace = groupBy(
          teamGroup,
          (item) => item.workspace?.id
        );
        for (const workspaceGroup of Object.values(groupedByWorkspace)) {
          const workspace = workspaceGroup[0].workspace;
          strings.push(`\tWorkspace: "${workspace?.name}" (${workspace?.id}):`);
          for (const item of workspaceGroup) {
            strings.push(`\t\t"${item.name}" (${item.id})`);
          }
        }
      }
      return strings.join("\n");
    };

    const projects = maybeFiltered(
      await dbMgr.getObsoleteDeletedEntities(Project, days, {
        leftJoins: workspaceJoins,
      })
    );
    if (projects.length > 0) {
      await ensureYes(
        `PERMANENTLY DELETING projects: \n${listWorkspaceItems(projects)}`
      );
      for (const project of projects) {
        await dbMgr.permanentlyDeleteProject(project.id, { force: opts.force });
      }
    }

    const databases = maybeFiltered(
      await dbMgr.getObsoleteDeletedEntities(CmsDatabase, days, {
        leftJoins: workspaceJoins,
      })
    );
    if (databases.length > 0) {
      await ensureYes(
        `PERMANENTLY DELETING CMS databases: \n${listWorkspaceItems(databases)}`
      );
      for (const db of databases) {
        await dbMgr.permanentlyDeleteCms(db.id, { force: opts.force });
      }
    }

    const sources = maybeFiltered(
      await dbMgr.getObsoleteDeletedEntities(DataSource, days, {
        leftJoins: workspaceJoins,
      })
    );
    if (sources.length > 0) {
      await ensureYes(
        `PERMANENTLY DELETING data sources:\n${listWorkspaceItems(sources)}`
      );
      for (const source of sources) {
        await dbMgr.permanentlyDeleteDataSource(source.id, {
          force: opts.force,
        });
      }
    }

    const workspaces = maybeFiltered(
      await dbMgr.getObsoleteDeletedEntities(Workspace, days, {
        leftJoins: [["x.team", "t"]],
      })
    );
    if (workspaces.length > 0) {
      await ensureYes(
        `PERMANENTLY DELETING workspaces:\n${workspaces
          .map((w) => `"${w.team?.name}" (${w.teamId}) > "${w.name}" (${w.id})`)
          .join("\n")}`
      );
      for (const workspace of workspaces) {
        await dbMgr.permanentlyDeleteWorkspace(workspace.id, {
          force: opts.force,
        });
      }
    }

    const teams = maybeFiltered(
      await dbMgr.getObsoleteDeletedEntities(Team, days)
    );
    if (teams.length > 0) {
      await ensureYes(
        `PERMANENTLY DELETING teams:\n${teams
          .map((t) => `"${t.name}" (${t.id})`)
          .join("\n")}`
      );
      for (const team of teams) {
        await dbMgr.permanentlyDeleteTeam(team.id, { force: opts.force });
      }
    }

    const users = maybeFiltered(
      await dbMgr.getObsoleteDeletedEntities(User, days)
    );
    if (users.length > 0) {
      await ensureYes(
        `PERMANENTLY DELETING users:\n${users
          .map((u) => `${u.email} (${u.id})`)
          .join("\n")}`
      );
      for (const user of users) {
        await dbMgr.permanentlyDeleteUser(user.id, { force: opts.force });
      }
    }

    await ensureYes("ARE YOU SURE??????");
  });
}

async function ensureYes(msg: string) {
  const { confirm } = await inquirer.prompt({
    type: "confirm",
    name: "confirm",
    message: msg,
    default: false,
  });

  if (!confirm) {
    throw new Error(`Aborted operation`);
  }
}

if (require.main === module) {
  spawn(
    main().catch((error) => {
      console.info("Unable to permanently delete things. Error:");
      console.error(error);
      process.exit(1);
    })
  );
}
