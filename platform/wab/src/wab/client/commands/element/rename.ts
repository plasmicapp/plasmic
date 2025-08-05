import { Command, stringPrompt } from "@/wab/client/commands/types";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { TplComponent, TplTag } from "@/wab/shared/model/classes";

export const renameCommand: Command<
  {
    name: string;
  },
  {
    viewCtx: ViewCtx;
    tpl: TplComponent | TplTag;
  }
> = {
  meta: () => ({
    id: "element.rename",
    name: "element.rename",
    title: "Rename Element",
    description: "Provide a human readable name to the focused element",
    args: {
      name: stringPrompt({}),
    },
  }),
  context: (studioCtx) => {
    const viewCtx = studioCtx.focusedViewCtx();
    const tpl = viewCtx?.focusedTpl(false);

    if (!(tpl && viewCtx)) {
      return [];
    }

    return [{ tpl: tpl as TplComponent | TplTag, viewCtx }];
  },
  execute: async (studioCtx, { name }, { viewCtx, tpl }) => {
    return await studioCtx.change(({ success }) => {
      viewCtx.getViewOps().renameTpl(name, tpl);
      return success();
    });
  },
};
