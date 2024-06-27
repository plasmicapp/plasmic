import { mergeSane } from "@/wab/shared/common";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { DbMgr } from "@/wab/server/db/DbMgr";

export async function getDevFlagsMergedWithOverrides(
  mgr: DbMgr
): Promise<typeof DEVFLAGS> {
  const overrides = await mgr.tryGetDevFlagOverrides();
  const merged = mergeSane({}, DEVFLAGS, JSON.parse(overrides?.data ?? "{}"));
  return merged;
}
