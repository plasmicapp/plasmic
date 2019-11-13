import fs from "fs";
import path from "path";

export function stripExtension(filename: string) {
  const ext = path.extname(filename);
  if (ext.length === 0) {
    return filename;
  }
  return filename.substring(0, filename.lastIndexOf(ext));
}

export function writeFileContent(path: string, content: string, opts?: {force?: boolean}) {
  opts = opts || {};
  if (fs.existsSync(path) && !opts.force) {
    console.error(`Cannot write to ${path}; file already exists.`);
    process.exit(1);
  }

  fs.writeFileSync(path, content);
}
