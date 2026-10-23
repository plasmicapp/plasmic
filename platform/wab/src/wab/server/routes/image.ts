import { uploadFileToS3 } from "@/wab/server/cdn/images";
import { BadRequestError } from "@/wab/shared/ApiErrors/errors";
import { isSVG } from "@/wab/shared/svg-utils";
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
    const { fileBuffer, dims } = await downscaleImage(imgFile.data);
    const result = await uploadFileToS3(fileBuffer);
    if (result.isErr()) {
      throw result.error;
    }
    res.status(200).json({
      dataUri: result.value.url,
      width: dims.width,
      height: dims.height,
      mimeType: result.value.mimeType,
    });
  } catch {
    const result = await uploadFileToS3(imgFile.data);
    if (result.isErr()) {
      throw result.error;
    }
    res.status(200).json({
      dataUri: result.value.url,
      mimeType: result.value.mimeType,
      warning:
        "The image could not be optimized. We recommend lowering the image resolution.",
    });
  }
}

async function downscaleImage(imgFile: Buffer) {
  if (isSVG(imgFile)) {
    return {
      fileBuffer: imgFile,
      dims: { width: undefined, height: undefined },
    };
  }
  const sharpObj = sharp(imgFile, {
    pages: -1,
  });
  const metadata = await sharpObj.metadata();
  const { width, height } = getDims(metadata);
  if (
    !width ||
    !height ||
    !metadata.size ||
    (width <= MaxImageDim &&
      height <= MaxImageDim &&
      metadata.size < DownscaleImageSizeThreshold)
  ) {
    return {
      fileBuffer: await sharpObj.toBuffer(),
      dims: { width, height },
    };
  }

  const { data, info } = await sharpObj
    .resize({
      width: width > height ? Math.min(width, MaxImageDim) : undefined,
      height: width <= height ? Math.min(height, MaxImageDim) : undefined,
      fit: "inside",
      withoutEnlargement: true,
    })
    .toBuffer({ resolveWithObject: true });
  return {
    fileBuffer: data,
    dims: getDims(info),
  };
}

function getDims(metadata: sharp.Metadata | sharp.OutputInfo): {
  width: number | undefined;
  height: number | undefined;
} {
  return {
    width: metadata.width,
    // For multi-page images (animation),
    // height is the height of all pages stacked,
    // pageHeight is the height of one page.
    // https://sharp.pixelplumbing.com/api-input/
    height: metadata.pageHeight ?? metadata.height,
  };
}

export const _testonly = {
  downscaleImage,
};
