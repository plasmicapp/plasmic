import { TplMgr, VariantOptionsType } from "@/wab/shared/TplMgr";
import { GenericError } from "@/wab/shared/error-handling";
import { Component, ComponentVariantGroup } from "@/wab/shared/model/classes";
import { Result, ok } from "neverthrow";

export type CreateVariantGroupResult = Result<
  ComponentVariantGroup,
  GenericError
>;

/**
 * Create a new variant group on a component.
 *
 * @param opts.component - The component to add the group to.
 * @param opts.tplMgr - TplMgr instance for the site.
 * @param opts.name - Desired group name. TplMgr uniquifies if needed.
 * @param opts.optionsType - {@link VariantOptionsType}.
 */
export function createVariantGroup(opts: {
  component: Component;
  tplMgr: TplMgr;
  name: string;
  optionsType: VariantOptionsType;
}): CreateVariantGroupResult {
  const { component, tplMgr, name, optionsType } = opts;
  return ok(tplMgr.createVariantGroup({ component, name, optionsType }));
}
