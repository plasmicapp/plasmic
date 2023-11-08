import { UnsafeBundle } from "../../shared/bundles";
import { BundleMigrationType } from "../db/bundle-migration-utils";

export function migrate(bundle: UnsafeBundle) {
  if ("maxIid" in bundle) {
    delete bundle["maxIid"];
  }
}

export const MIGRATION_TYPE: BundleMigrationType = "bundled";
