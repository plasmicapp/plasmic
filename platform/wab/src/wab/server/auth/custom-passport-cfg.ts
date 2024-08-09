import { Config } from "@/wab/server/config";
import { DbMgr } from "@/wab/server/db/DbMgr";
import { DevFlagsType } from "@/wab/shared/devflags";

export async function setupCustomPassport(
  dbMgr: DbMgr,
  config: Config,
  devflags: DevFlagsType
) {
  // Do nothing
}
