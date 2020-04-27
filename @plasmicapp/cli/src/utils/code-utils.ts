import path from "path";
import L from "lodash";
import fs from "fs";
import {
  ComponentConfig,
  ImportSpec,
  ProjectConfig,
  GlobalVariantGroupConfig,
  PlasmicContext,
  PlasmicConfig
} from "./config-utils";
import { stripExtension, writeFileContent } from "./file-utils";
import { flatMap } from "./lang-utils";

const IMPORT_MARKER = /^import\s+([^;]+)\s+from\s+["'`]([^"'`;]+)["'`];.*\s+plasmic-import:\s+([\w-]+)(?:\/(component|css|render|globalVariant))?/gm;

function getNewNamePart(existingSpec: string, newNamePart: string) {
  // TODO: make this much less fragile!
  const existingImportedNames = existingSpec.replace("{", "").replace("}", "").split(",").map(name => name.trim());
  const newSpecParts = existingImportedNames.includes(newNamePart)
      ? [existingSpec]
      : [existingSpec, newNamePart];
  return newSpecParts.join(", ");
}

/**
 * Given the argument `code` string, for module at `fromPath`, replaces all Plasmic imports
 * for modules found in `compConfigsMap`.
 */
export function replaceImports(
  code: string,
  fromPath: string,
  compConfigsMap: Record<string, ComponentConfig>,
  globalVariantConfigsMap: Record<string, GlobalVariantGroupConfig>
) {
  return code.replace(IMPORT_MARKER, (sub, spec, from, uuid, type) => {
    if (type === "component") {
      // instantiation of a mapped or managed component
      const compConfig = compConfigsMap[uuid];
      const { modulePath, exportName } = compConfig.importSpec;
      const namePart = exportName
        ? `{${exportName} as ${compConfig.name}}`
        : `${compConfig.name}`;

      const realPath = makeImportPath(fromPath, modulePath, true);
      const newSpec = getNewNamePart(spec, namePart);
      return `import ${newSpec} from "${realPath}"; // plasmic-import: ${uuid}/component`;
    } else if (type === "render") {
      // import of the PP blackbox
      const compConfig = compConfigsMap[uuid];
      const realPath = makeImportPath(
        fromPath,
        compConfig.renderModuleFilePath,
        true
      );
      const newSpec = getNewNamePart(spec, `PP__${compConfig.name}`);
      return `import ${newSpec} from "${realPath}"; // plasmic-import: ${uuid}/render`;
    } else if (type === "css") {
      // import of the PP css file
      const compConfig = compConfigsMap[uuid];
      const realPath = makeImportPath(fromPath, compConfig.cssFilePath, false);
      return `import "${realPath}"; // plasmic-import: ${uuid}/css`;
    } else if (type === "globalVariant") {
      // import of global context
      const variantConfig = globalVariantConfigsMap[uuid];
      const realPath = makeImportPath(
        fromPath,
        variantConfig.contextFilePath,
        true
      );
      return `import ${variantConfig.name}Context from "${realPath}"; // plasmic-import: ${uuid}/globalVariant`;
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
  const allComponents = flatMap(config.projects, p => p.components);
  const allCompConfigs = L.keyBy(allComponents, c => c.id);
  const allGlobalVariantConfigs = L.keyBy(
    config.globalVariants.variantGroups,
    c => c.id
  );
  for (const project of config.projects) {
    for (const compConfig of project.components) {
      fixComponentImportStatements(
        config,
        compConfig,
        allCompConfigs,
        allGlobalVariantConfigs
      );
    }
  }
}

function fixComponentImportStatements(
  config: PlasmicConfig,
  compConfig: ComponentConfig,
  allCompConfigs: Record<string, ComponentConfig>,
  allGlobalVariantConfigs: Record<string, GlobalVariantGroupConfig>
) {
  fixFileImportStatements(
    config,
    compConfig.renderModuleFilePath,
    allCompConfigs,
    allGlobalVariantConfigs
  );
  fixFileImportStatements(
    config,
    compConfig.cssFilePath,
    allCompConfigs,
    allGlobalVariantConfigs
  );
  // If ComponentConfig.importPath is still a local file, we best-effort also fix up the import statements there.
  if (isLocalModulePath(compConfig.importSpec.modulePath)) {
    fixFileImportStatements(
      config,
      compConfig.importSpec.modulePath,
      allCompConfigs,
      allGlobalVariantConfigs
    );
  }
}

function fixFileImportStatements(
  config: PlasmicConfig,
  srcDirFilePath: string,
  allCompConfigs: Record<string, ComponentConfig>,
  allGlobalVariantConfigs: Record<string, GlobalVariantGroupConfig>
) {
  const prevContent = fs
    .readFileSync(path.join(config.srcDir, srcDirFilePath))
    .toString();
  const newContent = replaceImports(
    prevContent,
    srcDirFilePath,
    allCompConfigs,
    allGlobalVariantConfigs
  );
  writeFileContent(config, srcDirFilePath, newContent, { force: true });
}
