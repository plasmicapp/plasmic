import { OperationResult } from "@/wab/client/operations/common";
import { TplMgr } from "@/wab/shared/TplMgr";
import { isStandaloneVariantGroup } from "@/wab/shared/Variants";
import {
  Component,
  ComponentVariantGroup,
  Variant,
} from "@/wab/shared/model/classes";

export type CreateVariantResult = OperationResult<{ variant: Variant }>;

/**
 * Add a single variant to an existing component variant group. If a variant
 * with the same name already exists in the group, TplMgr uniquifies it.
 *
 * @param opts.component - The owning component.
 * @param opts.tplMgr - TplMgr instance for the site.
 * @param opts.variantGroup - The group to add the variant to. Must belong to `component`.
 * @param opts.name - Variant name.
 */
export function createVariant(opts: {
  component: Component;
  tplMgr: TplMgr;
  variantGroup: ComponentVariantGroup;
  name: string;
}): CreateVariantResult {
  const { component, tplMgr, variantGroup, name } = opts;

  if (!component.variantGroups.includes(variantGroup)) {
    return {
      result: "error",
      message: `Variant group "${variantGroup.param.variable.name}" does not belong to component "${component.name}".`,
    };
  }

  // Standalone groups are identified structurally by their single implicit
  // variant whose name matches the group name. Adding another variant breaks
  // that invariant
  if (isStandaloneVariantGroup(variantGroup)) {
    return {
      result: "error",
      message: `Variant group "${variantGroup.param.variable.name}" is standalone and only supports its single implicit variant.`,
    };
  }

  return {
    result: "success",
    variant: tplMgr.createVariant(component, variantGroup, name),
  };
}
