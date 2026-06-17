import type { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { isDedicatedArena } from "@/wab/shared/Arenas";
import type { TplMgr } from "@/wab/shared/TplMgr";
import {
  getComponentDisplayName,
  getSubComponents,
  isCodeComponent,
} from "@/wab/shared/core/components";
import { getReferencingComponents } from "@/wab/shared/core/sites";
import { Component, Site } from "@/wab/shared/model/classes";
import { uniq } from "lodash";

export type DeleteComponentResult =
  | { result: "success"; message: string }
  | { result: "error"; message: string };

/**
 * Delete a component (or page) from the site, along with its sub-components.
 *
 * Validates that the component can be safely deleted: it must not be a
 * sub-component, the default page wrapper, or still referenced by another
 * component. If any check fails, returns an error and leaves the site untouched.
 *
 */
export function deleteComponent(
  component: Component,
  site: Site,
  studioCtx: StudioCtx,
  tplMgr: TplMgr
): DeleteComponentResult {
  // A sub-component only exists in service of its super-component and is deleted
  // alongside it; it cannot be deleted on its own.
  if (component.superComp && !isCodeComponent(component)) {
    return {
      result: "error",
      message: `Cannot delete "${getComponentDisplayName(
        component
      )}" because it is a sub-component.`,
    };
  }

  if (site.pageWrapper === component) {
    return {
      result: "error",
      message: `Cannot delete "${getComponentDisplayName(
        component
      )}" because it is set as the default page wrapper.`,
    };
  }

  const referencers = getReferencingComponents(site, component);
  if (referencers.length > 0) {
    return {
      result: "error",
      message: `Cannot delete "${getComponentDisplayName(
        component
      )}" because it is still used by ${uniq(
        referencers.map(getComponentDisplayName)
      ).join(", ")}.`,
    };
  }

  const curArena = studioCtx.currentArena;
  const comps = [component];
  if (!isCodeComponent(component)) {
    // Code components organize sub-components for display only; other
    // components own their sub-components and delete them together.
    comps.push(...getSubComponents(component));
  }
  tplMgr.removeComponentGroup(comps);
  studioCtx.pruneInvalidViewCtxs();
  if (isDedicatedArena(curArena) && comps.includes(curArena.component)) {
    studioCtx.switchToFirstArena();
  }

  return {
    result: "success",
    message: `Deleted component "${getComponentDisplayName(
      component
    )}" (uuid: ${component.uuid}).`,
  };
}
