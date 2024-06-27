import { applyDevFlagOverrides, DEVFLAGS } from "@/wab/shared/devflags";
import { MigrationDbMgr } from "@/wab/server/db/BundleMigrator";

export async function ensureDevFlags(dbMgr: MigrationDbMgr) {
  const devflags = await dbMgr.tryGetDevFlagOverrides();
  if (devflags) {
    applyDevFlagOverrides(DEVFLAGS, JSON.parse(devflags.data));
  }
}
