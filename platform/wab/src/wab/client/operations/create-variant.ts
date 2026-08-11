import { TplMgr } from "@/wab/shared/TplMgr";
import { isStandaloneVariantGroup } from "@/wab/shared/Variants";
import { GenericError } from "@/wab/shared/error-handling";
import {
  Component,
  ComponentVariantGroup,
  Variant,
} from "@/wab/shared/model/classes";
import { Result, err, ok } from "neverthrow";

export type CreateVariantResult = Result<Variant, GenericError>;

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
    return err({
      message: `Variant group "${variantGroup.param.variable.name}" does not belong to component "${component.name}".`,
    });
  }

  // Standalone groups are identified structurally by their single implicit
  // variant whose name matches the group name. Adding another variant breaks
  // that invariant
  if (isStandaloneVariantGroup(variantGroup)) {
    return err({
      message: `Variant group "${variantGroup.param.variable.name}" is standalone and only supports its single implicit variant.`,
    });
  }

  return ok(tplMgr.createVariant(component, variantGroup, name));
}
