import path from "upath";
import L from "lodash";
import fs from "fs";
import { logger } from "../deps";
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
import * as parser from "@babel/parser";
import traverse, { Node, NodePath } from "@babel/traverse";
import generate, { GeneratorOptions } from "@babel/generator";
import * as babel from "@babel/core";
import { ImportDeclaration } from "@babel/types";
import { tryParsePlasmicImportSpec } from "@plasmicapp/code-merger";
import { code as nodeToCode } from "@plasmicapp/code-merger/dist/utils";

const IMPORT_MARKER = /import\s+([^;]+)\s*;.*\s+plasmic-import:\s+([\w-]+)(?:\/(component|css|render|globalVariant|projectcss|defaultcss|icon))?/g;

function findImportSpecifierWithAlias(
  importDecl: ImportDeclaration,
  local: string
) {
  for (const spec of importDecl.specifiers) {
    if (spec.type === "ImportSpecifier" && spec.local.name === local) {
      return spec;
    }
  }
  return undefined;
}

function findImportDefaultSpecifier(importDecl: ImportDeclaration) {
  for (const spec of importDecl.specifiers) {
    if (spec.type === "ImportDefaultSpecifier") {
      return spec;
    }
  }
  return undefined;
}

export function ensureImportSpecifierWithAlias(
  decl: ImportDeclaration,
  imported: string,
  alias: string
) {
  const existing = findImportSpecifierWithAlias(decl, alias);
  if (existing) {
    existing.imported.name = imported;
  } else {
    decl.specifiers = decl.specifiers.filter(specifier => {
      if (
        specifier.type === "ImportDefaultSpecifier" &&
        specifier.local.name === alias
      ) {
        // If we are importing a default for a name that will collide with our
        // desired alias, then the default import is wrong and we skip it.
        return false;
      }
      return true;
    });
    decl.specifiers.push(
      babel.types.importSpecifier(
        babel.types.identifier(alias),
        babel.types.identifier(imported)
      )
    );
  }
}

export function ensureImportDefaultSpecifier(
  decl: ImportDeclaration,
  defaultExport: string
) {
  const existing = findImportDefaultSpecifier(decl);
  if (existing) {
    existing.local.name = defaultExport;
  } else {
    decl.specifiers.splice(
      0,
      0,
      babel.types.importDefaultSpecifier(babel.types.identifier(defaultExport))
    );
  }
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
  const file = parser.parse(code, {
    strictMode: true,
    sourceType: "module",
    plugins: [
      // At a minimum, we need to parse jsx and typescript
      "jsx",
      "typescript",

      // There are also various features that people may have... May just
      // need to add as we encounter them...
      "classProperties"
    ]
  });
  file.program.body.forEach(stmt => {
    if (stmt.type !== "ImportDeclaration") {
      return;
    }
    const spec = tryParsePlasmicImportSpec(stmt);
    if (!spec) {
      return;
    }
    const type = spec.type;
    const uuid = spec.id;
    if (type === "component") {
      // instantiation of a mapped or managed component
      const compConfig = compConfigsMap[uuid];
      if (!compConfig) {
        throw new Error(
          `Encountered Plasmic components (of uuid ${uuid}) in ${fromPath} that are being used but have not been synced.`
        );
      }
      const { modulePath, exportName } = compConfig.importSpec;
      if (exportName) {
        // ensure import { ${exportName} as ${compConfig.name} }
        ensureImportSpecifierWithAlias(stmt, exportName, compConfig.name);
      } else {
        // ensure import ${compConfig.name} from ...
        ensureImportDefaultSpecifier(stmt, compConfig.name);
      }
      const realPath = makeImportPath(fromPath, modulePath, true);
      stmt.source.value = realPath;
    } else if (type === "render") {
      // import of the PP blackbox
      const compConfig = compConfigsMap[uuid];
      const realPath = makeImportPath(
        fromPath,
        compConfig.renderModuleFilePath,
        true
      );
      stmt.source.value = realPath;
    } else if (type === "css") {
      // import of the PP css file
      const compConfig = compConfigsMap[uuid];
      const realPath = makeImportPath(fromPath, compConfig.cssFilePath, false);
      stmt.source.value = realPath;
    } else if (type === "globalVariant") {
      // import of global context
      const variantConfig = globalVariantConfigsMap[uuid];
      const realPath = makeImportPath(
        fromPath,
        variantConfig.contextFilePath,
        true
      );
      stmt.source.value = realPath;
    } else if (type === "icon") {
      // import of global context
      const iconConfig = iconConfigsMap[uuid];
      const realPath = makeImportPath(
        fromPath,
        iconConfig.moduleFilePath,
        true
      );
      stmt.source.value = realPath;
    } else if (type === "projectcss") {
      const projectConfig = projectConfigsMap[uuid];
      const realPath = makeImportPath(
        fromPath,
        projectConfig.cssFilePath,
        false
      );
      stmt.source.value = realPath;
    } else if (type === "defaultcss") {
      const realPath = makeImportPath(
        fromPath,
        styleConfig.defaultStyleCssFilePath,
        false
      );
      stmt.source.value = realPath;
    }
  });
  return nodeToCode(file, { retainLines: true });
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
  logger.info("Fixing import statements...");
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
  // when the code has jsx pragma, typescript will remove comments, and remove
  // "import React from 'React'" if React is unused. So we first invalidate it.
  // We also need to add the usageMagic to prevent typescript from remove the
  // import of ncreatePlasmicElementProxy.
  const usageMagic = "\ncreatePlasmicElementProxy();";
  const replaced = code.replace("/** @jsx", "/** @ jsx") + usageMagic;
  let result = ts.transpileModule(replaced, {
    compilerOptions: CompilerOptions.getOpts()
  });
  return result.outputText
    .replace("/** @ jsx", "/** @jsx")
    .replace(usageMagic, "");
};

export const formatJs = (code: string) => {
  const file = parser.parse(code, {
    strictMode: true,
    sourceType: "module",
    plugins: ["jsx", "typescript"]
  });
  let newLineMarker = "THIS_SHALL_BE_NEW_LINE";
  while (code.includes(newLineMarker)) {
    newLineMarker = newLineMarker + "_REALLY";
  }
  traverse(file, {
    Statement: function(path) {
      if (
        file.program.body.includes(path.node) &&
        path.node.type !== "ImportDeclaration"
      ) {
        path.insertBefore(babel.types.stringLiteral(newLineMarker));
        path.skip();
      }
    }
  });

  const withmarkers = generate(file, { retainLines: true }).code;
  const withNewLines = withmarkers.replace(
    new RegExp(`"${newLineMarker}"`, "g"),
    "\n"
  );

  return Prettier.format(withNewLines, {
    printWidth: 80,
    tabWidth: 2,
    useTabs: false,
    parser: "typescript",
    plugins: [parserTypeScript]
  });
};

export const parseImport = (code: string) => {
  const file = parser.parse(code, {
    strictMode: true,
    sourceType: "module",
    plugins: ["jsx", "typescript"]
  });
  if (file.program.body.length === 1) {
    const stmt = file.program.body[0];
    if (stmt.type === "ImportDeclaration") {
      return stmt;
    }
  }
  return undefined;
};

export const toCode = (node: ImportDeclaration) => {
  const code = generate(node, { retainLines: true, comments: false }).code;
  const formatted = Prettier.format(code, {
    parser: "typescript",
    trailingComma: "none",
    plugins: [parserTypeScript]
  });

  // Prettier add a newline to the end of file. So trim it.
  const body = formatted.trimRight();
  // Babel may move the comment to the next line - so we manually append the
  // comment.
  // See https://github.com/babel/babel/issues/5512
  if (node.trailingComments?.length === 1) {
    const comment = node.trailingComments[0];
    return body + ` //${comment.value}`;
  }
  return body;
};
