import { addVariantsToComponentVariantGroup } from "@/wab/client/copilot/tools/addVariantsToComponentVariantGroup";
import { createVariantGroup } from "@/wab/client/operations/create-variant-group";
import { unwrap } from "@/wab/commons/failable-utils";
import { TplMgr, VariantOptionsType } from "@/wab/shared/TplMgr";
import {
  COPILOT_TOOL_DEFS,
  defineCopilotTool,
} from "@/wab/shared/copilot/enterprise/copilot-tools";
import { getComponentByUuid } from "@/wab/shared/copilot/utils";
import { Component } from "@/wab/shared/model/classes";
import { serializeComponent } from "@/wab/shared/web-exporter/component-exporter";
import { serializeInvalidResource } from "@/wab/shared/web-exporter/project-exporter";

export const createComponentVariantGroupsTool = defineCopilotTool(
  COPILOT_TOOL_DEFS.createComponentVariantGroups,
  async (studioCtx, { componentUuid, groups }) => {
    const component = getComponentByUuid(studioCtx.site, componentUuid);
    const tplMgr = studioCtx.tplMgr();

    const invalidData = unwrap(
      await studioCtx.change<never, string[]>(({ success }) =>
        success(createComponentVariantGroups(component, tplMgr, groups))
      )
    );

    return [serializeComponent(component), ...invalidData].join("\n\n");
  }
);

/**
 * Create variant groups (and their initial variants) on the component.
 * Returns a list of `<invalid-resource>` strings
 * (one per failed group or variant) for the
 * caller to append to its primary serialized output.
 */
export function createComponentVariantGroups(
  component: Component,
  tplMgr: TplMgr,
  groups: {
    name: string;
    optionsType: VariantOptionsType;
    variants: { name: string }[];
  }[]
): string[] {
  const invalid: string[] = [];
  for (const groupInput of groups) {
    const groupResult = createVariantGroup({
      component,
      tplMgr,
      name: groupInput.name,
      optionsType: groupInput.optionsType,
    });
    if (groupResult.result === "error") {
      invalid.push(
        serializeInvalidResource(
          groupInput.name,
          "variantGroup",
          `Failed to create variant group "${groupInput.name}": ${groupResult.message}`
        )
      );
      continue;
    }

    if (groupInput.optionsType === VariantOptionsType.standalone) {
      // Standalone groups are one-variant-only by definition: TplMgr.createVariantGroup
      // already created a single implicit variant named after the group's
      // param. Adding more would break the `group.variants.length === 1` invariant
      // that `isStandaloneVariantGroup` relies on.
      continue;
    }

    invalid.push(
      ...addVariantsToComponentVariantGroup(
        component,
        tplMgr,
        groupResult.group,
        groupInput.variants
      )
    );
  }
  return invalid;
}
