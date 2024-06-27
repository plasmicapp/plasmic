import { InteractionContextData } from "@/wab/client/state-management/interactions-meta";
import { isCodeComponent } from "@/wab/shared/core/components";
import { TplNode } from "@/wab/shared/model/classes";
import { isTplComponent, isTplTag, tplHasRef } from "@/wab/shared/core/tpls";
import { RefActionRegistration } from "@plasmicapp/host/registerComponent";

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
