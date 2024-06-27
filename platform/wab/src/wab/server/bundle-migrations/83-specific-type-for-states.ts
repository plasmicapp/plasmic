import { ParamExportType } from "@/wab/shared/core/lang";
import {
  BundleMigrationType,
  unbundleSite,
} from "@/wab/server/db/bundle-migration-utils";
import { UnbundledMigrationFn } from "@/wab/server/db/BundleMigrator";
import { Bundler } from "@/wab/shared/bundler";
import { convertVariableTypeToWabType } from "@/wab/shared/model/model-util";
import { StateVariableType } from "@/wab/shared/core/states";

export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
  const bundler = new Bundler();
  const { site, siteOrProjectDep } = await unbundleSite(
    bundler,
    bundle,
    db,
    entity
  );

  for (const component of site.components) {
    for (const state of component.states) {
      if (state.accessType === "writable") {
        state.param.exportType = ParamExportType.External;
      }
      state.param.type = convertVariableTypeToWabType(
        state.variableType as StateVariableType
      );
    }
  }

  const newBundle = bundler.bundle(
    siteOrProjectDep,
    entity.id,
    "83-specific-type-for-states"
  );
  Object.assign(bundle, newBundle);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
