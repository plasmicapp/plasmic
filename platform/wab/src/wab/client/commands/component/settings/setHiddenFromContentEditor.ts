import { getComponentContext } from "@/wab/client/commands/context-utils";
import { booleanPrompt, Command } from "@/wab/client/commands/types";
import { Component } from "@/wab/shared/model/classes";
import { ok } from "neverthrow";

export const setHiddenFromContentEditorCommand: Command<
  {
    value: boolean;
  },
  {
    component: Component;
  }
> = {
  meta: () => {
    return {
      id: "component.settings.setHiddenFromContentEditor",
      name: "component.settings.setHiddenFromContentEditor",
      title: "Set Hidden From Content Editor",
      description: "Update component settings to hide it from content editor",
      args: {
        value: booleanPrompt({}),
      },
    };
  },
  context: getComponentContext,
  execute: async (studioCtx, { value }, { component }) => {
    return await studioCtx.change(() => {
      component.hiddenFromContentEditor = value;
      return ok();
    });
  },
};
