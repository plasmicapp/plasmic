import { getComponentDisplayName } from "@/wab/shared/core/components";
import {
  findImplicitStatesOfNodesInTree,
  findImplicitUsages,
  getStateDisplayName,
  isStateUsedInExpr,
} from "@/wab/shared/core/states";
import * as Tpls from "@/wab/shared/core/tpls";
import {
  Component,
  Site,
  TplNode,
  isKnownTplRef,
} from "@/wab/shared/model/classes";
import L from "lodash";

type TplRemovalError = {
  message: string;
  referencingNode?: TplNode | null;
};

/**
 * Check whether removing the given tpls from their component would leave a
 * dangling reference — either an implicit state referenced outside the
 * subtree (locally or cross-component) or a TplRef pointing into it.
 *
 * Returns null if removal is safe.
 */
export function validateTplRemoval(
  tpls: TplNode[],
  component: Component,
  site: Site
): TplRemovalError | null {
  const removedImplicitStates = tpls.flatMap((tpl) =>
    findImplicitStatesOfNodesInTree(component, tpl)
  );

  for (const state of removedImplicitStates) {
    const refs = Tpls.findExprsInTree(component.tplTree, tpls).filter(
      ({ expr }) => isStateUsedInExpr(state, expr)
    );
    if (refs.length > 0) {
      return {
        message: `It contains variable "${getStateDisplayName(
          state
        )}" which is referenced in the current component.`,
        referencingNode: refs.find((r) => r.node)?.node,
      };
    }

    const usages = findImplicitUsages(site, state);
    if (usages.length > 0) {
      const components = L.uniq(usages.map((u) => u.component));
      return {
        message: `It contains variable "${getStateDisplayName(
          state
        )}" which is referenced in ${components
          .map((c) => getComponentDisplayName(c))
          .join(", ")}.`,
      };
    }
  }

  for (const { expr, node } of Tpls.findExprsInComponent(component)) {
    if (isKnownTplRef(expr) && tpls.includes(expr.tpl)) {
      return {
        message:
          "It is referenced by another element in an invoke action element interaction.",
        referencingNode: node,
      };
    }
  }

  return null;
}
