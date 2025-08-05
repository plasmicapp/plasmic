import { BundleMigrationType } from "@/wab/server/db/bundle-migration-utils";
import { BundledMigrationFn } from "@/wab/server/db/BundleMigrator";
import { svgoProcess } from "@/wab/server/svgo";
import { ensure } from "@/wab/shared/common";
import { ImageAssetType } from "@/wab/shared/core/image-asset-type";
import { ASPECT_RATIO_SCALE_FACTOR } from "@/wab/shared/core/tpls";
import {
  asDataUrl,
  getParsedDataUrlData,
  parseDataUrl,
  SVG_MEDIA_TYPE,
} from "@/wab/shared/data-urls";
import S3 from "aws-sdk/clients/s3";

const siteAssetsBucket = process.env.SITE_ASSETS_BUCKET as string;

export const migrate: BundledMigrationFn = async (bundle) => {
  for (const inst of Object.values(bundle.map)) {
    if (inst.__type === "ImageAsset") {
      inst["aspectRatio"] = null;
      const url: string | null = inst["dataUri"];
      if (
        inst["type"] === ImageAssetType.Picture &&
        url &&
        url.startsWith("http") &&
        url.endsWith(".svg")
      ) {
        const storagePath = new URL(url).pathname.replace(/^\//, "");
        const res = await new S3({
          endpoint: process.env.S3_ENDPOINT,
        })
          .getObject({
            Bucket: siteAssetsBucket,
            Key: storagePath,
          })
          .promise();
        const dataUrl = asDataUrl(
          Buffer.from(ensure(res.Body, "must exist") as string),
          ensure(res.ContentType, "must exist")
        );
        const parsed = parseDataUrl(dataUrl);
        if (parsed && parsed.mediaType === SVG_MEDIA_TYPE) {
          const processed = svgoProcess(getParsedDataUrlData(parsed));
          const aspectRatio =
            processed.status === "success"
              ? processed.result.aspectRatio
              : undefined;
          if (aspectRatio && isFinite(aspectRatio)) {
            inst["aspectRatio"] = Math.round(
              aspectRatio * ASPECT_RATIO_SCALE_FACTOR
            );
          }
        }
      }
    }
  }
};

export const MIGRATION_TYPE: BundleMigrationType = "bundled";
