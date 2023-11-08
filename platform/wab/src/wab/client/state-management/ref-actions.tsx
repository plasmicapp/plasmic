import { RefActionRegistration } from "@plasmicapp/host/registerComponent";
import { TplNode } from "../../classes";
import { isCodeComponent } from "../../components";
import { isTplComponent, isTplTag, tplHasRef } from "../../tpls";
import { InteractionContextData } from "./interactions-meta";

export function getTplRefActions(tpl: TplNode, ctx: InteractionContextData) {
  if (tplHasRef(tpl)) {
    if (isTplTag(tpl)) {
      return FOCUSABLE_ACTIONS;
    } else if (isTplComponent(tpl) && isCodeComponent(tpl.component)) {
      const meta = ctx.viewCtx.studioCtx.getCodeComponentMeta(tpl.component);
      if (meta) {
        return meta.refActions;
      }
    }
  }
  return undefined;
}

const FOCUSABLE_ACTIONS: Record<string, RefActionRegistration<any>> = {
  focus: {
    displayName: "Focus",
    argTypes: [],
  },
  blur: {
    displayName: "Unfocus",
    argTypes: [],
  },
};
