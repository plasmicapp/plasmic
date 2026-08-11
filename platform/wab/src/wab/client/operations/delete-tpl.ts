import { validateTplRemoval } from "@/wab/client/operations/utils/validate-tpl-removal";
import { $$$ } from "@/wab/shared/TplQuery";
import { VariantTplMgr } from "@/wab/shared/VariantTplMgr";
import { redistributeColumnsSizes } from "@/wab/shared/columns-utils";
import * as Tpls from "@/wab/shared/core/tpls";
import { isTagListContainer } from "@/wab/shared/html";
import { Component, Site, TplNode } from "@/wab/shared/model/classes";
import { Result, err, ok } from "neverthrow";

export interface DeleteTplError {
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
}

export type DeleteTplResult = Result<void, DeleteTplError>;

/**
 * Delete TplNodes from a component.
 *
 * Validates that the deletion is safe (no referenced states or tplRefs),
 * then permanently removes elements from the tree, including parent list
 * containers that become empty (see {@link computeTplsToDelete}).
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
    return err({ message: "Cannot remove the root element." });
  }

  const tplsToDelete = computeTplsToDelete(tpls);
  const error = validateTplRemoval(tplsToDelete, component, site);
  if (error) {
    return err(error);
  }

  for (const tpl of tplsToDelete) {
    // Skip if deleted already
    if (!Tpls.tryGetTplOwnerComponent(tpl)) {
      continue;
    }

    const parent = tpl.parent;
    $$$(tpl).remove({ deep: true });

    // Redistribute column sizes when deleting from a columns layout
    if (parent && Tpls.isTplColumns(parent)) {
      redistributeColumnsSizes(parent, vtm);
    }
  }

  return ok(undefined);
}

/**
 * Deleting some tpls cascades to their parents.
 *
 * - list items cascade to list containers if they become empty
 */
export function computeTplsToDelete(tpls: TplNode[]): TplNode[] {
  const toDelete = new Set<TplNode>(tpls);
  for (const tpl of tpls) {
    const parent = tpl.parent;

    if (
      parent &&
      // is not already in toDelete
      !toDelete.has(parent) &&
      // has a parent (is not the root)
      parent.parent &&
      // is a list container
      Tpls.isTplTag(parent) &&
      isTagListContainer(parent.tag) &&
      // will be empty
      parent.children.every((child) => toDelete.has(child))
    ) {
      toDelete.add(parent);
    }
  }
  return [...toDelete];
}
