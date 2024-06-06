/**
 * Given image data, returns the size.
 *
 * Uses the HTMLImageElement DOM API to get the size.
 * This isn't fully implemented in JSDOM, so this function
 * is replaced with a server implementation using sharp.
 */
export async function getImageSize(input: Buffer | Uint8Array) {
  return new Promise<{ height: number; width: number }>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(new Blob([input]));

    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const { naturalHeight, height, naturalWidth, width } = image;
      resolve({
        height: naturalHeight ?? height,
        width: naturalWidth ?? width,
      });
    };
    image.onerror = (err) => reject(err);
    image.src = objectUrl;
  });
}
