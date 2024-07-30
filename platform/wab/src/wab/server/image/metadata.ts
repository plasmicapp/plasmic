import sharp from "sharp";

const unsupportedImageMimeTypes = new Set([
  "image/x-icon",
  "image/vnd.microsoft.icon",
]);

export function isImageSupported(mimeType: string) {
  return (
    mimeType.startsWith("image/") && !unsupportedImageMimeTypes.has(mimeType)
  );
}

/**
 * Given image data, returns the size.
 *
 * Uses the sharp image processing library to get the size.
 */
export async function getImageSize(input: Buffer | Uint8Array) {
  const s = sharp(input, {
    pages: -1,
  });
  const metadata = await s.metadata();
  return {
    height: metadata.height ?? 0,
    width: metadata.width ?? 0,
  };
}
