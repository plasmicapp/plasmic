import { normalizeError, reportError } from "@/wab/client/ErrorNotifications";
import { AppCtx } from "@/wab/client/app-ctx";
import type { ResizableImage } from "@/wab/client/dom-utils";
import { DESCRIBABLE_IMAGE_TYPES } from "@/wab/shared/ApiSchema";
import { ensure, withTimeout } from "@/wab/shared/common";

const DescribeImageMaxDim = 512;

export async function describeImage(
  appCtx: AppCtx,
  image: ResizableImage,
  blob: Blob,
) {
  if (
    !appCtx.appConfig.enableImageDescriptions ||
    !DESCRIBABLE_IMAGE_TYPES.includes(blob.type)
  ) {
    return undefined;
  }

  try {
    const imageFile =
      Math.max(image.width, image.height) <= DescribeImageMaxDim
        ? blob
        : await shrinkImageToPng(image, blob);
    const { description } = await withTimeout(
      appCtx.api.describeImage({ imageFile }),
      "Describing the image took too long",
      5000,
    );
    return description;
  } catch (e) {
    reportError(normalizeError(e), "Image description failed");
    return undefined;
  }
}

/**
 * Resizes an image to at most DescribeImageMaxDim pixels.
 */
async function shrinkImageToPng(image: ResizableImage, blob: Blob) {
  const scale = DescribeImageMaxDim / Math.max(image.width, image.height);
  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);
  const bitmap = await createImageBitmap(blob, {
    resizeWidth: width,
    resizeHeight: height,
    resizeQuality: "high",
  });

  try {
    const canvas = new OffscreenCanvas(width, height);
    ensure(canvas.getContext("2d"), "Canvas has no 2D context").drawImage(
      bitmap,
      0,
      0,
    );
    return await canvas.convertToBlob({ type: "image/png" });
  } finally {
    bitmap.close();
  }
}
