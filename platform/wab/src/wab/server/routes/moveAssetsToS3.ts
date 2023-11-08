import { BundledInst } from "../../shared/bundler";
import { UnsafeBundle } from "../../shared/bundles";
import { uploadDataUriToS3 } from "../cdn/images";

export async function moveAssetsToS3(data: string) {
  return JSON.stringify(await moveBundleAssetsToS3(JSON.parse(data)));
}

export async function moveBundleAssetsToS3<T extends UnsafeBundle>(bundle: T) {
  await Promise.all(
    Object.values<BundledInst>(bundle.map)
      .filter(
        (item) =>
          item.__type === "ImageAsset" &&
          item.type === "picture" &&
          item.dataUri?.indexOf("data:") === 0
      )
      .map(async (item) => {
        const result = await uploadDataUriToS3(item.dataUri as string);
        if (!result.result.isError) {
          item.dataUri = result.result.value;
        }
      })
  );

  return bundle;
}
