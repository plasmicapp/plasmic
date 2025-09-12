import { logger } from "@/wab/server/observability";
import { EntityManager, MigrationExecutor } from "typeorm";
import { PostgresConnectionOptions } from "typeorm/driver/postgres/PostgresConnectionOptions";

async function stampMigration(em: EntityManager) {
  const conn = em.connection;
  const migrator = new MigrationExecutor(conn, em.queryRunner);

  // Stamp the migrations that have not been recorded yet.  Note that
  // MigrationExecutor.getPendingMigrations() implementation is buggy, and so
  // we do our own here :-/
  const executedMigrationNames = new Set(
    (await migrator.getExecutedMigrations()).map((m) => m.name)
  );
  const allMigrations = await migrator.getAllMigrations();
  const pendingMigrations = allMigrations.filter(
    (m) => !executedMigrationNames.has(m.name)
  );
  const driverOptions = conn.driver.options as PostgresConnectionOptions;
  const tableName = conn.driver.buildTableName(
    conn.options.migrationsTableName || "migrations",
    driverOptions.schema,
    driverOptions.database
  );
  const qb = em.createQueryBuilder();
  for (const m of pendingMigrations) {
    logger().info(`Stamping migration ${m.name}`);
    await qb
      .insert()
      .into(tableName)
      .values({
        name: m.name,
        timestamp: m.timestamp,
      })
      .execute();
  }
}

export async function initDb(em: EntityManager) {
  await em.query("truncate org cascade;");
  await em.query("drop table if exists _project_revision_format_;");
  await stampMigration(em);
}
