import fs from "fs";
import path from "upath";
import glob from "glob";
import L from "lodash";
import {
  PlasmicContext,
  ComponentConfig,
  ProjectConfig,
  GlobalVariantGroupConfig,
  PlasmicConfig,
  CONFIG_FILE_NAME,
  IconConfig,
  updateConfig
} from "./config-utils";
import { isLocalModulePath } from "./code-utils";
import { logger } from "../deps";
import { HandledError } from "../utils/error";

export function stripExtension(filename: string) {
  const ext = path.extname(filename);
  if (ext.length === 0) {
    return filename;
  }
  return filename.substring(0, filename.lastIndexOf(ext));
}

export function writeFileContentRaw(
  filePath: string,
  content: string,
  opts?: { force?: boolean }
) {
  opts = opts || {};
  if (existsBuffered(filePath) && !opts.force) {
    logger.error(`Cannot write to ${filePath}; file already exists.`);
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  writeFileText(filePath, content);
}

export function writeFileContent(
  context: PlasmicContext,
  srcDirFilePath: string,
  content: string,
  opts: { force?: boolean } = {}
) {
  const path = makeFilePath(context, srcDirFilePath);
  writeFileContentRaw(path, content, opts);
}

export function readFileContent(
  context: PlasmicContext,
  srcDirFilePath: string
) {
  const path = makeFilePath(context, srcDirFilePath);
  return readFileText(path);
}

export function fileExists(context: PlasmicContext, srcDirFilePath: string) {
  return existsBuffered(makeFilePath(context, srcDirFilePath));
}

export function makeFilePath(context: PlasmicContext, filePath: string) {
  return path.join(context.absoluteSrcDir, filePath);
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
    ignore: [`${srcDir}/**/node_modules/**/*`]
  });
  return L.groupBy(allFiles, f => path.basename(f));
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
  const found = files.find(f => pred(f));
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

/**
 * Fixes all src-relative file paths in PlasmicConfig by detecting file
 * movement on disk.
 */
export function fixAllFilePaths(context: PlasmicContext) {
  const baseNameToFiles = buildBaseNameToFiles(context);
  const config = context.config;

  let changed = false;

  const fixPath = <K extends string>(bundle: { [k in K]: string }, key: K) => {
    const known = bundle[key];
    // Check null and undefined
    if (known == null) {
      throw new HandledError(
        `"${key} is required, but missing in ${CONFIG_FILE_NAME}. Please restore the file or delete from ${CONFIG_FILE_NAME} to re-sync: ${bundle}"`
      );
    }
    // Check falsey values (e.g. "")
    if (!known) {
      return;
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
  };

  const fixProject = (proj: ProjectConfig) => {
    fixPath(proj, "cssFilePath");
    for (const component of proj.components) {
      fixComponent(component);
    }
    for (const icon of proj.icons) {
      fixPath(icon, "moduleFilePath");
    }
  };

  const fixComponent = (comp: ComponentConfig) => {
    fixPath(comp, "renderModuleFilePath");
    fixPath(comp, "cssFilePath");
    // If `compConfig.importPath` is still referencing a local file, then we can also best-effort detect
    // whether it has been moved.
    if (isLocalModulePath(comp.importSpec.modulePath)) {
      fixPath(comp.importSpec, "modulePath");
    }
  };

  for (const project of config.projects) {
    fixProject(project);
  }

  for (const bundle of config.globalVariants.variantGroups) {
    fixPath(bundle, "contextFilePath");
  }

  fixPath(config.tokens, "tokensFilePath");
  fixPath(config.style, "defaultStyleCssFilePath");

  if (changed) {
    updateConfig(context, context.config);
  }
}

/** Whether we're currently recording to the buffer. */
let buffering = false;

/** Map of path to content. */
const buffer = new Map<string, string>();

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
    [...buffer.entries()].forEach(([path, content]) => {
      // eslint-disable-next-line no-restricted-properties
      fs.writeFileSync(path, content);
    });
  } finally {
    buffering = false;
  }
}

export function writeFileText(path: string, content: string) {
  if (buffering) {
    buffer.set(path, content);
  } else {
    // eslint-disable-next-line no-restricted-properties
    fs.writeFileSync(path, content, "utf8");
  }
}

export function readFileText(path: string) {
  return buffering
    ? // eslint-disable-next-line no-restricted-properties
      buffer.get(path) ?? fs.readFileSync(path, "utf8")
    : // eslint-disable-next-line no-restricted-properties
      fs.readFileSync(path, "utf8");
}

export function existsBuffered(path: string) {
  return buffering
    ? // eslint-disable-next-line no-restricted-properties
      buffer.has(path) || fs.existsSync(path)
    : // eslint-disable-next-line no-restricted-properties
      fs.existsSync(path);
}
