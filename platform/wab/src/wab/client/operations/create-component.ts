import { OperationResult } from "@/wab/client/operations/common";
import { TplMgr } from "@/wab/shared/TplMgr";
import { ComponentType } from "@/wab/shared/core/components";
import { Component, PageMetaParams, TplNode } from "@/wab/shared/model/classes";

export type CreateComponentResult = OperationResult<{ component: Component }>;

/**
 * Create a new component or page
 */
export function createComponent(opts: {
  tplMgr: TplMgr;
  name: string;
  type: ComponentType;
  rootTpl?: TplNode;
  pageMeta?: Partial<Omit<PageMetaParams, "roleId">>;
}): CreateComponentResult {
  const { tplMgr, name, type, rootTpl, pageMeta } = opts;

  if (!name.trim()) {
    return { result: "error", message: "Component name cannot be empty." };
  }

  return {
    result: "success",
    component: tplMgr.addComponent({ name, type, rootTpl, pageMeta }),
  };
}
