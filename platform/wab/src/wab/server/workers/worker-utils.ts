import { MigrationDbMgr } from "@/wab/server/db/BundleMigrator";
import { applyDevFlagOverrides } from "@/wab/shared/devflags";

export async function ensureDevFlags(dbMgr: MigrationDbMgr) {
  const devflags = await dbMgr.tryGetDevFlagOverrides();
  if (devflags) {
    applyDevFlagOverrides(JSON.parse(devflags.data));
  }
}
