import path, { resolve } from "upath";
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
import * as Prettier from "prettier";
import { Options, resolveConfig } from "prettier";
import * as parser from "@babel/parser";
import traverse, { Node, NodePath } from "@babel/traverse";
import generate, { GeneratorOptions } from "@babel/generator";
import * as babel from "@babel/core";
import { ImportDeclaration } from "@babel/types";
import { tryParsePlasmicImportSpec } from "@plasmicapp/code-merger";
import { HandledError } from "../utils/error";

export const formatAsLocal = (
  c: string,
  filePath: string,
  defaultOpts: Options = {}
) => {
  const opts = resolveConfig.sync(process.cwd()) || defaultOpts;
  opts.filepath = filePath;
  return Prettier.format(c, opts);
};

const nodeToFormattedCode = (
  n: Node,
  unformatted?: boolean,
  commentsToRemove?: Set<string>
) => {
  const c = generate(n, {
    retainLines: true,
    shouldPrintComment: c => !commentsToRemove || !commentsToRemove.has(c)
  }).code;
  return unformatted
    ? c
    : formatAsLocal(c, "/tmp/x.tsx", {
        trailingComma: "none",
        arrowParens: "avoid"
      });
};

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
  fixImportContext: FixImportContext,
  removeImportDirective: boolean
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
  const commentsToRemove = new Set<string>();
  file.program.body.forEach(stmt => {
    if (stmt.type !== "ImportDeclaration") {
      return;
    }
    const spec = tryParsePlasmicImportSpec(stmt);
    if (!spec) {
      return;
    }
    if (removeImportDirective) {
      commentsToRemove.add(stmt.trailingComments?.[0].value || "");
    }
    const type = spec.type;
    const uuid = spec.id;
    if (type === "component") {
      // instantiation of a mapped or managed component
      const compConfig = fixImportContext.components[uuid];
      if (!compConfig) {
        throw new HandledError(
          `Encountered Plasmic components (of uuid ${uuid}) in ${fromPath} that are being used but have not been synced. Try --recursive to also fetch missing components.`
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
      const compConfig = fixImportContext.components[uuid];
      const realPath = makeImportPath(
        fromPath,
        compConfig.renderModuleFilePath,
        true
      );
      stmt.source.value = realPath;
    } else if (type === "css") {
      // import of the PP css file
      const compConfig = fixImportContext.components[uuid];
      const realPath = makeImportPath(fromPath, compConfig.cssFilePath, false);
      stmt.source.value = realPath;
    } else if (type === "globalVariant") {
      // import of global context
      const variantConfig = fixImportContext.globalVariants[uuid];
      const realPath = makeImportPath(
        fromPath,
        variantConfig.contextFilePath,
        true
      );
      stmt.source.value = realPath;
    } else if (type === "icon") {
      // import of global context
      const iconConfig = fixImportContext.icons[uuid];
      const realPath = makeImportPath(
        fromPath,
        iconConfig.moduleFilePath,
        true
      );
      stmt.source.value = realPath;
    } else if (type === "projectcss") {
      const projectConfig = fixImportContext.projects[uuid];
      const realPath = makeImportPath(
        fromPath,
        projectConfig.cssFilePath,
        false
      );
      stmt.source.value = realPath;
    } else if (type === "defaultcss") {
      const realPath = makeImportPath(
        fromPath,
        fixImportContext.config.style.defaultStyleCssFilePath,
        false
      );
      stmt.source.value = realPath;
    }
  });
  return nodeToFormattedCode(file, false, commentsToRemove);
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

export interface ComponentUpdateSummary {
  // Whether the skeleton module was modified or created.
  skeletonModuleModified: boolean;
}

export interface FixImportContext {
  config: PlasmicConfig;
  components: Record<string, ComponentConfig>;
  globalVariants: Record<string, GlobalVariantGroupConfig>;
  icons: Record<string, IconConfig>;
  projects: Record<string, ProjectConfig>;
}

export const mkFixImportContext = (config: PlasmicConfig) => {
  const allComponents = flatMap(config.projects, p => p.components);
  const components = L.keyBy(allComponents, c => c.id);
  const globalVariants = L.keyBy(
    config.globalVariants.variantGroups,
    c => c.id
  );
  const icons = L.keyBy(
    flatMap(config.projects, p => p.icons),
    c => c.id
  );
  const projects = L.keyBy(config.projects, p => p.projectId);
  return {
    config,
    components,
    globalVariants,
    icons,
    projects
  };
};

/**
 * Assuming that all the files referenced in PlasmicConfig are correct, fixes import statements using PlasmicConfig
 * file locations as the source of truth.
 */
export function fixAllImportStatements(
  context: PlasmicContext,
  summary?: Map<string, ComponentUpdateSummary>
) {
  logger.info("Fixing import statements...");
  const config = context.config;
  const fixImportContext = mkFixImportContext(config);
  for (const project of config.projects) {
    for (const compConfig of project.components) {
      const compSummary = summary?.get(compConfig.id);
      if (summary && !compSummary) {
        continue;
      }
      const fixSkeletonModule = compSummary
        ? compSummary.skeletonModuleModified
        : true;
      if (!summary || compSummary) {
        fixComponentImportStatements(
          context,
          compConfig,
          fixImportContext,
          fixSkeletonModule
        );
      }
    }
  }
}

function fixComponentImportStatements(
  context: PlasmicContext,
  compConfig: ComponentConfig,
  fixImportContext: FixImportContext,
  fixSkeletonModule: boolean
) {
  fixFileImportStatements(
    context,
    compConfig.renderModuleFilePath,
    fixImportContext,
    false
  );
  // If ComponentConfig.importPath is still a local file, we best-effort also fix up the import statements there.
  if (
    isLocalModulePath(compConfig.importSpec.modulePath) &&
    fixSkeletonModule
  ) {
    fixFileImportStatements(
      context,
      compConfig.importSpec.modulePath,
      fixImportContext,
      true
    );
  }
}

function fixFileImportStatements(
  context: PlasmicContext,
  srcDirFilePath: string,
  fixImportContext: FixImportContext,
  removeImportDirective: boolean
) {
  const prevContent = fs
    .readFileSync(path.join(context.absoluteSrcDir, srcDirFilePath))
    .toString();

  const newContent = replaceImports(
    prevContent,
    srcDirFilePath,
    fixImportContext,
    removeImportDirective
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

export const formatScript = (code: string) => {
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

  const withmarkers = nodeToFormattedCode(file, true);
  const withNewLines = withmarkers.replace(
    new RegExp(`"${newLineMarker}"`, "g"),
    "\n"
  );
  return formatAsLocal(withNewLines, "/tmp/x.tsx", {
    printWidth: 80,
    tabWidth: 2,
    useTabs: false
  });
};
