import { getComponentContext } from "@/wab/client/commands/context-utils";
import { Command, booleanPrompt } from "@/wab/client/commands/types";
import { Component } from "@/wab/shared/model/classes";
import { ok } from "neverthrow";

export const setEditableByContentEditorCommand: Command<
  {
    value: boolean;
  },
  {
    component: Component;
  }
> = {
  meta: () => {
    return {
      id: "component.settings.setEditableByContentEditor",
      name: "component.settings.setEditableByContentEditor",
      title: "Set Editable By Content Editor",
      description:
        "Update component settings to make it editable by content editor",
      args: {
        value: booleanPrompt({}),
      },
    };
  },
  context: getComponentContext,
  execute: async (studioCtx, { value }, { component }) => {
    return await studioCtx.change(() => {
      component.editableByContentEditor = value;
      return ok();
    });
  },
};
