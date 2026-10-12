import { uploadDataUriToS3 } from "@/wab/server/cdn/images";
import { BundledInst } from "@/wab/shared/bundler";
import { UnsafeBundle } from "@/wab/shared/bundles";

export async function moveBundleAssetsToS3<T extends UnsafeBundle>(bundle: T) {
  await Promise.all(
    Object.values<BundledInst>(bundle.map)
      .filter(
        (item) =>
          item.__type === "ImageAsset" &&
          item.type === "picture" &&
          item.dataUri?.indexOf("data:") === 0,
      )
      .map(async (item) => {
        const result = await uploadDataUriToS3(item.dataUri as string);
        if (!result.isErr()) {
          item.dataUri = result.value;
        }
      }),
  );

  return bundle;
}
