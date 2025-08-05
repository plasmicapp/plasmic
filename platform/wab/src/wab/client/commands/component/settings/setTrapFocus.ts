import { getComponentContext } from "@/wab/client/commands/context-utils";
import { booleanPrompt, Command } from "@/wab/client/commands/types";
import { Component } from "@/wab/shared/model/classes";

export const setTrapFocusCommand: Command<
  {
    value: boolean;
  },
  {
    component: Component;
  }
> = {
  meta: () => {
    return {
      id: "component.settings.setTrapFocus",
      name: "component.settings.setTrapFocus",
      title: "Set Trap Focus",
      description:
        "Update component settings to trap focus on a given component, enabling user of the studio to must select the given component element first before selecting any of its slot contents.",
      args: {
        value: booleanPrompt({}),
      },
    };
  },
  context: getComponentContext,
  execute: async (studioCtx, { value }, { component }) => {
    return await studioCtx.change(({ success }) => {
      component.trapsFocus = value;
      return success();
    });
  },
};
