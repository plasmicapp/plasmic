import { MigrationDbMgr } from "@/wab/server/db/BundleMigrator";
import {
  ensureDbConnections,
  getDefaultConnection,
} from "@/wab/server/db/DbCon";
import { DbMgr, SUPER_USER } from "@/wab/server/db/DbMgr";
import { applyDevFlagOverrides } from "@/wab/shared/devflags";
import { ConnectionOptions } from "typeorm";

export async function ensureDevFlags(dbMgr: MigrationDbMgr) {
  const devflags = await dbMgr.tryGetDevFlagOverrides();
  if (devflags) {
    applyDevFlagOverrides(JSON.parse(devflags.data));
  }
}

// Workers run one task at a time, so pools are small and live as long as the
// process. Idle clients drop after pg's idleTimeoutMillis (10s).
export async function getWorkerDbMgr(connectionOptions: ConnectionOptions) {
  await ensureDbConnections(connectionOptions, {
    defaultPoolSize: 5,
    migrationPoolSize: 5,
  });
  // Permission checks happen before a task reaches the worker
  const mgr = new DbMgr((await getDefaultConnection()).manager, SUPER_USER);
  await ensureDevFlags(mgr);
  return mgr;
}
