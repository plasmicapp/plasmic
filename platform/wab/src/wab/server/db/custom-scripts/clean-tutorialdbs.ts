import { DataSource, TutorialDb } from "@/wab/server/entities/Entities";
import { getSuperTutorialDbConnection } from "@/wab/server/tutorialdb/tutorialdb-utils";
import { Connection, EntityManager, In, IsNull, Not } from "typeorm";

export async function cleanTutorialDbs(em: EntityManager) {
  const tutorialDbCon = await getSuperTutorialDbConnection();
  await dropDeletedTutorialDbs(em, tutorialDbCon);
  await dropUnusedTutorialDbs(em, tutorialDbCon);
  // Can be improved to delete tutorial dbs not used in a long time
}

async function dropDeletedTutorialDbs(
  em: EntityManager,
  tutorialDbCon: Connection
) {
  const results = await em.find(DataSource, {
    where: {
      source: "tutorialdb",
      deletedAt: Not(IsNull()),
    },
  });

  await dropTutorialDbFromDataSources(em, tutorialDbCon, results);
}

async function dropUnusedTutorialDbs(
  em: EntityManager,
  tutorialDbCon: Connection
) {
  const unusedDataSourceIds = await em.query(unusedTutorialDbsQuery);

  const unusedDataSources = await em.find(DataSource, {
    where: {
      id: In(unusedDataSourceIds),
    },
  });

  await dropTutorialDbFromDataSources(em, tutorialDbCon, unusedDataSources);

  await Promise.all(
    unusedDataSources.map(async (ds) => {
      Object.assign(ds, { deletedAt: new Date() });
      await em.save(ds);
    })
  );
}

async function dropTutorialDbFromDataSources(
  em: EntityManager,
  tutorialDbCon: Connection,
  dataSources: DataSource[]
) {
  const tutorialDbIds: string[] = dataSources.map(
    (r) => r.credentials.tutorialDbId
  );
  const badTutorialDbs = await em.find(TutorialDb, {
    where: {
      id: In(tutorialDbIds),
      deletedAt: IsNull(),
    },
  });

  console.log(`Deleting ${badTutorialDbs.length} tutorial dbs`);

  const qr = await tutorialDbCon.createQueryRunner();
  await Promise.all(
    badTutorialDbs.map(async (db) => {
      const name = db.info.databaseName;
      await qr.dropDatabase(name);
      Object.assign(db, { deletedAt: new Date() });
      await em.save(db);
    })
  );
}

const unusedTutorialDbsQuery = `
WITH ds AS (SELECT id
  FROM data_source
  WHERE source = 'tutorialdb' AND "deletedAt" IS NOT NULL)

SELECT d_ds."dataSourceId"
FROM (SELECT "dataSourceId", array_agg(p."deletedAt") as deleted
FROM data_source_allowed_projects as dp
     INNER JOIN project as p ON p.id = dp."projectId"
WHERE "dataSourceId" IN (SELECT * FROM ds)
AND p.name NOT LIKE '%Primary Copy%'
GROUP BY 1) as d_ds
WHERE array_position(d_ds.deleted, NULL) IS NULL
`;
