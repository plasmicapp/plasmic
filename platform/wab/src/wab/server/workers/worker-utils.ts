import { applyDevFlagOverrides, DEVFLAGS } from "../../devflags";
import { MigrationDbMgr } from "../db/BundleMigrator";

export async function ensureDevFlags(dbMgr: MigrationDbMgr) {
  const devflags = await dbMgr.tryGetDevFlagOverrides();
  if (devflags) {
    applyDevFlagOverrides(DEVFLAGS, JSON.parse(devflags.data));
  }
}
