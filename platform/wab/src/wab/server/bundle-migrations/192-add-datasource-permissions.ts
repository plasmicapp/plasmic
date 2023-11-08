import { DataSourceId } from "../../shared/ApiSchema";
import { BundleMigrationType } from "../db/bundle-migration-utils";
import { UnbundledMigrationFn } from "../db/BundleMigrator";
import { PkgVersion } from "../entities/Entities";

export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
  if (entity instanceof PkgVersion) {
    return;
  }

  const projectId = entity.projectId;
  const sourceIds = new Set<string>();
  for (const inst of Object.values(bundle.map)) {
    if (inst.__type === "DataSourceOpExpr") {
      sourceIds.add(inst["sourceId"]);
    }
  }

  const dataSourceIds = Array.from(sourceIds) as DataSourceId[];

  if (dataSourceIds.length === 0) {
    return;
  }

  await db.allowProjectToDataSources(projectId, dataSourceIds, {
    skipPermissionCheck: true,
  });
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
