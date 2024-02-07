import { BundleMigrationType } from "@/wab/server/db/bundle-migration-utils";
import { BundledMigrationFn } from "@/wab/server/db/BundleMigrator";

export const migrate: BundledMigrationFn = async (bundle) => {
  for (const inst of Object.values(bundle.map)) {
    if (inst.__type === "Component" && inst.codeComponentMeta) {
      // `inst` is a code component.
      for (const stateRef of inst.states) {
        const stateIid = `${stateRef.__ref}`;
        const state = bundle.map[stateIid];
        if (state.__type === "State") {
          // `state` is a State; convert it to a NamedState.
          state.__type = "NamedState";
          const param = bundle.map[`${state.param.__ref}`];
          const variable = bundle.map[`${param.variable.__ref}`];
          state.name = variable.name;
        }
      }
    }
  }
};

export const MIGRATION_TYPE: BundleMigrationType = "bundled";
