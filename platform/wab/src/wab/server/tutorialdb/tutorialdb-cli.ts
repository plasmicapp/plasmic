import { assert, spawn } from "@/wab/shared/common";
import { DEFAULT_DATABASE_URI } from "@/wab/server/config";
import { createDbConnection } from "@/wab/server/db/dbcli-utils";
import { DbMgr, SUPER_USER } from "@/wab/server/db/DbMgr";
import {
  resetTutorialDb,
  TutorialType,
} from "@/wab/server/tutorialdb/tutorialdb-utils";
import { Command } from "commander";
import { TutorialDbId } from "@/wab/shared/ApiSchema";

async function main() {
  const withDb = async (opts: any, func: (db: DbMgr) => Promise<void>) => {
    if (opts.tdbhost) {
      process.env["TUTORIAL_DB_HOST"] = opts.tdbhost;
    }
    const con = await createDbConnection(opts.dburi);
    await con.transaction(async (em) => {
      const db = new DbMgr(em, SUPER_USER);
      await func(db);
    });
  };

  const program = new Command("tutorialdb")
    .option("-db, --dburi <dburi>", "wab database uri", DEFAULT_DATABASE_URI)
    .option(
      "-tdb, --tdbhost <tdbhost>",
      "host of the tutorialdb postgres instance; always connects as user supertdbwab. Password can be passed as env variable TUTORIAL_DB_SUPER_PASSWORD if not in .pgpass"
    );
  program
    .command("create")
    .description("Create a new tutorialdb")
    .arguments("<type>")
    .action(async (type: string, opts: any) => {
      await withDb(program.optsWithGlobals(), async (db) => {
        const res = await db.createTutorialDb(type as TutorialType);
        console.log("DATABASE CREATED", res);
      });
    });

  program
    .command("reset")
    .description("Resets the schema and data in an existing tutorialdb")
    .arguments("<sourceId>")
    .action(async (sourceId: string, opts: any) => {
      await withDb(program.optsWithGlobals(), async (db) => {
        const source = await db.getDataSourceById(sourceId);
        assert(source.source === "tutorialdb", "Can only reset tutorialdb");
        const tutorialDbId = source.credentials.tutorialDbId;
        const tdb = await db.getTutorialDb(tutorialDbId as TutorialDbId);
        await resetTutorialDb(tdb.info);
      });
    });

  program
    .command("show")
    .description("debug")
    .arguments("<sourceId>")
    .action(async (sourceId: string, opts: any, what: any) => {
      await withDb(program.optsWithGlobals(), async (db) => {
        const source = await db.getDataSourceById(sourceId);
        assert(source.source === "tutorialdb", "Can only reset tutorialdb");
        const tutorialDbId = source.credentials.tutorialDbId;
        console.log(tutorialDbId);
        const tdb = await db.getTutorialDb(tutorialDbId as TutorialDbId);
        console.log(tdb);
      });
    });

  program.parse();
}

if (require.main === module) {
  spawn(main());
}
