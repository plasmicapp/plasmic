import { ensure } from "@/wab/shared/common";
import { PostgresFetcher } from "@/wab/server/data-sources/postgres-fetcher";
import { DbMgr, SUPER_USER } from "@/wab/server/db/DbMgr";
import {
  getSslOptions,
  getTutorialDbHost,
} from "@/wab/server/tutorialdb/tutorialdb-utils";
import { TutorialDbDataSource } from "@/wab/shared/data-sources-meta/tutorialdb-meta";
import { Connection } from "typeorm";

export async function makeTutorialDbFetcher(
  dbCon: Connection,
  source: TutorialDbDataSource
) {
  const tdb = await dbCon.transaction((em) => {
    const dbMgr = new DbMgr(em, SUPER_USER);
    return dbMgr.getTutorialDb(source.credentials.tutorialDbId);
  });
  console.log("INFO", tdb.info);
  return new PostgresFetcher(
    {
      credentials: {
        password: tdb.info.password,
      },
      settings: {
        port: "5432",
        name: tdb.info.databaseName,
        user: tdb.info.userName,
        host: ensure(getTutorialDbHost(), "Must have tutorial db host"),
      },
    },
    {
      ...getSslOptions(),
    }
  );
}
