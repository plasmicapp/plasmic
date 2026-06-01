import { validateComponentExtraction } from "@/wab/client/operations/utils/validate-component-extraction";
import { TplMgr } from "@/wab/shared/TplMgr";
import * as Components from "@/wab/shared/core/components";
import { CanvasEnv } from "@/wab/shared/eval";
import {
  Component,
  Site,
  TplComponent,
  TplNode,
  TplTag,
} from "@/wab/shared/model/classes";

export type ExtractComponentResult =
  | { result: "success"; tplComponent: TplComponent; warnings: string[] }
  | {
      result: "error";
      message: string;
      referencingNode?: TplNode | null;
    };

/**
 * Extract `tpl` from `containingComponent` into a new reusable component.
 *
 * Validates that the extraction is safe (no escaping implicit states, no
 * interaction-bound states, no dangling TplRefs), creates the new component,
 * replaces `tpl` with an instance of it, and attaches the component to the
 * site. Returns the new TplComponent and any fallback warnings on success, or
 * a structured error.
 *
 * The new component's name is uniquified against the site, so the resulting
 * component name may differ from `name`.
 *
 * @param opts.site - The site.
 * @param opts.containingComponent - Component that owns `tpl`.
 * @param opts.tpl - Element to extract.
 * @param opts.name - Desired name for the new component (will be uniquified).
 * @param opts.resurfaceParams - If true, params used by `tpl` stay on the
 *   containing component and are piped through as args; if false, they move
 *   into the new component.
 * @param opts.tplMgr - TplMgr instance for the site.
 * @param opts.getCanvasEnvForTpl - Resolves a node's canvas env, used to infer
 *   fallbacks for code expressions. May return undefined when no live render
 *   tree is available.
 */
export function extractComponent(opts: {
  site: Site;
  containingComponent: Component;
  tpl: TplComponent | TplTag;
  name: string;
  resurfaceParams?: boolean;
  tplMgr: TplMgr;
  getCanvasEnvForTpl: (node: TplNode) => CanvasEnv | undefined;
}): ExtractComponentResult {
  const {
    site,
    containingComponent,
    tpl,
    name,
    resurfaceParams = false,
    tplMgr,
    getCanvasEnvForTpl,
  } = opts;

  const error = validateComponentExtraction(tpl, containingComponent, site);
  if (error) {
    return { result: "error", ...error };
  }

  const { tplComponent, warnings } = Components.extractComponent({
    site,
    name: tplMgr.getUniqueComponentName(name),
    tpl,
    containingComponent,
    resurfaceParams,
    tplMgr,
    getCanvasEnvForTpl,
  });
  tplMgr.attachComponent(tplComponent.component);

  return { result: "success", tplComponent, warnings };
}
