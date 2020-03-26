import path from "path";
import L from "lodash";
import fs from "fs";
import {
  ComponentConfig,
  ImportSpec,
  ProjectConfig,
  GlobalVariantConfig,
  PlasmicContext
} from "./config-utils";
import { stripExtension, writeFileContent } from "./file-utils";

const IMPORT_MARKER = /import .*\s+plasmic-import:\s+([\w-]+)(?:\/(component|css|render|globalContext))?/g;

/**
 * Given the argument `code` string, for module at `fromPath`, replaces all Plasmic imports
 * for modules found in `compConfigsMap`.
 */
export function replaceImports(
  code: string,
  fromPath: string,
  compConfigsMap: Record<string, ComponentConfig>,
  globalVariantConfigsMap: Record<string, GlobalVariantConfig>
) {
  return code.replace(IMPORT_MARKER, (sub, uuid, type) => {
    if (type === "component") {
      // instantiation of a mapped or managed component
      const compConfig = compConfigsMap[uuid];
      const { modulePath, exportName } = compConfig.importSpec;
      const namePart = exportName
        ? `{${exportName} as ${compConfig.name}}`
        : `${compConfig.name}`;
      const realPath = makeImportPath(fromPath, modulePath, true);
      return `import ${namePart} from "${realPath}";  // plasmic-import: ${uuid}/component`;
    } else if (type === "render") {
      // import of the PP blackbox
      const compConfig = compConfigsMap[uuid];
      const realPath = makeImportPath(
        fromPath,
        compConfig.renderModuleFilePath,
        true
      );
      return `import PP__${compConfig.name} from "${realPath}";  // plasmic-import: ${uuid}/render`;
    } else if (type === "css") {
      // import of the PP css file
      const compConfig = compConfigsMap[uuid];
      const realPath = makeImportPath(fromPath, compConfig.cssFilePath, false);
      return `import "${realPath}";  // plasmic-import: ${uuid}/css`;
    } else if (type === "globalVariant") {
      // import of global context
      const variantConfig = globalVariantConfigsMap[uuid];
      const realPath = makeImportPath(
        fromPath,
        variantConfig.contextFilePath,
        true
      );
      return `import ${variantConfig.name} from "${realPath}";  // plasmic-import: ${uuid}/globalVariant`;
    } else {
      // Does not match a known import type; just keep the same matched string
      return sub;
    }
  });
}

function makeImportPath(fromPath: string, toPath: string, stripExt: boolean) {
  let result = toPath;
  if (isLocalModulePath(toPath)) {
    result = path.relative(path.dirname(fromPath), toPath);
    if (!result.startsWith(".")) {
      result = `./${result}`;
    }
  }
  if (stripExt) {
    result = stripExtension(result);
  }
  return result;
}

/**
 * Returns true if the argument ComponentConfig.importSpec.modulePath is referencing
 * a local file
 */
export function isLocalModulePath(modulePath: string) {
  // It is a local file reference if the importPath includes the file extension
  return !!path.extname(modulePath);
}

/**
 * Assuming that all the files referenced in PlasmicConfig are correct, fixes import statements using PlasmicConfig
 * file locations as the source of truth.
 */
export function fixAllImportStatements(context: PlasmicContext) {
  const config = context.config;
  const srcDir = path.join(context.rootDir, config.srcDir);
  const allCompConfigs = L.keyBy(config.components, c => c.id);
  const allGlobalVariantConfigs = L.keyBy(
    config.globalVariants.variants,
    c => c.id
  );
  for (const compConfig of config.components) {
    fixComponentImportStatements(
      srcDir,
      compConfig,
      allCompConfigs,
      allGlobalVariantConfigs
    );
  }
}

function fixComponentImportStatements(
  srcDir: string,
  compConfig: ComponentConfig,
  allCompConfigs: Record<string, ComponentConfig>,
  allGlobalVariantConfigs: Record<string, GlobalVariantConfig>
) {
  fixFileImportStatements(
    srcDir,
    compConfig.renderModuleFilePath,
    allCompConfigs,
    allGlobalVariantConfigs
  );
  fixFileImportStatements(
    srcDir,
    compConfig.cssFilePath,
    allCompConfigs,
    allGlobalVariantConfigs
  );
  // If ComponentConfig.importPath is still a local file, we best-effort also fix up the import statements there.
  if (isLocalModulePath(compConfig.importSpec.modulePath)) {
    fixFileImportStatements(
      srcDir,
      compConfig.importSpec.modulePath,
      allCompConfigs,
      allGlobalVariantConfigs
    );
  }
}

function fixFileImportStatements(
  srcDir: string,
  srcDirFilePath: string,
  allCompConfigs: Record<string, ComponentConfig>,
  allGlobalVariantConfigs: Record<string, GlobalVariantConfig>
) {
  const prevContent = fs
    .readFileSync(path.join(srcDir, srcDirFilePath))
    .toString();
  const newContent = replaceImports(
    prevContent,
    srcDirFilePath,
    allCompConfigs,
    allGlobalVariantConfigs
  );
  writeFileContent(path.join(srcDir, srcDirFilePath), newContent, {
    force: true
  });
}
