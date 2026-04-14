import { TplMgr } from "@/wab/shared/TplMgr";
import { isPrivateState } from "@/wab/shared/core/states";
import { TplNamable } from "@/wab/shared/core/tpls";
import { Component, isKnownTplComponent } from "@/wab/shared/model/classes";

export type RenameTplResult =
  | { result: "success"; newName: string | null }
  | { result: "error"; message: string };

/**
 * Rename a TplNode in a component.
 *
 * @param tpl - The TplNode to rename.
 * @param name - New name, or empty/null to clear.
 * @param opts
 * @param opts.component - The owning component.
 * @param opts.tplMgr - TplMgr instance for the site.
 * @returns RenameTplResult indicating success or error with details.
 */
export function renameTpl(
  tpl: TplNamable,
  name: string | null,
  opts: { component: Component; tplMgr: TplMgr }
): RenameTplResult {
  const { component, tplMgr } = opts;

  if (
    isKnownTplComponent(tpl) &&
    tpl.component.states.some((s) => !isPrivateState(s)) &&
    !name
  ) {
    return {
      result: "error",
      message: "Instances of components with public states must be named.",
    };
  }

  const newName = tplMgr.renameTpl(component, tpl, name);

  return { result: "success", newName };
}
