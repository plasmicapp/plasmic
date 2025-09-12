import { loadConfig } from "@/wab/server/config";
import { ensureDbConnection } from "@/wab/server/db/DbCon";
import { DbMgr, SUPER_USER } from "@/wab/server/db/DbMgr";
import { logger } from "@/wab/server/observability";
import { spawn } from "@/wab/shared/common";
import { PLUME_INSERTABLE_ID } from "@/wab/shared/insertables";
import yargs from "yargs";
import { PkgMgr, parseMasterPkg } from ".";

// This is the right Plume PkgVersion.version to use. You can publish
// newer versions of Plume, but they will not be used until this
// constant is updated to point to them. This makes it possible to
// update Plume project, publish a new version, save the json to
// git, and run tests against it in cypress before it is live in prod.
export const REAL_PLUME_VERSION = "19.4.2";

async function updatePlumePkg() {
  const config = loadConfig();
  const con = await ensureDbConnection(config.databaseUri, "default");
  await con.transaction(async (em) => {
    const db = new DbMgr(em, SUPER_USER);
    const mgr = new PkgMgr(db, PLUME_INSERTABLE_ID);
    await mgr.upgradePkg();
  });
}

async function checkPlumeVersion() {
  const sysname = PLUME_INSERTABLE_ID;
  const { master: bundle } = parseMasterPkg(sysname);
  if (!bundle) {
    throw new Error(`Could not find ${sysname} project data`);
  }
  const depVersion = bundle[1].map[bundle[1].root].version;
  if (depVersion !== REAL_PLUME_VERSION) {
    throw new Error(
      `${sysname}-master-pkg.json has version ${depVersion}, but REAL_PLUME_VERSION is ${REAL_PLUME_VERSION}; did you forget to update ${sysname}-master-pkg.json or REAL_PLUME_VERSION?`
    );
  }

  // TODO: replace with prod URL once supported on prod
  const resp = await fetch(
    `https://studio.plasmic.app/api/v1/plume-pkg/versions`
  );
  const data = await resp.json();
  if (!data.versions.includes(REAL_PLUME_VERSION)) {
    throw new Error(
      `REAL_PLUME_VERSION is not one of the published ${sysname} pkg versions!`
    );
  }
}

export async function main() {
  await yargs
    .usage("Usage: $0 <command> [options]")
    .command<{ sysname: string }>(
      "update",
      "Updates the plume pkg locally",
      (argv) => updatePlumePkg()
    )
    .command(
      "check",
      "Checks that plume-master-pkg.json matches REAL_PLUME_VERSION",
      async () => {
        try {
          await checkPlumeVersion();
        } catch (err) {
          logger().error("Error checking plume version", err);
          process.exit(1);
        }
      }
    )
    .demandCommand()
    .help("h")
    .alias("h", "help").argv;
}

if (require.main === module) {
  spawn(main());
}
