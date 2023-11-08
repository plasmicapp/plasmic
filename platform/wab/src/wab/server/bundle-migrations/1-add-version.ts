import { UnsafeBundle } from "../../shared/bundles";
import { BundleMigrationType } from "../db/bundle-migration-utils";

export function migrate(bundle: UnsafeBundle) {
  bundle.version = "";
}

export const MIGRATION_TYPE: BundleMigrationType = "bundled";
