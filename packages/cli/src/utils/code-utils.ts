import * as babel from "@babel/core";
import generate from "@babel/generator";
import * as parser from "@babel/parser";
import traverse, { Node } from "@babel/traverse";
import { ImportDeclaration } from "@babel/types";
import L from "lodash";
import * as Prettier from "prettier";
import { Options, resolveConfig } from "prettier";
import * as ts from "typescript";
import path from "upath";
import {
  fixComponentCssReferences,
  fixComponentImagesReferences,
} from "../actions/sync-images";
import { logger } from "../deps";
import { HandledError } from "../utils/error";
import {
  CodeComponentConfig,
  ComponentConfig,
  GlobalVariantGroupConfig,
  IconConfig,
  ImageConfig,
  PlasmicConfig,
  PlasmicContext,
  ProjectConfig,
} from "./config-utils";
import {
  existsBuffered,
  makeFilePath,
  readFileText,
  stripExtension,
  writeFileContent,
} from "./file-utils";
import { assert, flatMap } from "./lang-utils";

export const formatAsLocal = (
  content: string,
  filePath: string,
  defaultOpts: Options = {}
) => {
  const opts = resolveConfig.sync(process.cwd()) || defaultOpts;
  opts.filepath = filePath;

  // Running Prettier multiple times may actually yield different results!
  // Here we run it twice, just to be safe... :-/
  const res = Prettier.format(content, opts);
  const res2 = Prettier.format(res, opts);
  return res2;
};

const nodeToFormattedCode = (
  n: Node,
  unformatted?: boolean,
  commentsToRemove?: Set<string>
) => {
  const c = generate(n, {
    retainLines: true,
    shouldPrintComment: (c) => !commentsToRemove || !commentsToRemove.has(c),
  }).code;
  return unformatted
    ? c
    : formatAsLocal(c, "/tmp/x.tsx", {
        trailingComma: "none",
        arrowParens: "avoid",
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
    if (existing.imported.type === "Identifier") {
      existing.imported.name = imported;
    } else {
      existing.imported.value = imported;
    }
  } else {
    decl.specifiers = decl.specifiers.filter((specifier) => {
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

interface PlasmicImportSpec {
  id: string;
  type: PlasmicImportType;
  node: ImportDeclaration;
}

type PlasmicImportType =
  | "render"
  | "css"
  | "component"
  | "globalVariant"
  | "projectcss"
  | "defaultcss"
  | "icon"
  | "picture"
  | "jsBundle"
  | "codeComponent"
  | undefined;

function tryParsePlasmicImportSpec(node: ImportDeclaration) {
  const c = node.trailingComments?.[0];
  if (!c) {
    return undefined;
  }
  const m = c.value.match(
    /plasmic-import:\s+([\w-]+)(?:\/(component|css|render|globalVariant|projectcss|defaultcss|icon|picture|jsBundle|codeComponent))?/
  );
  if (m) {
    return { id: m[1], type: m[2] as PlasmicImportType } as PlasmicImportSpec;
  }
  return undefined;
}

function filterUnformattedMarker(code: string, changed: boolean) {
  const lines = code.split("\n");
  const isUnformattedMarker = (line: string) =>
    line.trim() === "// plasmic-unformatted";
  changed = changed || lines.some(isUnformattedMarker);
  code = lines.filter((line) => !isUnformattedMarker(line)).join("\n");
  return [code, changed] as const;
}

/**
 * Given the argument `code` string, for module at `fromPath`, replaces all Plasmic imports
 * for modules found in `compConfigsMap`.
 */
export function replaceImports(
  context: PlasmicContext,
  code: string,
  fromPath: string,
  fixImportContext: FixImportContext,
  removeImportDirective: boolean,
  changed = false
) {
  [code, changed] = filterUnformattedMarker(code, changed);
  const file = parser.parse(code, {
    strictMode: true,
    sourceType: "module",
    plugins: [
      // At a minimum, we need to parse jsx and typescript
      "jsx",
      "typescript",

      // There are also various features that people may have... May just
      // need to add as we encounter them...
      "classProperties",
    ],
  });
  const commentsToRemove = new Set<string>();
  file.program.body.forEach((stmt) => {
    if (stmt.type !== "ImportDeclaration") {
      return;
    }
    const importStmt: ImportDeclaration = stmt;
    const spec = tryParsePlasmicImportSpec(importStmt);
    if (!spec) {
      return;
    }
    changed = true;
    if (removeImportDirective) {
      commentsToRemove.add(stmt.trailingComments?.[0].value || "");
    }
    const type = spec.type;
    const uuid = spec.id;
    if (type === "component") {
      // instantiation of a mapped or managed component
      const compConfig = fixImportContext.components[uuid];
      if (!compConfig) {
        throwMissingReference(context, "component", uuid, fromPath);
      }
      const { modulePath, exportName } = compConfig.importSpec;
      if (exportName) {
        // ensure import { ${exportName} as ${compConfig.name} }
        ensureImportSpecifierWithAlias(stmt, exportName, compConfig.name);
      } else {
        // Keep the same name as it might be different from compConfig.name due
        // to name collisions.
        // ensureImportDefaultSpecifier(stmt, compConfig.name);
      }
      const realPath = makeImportPath(context, fromPath, modulePath, true);
      stmt.source.value = realPath;
    } else if (type === "render") {
      // import of the PP blackbox
      const compConfig = fixImportContext.components[uuid];
      if (!compConfig) {
        throwMissingReference(context, "component", uuid, fromPath);
      }
      const realPath = makeImportPath(
        context,
        fromPath,
        compConfig.renderModuleFilePath,
        true
      );
      stmt.source.value = realPath;
    } else if (type === "css") {
      // import of the PP css file
      const compConfig = fixImportContext.components[uuid];
      if (!compConfig) {
        throwMissingReference(context, "component", uuid, fromPath);
      }
      const realPath = makeImportPath(
        context,
        fromPath,
        compConfig.cssFilePath,
        false
      );
      stmt.source.value = realPath;
    } else if (type === "globalVariant") {
      // import of global context
      const variantConfig = fixImportContext.globalVariants[uuid];
      if (!variantConfig) {
        throwMissingReference(context, "global variant", uuid, fromPath);
      }
      const realPath = makeImportPath(
        context,
        fromPath,
        variantConfig.contextFilePath,
        true
      );
      stmt.source.value = realPath;
    } else if (type === "icon") {
      // import of global context
      const iconConfig = fixImportContext.icons[uuid];
      if (!iconConfig) {
        throwMissingReference(context, "icon", uuid, fromPath);
      }
      const realPath = makeImportPath(
        context,
        fromPath,
        iconConfig.moduleFilePath,
        true
      );
      stmt.source.value = realPath;
    } else if (type === "picture") {
      const imageConfig = fixImportContext.images[uuid];
      if (!imageConfig) {
        throwMissingReference(context, "image", uuid, fromPath);
      }
      const realPath = makeImportPath(
        context,
        fromPath,
        imageConfig.filePath,
        false
      );
      stmt.source.value = realPath;
    } else if (type === "projectcss") {
      const projectConfig = fixImportContext.projects[uuid];
      if (!projectConfig) {
        throwMissingReference(context, "project", uuid, fromPath);
      }
      const realPath = makeImportPath(
        context,
        fromPath,
        projectConfig.cssFilePath,
        false
      );
      stmt.source.value = realPath;
    } else if (type === "defaultcss") {
      const realPath = makeImportPath(
        context,
        fromPath,
        fixImportContext.config.style.defaultStyleCssFilePath,
        false
      );
      stmt.source.value = realPath;
    } else if (type === "codeComponent") {
      const meta = fixImportContext.codeComponentMetas[uuid];
      if (meta.componentImportPath[0] === ".") {
        // Relative path from the project root
        const toPath = path.join(context.rootDir, meta.componentImportPath);
        assert(path.isAbsolute(toPath));
        const realPath = makeImportPath(context, fromPath, toPath, true);
        stmt.source.value = realPath;
      } else {
        // npm package
        stmt.source.value = meta.componentImportPath;
      }
    }
  });

  if (!changed) {
    return code;
  }

  return nodeToFormattedCode(file, !changed, commentsToRemove);
}

function throwMissingReference(
  context: PlasmicContext,
  itemType: string,
  uuid: string,
  fromPath: string
) {
  let recFix = `Please make sure projects that "${uuid}" depends on have already been synced.`;
  if (context.cliArgs.nonRecursive) {
    recFix = `Please run "plasmic sync" without the --non-recursive flag to sync dependencies.`;
  } else if (!context.cliArgs.force) {
    recFix = `Please run "plasmic sync" with --force flag to force-sync the dependencies.`;
  }
  throw new HandledError(
    `Encountered Plasmic ${itemType} "${uuid}" in ${fromPath} that are being used but have not been synced. ${recFix}`
  );
}

function makeImportPath(
  context: PlasmicContext,
  fromPath: string,
  toPath: string,
  stripExt: boolean
) {
  let result = toPath;
  if (isLocalModulePath(toPath)) {
    result = path.relative(
      makeFilePath(context, path.dirname(fromPath)),
      makeFilePath(context, toPath)
    );
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
  codeComponentMetas: Record<string, CodeComponentConfig>;
  globalVariants: Record<string, GlobalVariantGroupConfig>;
  icons: Record<string, IconConfig>;
  images: Record<string, ImageConfig>;
  projects: Record<string, ProjectConfig>;
}

export const mkFixImportContext = (config: PlasmicConfig) => {
  const allComponents = flatMap(config.projects, (p) => p.components);
  const components = L.keyBy(allComponents, (c) => c.id);
  const allCodeComponents = flatMap(
    config.projects,
    (p) => p.codeComponents || []
  );
  const codeComponentMetas = L.keyBy(allCodeComponents, (c) => c.id);
  const globalVariants = L.keyBy(
    config.globalVariants.variantGroups,
    (c) => c.id
  );
  const icons = L.keyBy(
    flatMap(config.projects, (p) => p.icons),
    (c) => c.id
  );
  const images = L.keyBy(
    flatMap(config.projects, (p) => p.images),
    (c) => c.id
  );
  const projects = L.keyBy(config.projects, (p) => p.projectId);
  return {
    config,
    components,
    codeComponentMetas,
    globalVariants,
    icons,
    images,
    projects,
  };
};

/**
 * Assuming that all the files referenced in PlasmicConfig are correct, fixes import statements using PlasmicConfig
 * file locations as the source of truth.
 */
export async function fixAllImportStatements(
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
        await fixComponentImportStatements(
          context,
          compConfig,
          fixImportContext,
          fixSkeletonModule
        );
      }
    }
  }
}

async function fixComponentImportStatements(
  context: PlasmicContext,
  compConfig: ComponentConfig,
  fixImportContext: FixImportContext,
  fixSkeletonModule: boolean
) {
  // If ComponentConfig.importPath is still a local file, we best-effort also fix up the import statements there.
  if (
    isLocalModulePath(compConfig.importSpec.modulePath) &&
    fixSkeletonModule
  ) {
    await fixFileImportStatements(
      context,
      compConfig.importSpec.modulePath,
      fixImportContext,
      true
    );
  }

  let renderModuleChanged = false;

  if (context.config.images.scheme !== "inlined") {
    await fixComponentCssReferences(
      context,
      fixImportContext,
      compConfig.cssFilePath
    );
    if (context.config.images.scheme === "public-files") {
      renderModuleChanged = await fixComponentImagesReferences(
        context,
        fixImportContext,
        compConfig.renderModuleFilePath
      );
    }
  }

  // Fix file imports and run prettier just after fixing image references
  await fixFileImportStatements(
    context,
    compConfig.renderModuleFilePath,
    fixImportContext,
    false,
    renderModuleChanged
  );
}

async function fixFileImportStatements(
  context: PlasmicContext,
  srcDirFilePath: string,
  fixImportContext: FixImportContext,
  removeImportDirective: boolean,
  fileHasChanged = false
) {
  const filePath = makeFilePath(context, srcDirFilePath);
  if (!existsBuffered(filePath)) {
    logger.warn(
      `Cannot fix imports in non-existing file ${srcDirFilePath}. Check your plasmic.json file for invalid entries.`
    );
    return;
  }

  const prevContent = readFileText(filePath).toString();

  const newContent = replaceImports(
    context,
    prevContent,
    srcDirFilePath,
    fixImportContext,
    removeImportDirective,
    fileHasChanged
  );
  if (prevContent !== newContent) {
    await writeFileContent(context, srcDirFilePath, newContent, {
      force: true,
    });
  }
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
      } while (!existsBuffered(configPath));
      const c = ts.readConfigFile(configPath, (path) => readFileText(path));
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
  const jsxPragmas = ["jsx", "jsxFrag", "jsxRuntime"];

  function prepForTranspile(str: string) {
    for (const p of jsxPragmas) {
      str = str.replace(`/** @${p} `, `/** @ ${p} `);
    }
    return str + usageMagic;
  }

  function fixPostTranspile(str: string) {
    for (const p of jsxPragmas) {
      str = str.replace(`/** @ ${p} `, `/** @${p} `);
    }
    str = str.replace(usageMagic, "");
    return str;
  }

  let result = ts.transpileModule(prepForTranspile(code), {
    compilerOptions: CompilerOptions.getOpts(),
  });
  return fixPostTranspile(result.outputText);
};

export function maybeConvertTsxToJsx(fileName: string, content: string) {
  if (fileName.endsWith("tsx")) {
    const jsFileName = stripExtension(fileName) + ".jsx";
    const jsContent = formatScript(tsxToJsx(content));
    return [jsFileName, jsContent];
  }
  return [fileName, content];
}

export const formatScript = (code: string) => {
  const file = parser.parse(code, {
    strictMode: true,
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });
  let newLineMarker = "THIS_SHALL_BE_NEW_LINE";
  while (code.includes(newLineMarker)) {
    newLineMarker = newLineMarker + "_REALLY";
  }
  traverse(file, {
    Statement: function (path) {
      if (
        file.program.body.includes(path.node) &&
        path.node.type !== "ImportDeclaration"
      ) {
        path.insertBefore(babel.types.stringLiteral(newLineMarker));
        path.skip();
      }
    },
  });

  const withmarkers = nodeToFormattedCode(file, true);
  const withNewLines = withmarkers.replace(
    new RegExp(`"${newLineMarker}"`, "g"),
    "\n"
  );
  return formatAsLocal(withNewLines, "/tmp/x.tsx", {
    printWidth: 80,
    tabWidth: 2,
    useTabs: false,
  });
};
