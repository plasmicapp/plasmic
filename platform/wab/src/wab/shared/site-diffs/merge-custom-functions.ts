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
import { groupBy, initial, last } from "lodash";

/**
 * Each branch registers a new function on its own, so the merged site can have
 * two copies of the same registration. Keeps the last copy, points usages of
 * the others at it, and matches args to params by name, dropping args that have
 * no matching param.
 *
 * The last copy, not the first: sites can already hold older copies of a
 * registration (e.g. from before its importPath changed), and codegen resolves
 * a function by id with the last copy winning. Keeping the first one would
 * switch generated imports back to a stale importPath.
 */
export function fixDuplicatedCustomFunctions(mergedSite: Site) {
  const toFunctions = new Map<CustomFunction, CustomFunction>();
  Object.values(groupBy(mergedSite.customFunctions, customFunctionId)).forEach(
    (copies) => {
      const toFunction = last(copies)!;
      initial(copies).forEach((f) => toFunctions.set(f, toFunction));
    },
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
 * Same as `fixDuplicatedCustomFunctions`, for registered libraries. Nothing
 * references a library instance, so the duplicates are just removed.
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
