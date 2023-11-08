import { EntityManager } from "typeorm";
import { DbMgr, SUPER_USER } from "../db/DbMgr";

export async function prunePartialRevCache(em: EntityManager) {
  const mgr = new DbMgr(em, SUPER_USER);
  return mgr.prunePartialRevisionsCache();
}

export async function pruneOldBundleBackupsCache(em: EntityManager) {
  const mgr = new DbMgr(em, SUPER_USER);
  return mgr.pruneOldBundleBackups();
}
