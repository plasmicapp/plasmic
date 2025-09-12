const { Command } = require("commander");
import { DEFAULT_DATABASE_URI } from "@/wab/server/config";
import { DbMgr, SUPER_USER } from "@/wab/server/db/DbMgr";
import { createDbConnection } from "@/wab/server/db/dbcli-utils";
import { ProjectRevision } from "@/wab/server/entities/Entities";
import { logger } from "@/wab/server/observability";
import { assert, ensure, spawn } from "@/wab/shared/common";
import { MoreThan } from "typeorm";

export async function main() {
  const opts = new Command("db pruner")
    .option("-db, --dburi <dburi>", "Database uri", DEFAULT_DATABASE_URI)
    .option("--aggressive", "Aggressively prune all non-latest revisions")
    .option("--limit <limit>", "Limit number of deleted revisions")
    .parse(process.argv)
    .opts();

  const con = await createDbConnection(opts.dburi);

  // Add more logging to debug hanging query
  (con.logger as any).options = ["all"];

  // If true, we do a more aggressive pruning and dont all revisions from the past
  // month. Otherwise, we only prune revisions older than that.
  const aggressivePruning: boolean = opts.aggressive;

  logger().info(`Start pruning${aggressivePruning ? " AGGRESSIVELY" : ""}...`);

  await con.transaction(async (em) => {
    const db = new DbMgr(em, SUPER_USER);

    // Adds `to_delete` CTE which contains the ids of the project
    // revisions to be deleted.
    // TODO: Also filter according to users that are on a paid plan
    const filterToDeleteRows = (stmt: string, limit?: number | string) => `
    WITH
      project_max_rev AS (
        SELECT "projectId", "branchId", MAX(revision) AS revision
        FROM project_revision
        GROUP BY "projectId", "branchId"
      ),
      pkg_rev AS (
        SELECT "revisionId" FROM pkg_version WHERE "revisionId" IS NOT NULL
      ),
      to_delete AS (
        SELECT sub.id AS id
        FROM project_revision AS sub
        INNER JOIN project_max_rev AS maxpr ON
            sub."projectId" = maxpr."projectId"
            AND (
              sub."branchId" = maxpr."branchId" OR
              (sub."branchId" IS NULL AND maxpr."branchId" IS NULL)
            )
        LEFT OUTER JOIN pkg_rev
          ON pkg_rev."revisionId" = sub.id
        WHERE
          sub."createdAt" < NOW() - INTERVAL '${
            aggressivePruning ? 0 : 35
          } days'
          AND sub."updatedAt" < NOW() - INTERVAL '${
            aggressivePruning ? 0 : 35
          } days'
          AND sub.revision < maxpr.revision
          AND pkg_rev."revisionId" IS NULL
        ${limit ? `LIMIT ${limit}` : ""}
      )
    ${stmt}`;

    // ### Logging for debugging / testing ###

    const { count: toDeleteRevsCount } = (
      await em.query(
        filterToDeleteRows(
          `
          SELECT COUNT(*)
          FROM to_delete`,
          opts.limit
        )
      )
    )[0];

    logger().info(`Deleting ${toDeleteRevsCount} revisions from database`);

    const { count: allRevsCount } = (
      await em.query(`
      SELECT COUNT(*)
      FROM project_revision
    `)
    )[0];

    logger().info(`Out of ${allRevsCount}`);

    const { count: versionCount } = (
      await em.query(`
      SELECT COUNT("revisionId")
      FROM pkg_version
    `)
    )[0];

    const { count: projectCount } = (
      await em.query(`
      SELECT COUNT(*)
      FROM project
    `)
    )[0];

    const { count: branchCount } = (
      await em.query(`
      SELECT COUNT(*)
      FROM branch
    `)
    )[0];

    logger().info(
      `(${projectCount} projects, ${branchCount} branches, ${versionCount} published versions)`
    );

    // ### End of logging ###

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    // Recent revision IDS to ensure that they will survive
    const revIdsToCheck = aggressivePruning
      ? []
      : await db
          .getEntMgr()
          .getRepository(ProjectRevision)
          .find({
            where: {
              createdAt: MoreThan(oneMonthAgo),
            },
            select: ["id"],
            take: 500,
          });

    const prevProject2LatestRevNum = new Map<string, number>(
      (
        await db.listLatestProjectAndBranchRevisions({
          includeDeletedProjects: true,
        })
      )
        .filter((x) => !!x.id && !!x.revision)
        .map((x) => [`${x.projectId} ${x.branchId}`, x.revision!])
    );

    const assertProjectRevIdExists = async (id: string) => {
      const count = await db
        .getEntMgr()
        .getRepository(ProjectRevision)
        .count({ id });
      assert(count > 0, `Expected ProjectRevision to exist: ${id}`);
    };

    logger().info(`Loaded ${prevProject2LatestRevNum.size} latest revisions`);
    const allVersions: {
      id: string;
      revisionId: string;
    }[] = await em.query(`
      SELECT id, "revisionId"
      FROM pkg_version
    `);

    logger().info("Start deleting...");

    // Actually issue the delete
    let deleted = 0;
    const toDelete = +toDeleteRevsCount;
    while (deleted < toDelete) {
      const limit = Math.min(2000, toDelete - deleted);
      logger().info(
        (
          await em.query(
            "EXPLAIN ANALYZE" +
              filterToDeleteRows(
                `
                DELETE FROM project_revision AS pr
                USING to_delete
                WHERE pr.id=to_delete.id`,
                limit
              )
          )
        )
          .map((plan) => plan["QUERY PLAN"])
          .join("\n")
      );
      deleted += limit;
      logger().info(`Deleted ${deleted} of ${toDelete}...`);
    }

    logger().info("Done deleting. Running assertions...");

    // Make sure every project still has a latest revision
    logger().info("Asserting every project still has latest revision...");
    const newProject2LatestRevNum = new Map<string, number>(
      (
        await db.listLatestProjectAndBranchRevisions({
          includeDeletedProjects: true,
        })
      )
        .filter((x) => !!x.id && !!x.revision)
        .map((x) => [`${x.projectId} ${x.branchId}`, x.revision!])
    );
    for (const [key, rev] of prevProject2LatestRevNum.entries()) {
      const [projectId, branchId] = key.split(" ");
      assert(
        ensure(
          newProject2LatestRevNum.get(key),
          () =>
            `No revision found for project ${projectId} (branch ${branchId})`
        ) >= rev,
        () =>
          `Latest revision for project ${projectId} (branch ${branchId}) is ${newProject2LatestRevNum.get(
            key
          )} which is smaller than the previous revision ${rev}`
      );
    }

    // Make sure every the revision of every published version is still present
    logger().info("Asserting every revision of PkgVersions still present...");
    for (const version of allVersions) {
      if (version.revisionId) {
        await assertProjectRevIdExists(version.revisionId);
      }
    }

    if (!aggressivePruning) {
      // Also checks that recent revisions haven't been deleted
      logger().info("Asserting recent revisions haven't been deleted...");
      for (const rev of revIdsToCheck) {
        await assertProjectRevIdExists(rev.id);
      }
    }

    logger().info("Assertions passed.");
  });

  logger().info("Done pruning.");
}

if (require.main === module) {
  spawn(main());
}
