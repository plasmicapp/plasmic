import { OperationResult } from "@/wab/client/operations/common";
import { TplMgr, VariantOptionsType } from "@/wab/shared/TplMgr";
import { Component, ComponentVariantGroup } from "@/wab/shared/model/classes";

export type CreateVariantGroupResult = OperationResult<{
  group: ComponentVariantGroup;
}>;

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
  return {
    result: "success",
    group: tplMgr.createVariantGroup({ component, name, optionsType }),
  };
}
