import path from "path";
import L from "lodash";
import fs from "fs";
import {
  ComponentConfig,
  ImportSpec,
  ProjectConfig,
  GlobalVariantGroupConfig,
  PlasmicContext,
  PlasmicConfig,
  StyleConfig,
  IconConfig
} from "./config-utils";
import { stripExtension, writeFileContent } from "./file-utils";
import { flatMap } from "./lang-utils";
import * as ts from "typescript";
import * as Prettier from "prettier/standalone";
import parserTypeScript from "prettier/parser-typescript";

const IMPORT_MARKER = /import\s+([^;]+)\s*;.*\s+plasmic-import:\s+([\w-]+)(?:\/(component|css|render|globalVariant|projectcss|defaultcss|icon))?/g;
const IMPORT_MARKER_WITH_FROM = /^([^;]+)\s+from\s+["'`]([^"'`;]+)["'`]$/;
const IMPORT_MARKER_WITHOUT_FROM = /^["'`]([^"'`;]+)["'`]$/;

function parseImportBody(body: string) {
  const maybeWithFrom = body.match(IMPORT_MARKER_WITH_FROM);
  if (maybeWithFrom) {
    return {
      spec: maybeWithFrom[1] as string,
      from: maybeWithFrom[2] as string
    };
  }
  const noFrom = body.match(IMPORT_MARKER_WITHOUT_FROM);
  if (!noFrom) {
    console.error("Unable to parse import body", noFrom);
    process.exit(1);
  }
  return { spec: "", from: noFrom[1] as string };
}

function getNewNamePart(existingSpec: string, newNamePart: string) {
  // TODO: make this much less fragile!
  const existingImportedNames = existingSpec
    .replace("{", "")
    .replace("}", "")
    .split(",")
    .map(name => name.trim());
  const newSpecParts = existingImportedNames.includes(newNamePart)
    ? [existingSpec]
    : [newNamePart, existingSpec];
  return newSpecParts.join(", ");
}

/**
 * Given the argument `code` string, for module at `fromPath`, replaces all Plasmic imports
 * for modules found in `compConfigsMap`.
 */
export function replaceImports(
  code: string,
  fromPath: string,
  styleConfig: StyleConfig,
  compConfigsMap: Record<string, ComponentConfig>,
  projectConfigsMap: Record<string, ProjectConfig>,
  globalVariantConfigsMap: Record<string, GlobalVariantGroupConfig>,
  iconConfigsMap: Record<string, IconConfig>
) {
  return code.replace(IMPORT_MARKER, (sub, body, uuid, type) => {
    const { spec, from } = parseImportBody(body);
    if (type === "component") {
      // instantiation of a mapped or managed component
      const compConfig = compConfigsMap[uuid];
      if (!compConfig) {
        throw new Error(
          `Encountered Plasmic components in ${fromPath} that are being used but have not been synced.`
        );
      }
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
      return `import ${spec} from "${realPath}"; // plasmic-import: ${uuid}/render`;
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
      return `import ${spec} from "${realPath}"; // plasmic-import: ${uuid}/globalVariant`;
    } else if (type === "icon") {
      // import of global context
      const iconConfig = iconConfigsMap[uuid];
      const realPath = makeImportPath(
        fromPath,
        iconConfig.moduleFilePath,
        true
      );
      return `import ${spec} from "${realPath}"; // plasmic-import: ${uuid}/icon`;
    } else if (type === "projectcss") {
      const projectConfig = projectConfigsMap[uuid];
      const realPath = makeImportPath(
        fromPath,
        projectConfig.cssFilePath,
        false
      );
      return `import "${realPath}"; // plasmic-import: ${uuid}/projectcss`;
    } else if (type === "defaultcss") {
      const realPath = makeImportPath(
        fromPath,
        styleConfig.defaultStyleCssFilePath,
        false
      );
      return `import "${realPath}"; // plasmic-import: ${uuid}/defaultcss`;
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
  console.log("Fixing import statements...");
  const config = context.config;
  const allComponents = flatMap(config.projects, p => p.components);
  const allCompConfigs = L.keyBy(allComponents, c => c.id);
  const allGlobalVariantConfigs = L.keyBy(
    config.globalVariants.variantGroups,
    c => c.id
  );
  const allIconConfigs = L.keyBy(
    flatMap(config.projects, p => p.icons),
    c => c.id
  );
  for (const project of config.projects) {
    for (const compConfig of project.components) {
      fixComponentImportStatements(
        context,
        compConfig,
        allCompConfigs,
        allGlobalVariantConfigs,
        allIconConfigs
      );
    }
  }
}

function fixComponentImportStatements(
  context: PlasmicContext,
  compConfig: ComponentConfig,
  allCompConfigs: Record<string, ComponentConfig>,
  allGlobalVariantConfigs: Record<string, GlobalVariantGroupConfig>,
  allIconConfigs: Record<string, IconConfig>
) {
  fixFileImportStatements(
    context,
    compConfig.renderModuleFilePath,
    allCompConfigs,
    allGlobalVariantConfigs,
    allIconConfigs
  );
  fixFileImportStatements(
    context,
    compConfig.cssFilePath,
    allCompConfigs,
    allGlobalVariantConfigs,
    allIconConfigs
  );
  // If ComponentConfig.importPath is still a local file, we best-effort also fix up the import statements there.
  if (isLocalModulePath(compConfig.importSpec.modulePath)) {
    fixFileImportStatements(
      context,
      compConfig.importSpec.modulePath,
      allCompConfigs,
      allGlobalVariantConfigs,
      allIconConfigs
    );
  }
}

function fixFileImportStatements(
  context: PlasmicContext,
  srcDirFilePath: string,
  allCompConfigs: Record<string, ComponentConfig>,
  allGlobalVariantConfigs: Record<string, GlobalVariantGroupConfig>,
  allIconConfigs: Record<string, IconConfig>
) {
  console.log(`\tFixing ${srcDirFilePath}`);
  const prevContent = fs
    .readFileSync(path.join(context.absoluteSrcDir, srcDirFilePath))
    .toString();
  const allProjectConfigs = L.keyBy(context.config.projects, p => p.projectId);
  const newContent = replaceImports(
    prevContent,
    srcDirFilePath,
    context.config.style,
    allCompConfigs,
    allProjectConfigs,
    allGlobalVariantConfigs,
    allIconConfigs
  );
  writeFileContent(context, srcDirFilePath, newContent, { force: true });
}

class CompilerOptions {
  private static opts: ts.CompilerOptions | undefined = undefined;

  static getOpts() {
    if (!this.opts) {
      let curDir = __dirname;
      let configPath = "";
      do {
        curDir = path.join(curDir, "..");
        configPath = path.join(curDir, "tsconfig-transform.json");
      } while (!fs.existsSync(configPath));
      const c = ts.readConfigFile(configPath, path =>
        fs.readFileSync(path, { encoding: "utf-8" })
      );
      this.opts = ts.convertCompilerOptionsFromJson(
        c.config.compilerOptions,
        "."
      ).options;
    }
    return this.opts;
  }
}

export const tsxToJsx = (code: string) => {
  let result = ts.transpileModule(code, {
    compilerOptions: CompilerOptions.getOpts()
  });
  return result.outputText;
};

export const formatJs = (code: string) => {
  return Prettier.format(code, {
    parser: "typescript",
    plugins: [parserTypeScript]
  });
};
