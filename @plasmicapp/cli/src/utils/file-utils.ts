import fs from "fs";
import path from "path";
import glob from "glob";
import L from "lodash";
import {
  PlasmicContext,
  ComponentConfig,
  ProjectConfig,
  GlobalVariantGroupConfig,
  PlasmicConfig
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
  path: string,
  content: string,
  opts?: { force?: boolean }
) {
  opts = opts || {};
  if (fs.existsSync(path) && !opts.force) {
    console.error(`Cannot write to ${path}; file already exists.`);
    process.exit(1);
  }

  fs.writeFileSync(path, content);
}

export function writeFileContent(
  config: PlasmicConfig,
  srcDirFilePath: string,
  content: string,
  opts: { force?: boolean } = {}
) {
  const path = makeFilePath(config, srcDirFilePath);
  writeFileContentRaw(path, content, opts);
}

export function readFileContent(config: PlasmicConfig, srcDirFilePath: string) {
  return fs.readFileSync(makeFilePath(config, srcDirFilePath)).toString();
}

export function fileExists(config: PlasmicConfig, srcDirFilePath: string) {
  return fs.existsSync(makeFilePath(config, srcDirFilePath));
}

export function makeFilePath(config: PlasmicConfig, filePath: string) {
  return path.join(config.srcDir, filePath);
}

export function buildBaseNameToFiles(context: PlasmicContext) {
  const srcDir = path.join(context.rootDir, context.config.srcDir);
  const allFiles = glob.sync(`${srcDir}/**/*.+(ts|css|tsx|json)`, {
    ignore: [`${srcDir}/**/node_modules/**/*`]
  });
  return L.groupBy(allFiles, f => path.basename(f));
}

/**
 * Attempts to look for all files referenced in `compConfig`, and best-guess fix up the references
 * if the files have been moved.  Mutates `compConfig` with the new paths.
 */
export function fixComponentPaths(
  srcDir: string,
  compConfig: ComponentConfig,
  baseNameToFiles: Record<string, string[]>
) {
  compConfig.renderModuleFilePath = findSrcDirPath(
    srcDir,
    compConfig.renderModuleFilePath,
    baseNameToFiles
  );

  compConfig.cssFilePath = findSrcDirPath(
    srcDir,
    compConfig.cssFilePath,
    baseNameToFiles
  );

  // If `compConfig.importPath` is still referencing a local file, then we can also best-effort detect
  // whether it has been moved.
  if (isLocalModulePath(compConfig.importSpec.modulePath)) {
    const modulePath = compConfig.importSpec.modulePath;
    const fuzzyPath = findSrcDirPath(srcDir, modulePath, baseNameToFiles);
    if (fuzzyPath !== modulePath) {
      console.warn(`\tDetected file moved from ${modulePath} to ${fuzzyPath}`);
      compConfig.importSpec.modulePath = fuzzyPath;
    }
  }
}

export function fixGlobalVariantFilePath(
  srcDir: string,
  variantConfig: GlobalVariantGroupConfig,
  baseNameToFiles: Record<string, string[]>
) {
  variantConfig.contextFilePath = findSrcDirPath(
    srcDir,
    variantConfig.contextFilePath,
    baseNameToFiles
  );
}

export function fixProjectFilePaths(
  srcDir: string,
  projectConfig: ProjectConfig,
  baseNameToFiles: Record<string, string[]>
) {
  projectConfig.fontsFilePath = findSrcDirPath(
    srcDir,
    projectConfig.fontsFilePath,
    baseNameToFiles
  );
}

/**
 * Tries to find the file at `srcDir/expectedPath`.  If it's not there, tries to detect if it has
 * been moved to a different location.  Returns the found location relative to the `srcDir`.
 *
 * If `expectedPath` doesn't exist, but there's more than one file of that name in `baseNameToFiles`, then
 * error and quit.  If no file of that name can be found, `expectedPath` is returned.
 */
export function findSrcDirPath(
  srcDir: string,
  expectedPath: string,
  baseNameToFiles: Record<string, string[]>
): string {
  const fileName = path.basename(expectedPath);
  if (fs.existsSync(path.join(srcDir, expectedPath))) {
    return expectedPath;
  } else if (!(fileName in baseNameToFiles)) {
    return expectedPath;
  } else if (baseNameToFiles[fileName].length === 1) {
    // There's only one file of the same name, so maybe we've been moved there?
    const newPath = path.relative(srcDir, baseNameToFiles[fileName][0]);
    console.log(`\tDetected file moved from ${expectedPath} to ${newPath}`);
    return newPath;
  } else {
    console.error(
      `Cannot find expected file at ${expectedPath}, and found multiple possible matching files ${baseNameToFiles[fileName]}.  Please update plasmic.config with the real location for ${fileName}.`
    );
    process.exit(1);
  }
}
