import { BundleMigrationType } from "../db/bundle-migration-utils";
import { BundledMigrationFn } from "../db/BundleMigrator";

export const migrate: BundledMigrationFn = async (bundle) => {
  for (const inst of Object.values(bundle.map)) {
    // Rename CodeComponentState to NamedState.
    if (inst.__type === "CodeComponentState") {
      inst.__type = "NamedState";
    }

    // Convert unnamed implicit states of TplTags to NamedStates.
    if (inst.__type === "State" && inst["tplNode"]?.["__ref"]) {
      const tplNode = bundle.map[`${inst["tplNode"]["__ref"]}`];
      if (tplNode.__type === "TplTag") {
        const param = bundle.map[`${inst["param"]["__ref"]}`];
        const variable = bundle.map[`${param["variable"]["__ref"]}`];
        inst.__type = "NamedState";
        inst.name = variable.name; // e.g. "value"
        variable.name = `${tplNode.name} ${inst.name}`; // e.g. "TextInput value"
      }
    }
  }
};

export const MIGRATION_TYPE: BundleMigrationType = "bundled";
