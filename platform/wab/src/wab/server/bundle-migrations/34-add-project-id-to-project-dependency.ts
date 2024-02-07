import { BundleMigrationType } from "@/wab/server/db/bundle-migration-utils";
import { UnbundledMigrationFn } from "@/wab/server/db/BundleMigrator";
import { DbMgr } from "@/wab/server/db/DbMgr";
import { ProjectRevision } from "@/wab/server/entities/Entities";

export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
  const projectId =
    entity instanceof ProjectRevision
      ? entity.projectId
      : db instanceof DbMgr
      ? (await db.getPkgById(entity.pkgId)).projectId
      : "";

  for (const inst of Object.values(bundle.map)) {
    if (inst.__type === "ProjectDependency") {
      inst["projectId"] = projectId;
    }
  }
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
