const { Command } = require("commander");
import { DEFAULT_DATABASE_URI, loadConfig } from "@/wab/server/config";
import { getMigratedBundle } from "@/wab/server/db/BundleMigrator";
import {
  ensureDbConnections,
  getDefaultConnection,
} from "@/wab/server/db/DbCon";
import { DbMgr, NotFoundError, SUPER_USER } from "@/wab/server/db/DbMgr";
import * as Sentry from "@sentry/browser";

async function migrate() {
  const opts = new Command("bundle-migrator")
    .option("-db, --dburi <dburi>", "Database uri", DEFAULT_DATABASE_URI)
    .parse(process.argv)
    .opts();
  const config = loadConfig();

  Sentry.init({
    dsn: config.sentryDSN,
  });

  const failedPkgVersions: string[] = [];
  const failedProjectRevisions: string[] = [];

  await ensureDbConnections(opts.dburi, { useEnvPassword: true });

  const conn = await getDefaultConnection();

  // Migration is hard-coded to log "query/error/schema", which is super noisy,
  // especially since the UPDATE statements are very big for us.  We override
  // the logging options here.
  (conn.logger as any).options = ["error", "schema"];

  const db = new DbMgr(conn.manager, SUPER_USER);

  // Run sequencially to avoid loading too much data into memory.
  for (const pkgVersionId of await db.listAllPkgVersionIds()) {
    try {
      await conn.transaction(async (txMgr) => {
        const newdb = new DbMgr(txMgr, SUPER_USER);
        const pkgVersion = await newdb.getPkgVersionById(pkgVersionId.id);
        await getMigratedBundle(pkgVersion);
      });
    } catch (err) {
      failedPkgVersions.push(pkgVersionId.id);
      console.error(
        `Error migrating PkgVersion ${pkgVersionId.id}`,
        err,
        err.stack
      );
    }
  }

  for (const project of await db.listAllProjects()) {
    const branches = [
      undefined,
      ...(await db.listBranchesForProject(project.id)).map(
        (branch) => branch.id
      ),
    ];

    for (const branchId of branches) {
      try {
        await conn.transaction(async (txMgr) => {
          const newdb = new DbMgr(txMgr, SUPER_USER);
          const rev = await newdb.getLatestProjectRev(project.id, { branchId });
          await getMigratedBundle(rev);
        });
      } catch (e) {
        if (e instanceof NotFoundError) {
          console.info(
            `Project ${project.name} (${project.id}, branchId: ${branchId}) has no revision. Skipping...`
          );
          continue;
        } else {
          console.error(
            `Error migrating project ${project.id} (branchId: ${branchId})`,
            e,
            e.stack
          );
          failedProjectRevisions.push(project.id);
        }
      }
    }
  }

  console.log("Failed PkgVersions:");
  for (const id of failedPkgVersions) {
    console.log(`\t${id}`);
  }

  console.log("Failed Projects:");
  for (const id of failedProjectRevisions) {
    console.log(`\t${id}`);
  }
}

if (require.main === module) {
  migrate().catch((error) => {
    console.info("Unable to migrate projects. Error:");
    console.error(error);
    process.exit(1);
  });
}
