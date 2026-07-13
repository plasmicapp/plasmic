import { getComponentContext } from "@/wab/client/commands/context-utils";
import { Command } from "@/wab/client/commands/types";
import { createComponentState } from "@/wab/client/operations/create-component-state";
import { assert } from "@/wab/shared/common";
import { DEFAULT_STATE_VARIABLE_NAME } from "@/wab/shared/core/states";
import { Component, State } from "@/wab/shared/model/classes";

export const addNewStateVariableCommand: Command<
  {},
  {
    component: Component;
  },
  State
> = {
  meta: () => {
    return {
      id: "component.addNewStateVariable",
      name: "component.addNewStateVariable",
      title: "Add new state variable",
      description: "Add new state variable to a component",
      args: {},
    };
  },
  context: getComponentContext,
  execute: async (studioCtx, _, { component }) => {
    return await studioCtx.change(({ success }) => {
      const result = createComponentState({
        site: studioCtx.site,
        component,
        tplMgr: studioCtx.tplMgr(),
        name: DEFAULT_STATE_VARIABLE_NAME,
      });
      assert(result.result === "success", "Failed to create state variable");

      return success(result.state);
    });
  },
};
