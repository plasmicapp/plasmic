import { isSVG, uploadFileToS3 } from "@/wab/server/cdn/images";
import { BadRequestError } from "@/wab/shared/ApiErrors/errors";
import fileUpload from "express-fileupload";
import { Request, Response } from "express-serve-static-core";
import sharp from "sharp";

const MaxImageDim = 4096;

// When the image data url size exceeds this number, we start downscaling - the
// downscaling may compress the image to a smaller one.
const DownscaleImageSizeThreshold = 4 * 1024 * 1024;

export async function uploadImage(req: Request, res: Response) {
  if (!req.files) {
    throw new BadRequestError("No image file found");
  }
  const imgFile = req.files.file as fileUpload.UploadedFile;
  try {
    const { fileBuffer, metadata } = await downscaleImage(imgFile.data);
    const result = await uploadFileToS3(fileBuffer);
    if (result.result.isError) {
      throw result.result.error;
    }
    res.status(200).json({
      dataUri: result.result.value.url,
      width: metadata.width,
      height: metadata.height,
      mimeType: result.result.value.mimeType,
    });
  } catch {
    const result = await uploadFileToS3(imgFile.data);
    if (result.result.isError) {
      throw result.result.error;
    }
    res.status(200).json({
      dataUri: result.result.value.url,
      mimeType: result.result.value.mimeType,
      warning:
        "The image could not be optimized. We recommend lowering the image resolution.",
    });
  }
}

async function downscaleImage(imgFile: Buffer) {
  if (isSVG(imgFile)) {
    return {
      fileBuffer: imgFile,
      metadata: { width: undefined, height: undefined },
    };
  }
  const sharpObj = sharp(imgFile, {
    pages: -1,
  });
  const metadata = await sharpObj.metadata();
  if (
    !metadata.width ||
    !metadata.height ||
    !metadata.size ||
    (metadata.width < MaxImageDim &&
      metadata.height < MaxImageDim &&
      metadata.size < DownscaleImageSizeThreshold)
  ) {
    return { fileBuffer: await sharpObj.toBuffer(), metadata };
  }

  const targetWidth =
    metadata.width > metadata.height
      ? Math.min(metadata.width, MaxImageDim)
      : undefined;
  const targetHeight =
    metadata.width <= metadata.height
      ? Math.min(metadata.height, MaxImageDim)
      : undefined;
  sharpObj.resize({
    width: targetWidth,
    height: targetHeight,
    fit: "inside",
    withoutEnlargement: true,
  });
  const resizedImageMetadata = await sharpObj.metadata();
  resizedImageMetadata.format;
  return {
    fileBuffer: await sharpObj.toBuffer(),
    metadata: {
      width: resizedImageMetadata.width,
      height: resizedImageMetadata.pageHeight ?? resizedImageMetadata.height,
    },
  };
}
