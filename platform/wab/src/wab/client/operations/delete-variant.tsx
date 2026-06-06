import { deleteResourcesWithUsages } from "@/wab/client/operations/delete-resources";
import type { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { getArenaFrames } from "@/wab/shared/Arenas";
import type { TplMgr } from "@/wab/shared/TplMgr";
import { isBaseVariant, makeVariantName } from "@/wab/shared/Variants";
import {
  findComponentsUsingComponentVariant,
  findComponentsUsingGlobalVariant,
} from "@/wab/shared/cached-selectors";
import { ensure } from "@/wab/shared/common";
import {
  findStateForParam,
  isFrameComponent,
  isPlumeComponent,
} from "@/wab/shared/core/components";
import { GeneralUsageSummary } from "@/wab/shared/core/sites";
import { isStateUsedInExpr } from "@/wab/shared/core/states";
import { ExprReference, findExprsInComponent } from "@/wab/shared/core/tpls";
import {
  Component,
  Site,
  Variant,
  isKnownComponentVariantGroup,
} from "@/wab/shared/model/classes";
import { getPlumeVariantDef } from "@/wab/shared/plume/plume-registry";

export type DeleteVariantResult =
  | { result: "success"; messages: string[] }
  | {
      result: "error";
      message: string;
      variantGroupRefs?: ExprReference[];
      /** True when the user dismissed the confirmation dialog without deleting. */
      cancelled?: boolean;
    };

/**
 * Delete a variant from a component.
 *
 * Validates that the variant can be safely deleted and performs the deletion with cleanup.
 *
 * @param variant - The variant to delete
 * @param component - The component containing the variant
 * @param opts - Deletion options with behaviour ("confirm-if-referenced", "delete-if-referenced", "error-if-referenced")
 * @returns Promise<DeleteVariantResult> indicating success or detailed error
 */
export async function deleteVariant(
  variant: Variant,
  component: Component,
  site: Site,
  studioCtx: StudioCtx,
  tplMgr: TplMgr,
  opts?: {
    behaviour?:
      | "confirm-if-referenced"
      | "delete-if-referenced"
      | "error-if-referenced";
  }
): Promise<DeleteVariantResult> {
  if (isBaseVariant(variant)) {
    return {
      result: "error",
      message: "Cannot delete the base variant.",
    };
  }

  // Check if variant group is referenced in the component
  if (variant.parent && isKnownComponentVariantGroup(variant.parent)) {
    const state = ensure(
      findStateForParam(component, variant.parent.param),
      "Variant group param must correspond to state"
    );
    const refs = findExprsInComponent(component).filter(({ expr }) =>
      isStateUsedInExpr(state, expr)
    );

    if (refs.length > 0) {
      return {
        result: "error",
        message: `Variant group is referenced in the current component.`,
        variantGroupRefs: refs,
      };
    }
  }

  // Check if it's a required Plume variant
  if (isPlumeComponent(component)) {
    const variantDef = getPlumeVariantDef(component, variant);
    if (variantDef?.required) {
      return {
        result: "error",
        message: `The "${variant.name}" variant is required for the "${component.name}" component to function properly.`,
      };
    }
  }

  const usageSummary = extractVariantUsages(site, variant, component);
  const usageCount =
    usageSummary.components.length + usageSummary.frames.length;

  const result = await deleteResourcesWithUsages(
    studioCtx,
    [{ resource: variant, usageSummary, usageCount }],
    () => {
      tplMgr.tryRemoveVariant(variant, component);
      studioCtx.ensureComponentStackFramesHasOnlyValidVariants(component);
      studioCtx.pruneInvalidViewCtxs();
    },
    {
      behaviour: opts?.behaviour ?? "confirm-if-referenced",
      deleteLabel: `variant ${makeVariantName({ variant, site })}`,
    }
  );

  if (result.errors && result.errors.length > 0) {
    return {
      result: "error",
      message: result.errors[0],
      cancelled: result.cancelled,
    };
  }

  return { result: "success", messages: result.messages };
}

/**
 * Extract variant usages across the site.
 * Returns components that use the variant and frame components that contain the variant.
 */
function extractVariantUsages(
  site: Site,
  variant: Variant,
  component?: Component
): GeneralUsageSummary {
  const usingComps = !component
    ? findComponentsUsingGlobalVariant(site, variant)
    : findComponentsUsingComponentVariant(site, component, variant);

  const arenaFrames = site.arenas.flatMap((arena) => getArenaFrames(arena));

  const usingFrames = [...usingComps].filter(isFrameComponent).map((c) =>
    ensure(
      arenaFrames.find((frame) => frame.container.component === c),
      () => `Couldn't find arenaFrame for component ${c.name} (${c.uuid})`
    )
  );

  return {
    components: [...usingComps].filter((c) => !isFrameComponent(c)),
    frames: usingFrames,
  };
}
