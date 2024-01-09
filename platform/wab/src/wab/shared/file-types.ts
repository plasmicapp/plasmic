import FileType from "file-type";

export function isSVG(buffer: Buffer | ArrayBuffer) {
  // We get the first 10kB, just in case of
  // some very long comments before the svg tag
  const fileContent = buffer.toString("utf8", 0, 10240);
  return /<svg\s.*?>/i.test(fileContent);
}

export async function getFileType(buffer: Buffer | ArrayBuffer) {
  let fileType = await FileType.fromBuffer(buffer);
  if (!fileType && isSVG(buffer)) {
    fileType = {
      mime: "image/svg+xml" as FileType.MimeType,
      ext: "svg" as FileType.FileExtension,
    };
  }
  return fileType;
}
