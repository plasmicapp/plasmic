import "@/wab/server/db/pg-type-parsers";

import * as customEntities from "@/wab/server/entities/CustomEntities";
import * as entities from "@/wab/server/entities/Entities";

import { logger } from "@/wab/server/observability";
import { stringToPair } from "@/wab/server/util/hash";
import { importByPath } from "@/wab/server/util/import-by-path";
import * as Sentry from "@sentry/node";
import fs from "fs/promises";
import path from "path";
import { parse as parseDbUri } from "pg-connection-string";
import {
  Connection,
  ConnectionOptions,
  ConnectionOptionsReader,
  createConnection,
  getConnection,
  getConnectionManager,
} from "typeorm";

// ormconfig.json points typeorm at the entity and migration source files, which
// it loads with a bare require(). Pass the classes instead, so the connection
// does not depend on the require() hook of whichever runtime we are under.
const entityClasses = [
  ...Object.values(entities),
  ...Object.values(customEntities),
].filter((exported) => typeof exported === "function") as Function[];

const MIGRATIONS_PATH = path.join(__dirname, "..", "migrations");

let migrationClasses: Promise<Function[]> | undefined;
function getMigrationClasses() {
  return (migrationClasses ??= (async () => {
    const files = (await fs.readdir(MIGRATIONS_PATH)).filter((file) =>
      file.endsWith(".ts")
    );
    const mods = await Promise.all(
      files.map((file) => importByPath(path.join(MIGRATIONS_PATH, file)))
    );
    return mods.flatMap(
      (mod) =>
        Object.values(mod).filter(
          (exported) => typeof exported === "function"
        ) as Function[]
    );
  })());
}

/**
 * Reads wab's ormconfig.json, explicitly anchored to the wab package root.
 *
 * typeorm's getConnectionOptions() locates the config via app-root-path,
 * which derives the root from its own physical location inside node_modules.
 * Under pnpm that is the workspace store (platform/node_modules/.pnpm/...),
 * so it looks for platform/ormconfig.json and finds nothing. (The typeorm
 * CLI is unaffected: it passes root: process.cwd().)
 */
export function getWabConnectionOptions(): Promise<ConnectionOptions> {
  // __dirname is src/wab/server/db; ormconfig.json lives four levels up at
  // the wab package root.
  return new ConnectionOptionsReader({
    root: path.join(__dirname, "..", "..", "..", ".."),
  }).get("default");
}

function getDatabaseUriForConnectionOptions(
  dburi: string | ConnectionOptions
): string | undefined {
  if (typeof dburi === "string") {
    return dburi;
  }
  return (dburi as ConnectionOptions & { url?: string }).url;
}

function existingConnectionMatches(
  conn: Connection,
  dburi: string | ConnectionOptions
) {
  const requestedUri = getDatabaseUriForConnectionOptions(dburi);
  const existingUri = (conn.options as ConnectionOptions & { url?: string })
    .url;
  if (requestedUri && existingUri) {
    return requestedUri === existingUri;
  }
  return true;
}

// Unused, just creating for the global side effect of having a connection
// pool.  Contrary to the name, this actually sets up a pool of connections
// that later getConnection() calls draw from.
// When --freshDb is specified, the default connection is created in
// prepareFreshDb and so we guard against trying to create it again (which
// causes an error).
export async function ensureDbConnection(
  dburi: string | ConnectionOptions,
  name: string,
  opts?: {
    maxConnections?: number;
    useEnvPassword?: boolean;
  }
) {
  const maxConnections = opts?.maxConnections ?? 15;
  const connMgr = getConnectionManager();

  if (connMgr.has(name)) {
    try {
      const conn = connMgr.get(name);
      if (conn.isConnected) {
        if (!existingConnectionMatches(conn, dburi)) {
          logger().info(
            `Closing typeorm connection pool for ${name} because its database URI changed`
          );
          await conn.close();
        } else {
          logger().info(`Reusing typeorm connection pool for ${name}`);
          return conn;
        }
      }
    } catch (error: unknown) {
      logger().warn(error as any);
      Sentry.captureException(error);
    }
  }

  logger().info(`Creating typeorm connection pool for ${name}`);
  let connOpts: ConnectionOptions;
  if (typeof dburi === "string") {
    const envPassword = process.env.WAB_DBPASSWORD;
    connOpts = Object.assign(
      {},
      await getWabConnectionOptions(),
      {
        type: "postgres",
        extra: {
          // Set postgres pool size up from default of 10
          // https://node-postgres.com/api/pool
          max: maxConnections,
          simple_query_mode: process.env.PG_SIMPLE_QUERY_MODE === "true",
        },
      },
      opts?.useEnvPassword && envPassword
        ? {
            // We parse dbUri into its component options, instead of specifying
            // `url:`, because we can't use `url:` in combination with `password:`
            ...parseDbUri(dburi),
            password: envPassword,
          }
        : {
            url: dburi,
          }
    );
  } else {
    connOpts = dburi;
  }

  return await createConnection({
    ...connOpts,
    name,
    entities: entityClasses,
    migrations: await getMigrationClasses(),

    // uncomment this to log all SQL queries
    // logging: true
  });
}

/**
 * Connection options a worker can reconnect with. The entity and migration
 * classes on the live options are not structured-cloneable, and the worker
 * adds them back itself.
 */
export function getSerializableConnectionOptions(): ConnectionOptions {
  const {
    entities: _entities,
    migrations: _migrations,
    ...options
  } = getConnection().options;
  return options as ConnectionOptions;
}

export const MIGRATION_POOL_NAME = "migration-pool";

export async function getMigrationConnection() {
  // Should only call this after ensureDbConnections() have been called
  return _getConnection(MIGRATION_POOL_NAME);
}

export async function getDefaultConnection() {
  return _getConnection();
}

async function _getConnection(name?: string) {
  const conn = getConnection(name);
  if (!conn.isConnected) {
    await conn.connect();
  }
  return conn;
}

export async function ensureDbConnections(
  dbUri: string | ConnectionOptions,
  opts?: {
    defaultPoolSize?: number;
    migrationPoolSize?: number;
    useEnvPassword?: boolean;
  }
) {
  await ensureDbConnection(dbUri, "default", {
    maxConnections: opts?.defaultPoolSize ?? 15,
    useEnvPassword: opts?.useEnvPassword,
  });
  await ensureDbConnection(dbUri, MIGRATION_POOL_NAME, {
    maxConnections: opts?.migrationPoolSize ?? 10,
    useEnvPassword: opts?.useEnvPassword,
  });
}

async function withAdvisoryLock(
  conn: Connection,
  callback: () => Promise<void>
): Promise<void> {
  const lockName = stringToPair("migration-lock");
  try {
    // wait to acquire lock
    await conn.manager.query(
      `SELECT pg_advisory_lock(${lockName[0]}, ${lockName[1]})`
    );

    // execute our code inside the lock
    await callback();
  } finally {
    // unlock the acquired lock
    const [{ pg_advisory_unlock: wasLocked }]: [
      { pg_advisory_unlock: boolean }
    ] = await conn.manager.query(
      `SELECT pg_advisory_unlock(${lockName[0]}, ${lockName[1]})`
    );

    if (!wasLocked) {
      logger().warn(
        `Advisory lock was not locked: ${lockName[0]}, ${lockName[1]}`
      );
    }
  }
}

export async function maybeMigrateDatabase() {
  const conn = await getDefaultConnection();
  await withAdvisoryLock(conn, async () => {
    const migrations = await conn.runMigrations({ transaction: "all" });
    if (migrations.length > 0) {
      logger().info(
        `Successfully ran ${migrations.length} migrations`,
        migrations
      );
    }
  });
}

async function closeConnection(name?: string) {
  const connMgr = getConnectionManager();
  if (!connMgr.has(name ?? "default")) {
    return;
  }
  const conn = getConnection(name);
  if (!conn.isConnected) {
    return;
  }
  logger().info(`Closing typeorm connection pool for ${name}`);
  await conn.close();
}

export async function closeDbConnections() {
  await closeConnection("default");
  await closeConnection(MIGRATION_POOL_NAME);
}
