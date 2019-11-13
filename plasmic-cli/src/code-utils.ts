import path from "path";
import { ComponentConfig } from "./config-utils";
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
      const {modulePath, exportName} = parseImportPath(compConfig.importPath);
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
  if (isLocalImportPath(toPath)) {
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
 * Returns true if the argument ComponentConfig.importPath is referencing
 * a local file
 */
export function isLocalImportPath(importPath: string) {
  // It is a local file reference if the modulePath includes the file extension
  const {modulePath} = parseImportPath(importPath);
  return !!path.extname(modulePath);
}

/**
 * ComponentConfig.importPath is of the format "modulePath::exportName".
 * If the component is the default export, then exportName is undefined.
 */
export function parseImportPath(importPath: string) {
  const [modulePath, exportName] = importPath.split("::");
  return {modulePath, exportName: exportName || undefined};
}