import { DbMgr, SUPER_USER } from "@/wab/server/db/DbMgr";
import { EntityManager } from "typeorm";

export async function prunePartialRevCache(em: EntityManager) {
  const mgr = new DbMgr(em, SUPER_USER);
  return mgr.prunePartialRevisionsCache();
}

export async function pruneOldBundleBackupsCache(em: EntityManager) {
  const mgr = new DbMgr(em, SUPER_USER);
  return mgr.pruneOldBundleBackups();
}
