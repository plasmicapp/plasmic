import path from "path";
import { ComponentConfig, ImportSpec, ProjectConfig } from "./config-utils";
import { stripExtension } from "./file-utils";

const IMPORT_MARKER = /import .*\s+plasmic-import:\s+([\w-]+)(?:\/(css|render|globalContext))?/g;

/**
 * Given the argument `code` string, for module at `fromPath`, replaces all Plasmic imports
 * for modules found in `compConfigsMap`.
 */
export function replaceImports(code: string, fromPath: string, compConfigsMap: Record<string, ComponentConfig>, allProjectConfigs: Record<string, ProjectConfig>) {
  return code.replace(IMPORT_MARKER, (sub, uuid, type) => {
    const compConfig = compConfigsMap[uuid];
    if (!type) {
      // instantiation of a mapped or managed component
      const {modulePath, exportName} = compConfig.importSpec;
      const namePart = exportName ? `{${exportName} as ${compConfig.name}}` : `${compConfig.name}`;
      return `import ${namePart} from "${makeImportPath(fromPath, modulePath, true)}";  // plasmic-import: ${uuid}`
    } else if (type === "render") {
      // import of the PP blackbox
      return `import PP__${compConfig.name} from "${makeImportPath(fromPath, compConfig.renderModuleFilePath, true)}";  // plasmic-import: ${uuid}/render`
    } else if (type === "css") {
      // import of the PP css file
      return `import "${makeImportPath(fromPath, compConfig.cssFilePath, false)}";  // plasmic-import: ${uuid}/css`
    } else if (type === "globalContext") {
      // import of global context
      const pc = allProjectConfigs[uuid];
      return `import { ${pc.contextTypeName} } from "${makeImportPath(fromPath, pc.contextFilePath, true)}"; // plasmic-import: ${uuid}/globalContext`;
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
