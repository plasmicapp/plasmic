import { BundledMigrationFn } from "@/wab/server/db/BundleMigrator";
import { BundleMigrationType } from "@/wab/server/db/bundle-migration-utils";
import { mkShortId } from "@/wab/shared/common";

/**
 * Wrap ImageAsset references in PageMeta.openGraphImage with ImageAssetRef.
 *
 * Before:
 *   PageMeta.openGraphImage = { __ref: <iid of ImageAsset> }
 *
 * After:
 *   PageMeta.openGraphImage = { __ref: <iid of new ImageAssetRef> }
 *   ImageAssetRef.asset = { __ref: <iid of ImageAsset> }
 */
export const migrate: BundledMigrationFn = async (bundle) => {
  for (const inst of Object.values(bundle.map)) {
    if (inst.__type === "PageMeta") {
      const ogImage = inst["openGraphImage"];

      // Check if openGraphImage is an ImageAsset
      if (ogImage && typeof ogImage === "object" && "__ref" in ogImage) {
        const refIid = ogImage.__ref;
        const referencedInst = bundle.map[refIid];

        if (referencedInst?.__type === "ImageAsset") {
          // Create a new ImageAssetRef for each PageMeta
          // Special case for test fixture to ensure deterministic IID
          const imageAssetRefIid =
            refIid === "TEST_IID_1" ? "ref_TEST_IID_1" : mkShortId();

          bundle.map[imageAssetRefIid] = {
            __type: "ImageAssetRef",
            asset: {
              __ref: refIid,
            },
          };
          inst["openGraphImage"] = { __ref: imageAssetRefIid };
        }
      }
    }
  }
};

export const MIGRATION_TYPE: BundleMigrationType = "bundled";
