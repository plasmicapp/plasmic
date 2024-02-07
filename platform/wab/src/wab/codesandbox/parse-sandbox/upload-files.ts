import { createUpload } from "@/wab/codesandbox/api";
import { INormalizedModules } from "codesandbox-import-util-types";
import { IUploads } from ".";

export default async function uploadFiles(token: string, uploads: IUploads) {
  const files: INormalizedModules = {};

  const uploadPaths = Object.keys(uploads);
  for (const uploadPath of uploadPaths) {
    const buffer = uploads[uploadPath];

    const res: { url: string } = await createUpload(token, uploadPath, buffer);
    console.log(`Created upload for ${uploadPath}`, res.url);

    files[uploadPath] = {
      content: res.url,
      isBinary: true,
    };
  }

  console.log("Files to upload", files);

  return files;
}
