import { mkShortId } from "../../common";
import { UnsafeBundle } from "../../shared/bundles";
import { BundleMigrationType } from "../db/bundle-migration-utils";

export async function migrate(bundle: UnsafeBundle) {
  for (const inst of Object.values(bundle.map)) {
    if (["ArenaFrame", "Param"].includes(inst.__type)) {
      inst["uuid"] = mkShortId();
    }
  }
}

export const MIGRATION_TYPE: BundleMigrationType = "bundled";
