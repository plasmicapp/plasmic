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
  isPageAwarePlatform,
  PlasmicContext,
  ProjectConfig,
  updateConfig,
} from "./config-utils";
import { detectCreateReactApp } from "./envdetect";
import { ensureString } from "./lang-utils";
import { confirmWithUser } from "./user-utils";

export function stripExtension(filename: string, removeComposedPath = false) {
  const ext = removeComposedPath
    ? filename.substring(filename.indexOf("."))
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
      logger.error(`Cannot write to ${filePath}; file already exists.`);
      process.exit(1);
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
    logger.error("Cannot find srcDir. Please check plasmic.json.");
    process.exit(1);
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
    logger.error(
      `Cannot find expected file at ${expectedPath}, and found multiple possible matching files ${baseNameToFiles[fileName]}.  Please update plasmic.config with the real location for ${fileName}.`
    );
    process.exit(1);
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
 * Fixes all src-relative file paths in PlasmicConfig by detecting file
 * movement on disk.
 */
export async function fixAllFilePaths(context: PlasmicContext) {
  const baseNameToFiles = buildBaseNameToFiles(context);
  let changed = false;

  const paths = getAllPaths(context);
  for (const { bundle, key } of paths) {
    const known = bundle[key];
    // Check null and undefined
    if (known == null) {
      throw new HandledError(
        `"${key} is required, but missing in ${CONFIG_FILE_NAME}. Please restore the file or delete from ${CONFIG_FILE_NAME} and run plasmic sync: ${bundle}"`
      );
    }
    // Check falsey values (e.g. "")
    if (!known) {
      continue;
    }
    const found = findSrcDirPath(
      context.absoluteSrcDir,
      known,
      baseNameToFiles
    );
    if (known !== found) {
      bundle[key] = found;
      changed = true;
    }
  }

  if (changed) {
    await updateConfig(context, context.config);
  }
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

/**
 * If this is a Next.js, Gatsby, or create-react-app stack,
 * - searches for an existing index file
 * - if it's missing, creates a Welcome to Plasmic page
 *
 * Expect this to only succeed with create-plasmic-app,
 * which explicitly deletes the index file
 * @param context
 * @returns
 */
export async function createMissingIndexPage(context: PlasmicContext) {
  const isNextjs = context.config.platform === "nextjs";
  const isGatsby = context.config.platform === "gatsby";
  const isCra = context.config.platform === "react" && detectCreateReactApp();
  const isTypescript = context.config.code.lang === "ts";

  const pagesDir = isNextjs
    ? context.config.nextjsConfig?.pagesDir
    : isGatsby
    ? context.config.gatsbyConfig?.pagesDir
    : isCra
    ? "../" // relative to srcDir in plasmic.json
    : undefined;
  const indexBasename = isCra ? `App` : `index`;
  const extension = isTypescript ? "tsx" : "jsx";

  // Skip creating index file if not Next.js, Gatsby, or CRA
  if (!pagesDir) {
    return;
  }

  const indexRelPath = path.join(pagesDir, `${indexBasename}.${extension}`);
  // Search for an existing file, skip if so
  const searchQuery = makeFilePath(
    context,
    path.join(pagesDir, `${indexBasename}.*`)
  );
  const searchResults = glob.sync(searchQuery);
  if (searchResults.length > 0) {
    return;
  }

  // Create an index file
  const pageComponents = L.flatMap(
    context.config.projects,
    (p) => p.components
  ).filter((c) => c.componentType === "page");
  const pageLinks = pageComponents
    .map((pc) => {
      // Get the relative path on the filesystem
      const relativePath = path.relative(pagesDir, pc.importSpec.modulePath);
      // Format as an absolute path without the extension name
      const relativeLink = "/" + stripExtension(relativePath);
      return `<li><a style={{ color: "blue" }} href="${relativeLink}">${pc.name} - ${relativeLink}</a></li>`;
    })
    .join("\n");
  const pageSection =
    !isPageAwarePlatform(context.config.platform) || pageComponents.length <= 0
      ? ""
      : `
        <h3>Your pages:</h3>
        <ul>
          ${pageLinks}
        </ul>
  `;
  const content = `
import React from "react";
function Index() {
  return (
    <div style={{ width: "100%", padding: "100px", alignContent: "center" }}>
      <header>
        <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0zNCAyNkgzMlYyNUMzMiAxOC4zNzI5IDI2LjYyNzEgMTMuMDAwNiAyMCAxMy4wMDA2QzEzLjM3MjkgMTMuMDAwNiA4LjAwMDU1IDE4LjM3MjkgOC4wMDA1NSAyNUw4IDI2SDZDNS40NDc3MSAyNiA1IDI1LjU1MjMgNSAyNUM1IDE2LjcxNTkgMTEuNzE2IDEwLjAwMDQgMjAgMTAuMDAwNEMyOC4yODQxIDEwLjAwMDQgMzQuOTk5NiAxNi43MTU5IDM0Ljk5OTYgMjVDMzQuOTk5NiAyNS41NTIzIDM0LjU1MjMgMjYgMzQgMjZaIiBmaWxsPSJ1cmwoI3BhaW50MF9saW5lYXIpIi8+CjxwYXRoIGQ9Ik0yNi45OTkxIDI1QzI2Ljk5OTEgMjEuMTM0NiAyMy44NjU1IDE4LjAwMSAyMCAxOC4wMDFDMTYuMTM0NSAxOC4wMDExIDEzIDIxLjEzNDYgMTMgMjVWMjZIMTVDMTUuNTUyMyAyNiAxNiAyNS41NTIzIDE2IDI1QzE2IDIyLjc5MDkgMTcuNzkwOSAyMSAyMCAyMUMyMi4yMDkxIDIxIDI0IDIyLjc5MDkgMjQgMjVDMjQgMjUuNTUyMyAyNC40NDc3IDI2IDI1IDI2SDI3TDI2Ljk5OTEgMjVaIiBmaWxsPSJ1cmwoI3BhaW50MV9saW5lYXIpIi8+CjxwYXRoIGQ9Ik0zMC45OTkgMjQuOTk5OUMzMC45OTkgMTguOTI1NCAyNi4wNzQ2IDE0LjAwMSAyMCAxNC4wMDFDMTMuOTI1NCAxNC4wMDEgOS4wMDEwNSAxOC45MjU1IDkuMDAxMDUgMjVIOVYyNkgxMi4wMDA0VjI1QzEyLjAwMDQgMjAuNTgyIDE1LjU4MiAxNy4wMDA1IDIwIDE3LjAwMDVDMjQuNDE4IDE3LjAwMDUgMjggMjAuNTgyIDI4IDI1VjI2SDMxVjI1TDMwLjk5OSAyNC45OTk5WiIgZmlsbD0idXJsKCNwYWludDJfbGluZWFyKSIvPgo8ZGVmcz4KPGxpbmVhckdyYWRpZW50IGlkPSJwYWludDBfbGluZWFyIiB4MT0iNSIgeTE9IjI2IiB4Mj0iMzUiIHkyPSIyNiIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgo8c3RvcCBzdG9wLWNvbG9yPSIjMTg3N0YyIi8+CjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzA0QTRGNCIvPgo8L2xpbmVhckdyYWRpZW50Pgo8bGluZWFyR3JhZGllbnQgaWQ9InBhaW50MV9saW5lYXIiIHgxPSIxMyIgeTE9IjI2IiB4Mj0iMjciIHkyPSIyNiIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgo8c3RvcCBzdG9wLWNvbG9yPSIjRjAyODQ5Ii8+CjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iI0Y1NTMzRCIvPgo8L2xpbmVhckdyYWRpZW50Pgo8bGluZWFyR3JhZGllbnQgaWQ9InBhaW50Ml9saW5lYXIiIHgxPSI5IiB5MT0iMjYiIHgyPSIzMSIgeTI9IjI2IiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CjxzdG9wIHN0b3AtY29sb3I9IiM0NUJENjIiLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjMkFCQkE3Ii8+CjwvbGluZWFyR3JhZGllbnQ+CjwvZGVmcz4KPC9zdmc+Cg==" alt="" />
        <h1 style={{ margin: 0 }}>
          Welcome to Plasmic!
        </h1>
        <h4>
          <a
            style={{ color: "blue" }}
            href="https://www.plasmic.app/learn/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn Plasmic
          </a>
        </h4>
        ${pageSection}
      </header>
    </div>
  );
}

export default Index;
  `;
  await writeFileContent(context, makeFilePath(context, indexRelPath), content);
}
