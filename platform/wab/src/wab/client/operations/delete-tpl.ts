import { $$$ } from "@/wab/shared/TplQuery";
import { VariantTplMgr } from "@/wab/shared/VariantTplMgr";
import { redistributeColumnsSizes } from "@/wab/shared/columns-utils";
import { getComponentDisplayName } from "@/wab/shared/core/components";
import { isTagListContainer } from "@/wab/shared/core/rich-text-util";
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
  State,
  TplNode,
  isKnownTplRef,
} from "@/wab/shared/model/classes";
import L from "lodash";

export type DeleteTplResult =
  | { result: "deleted" }
  | {
      result: "error";
      message: string;
      /**
       * The TplNode that holds the reference preventing deletion.
       * Present when a state variable or TplRef in the component tree
       * references the element being deleted. Used to render
       * a clickable "Go to reference" link in the error notification.
       * Not all deletion errors have a referencing node (e.g. root
       * element protection, cross-component references).
       */
      referencingNode?: TplNode | null;
    };

/**
 * Delete TplNodes from a component.
 *
 * Validates that the deletion is safe (no referenced states or tplRefs),
 * then permanently removes elements from the tree.
 *
 * @param tpls - TplNodes to delete.
 * @param opts
 * @param opts.component - The owning component.
 * @param opts.site - The site.
 * @param opts.vtm - VariantTplMgr for column redistribution after deletion.
 * @returns DeleteTplResult indicating success or error with details.
 */
export function deleteTpl(
  tpls: TplNode[],
  opts: {
    component: Component;
    site: Site;
    vtm: VariantTplMgr;
  }
): DeleteTplResult {
  const { component, site, vtm } = opts;

  // Check for the root element
  if (tpls.some((t) => t === component.tplTree)) {
    return { result: "error", message: "Cannot remove the root element." };
  }

  // Implicit state validation
  const removedImplicitStates: State[] = [];
  for (const tpl of tpls) {
    removedImplicitStates.push(
      ...findImplicitStatesOfNodesInTree(component, tpl)
    );
  }

  for (const state of removedImplicitStates) {
    // Check if state is referenced within the component (excluding deleted subtrees)
    const refs = Tpls.findExprsInTree(component.tplTree, tpls).filter(
      ({ expr }) => isStateUsedInExpr(state, expr)
    );
    if (refs.length > 0) {
      const maybeNode = refs.find((r) => r.node)?.node;
      return {
        result: "error",
        message: `It contains variable "${getStateDisplayName(
          state
        )}" which is referenced in the current component.`,
        referencingNode: maybeNode,
      };
    }

    // Check cross-component references
    const implicitUsages = findImplicitUsages(site, state);
    if (implicitUsages.length > 0) {
      const components = L.uniq(implicitUsages.map((usage) => usage.component));
      return {
        result: "error",
        message: `Cannot remove element: it contains variable "${getStateDisplayName(
          state
        )}" which is referenced in ${components
          .map((c) => getComponentDisplayName(c))
          .join(", ")}.`,
      };
    }
  }

  // TplRef validation
  for (const { expr, node: maybeNode } of Tpls.findExprsInComponent(
    component
  )) {
    if (isKnownTplRef(expr) && tpls.includes(expr.tpl)) {
      return {
        result: "error",
        message:
          "It is referenced by another element in an invoke action element interaction.",
        referencingNode: maybeNode,
      };
    }
  }

  // Permanent deletion
  for (const tpl of tpls) {
    const parent = tpl.parent;
    $$$(tpl).remove({ deep: true });

    // Remove list containers when they become empty (i.e., their latest
    // item is removed).
    if (
      Tpls.isTplTag(parent) &&
      isTagListContainer(parent.tag) &&
      parent.children.length === 0
    ) {
      $$$(parent).remove({ deep: true });
    }

    // Redistribute column sizes when deleting from a columns layout
    if (parent && Tpls.isTplColumns(parent)) {
      redistributeColumnsSizes(parent, vtm);
    }
  }

  return { result: "deleted" };
}
