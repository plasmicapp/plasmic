import { removeWhere } from "@/wab/shared/common";
import { fixCustomFunctionExpr } from "@/wab/shared/core/custom-functions";
import { customFunctionId } from "@/wab/shared/core/query-ids";
import {
  CustomFunction,
  isKnownCustomFunctionExpr,
  Site,
} from "@/wab/shared/model/classes";
import {
  createNodeCtx,
  walkModelTree,
} from "@/wab/shared/model/model-tree-util";
import { groupBy } from "lodash";

/**
 * Each branch registers a new function on its own, so the merged site can have
 * two copies of the same registration. Keeps the last copy, the one Studio's
 * re-sync updates and codegen resolves by id, points usages of the others at
 * it, and matches args to params by name, dropping args that have no matching
 * param.
 */
export function fixDuplicatedCustomFunctions(mergedSite: Site) {
  const toFunctions = new Map<CustomFunction, CustomFunction>();
  Object.values(
    groupBy([...mergedSite.customFunctions].reverse(), customFunctionId),
  ).forEach(([toFunction, ...duplicatedFunctions]) =>
    duplicatedFunctions.forEach((f) => toFunctions.set(f, toFunction)),
  );
  if (toFunctions.size === 0) {
    return;
  }
  walkModelTree(createNodeCtx(mergedSite))
    .filter(isKnownCustomFunctionExpr)
    .forEach((expr) => fixCustomFunctionExpr(toFunctions, expr));
  removeWhere(mergedSite.customFunctions, (f) => toFunctions.has(f));
}

/**
 * Dedupes registered libraries by name. Nothing references a library instance,
 * so the duplicates are just removed.
 */
export function fixDuplicatedCodeLibraries(mergedSite: Site) {
  const names = new Set<string>();
  removeWhere(mergedSite.codeLibraries, (lib) => {
    if (names.has(lib.name)) {
      return true;
    }
    names.add(lib.name);
    return false;
  });
}
