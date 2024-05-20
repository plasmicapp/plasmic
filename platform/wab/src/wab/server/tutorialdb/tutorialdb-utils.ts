import { mkShortUuid } from "@/wab/common";
import { withSpan } from "@/wab/server/util/apm-util";
import { generateSomeApiToken } from "@/wab/server/util/Tokens";
import fs from "fs";
import { Connection, ConnectionOptions, createConnection } from "typeorm";
import { SnakeNamingStrategy } from "typeorm-naming-strategies";

export type TutorialType = "todo" | "northwind";
export interface TutorialDbInfo {
  databaseName: string;
  type: TutorialType;
  userName: string;
  password: string;
}

export function getTutorialDbHost() {
  return process.env.TUTORIAL_DB_HOST ?? "localhost";
}

export async function createTutorialDb(
  type: TutorialType
): Promise<TutorialDbInfo> {
  return await withSpan("tdb-createTutorialDb", async () => {
    const info = await withSuperTutorialDbConnection(async (con) => {
      const databaseId = mkShortUuid().toLowerCase();
      const databaseName = `tdb_${type}_${databaseId}`;
      const userName = databaseName;
      const password = generateSomeApiToken();

      const runner = con.createQueryRunner();
      await runner.createDatabase(databaseName, true);

      // Only userName (and db owner like supertbwab) can connect
      // to this database
      await runner.query(`
      CREATE USER ${userName} PASSWORD '${password}';
      REVOKE CONNECT ON DATABASE ${databaseName} FROM public;
      GRANT CONNECT ON DATABASE ${databaseName} TO ${userName};
    `);
      return {
        databaseName,
        userName,
        password,
        type,
      } as TutorialDbInfo;
    });

    console.log("Created tutorialdb", info);

    await withSuperTutorialDbConnection(
      async (con) => {
        await initTutorialDb(con, info);
      },
      { database: info.databaseName, type }
    );

    return info;
  });
}

async function initTutorialDb(con: Connection, info: TutorialDbInfo) {
  await withSpan("tdb-initTutorialDb", async () => {
    const mod = require(`./${info.type}/init`);
    await mod.initDb(con);

    // Make sure the GRANT statements come after the init, so that
    // all tables that were created above will be granted
    await con.query(`
GRANT ALL ON ALL TABLES IN SCHEMA public TO ${info.userName};
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO ${info.userName};
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'typeorm_metadata'
  ) THEN
    REVOKE ALL ON typeorm_metadata FROM ${info.userName};
  END IF;
END $$;
`);
  });
}

export async function resetTutorialDb(info: TutorialDbInfo) {
  const { databaseName, type } = info;
  await withSuperTutorialDbConnection(
    async (con) => {
      const views = await con.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='VIEW'`
      );
      console.log("VIEWS", views);
      for (const table of views) {
        await con.query(`DROP VIEW ${table.table_name} CASCADE;`);
      }
      console.log("Deleting existing tables...");
      const tables = await con.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'`
      );
      console.log("TABLES", tables);
      for (const table of tables) {
        await con.query(`DROP TABLE ${table.table_name} CASCADE;`);
      }
      console.log("Loading schema and data...");
      await initTutorialDb(con, info);
    },
    {
      database: databaseName,
      type,
    }
  );
}

async function withSuperTutorialDbConnection<T>(
  func: (con: Connection) => Promise<T>,
  opts?: {
    database?: string;
    type?: TutorialType;
  }
) {
  const con = await getSuperTutorialDbConnection(opts);
  try {
    return await func(con);
  } finally {
    await con.close();
  }
}

/**
 * super connection for creating and dropping databases
 */
export async function getSuperTutorialDbConnection(opts?: {
  database?: string;
  type?: TutorialType;
}) {
  const database = opts?.database ?? "postgres";
  const host = getTutorialDbHost();
  // if TUTORIAL_DB_SUPER_PASSWORD is absent, will just fallback
  // to ~/.pgpass
  const password = process.env.TUTORIAL_DB_SUPER_PASSSWORD;
  const connName = `super-tutorialdb-${
    database ?? "postgres"
  }-${mkShortUuid()}`;
  const conOpts: ConnectionOptions = {
    type: "postgres",
    host,
    username: "supertdbwab",
    database: database ?? "postgres",
    password,
    name: connName,
    ...getSslOptions(),
    entities: opts?.type
      ? [`${__dirname}/${opts.type}/entities.ts`]
      : undefined,
    namingStrategy: opts?.type ? new SnakeNamingStrategy() : undefined,
  };
  const con = await withSpan("tdb-createConnection", () =>
    createConnection(conOpts)
  );
  return con;
}

export function getSslOptions() {
  const host = getTutorialDbHost();
  if (host && host.endsWith(".rds.amazonaws.com")) {
    // For AWS RDS, we must connect using ssl, and we need to tell the
    // postgres driver to trust the AWS RDS certificate.
    return {
      ssl: {
        ca: getAwsRdsCert(),
      },
    };
  }
  return undefined;
}

let AWS_RDS_CERT: string | undefined = undefined;
function getAwsRdsCert() {
  if (!AWS_RDS_CERT) {
    // The AWS RDS instance requires ssl connections, and it is signed
    // by the AWS RDS certificate. In order to trust it, we check in and
    // read the AWS bundle of certificates in us-west-2 here.
    // The file is downloaded from https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.SSL.html#UsingWithRDS.SSL.RegionCertificates
    const cert = fs.readFileSync("./us-west-2-bundle.pem").toString();
    AWS_RDS_CERT = cert;
  }

  return AWS_RDS_CERT;
}
