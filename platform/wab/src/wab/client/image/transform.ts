/**
 * Reduces the dimensions of an image to fit within the specified maximum width and height,
 * while maintaining the original aspect ratio.
 *
 * @param width - The original width of the image.
 * @param height - The original height of the image.
 * @param maxWidth - The maximum allowed width for the image.
 * @param maxHeight - The maximum allowed height for the image.
 * @returns An object containing the new width and height of the image.
 */
export function reduceImageSize(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
) {
  const aspectRatio = width / height;
  if (width > maxWidth) {
    width = maxWidth;
    height = width / aspectRatio;
  }
  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }
  return { width, height };
}
