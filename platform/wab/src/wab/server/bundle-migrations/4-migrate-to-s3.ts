import { BundleMigrationType } from "@/wab/server/db/bundle-migration-utils";
import { moveBundleAssetsToS3 } from "@/wab/server/routes/moveAssetsToS3";
import { UnsafeBundle } from "@/wab/shared/bundles";

export async function migrate(bundle: UnsafeBundle) {
  Object.assign(bundle, await moveBundleAssetsToS3(bundle));
}

export const MIGRATION_TYPE: BundleMigrationType = "bundled";
