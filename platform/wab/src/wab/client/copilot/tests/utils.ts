import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ensureVariantSetting, getBaseVariant } from "@/wab/shared/Variants";
import * as Tpls from "@/wab/shared/core/tpls";
import { Component, TplTag } from "@/wab/shared/model/classes";

export function rootDiv(component: Component) {
  return component.tplTree as TplTag;
}

export function addChild(
  studioCtx: StudioCtx,
  component: Component,
  tag: string,
  opts: Tpls.MkTplTagOpts = {}
): TplTag {
  const tpl = Tpls.mkTplTagX(tag, {
    baseVariant: getBaseVariant(component),
    ...opts,
  });
  ensureVariantSetting(tpl, [getBaseVariant(component)]);
  studioCtx.focusedViewCtx()!.viewOps.insertAsChild(tpl, rootDiv(component));
  return tpl;
}
