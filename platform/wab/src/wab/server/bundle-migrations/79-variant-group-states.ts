import {
  BundleMigrationType,
  unbundleSite,
} from "@/wab/server/db/bundle-migration-utils";
import { UnbundledMigrationFn } from "@/wab/server/db/BundleMigrator";
import { Bundler } from "@/wab/shared/bundler";
import { mkState } from "@/wab/shared/core/states";

export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
  const bundler = new Bundler();
  const { site, siteOrProjectDep } = await unbundleSite(
    bundler,
    bundle,
    db,
    entity
  );

  for (const component of site.components) {
    for (const vg of component.variantGroups) {
      if (!vg.linkedState) {
        const state = mkState({
          param: vg.param,
          variableType: "variant",
          variantGroup: vg,
          onChangeParam: undefined as any,
        });
        component.states.push(state);
        (vg as any).linkedState = state;
      } else {
        (vg.linkedState as any).param = vg.param;
        vg.linkedState.variableType = "variant";
      }
    }
  }

  const newBundle = bundler.bundle(
    siteOrProjectDep,
    entity.id,
    "79-variant-group-states"
  );
  Object.assign(bundle, newBundle);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
