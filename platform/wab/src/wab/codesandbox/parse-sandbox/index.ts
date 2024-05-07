import FileError from "@/wab/codesandbox/parse-sandbox/file-error";
import { IModule, INormalizedModules } from "codesandbox-import-util-types";
import { isText, isTooBig } from "codesandbox-import-utils/lib/is-text";
import * as fs from "fs-extra";
import * as path from "path";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export interface IUploads {
  [path: string]: Buffer | string;
}

async function normalizeFilesInDirectory(
  p: string,
  startingPath: string
): Promise<{
  errors: FileError[];
  uploads: IUploads;
  files: INormalizedModules;
}> {
  const entries = await fs.readdir(p);
  const dirs: string[] = [];
  const files: string[] = [];
  const errors: FileError[] = [];
  let uploads: IUploads = {};

  await Promise.all(
    entries.map(async (e) => {
      const absolutePath = path.join(p, e);
      const stat = await fs.stat(absolutePath);

      if (stat.isDirectory()) {
        if (e !== "node_modules" && e !== ".git") {
          dirs.push(absolutePath);
        }
      } else {
        files.push(absolutePath);
      }
    })
  );

  const recursiveDirs: { [path: string]: IModule } = (
    await Promise.all(
      dirs.map((d) => normalizeFilesInDirectory(d, startingPath))
    )
  ).reduce((prev, next) => {
    next.errors.forEach((e) => {
      errors.push(e);
    });

    uploads = { ...next.uploads, ...uploads };

    return { ...prev, ...next.files };
  }, {});

  const fileData = (
    await Promise.all(
      files.map(async (t) => {
        const code = await fs.readFile(t);

        const relativePath = t.replace(startingPath + "/", "");
        const isBinary = !(await isText(t, code));
        if (isBinary) {
          if (code.byteLength > MAX_FILE_SIZE) {
            errors.push(
              new FileError(
                isTooBig(code) ? "Is too big" : "Is a binary file",
                relativePath,
                true
              )
            );
            return false;
          } else {
            uploads[relativePath] = code;
            return false;
          }
        }

        return { path: relativePath, code: code.toString() };
      })
    )
  ).reduce((prev, next) => {
    if (next === false) {
      return prev;
    }

    return {
      ...prev,
      [next.path]: { content: next.code },
    };
  }, {});

  return { errors, uploads, files: { ...recursiveDirs, ...fileData } };
}

const exists = async (p: string) => {
  try {
    const stat = await fs.stat(p);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * This will take a path and return all parameters that are relevant for the call
 * to the CodeSandbox API fir creating a sandbox
 *
 * @export
 * @param {string} path
 */
export default async function parseSandbox(resolvedPath: string) {
  const dirExists = await exists(resolvedPath);
  if (!dirExists) {
    throw new Error(`The given path (${resolvedPath}) doesn't exist.`);
  }

  const fileData = await normalizeFilesInDirectory(resolvedPath, resolvedPath);

  return fileData;
}
