import { deleteResourcesWithUsages } from "@/wab/client/operations/delete-resources";
import type { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import type { TplMgr } from "@/wab/shared/TplMgr";
import {
  findComponentsUsingComponentVariant,
  findComponentsUsingGlobalVariant,
  findSplitsUsingVariantGroup,
  findStyleTokensUsingVariantGroup,
} from "@/wab/shared/cached-selectors";
import { toVarName } from "@/wab/shared/codegen/util";
import { ensure, xAddAll } from "@/wab/shared/common";
import {
  findStateForParam,
  getComponentDisplayName,
  isPlumeComponent,
  removeVariantGroup,
} from "@/wab/shared/core/components";
import { GeneralUsageSummary } from "@/wab/shared/core/sites";
import {
  findImplicitUsages,
  isStateUsedInExpr,
} from "@/wab/shared/core/states";
import { ExprReference, findExprsInComponent } from "@/wab/shared/core/tpls";
import {
  Component,
  Site,
  Split,
  StyleToken,
  VariantGroup,
  isKnownComponentVariantGroup,
} from "@/wab/shared/model/classes";
import { getPlumeEditorPlugin } from "@/wab/shared/plume/plume-registry";

export type DeleteVariantGroupResult =
  | { result: "success"; messages: string[] }
  | {
      result: "error";
      message: string;
      variantGroupRefs?: ExprReference[];
      /** True when the user dismissed the confirmation dialog without deleting. */
      cancelled?: boolean;
    };

/**
 * Delete a variant group from a component or site.
 *
 * Validates that the variant group can be safely deleted and performs the deletion with cleanup.
 *
 * @param group - The variant group to delete
 * @param component - The component containing the variant group (undefined for global variant groups)
 * @param site - The site
 * @param studioCtx - StudioCtx for change tracking
 * @param tplMgr - TplMgr for cleanup
 * @param opts - Deletion options with behaviour ("confirm-if-referenced", "delete-if-referenced", "error-if-referenced")
 * @returns Promise<DeleteVariantGroupResult> indicating success or detailed error
 */
export async function deleteVariantGroup(
  group: VariantGroup,
  component: Component | undefined,
  site: Site,
  studioCtx: StudioCtx,
  tplMgr: TplMgr,
  opts?: {
    behaviour?:
      | "confirm-if-referenced"
      | "delete-if-referenced"
      | "error-if-referenced";
  }
): Promise<DeleteVariantGroupResult> {
  if (component) {
    // Check if variant group is referenced in the component
    if (isKnownComponentVariantGroup(group)) {
      const refs = findVariantGroupReferences(component, group);
      if (refs.length > 0) {
        return {
          result: "error",
          message: `Variant group is referenced in the current component.`,
          variantGroupRefs: refs,
        };
      }
    }

    // Check if it's a required Plume variant group
    if (isPlumeComponent(component)) {
      const groupName = toVarName(group.param.variable.name);
      const plugin = getPlumeEditorPlugin(component);
      const isRequired = plugin?.componentMeta.variantDefs.some(
        (def) => def.group === groupName && def.required
      );
      if (isRequired) {
        return {
          result: "error",
          message: `The "${group.param.variable.name}" variant group is required for the "${component.name}" component to function properly.`,
        };
      }
    }

    // Check implicit usages from linked state
    if (isKnownComponentVariantGroup(group)) {
      const implicitUsages = group.linkedState
        ? findImplicitUsages(site, group.linkedState)
        : [];
      if (implicitUsages.length > 0) {
        const components = Array.from(
          new Set(implicitUsages.map((usage) => usage.component))
        );
        return {
          result: "error",
          message: `Variant group is referenced in ${components
            .map((c) => getComponentDisplayName(c))
            .join(", ")}.`,
        };
      }
    }
  }

  const usageSummary = extractVariantGroupUsages(site, group, component);
  const usageCount =
    usageSummary.components.length +
    usageSummary.splits.length +
    usageSummary.tokens.length;

  const result = await deleteResourcesWithUsages(
    studioCtx,
    [{ resource: group, usageSummary, usageCount }],
    () => {
      if (component) {
        removeVariantGroup(site, component, group);
        studioCtx.ensureComponentStackFramesHasOnlyValidVariants(component);
      } else {
        tplMgr.removeGlobalVariantGroup(group);
        studioCtx.ensureGlobalStackFramesHasOnlyValidVariants();
      }
      studioCtx.pruneInvalidViewCtxs();
    },
    {
      behaviour: opts?.behaviour ?? "confirm-if-referenced",
      deleteLabel: `variant group ${group.param.variable.name}`,
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
 * Extract variant group usages across the site.
 * Returns components, splits, and tokens that use the variant group.
 */
function extractVariantGroupUsages(
  site: Site,
  group: VariantGroup,
  component?: Component
): GeneralUsageSummary & { splits: Split[]; tokens: StyleToken[] } {
  const usingComps = new Set<Component>();
  for (const variant of group.variants) {
    const compsUsingVariant = component
      ? findComponentsUsingComponentVariant(site, component, variant)
      : findComponentsUsingGlobalVariant(site, variant);
    xAddAll(usingComps, compsUsingVariant);
  }

  const usingSplits = findSplitsUsingVariantGroup(site, group);
  const usingTokens = findStyleTokensUsingVariantGroup(site, group);

  return {
    components: Array.from(usingComps),
    frames: [],
    splits: usingSplits,
    tokens: usingTokens,
  };
}

/**
 * Find variant group references in a component's expressions.
 */
function findVariantGroupReferences(
  component: Component,
  group: VariantGroup
): ExprReference[] {
  const state = ensure(
    findStateForParam(component, group.param),
    "Variant group param must correspond to state"
  );
  return findExprsInComponent(component).filter(({ expr }) =>
    isStateUsedInExpr(state, expr)
  );
}
