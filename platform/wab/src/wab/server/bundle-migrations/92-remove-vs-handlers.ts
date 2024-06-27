import { assert } from "@/wab/shared/common";
import { BundleMigrationType } from "@/wab/server/db/bundle-migration-utils";
import { BundledMigrationFn } from "@/wab/server/db/BundleMigrator";
import { PkgVersion } from "@/wab/server/entities/Entities";

const stateManagementWorskpaceId = "kZp2bNnMvBuSKZXYYP1rye";
export const migrate: BundledMigrationFn = async (bundle, entity) => {
  const workspaceId =
    entity instanceof PkgVersion
      ? entity.pkg?.project?.workspaceId
      : entity.project?.workspaceId;

  const projectId =
    entity instanceof PkgVersion ? entity.pkg?.projectId : entity.projectId;
  for (const inst of Object.values(bundle.map)) {
    if (inst.__type === "VariantSetting") {
      delete inst["handlers"];
    }
    assert(
      inst._type !== "EventHandler" ||
        stateManagementWorskpaceId !== workspaceId,
      `project ${projectId} doesn't belong to the state management workspace so it shouldn't have an EventHandler`
    );
  }
};

export const MIGRATION_TYPE: BundleMigrationType = "bundled";
