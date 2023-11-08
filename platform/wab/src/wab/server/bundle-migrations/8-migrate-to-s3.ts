import { UnsafeBundle } from "../../shared/bundles";
import { BundleMigrationType } from "../db/bundle-migration-utils";
import { moveBundleAssetsToS3 } from "../routes/moveAssetsToS3";

export async function migrate(bundle: UnsafeBundle) {
  Object.assign(bundle, await moveBundleAssetsToS3(bundle));
}

export const MIGRATION_TYPE: BundleMigrationType = "bundled";
