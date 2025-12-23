import {
  makeDataTokensFileName,
  makeTaggedPlasmicImport,
} from "@/wab/shared/codegen/react-p/serialize-utils";
import { ExportOpts } from "@/wab/shared/codegen/types";
import { makeShortProjectId, stripExtension } from "@/wab/shared/codegen/util";
import { walkDependencyTree } from "@/wab/shared/core/project-deps";
import { findExprsInComponent } from "@/wab/shared/core/tpls";
import {
  extractDataTokenIdentifiersFromCode,
  isPathDataToken,
  parseDataTokenIdentifier,
} from "@/wab/shared/eval/expression-parser";
import {
  Component,
  Site,
  isKnownCustomCode,
  isKnownObjectPath,
} from "@/wab/shared/model/classes";

export function generateDataTokenImports(
  tokenIdentifiers: Set<string>,
  site: Site,
  projectId: string,
  exportOpts: ExportOpts
): string {
  if (tokenIdentifiers.size === 0) {
    return "";
  }
  // Group by project ID and generate imports
  const importsByProject = new Map<string, Set<string>>();

  for (const identifier of tokenIdentifiers) {
    const parsed = parseDataTokenIdentifier(identifier);
    if (!parsed) {
      continue;
    }
    if (!importsByProject.has(parsed.projectShortId)) {
      importsByProject.set(parsed.projectShortId, new Set());
    }
    importsByProject.get(parsed.projectShortId)!.add(identifier);
  }

  // Generate import statements
  const imports: string[] = [];
  const localShortId = makeShortProjectId(projectId);
  const allDeps = walkDependencyTree(site, "all");

  for (const [projectShortId, identifiers] of importsByProject.entries()) {
    let importPath: string;
    let tokenProjectId: string;

    if (projectShortId === localShortId) {
      // Local tokens
      importPath = makeDataTokensFileName(projectId, exportOpts);
      tokenProjectId = projectId;
    } else {
      // Dependency tokens - find the dep (including transitive dependencies)
      const dep = allDeps.find(
        (d) => makeShortProjectId(d.projectId) === projectShortId
      );
      if (!dep) {
        continue;
      }
      importPath = makeDataTokensFileName(dep.projectId, exportOpts);
      tokenProjectId = dep.projectId;
    }

    // For each group of identifiers, create an import with aliases
    const importSpecifiers = [...identifiers]
      .map(parseDataTokenIdentifier)
      .filter((parsed) => !!parsed)
      .map((parsed) => `${parsed.tokenName} as ${parsed.identifier}`)
      .join(", ");

    imports.push(
      makeTaggedPlasmicImport(
        importSpecifiers,
        `./${stripExtension(importPath)}`,
        tokenProjectId,
        "dataTokens"
      )
    );
  }
  return imports.join("\n");
}

/**
 * Returns all necessary data token imports for a component.
 */
export function makeComponentDataTokenImports(
  component: Component,
  site: Site,
  projectId: string,
  exportOpts: ExportOpts
): string {
  const tokenIdentifiers = new Set<string>();

  for (const { expr } of findExprsInComponent(component)) {
    if (isKnownObjectPath(expr) && isPathDataToken(expr.path)) {
      tokenIdentifiers.add(expr.path[0]);
    } else if (isKnownCustomCode(expr)) {
      extractDataTokenIdentifiersFromCode(expr.code).forEach((id) =>
        tokenIdentifiers.add(id)
      );
    }
  }
  return generateDataTokenImports(
    tokenIdentifiers,
    site,
    projectId,
    exportOpts
  );
}
