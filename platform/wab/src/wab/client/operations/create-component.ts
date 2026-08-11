import { TplMgr } from "@/wab/shared/TplMgr";
import { ComponentType } from "@/wab/shared/core/components";
import { GenericError } from "@/wab/shared/error-handling";
import { Component, PageMetaParams, TplNode } from "@/wab/shared/model/classes";
import { Result, err, ok } from "neverthrow";

export type CreateComponentResult = Result<Component, GenericError>;

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
    return err({ message: "Component name cannot be empty." });
  }

  return ok(tplMgr.addComponent({ name, type, rootTpl, pageMeta }));
}
