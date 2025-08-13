import { DEFAULT_DATABASE_URI } from "@/wab/server/config";
import {
  ensureDbConnections,
  getDefaultConnection,
} from "@/wab/server/db/DbCon";
import { DbMgr, SUPER_USER, normalActor } from "@/wab/server/db/DbMgr";
import { createDbConnection } from "@/wab/server/db/dbcli-utils";
import { upgradeReferencedHostlessDeps } from "@/wab/server/db/upgrade-hostless-utils";
import { logger } from "@/wab/server/observability";
import { doImportProject } from "@/wab/server/routes/projects";
import { ProjectId } from "@/wab/shared/ApiSchema";
import {
  Bundle,
  Bundler,
  removeUnreachableNodesFromBundle,
} from "@/wab/shared/bundler";
import { spawn, spawnWrapper } from "@/wab/shared/common";
import fs from "fs";
import fetch from "node-fetch";
import path from "path";
import yargs from "yargs";

export async function main() {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  yargs
    .option("dburi", {
      alias: "db",
      describe: "Database URI to use",
      default: DEFAULT_DATABASE_URI,
    })
    .option("user", {
      alias: "u",
      describe: "Email of user to perform actions as",
    })
    .command<Parameters<typeof uploadProject>[0]>(
      "upload <file>",
      "Uploads a json file as a project",
      (yags) => {
        yags
          .positional("file", {
            describe: "JSON file to upload",
            type: "string",
          })
          .option("name", {
            alias: "n",
            describe: "Name of the imported project",
            default: "Imported project",
          })
          .option("publish", {
            type: "boolean",
            description: "Publish the imported project",
          })
          .option("prefilled", {
            type: "boolean",
            description:
              "Marks published PkgVersion as prefilled (doesn't actuall prefill)",
          });
      },
      spawnWrapper(uploadProject)
    )
    .command<Parameters<typeof prefillProjects>[0]>(
      "prefill",
      "Hits cloudfront to actually prefill pkgs",
      (yags) => {
        yags.option("project", {
          alias: "p",
          describe:
            "Project ID to prefill; if none specified, prefills all that have been prefilled",
          type: "array",
        });
      },
      spawnWrapper(prefillProjects)
    )
    .command<Parameters<typeof pruneProjectBundle>[0]>(
      "prune-bundle",
      "Prunes project bundle, removing unreachable instances",
      (yags) => {
        yags.option("project", {
          alias: "p",
          describe: "Project ID to prune; will prune latest revision",
          type: "array",
        });
      },
      spawnWrapper(pruneProjectBundle)
    )
    .command<Parameters<typeof upgradeHostlessDeps>[0]>(
      "upgrade-hostless-deps",
      "Upgrades hostless dependencies for argument project; useful in dev for testing a hostless upgrade without a migration script",
      (yags) => {
        yags.option("project", {
          alias: "p",
          describe: "Project ID to update; will update latest revision",
          type: "string",
        });
      },
      spawnWrapper(upgradeHostlessDeps)
    )
    .demandCommand()
    .help("h")
    .alias("h", "help").argv;
}

interface CommonArgs {
  dburi: string;
  user: string;
}

async function uploadProject(
  opts: CommonArgs & {
    file: string;
    name: string;
    publish?: boolean;
    prefilled?: boolean;
  }
) {
  logger().debug("Uploading project", opts);
  const con = await createDbConnection(opts.dburi);
  await con.transaction(async (em) => {
    const filePath = path.resolve(opts.file);
    const bundles = JSON.parse(fs.readFileSync(filePath).toString());

    let mgr = new DbMgr(em, SUPER_USER);
    if (opts.user) {
      const user = await mgr.getUserByEmail(opts.user);
      mgr = new DbMgr(em, normalActor(user.id));
    }

    const project = await doImportProject(bundles, mgr, new Bundler());

    if (opts.name) {
      await mgr.updateProject({ id: project.id, name: opts.name });
    }

    logger().debug(`Project ID: ${project.id}`);
    logger().debug(`Project Token: ${project.projectApiToken}`);

    if (opts.publish) {
      const { pkgVersion } = await mgr.publishProject(
        project.id,
        "1.0.0",
        [],
        ""
      );
      logger().debug("Published project");
      if (opts.prefilled) {
        await mgr.updatePkgVersion(
          pkgVersion.pkgId,
          pkgVersion.version,
          pkgVersion.branchId,
          {
            isPrefilled: true,
          }
        );
      }
    }
  });
}

async function prefillProjects(
  opts: CommonArgs & {
    project: string[];
  }
) {
  const con = await createDbConnection(opts.dburi);
  await con.transaction(async (em) => {
    const mgr = new DbMgr(em, SUPER_USER);
    for (const project of opts.project) {
      const pkg = await mgr.getPkgByProjectId(project);
      if (!pkg) {
        throw new Error(`No published Pkg for ${project}`);
      }
      const pkgVersion = await mgr.getPkgVersion(pkg?.id);
      if (!pkgVersion) {
        throw new Error(`No published PkgVersion for ${project}`);
      }

      const res = await fetch(
        `http://codegen-origin.plasmic.app/api/v1/loader/code/prefill/${pkgVersion.id}`,
        {
          method: "POST",
        }
      );

      if (res.status !== 200) {
        throw new Error(`Error pre-filling ${project}: ${await res.text()}`);
      }
    }
  });
}

async function pruneProjectBundle(
  opts: CommonArgs & {
    project: string[];
  }
) {
  const con = await createDbConnection(opts.dburi);
  await con.transaction(async (em) => {
    const mgr = new DbMgr(em, SUPER_USER);
    for (const project of opts.project) {
      const rev = await mgr.getLatestProjectRev(project);
      logger().info(`Pruning ${project} [${rev.revision}]`);
      const bundle = JSON.parse(rev.data) as Bundle;
      removeUnreachableNodesFromBundle(bundle);
      await mgr.updateProjectRev({
        projectId: project,
        data: JSON.stringify(bundle),
        revisionNum: rev.revision,
        branchId: undefined,
      });
    }
  });
}

async function upgradeHostlessDeps(
  opts: CommonArgs & {
    project: string;
  }
) {
  await ensureDbConnections(opts.dburi);
  const con = await getDefaultConnection();
  await con.transaction(async (em) => {
    const mgr = new DbMgr(em, SUPER_USER);
    await upgradeReferencedHostlessDeps(mgr, opts.project as ProjectId);
  });

  logger().info("All done!");
}

if (require.main === module) {
  spawn(main());
}
