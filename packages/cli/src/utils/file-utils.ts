import fs from "fs";
import glob from "glob";
import L from "lodash";
import path from "upath";
import { ProjectMetaBundle } from "../api";
import { logger } from "../deps";
import { HandledError } from "../utils/error";
import { isLocalModulePath } from "./code-utils";
import {
  ComponentConfig,
  CONFIG_FILE_NAME,
  PlasmicContext,
  ProjectConfig,
} from "./config-utils";
import { ensureString } from "./lang-utils";
import { confirmWithUser } from "./user-utils";

const findExtension = (filename?: string) =>
  filename?.substring(filename.indexOf(".")) ?? filename;

export function stripExtension(filename: string, removeComposedPath = false) {
  const ext = removeComposedPath
    ? findExtension(L.last(filename.split("/")))
    : path.extname(filename);
  if (!ext || filename === ext) {
    return filename;
  }
  return filename.substring(0, filename.lastIndexOf(ext));
}

export async function writeFileContentRaw(
  filePath: string,
  content: string | Buffer,
  opts?: { force?: boolean; yes?: boolean }
) {
  opts = opts || {};
  if (existsBuffered(filePath) && !opts.force) {
    const overwrite = await confirmWithUser(
      `File ${filePath} already exists. Do you want to overwrite?`,
      opts.yes
    );
    if (!overwrite) {
      throw new HandledError(
        `Cannot write to ${filePath}; file already exists.`
      );
    }
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  writeFileText(filePath, content);
}

export function defaultResourcePath(
  context: PlasmicContext,
  project: ProjectConfig | ProjectMetaBundle | string,
  ...subpaths: string[]
) {
  const projectName = L.isString(project) ? project : project.projectName;
  return path.join(
    context.config.defaultPlasmicDir,
    L.snakeCase(projectName),
    ...subpaths
  );
}

export function defaultPublicResourcePath(
  context: PlasmicContext,
  project: ProjectConfig,
  ...subpaths: string[]
) {
  return path.join(
    context.config.images.publicDir,
    "plasmic",
    L.snakeCase(project.projectName),
    ...subpaths
  );
}

export function defaultPagePath(context: PlasmicContext, fileName: string) {
  if (context.config.platform === "nextjs") {
    return path.join(context.config.nextjsConfig?.pagesDir || "", fileName);
  }
  if (context.config.platform === "gatsby") {
    return path.join(context.config.gatsbyConfig?.pagesDir || "", fileName);
  }
  return fileName;
}

/**
 * Returns true iff paths `a` and `b` resolve to the same page URI. For
 * example:
 *
 * - pages/about.tsx and pages/about.js resolve to the same URI (/about).
 * - pages/about/index.tsx and pages/about.tsx resolve to the same URI (/about).
 * - pages/index.tsx and pages/index/index.tsx do not resolve to the same URI
 * (they resolve, respectively, to / and /index).
 */
export function eqPagePath(a: string, b: string) {
  // Remove extension and ensure that a.length < b.length.
  a = stripExtension(a);
  b = stripExtension(b);
  if (a.length > b.length) {
    [a, b] = [b, a];
  }

  // pages/about.tsx and pages/about.js resolve to the same page URI.
  if (a === b) {
    return true;
  }

  // pages/about.* and pages/about/index.* resolve to the same URI, but
  // pages/index.* and pages/index/index.* do not.
  if (!a.endsWith("/index") && `${a}/index` === b) {
    return true;
  }

  return false;
}

export async function writeFileContent(
  context: PlasmicContext,
  srcDirFilePath: string,
  content: string | Buffer,
  opts: { force?: boolean } = {}
) {
  const path = makeFilePath(context, srcDirFilePath);
  await writeFileContentRaw(path, content, {
    yes: context.cliArgs.yes,
    ...opts,
  });
}

export function readFileContent(
  context: PlasmicContext,
  srcDirFilePath: string
) {
  const path = makeFilePath(context, srcDirFilePath);
  return readFileText(path);
}

export function deleteFile(context: PlasmicContext, srcDirFilePath: string) {
  const path = makeFilePath(context, srcDirFilePath);
  deleteFileBuffered(path);
}

export function fileExists(context: PlasmicContext, srcDirFilePath: string) {
  return existsBuffered(makeFilePath(context, srcDirFilePath));
}

export function makeFilePath(context: PlasmicContext, filePath: string) {
  return path.isAbsolute(filePath)
    ? filePath
    : path.join(context.absoluteSrcDir, filePath);
}

export function renameFile(
  context: PlasmicContext,
  oldPath: string,
  newPath: string
) {
  renameFileBuffered(
    makeFilePath(context, oldPath),
    makeFilePath(context, newPath)
  );
}

/**
 * Returns absolute paths of all Plasmic managed files found, grouped by each basename
 * for example:
 * {
 * "file.txt": [ "/path1/file.txt", "/path2.txt" ]
 * ...
 * }
 * @param {PlasmicContext} context
 * @returns {Record<string, string[]>}
 **/
export function buildBaseNameToFiles(
  context: PlasmicContext
): Record<string, string[]> {
  const srcDir = context.absoluteSrcDir;
  const scriptFileExt = context.config.code.lang === "ts" ? "tsx" : "jsx";
  const allFiles = glob.sync(`${srcDir}/**/*.+(ts|css|${scriptFileExt}|json)`, {
    ignore: [`${srcDir}/**/node_modules/**/*`],
  });
  return L.groupBy(allFiles, (f) => path.basename(f));
}

/**
 * Tries to find the file at `srcDir/expectedPath`.  If it's not there, tries to detect if it has
 * been moved to a different location.  Returns the found location relative to the `srcDir`.
 *
 * If `expectedPath` doesn't exist, but there's more than one file of that name in `baseNameToFiles`, then
 * error and quit.  If no file of that name can be found, `expectedPath` is returned.
 */
export function findSrcDirPath(
  absoluteSrcDir: string,
  expectedPath: string,
  baseNameToFiles: Record<string, string[]>
): string {
  if (!path.isAbsolute(absoluteSrcDir)) {
    throw new HandledError("Cannot find srcDir. Please check plasmic.json.");
  }

  const fileName = path.basename(expectedPath);
  if (existsBuffered(path.join(absoluteSrcDir, expectedPath))) {
    return expectedPath;
  } else if (!(fileName in baseNameToFiles)) {
    return expectedPath;
  } else if (baseNameToFiles[fileName].length === 1) {
    // There's only one file of the same name, so maybe we've been moved there?
    const newPath = path.relative(absoluteSrcDir, baseNameToFiles[fileName][0]);
    logger.info(`\tDetected file moved from ${expectedPath} to ${newPath}`);
    return newPath;
  } else {
    throw new HandledError(
      `Cannot find expected file at ${expectedPath}, and found multiple possible matching files ${baseNameToFiles[fileName]}.  Please update plasmic.config with the real location for ${fileName}.`
    );
  }
}

/**
 * Finds the full path to the first file satisfying `pred` in `dir`.  If
 * `opts.traverseParents` is set to true, then will also look in ancestor
 * directories until the plasmic.json file is found.  If none is found,
 * returns undefined.
 */
export function findFile(
  dir: string,
  pred: (name: string) => boolean,
  opts: {
    traverseParents?: boolean;
  }
): string | undefined {
  const files = fs.readdirSync(dir);
  const found = files.find((f) => pred(f));
  if (found) {
    return path.join(dir, found);
  }
  if (!opts.traverseParents) {
    return undefined;
  }
  const parent = path.dirname(dir);
  if (parent === dir) {
    // We've hit the root dir already
    return undefined;
  }
  return findFile(path.dirname(dir), pred, opts);
}

type BundleKeyPair = {
  bundle: Record<string, any>;
  key: string;
};

/**
 * Parses a configuration and returns file/dir paths in it (in the format
 * BundleKeyPair to allow the caller to change these paths).
 */
function getAllPaths(context: PlasmicContext): BundleKeyPair[] {
  const config = context.config;

  const pairs: BundleKeyPair[] = [];
  const pushPath = (bundle: Record<string, any>, key: string) => {
    pairs.push({ bundle, key });
  };

  const pushComponent = (comp: ComponentConfig) => {
    pushPath(comp, "renderModuleFilePath");
    pushPath(comp, "cssFilePath");
    if (isLocalModulePath(comp.importSpec.modulePath)) {
      pushPath(comp.importSpec, "modulePath");
    }
  };

  const pushProject = (proj: ProjectConfig) => {
    pushPath(proj, "cssFilePath");
    pushPath(proj, "globalContextsFilePath");
    for (const component of proj.components) {
      pushComponent(component);
    }
    for (const icon of proj.icons) {
      pushPath(icon, "moduleFilePath");
    }
    for (const image of proj.images) {
      pushPath(image, "filePath");
    }
  };

  for (const project of config.projects) {
    pushProject(project);
  }

  for (const bundle of config.globalVariants.variantGroups) {
    pushPath(bundle, "contextFilePath");
  }

  pushPath(config.tokens, "tokensFilePath");
  pushPath(config.style, "defaultStyleCssFilePath");

  pushPath(config, "defaultPlasmicDir");
  if (config.images.publicDir) {
    pushPath(config.images, "publicDir");
  }
  if (config.gatsbyConfig) {
    pushPath(config.gatsbyConfig, "pagesDir");
  }
  if (config.nextjsConfig) {
    pushPath(config.nextjsConfig, "pagesDir");
  }

  return pairs;
}

/**
 * Throws an error if some file in PlasmicConfig is not inside the root
 * directory (i.e., the directory containing plasmic.json).
 */
export function assertAllPathsInRootDir(context: PlasmicContext) {
  // Do not run this check when running in PlasmicLoader environment
  if (process.env.PLASMIC_LOADER) {
    return;
  }

  if (!context.absoluteSrcDir.startsWith(context.rootDir)) {
    throw new HandledError(
      `"srcDir" in ${CONFIG_FILE_NAME} is outside of ${context.rootDir}`
    );
  }

  const paths = getAllPaths(context);
  for (const { bundle, key } of paths) {
    const relPath = bundle[key];
    if (!relPath) {
      continue;
    }

    const absPath = path.resolve(context.absoluteSrcDir, relPath);
    if (!absPath.startsWith(context.rootDir)) {
      throw new HandledError(
        `The path "${relPath}" in ${CONFIG_FILE_NAME} is outside of ${context.rootDir}`
      );
    }
  }
}

/** Whether we're currently recording to the buffer. */
let buffering = false;

interface BufferCreateFile {
  type: "create";
  content: string | Buffer;
}
interface BufferRenameFile {
  type: "rename";
  newPath: string;
}
interface BufferDeleteFile {
  type: "delete";
}

/** List of buffer actions. */
const buffer = new Map<
  string,
  BufferCreateFile | BufferRenameFile | BufferDeleteFile
>();
const renamedFiles = new Map<string, string>();

/**
 * This turns on buffering of file writes/reads.
 *
 * This is useful for reducing the extent to which our file updates are scattered over time, which can cause webpack
 * dev server to trip up.
 *
 * This also has the side benefit of making our CLI commands more atomic, in case of failure partway through a sync.
 */
export async function withBufferedFs(f: () => Promise<void>) {
  buffering = true;
  buffer.clear();
  renamedFiles.clear();
  try {
    await f();
    for (const [filePath, action] of buffer.entries()) {
      switch (action.type) {
        case "create":
          fs.mkdirSync(path.dirname(filePath), { recursive: true });
          // eslint-disable-next-line no-restricted-properties
          fs.writeFileSync(filePath, action.content);
          break;
        case "rename":
          fs.mkdirSync(path.dirname(action.newPath), { recursive: true });
          // eslint-disable-next-line no-restricted-properties
          fs.renameSync(filePath, action.newPath);
          break;
        case "delete":
          // eslint-disable-next-line no-restricted-properties
          fs.unlinkSync(filePath);
          break;
      }
    }
  } finally {
    buffering = false;
  }
}

export function writeFileText(path: string, content: string | Buffer) {
  if (buffering) {
    buffer.set(path, { type: "create", content });
  } else {
    // eslint-disable-next-line no-restricted-properties
    fs.writeFileSync(path, content, "utf8");
  }
}

export function readFileText(path: string): string {
  if (buffering) {
    const action = buffer.get(path);
    if (action) {
      switch (action.type) {
        case "create":
          return ensureString(action.content);
        case "rename":
          return readFileText(action.newPath);
        case "delete":
          throw new HandledError("File does not exists");
      }
    }
  }

  // eslint-disable-next-line no-restricted-properties
  return fs.readFileSync(path, "utf8");
}

export function renameFileBuffered(oldPath: string, newPath: string) {
  if (oldPath === newPath) {
    return;
  }

  if (buffering) {
    if (!existsBuffered(oldPath)) {
      throw new HandledError("File does not exists");
    }

    const action = buffer.get(oldPath);

    if (action) {
      switch (action.type) {
        case "create":
          buffer.set(newPath, action);
          buffer.delete(oldPath);
          break;
        case "rename":
          throw new HandledError("File does not exists");
        case "delete":
          throw new HandledError("File does not exists");
      }
    }

    const renamedFile = renamedFiles.get(oldPath);
    if (renamedFile !== undefined) {
      oldPath = renamedFile;
    }

    buffer.set(oldPath, { type: "rename", newPath });
    renamedFiles.set(newPath, oldPath);
  } else {
    fs.mkdirSync(path.dirname(newPath), { recursive: true });
    // eslint-disable-next-line no-restricted-properties
    fs.renameSync(oldPath, newPath);
  }
}

export function deleteFileBuffered(path: string) {
  if (buffering) {
    if (!existsBuffered(path)) {
      throw new HandledError("File does not exists");
    }

    const action = buffer.get(path);

    if (action) {
      switch (action.type) {
        case "create":
          buffer.delete(path);
          break;
        case "rename":
          throw new HandledError("File does not exists");
        case "delete":
          throw new HandledError("File does not exists");
      }
    } else {
      buffer.set(path, { type: "delete" });
    }

    renamedFiles.delete(path);
  } else {
    // eslint-disable-next-line no-restricted-properties
    fs.unlinkSync(path);
  }
}

export function existsBuffered(path: string): boolean {
  if (buffering) {
    if (renamedFiles.has(path)) {
      return true;
    }

    const action = buffer.get(path);
    if (action) {
      switch (action.type) {
        case "create":
          return true;
        case "rename":
          return false;
        case "delete":
          return false;
      }
    }
  }

  // eslint-disable-next-line no-restricted-properties
  return fs.existsSync(path);
}
