import { BundleMigrationType } from "@/wab/server/db/bundle-migration-utils";
import { UnsafeBundle } from "@/wab/shared/bundles";

export function migrate(bundle: UnsafeBundle) {
  if ("maxIid" in bundle) {
    delete bundle["maxIid"];
  }
}

export const MIGRATION_TYPE: BundleMigrationType = "bundled";
