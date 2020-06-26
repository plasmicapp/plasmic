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
  if (fs.existsSync(filePath) && !opts.force) {
    console.error(`Cannot write to ${filePath}; file already exists.`);
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  fs.writeFileSync(filePath, content);
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
  return fs.readFileSync(makeFilePath(context, srcDirFilePath)).toString();
}

export function fileExists(context: PlasmicContext, srcDirFilePath: string) {
  return fs.existsSync(makeFilePath(context, srcDirFilePath));
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
    console.error("Cannot find srcDir. Please check plasmic.json.");
    process.exit(1);
  }

  const fileName = path.basename(expectedPath);
  if (fs.existsSync(path.join(absoluteSrcDir, expectedPath))) {
    return expectedPath;
  } else if (!(fileName in baseNameToFiles)) {
    return expectedPath;
  } else if (baseNameToFiles[fileName].length === 1) {
    // There's only one file of the same name, so maybe we've been moved there?
    const newPath = path.relative(absoluteSrcDir, baseNameToFiles[fileName][0]);
    console.log(`\tDetected file moved from ${expectedPath} to ${newPath}`);
    return newPath;
  } else {
    console.error(
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
