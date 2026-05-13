import { createVariant } from "@/wab/client/operations/create-variant";
import { unwrap } from "@/wab/commons/failable-utils";
import { TplMgr } from "@/wab/shared/TplMgr";
import {
  COPILOT_TOOL_DEFS,
  defineCopilotTool,
} from "@/wab/shared/copilot/enterprise/copilot-tools";
import { getComponentByUuid } from "@/wab/shared/copilot/utils";
import {
  Component,
  ComponentVariantGroup,
  isKnownComponentVariantGroup,
} from "@/wab/shared/model/classes";
import { serializeComponent } from "@/wab/shared/web-exporter/component-exporter";
import { serializeInvalidResource } from "@/wab/shared/web-exporter/project-exporter";

export const addVariantsToComponentVariantGroupTool = defineCopilotTool(
  COPILOT_TOOL_DEFS.addVariantsToComponentVariantGroup,
  async (studioCtx, { componentUuid, variantGroupUuid, variants }) => {
    const component = getComponentByUuid(studioCtx.site, componentUuid);
    const tplMgr = studioCtx.tplMgr();

    const variantGroup = component.variantGroups.find(
      (g) => g.uuid === variantGroupUuid
    );
    if (!variantGroup || !isKnownComponentVariantGroup(variantGroup)) {
      return serializeInvalidResource(
        variantGroupUuid,
        "variantGroup",
        `Variant group "${variantGroupUuid}" not found on component "${component.uuid}".`
      );
    }

    const invalid = unwrap(
      await studioCtx.change<never, string[]>(({ success }) =>
        success(
          addVariantsToComponentVariantGroup(
            component,
            tplMgr,
            variantGroup,
            variants
          )
        )
      )
    );

    return [serializeComponent(component), ...invalid].join("\n\n");
  }
);

/**
 * Create variants on the given variant group.
 * Returns a list of `<invalid-resource>` strings
 * (one per failed variant) for the caller to append to its primary
 * serialized output.
 */
export function addVariantsToComponentVariantGroup(
  component: Component,
  tplMgr: TplMgr,
  variantGroup: ComponentVariantGroup,
  variants: { name: string }[]
): string[] {
  const invalid: string[] = [];
  for (const variant of variants) {
    const result = createVariant({
      component,
      tplMgr,
      variantGroup,
      name: variant.name,
    });
    if (result.result === "error") {
      invalid.push(
        serializeInvalidResource(
          variant.name,
          "variant",
          `Failed to create variant "${variant.name}" in group "${variantGroup.param.variable.name}": ${result.message}`
        )
      );
    }
  }
  return invalid;
}
