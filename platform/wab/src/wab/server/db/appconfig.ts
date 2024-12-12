import { DbMgr } from "@/wab/server/db/DbMgr";
import {
  applyDevFlagOverridesToDefaults,
  DevFlagsType,
} from "@/wab/shared/devflags";

/**
 * WARNING: This function may return devflags inconsistent with the DEVFLAGS.
 * DEVFLAGS is only computed once, when the server starts.
 * If an override is submitted after the server starts, this function will
 * include the new overrides, while DEVFLAGS will stay the same.
 */
export async function getDevFlagsMergedWithOverrides(
  mgr: DbMgr
): Promise<DevFlagsType> {
  const overrides = await mgr.tryGetDevFlagOverrides();
  return applyDevFlagOverridesToDefaults(JSON.parse(overrides?.data ?? "{}"));
}
