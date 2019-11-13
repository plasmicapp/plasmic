import path from "path";
import { ComponentConfig, ImportSpec } from "./config-utils";
import { stripExtension } from "./file-utils";

const IMPORT_MARKER = /import .*\s+plasmic-import:\s+([\w-]+)(?:\/(css|render))?/g;

/**
 * Given the argument `code` string, for module at `fromPath`, replaces all Plasmic imports
 * for modules found in `compConfigsMap`.
 */
export function replaceImports(code: string, fromPath: string, compConfigsMap: Record<string, ComponentConfig>) {
  return code.replace(IMPORT_MARKER, (sub, componentId, type) => {
    const compConfig = compConfigsMap[componentId];
    if (!type) {
      // instantiation of a mapped or managed component
      const {modulePath, exportName} = compConfig.importSpec;
      const namePart = exportName ? `{${exportName} as ${compConfig.name}}` : `${compConfig.name}`;
      return `import ${namePart} from "${makeImportPath(fromPath, modulePath, true)}";  // plasmic-import: ${componentId}`
    } else if (type === "render") {
      // import of the PP blackbox
      return `import PP__${compConfig.name} from "${makeImportPath(fromPath, compConfig.renderModuleFilePath, true)}";  // plasmic-import: ${componentId}/render`
    } else if (type === "css") {
      // import of the PP css file
      return `import "${makeImportPath(fromPath, compConfig.cssFilePath, false)}";  // plasmic-import: ${componentId}/css`
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
