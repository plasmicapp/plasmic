const { Command } = require("commander");
import { DEFAULT_DATABASE_URI } from "@/wab/server/config";
import {
  ensureDbConnections,
  getDefaultConnection,
} from "@/wab/server/db/DbCon";
import { cleanTutorialDbs } from "@/wab/server/db/custom-scripts/clean-tutorialdbs";
import { findConflictNames } from "@/wab/server/db/custom-scripts/find-conflict-names";
import { findDanglingWeakRefs } from "@/wab/server/db/custom-scripts/find-dangling-weak-refs";
import { findMissingImplicitStates } from "@/wab/server/db/custom-scripts/find-missing-implicit-states";
import { fixDuplicatedComponents } from "@/wab/server/db/custom-scripts/fix-duplicated-components";
import { fixInvalidImplicitStates } from "@/wab/server/db/custom-scripts/fix-invalid-implicit-states";
import { profileCodegen } from "@/wab/server/db/custom-scripts/profile-codegen";
import { reIdentifyUsers } from "@/wab/server/db/custom-scripts/re-identify-users";
import { logger } from "@/wab/server/observability";
import { spawn } from "@/wab/shared/common";
import { exit } from "process";

/**
 * This file is meant to be used to run scripts on prod without requiring to
 * create a new Jenkins job every time (especially for jobs that should run only
 * once).
 *
 * It can be used, for example, to implement long migrations that don't require
 * down time.
 *
 * To test the script locally, run `yarn db:one-time-job`.
 *
 * To run in prod, ssh into a kubernetes pod that uses the codegen-server image
 * and run yarn db:one-time-job -s <script> -db postgres://wab@proddb.c856obael8lq.us-west-2.rds.amazonaws.com/wab
 *
 * The custom script implementation can be written in the function `runScript`,
 * which runs inside a typeorm transaction.
 */

async function main() {
  logger().info("Start script...");
  const opts = new Command("custom-script")
    .option("-db, --dburi <dburi>", "Database uri", DEFAULT_DATABASE_URI)
    .option("-s, --script <script>", "Script to execute")
    .option("-pId, --projectId <projectId>", "project id")
    .parse(process.argv)
    .opts();

  await ensureDbConnections(opts.dburi, {
    useEnvPassword: true,
  });
  const conn = await getDefaultConnection();

  logger().info(`Running ${opts.script}`);

  await conn.transaction(async (em) => {
    if (opts.script === "re-identify-users") {
      await reIdentifyUsers(em);
    }
    if (opts.script === "find-conflict-names") {
      await findConflictNames(em);
    }
    if (opts.script === "find-missing-implicit-states") {
      await findMissingImplicitStates(em);
    }
    if (opts.script === "check-dangling-weakrefs") {
      await findDanglingWeakRefs(em);
    }
    if (opts.script === "fix-invalid-implicit-states") {
      await fixInvalidImplicitStates(em, opts.projectId);
    }
    if (opts.script === "profile-codegen") {
      await profileCodegen(em, opts.projectId);
    }
    if (opts.script === "clean-tutorialdbs") {
      await cleanTutorialDbs(em);
    }
    if (opts.script === "fix-duplicated-components") {
      await fixDuplicatedComponents(em, opts.projectId);
    }
  });

  exit(0);
}

if (require.main === module) {
  spawn(main());
}
