import { getComponentContext } from "@/wab/client/commands/context-utils";
import { Command } from "@/wab/client/commands/types";
import { mkInitialState } from "@/wab/client/components/sidebar-tabs/StateManagement/VariablesSection";
import { addComponentState } from "@/wab/shared/core/states";
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
      const newState = mkInitialState(studioCtx, component);
      addComponentState(studioCtx.site, component, newState);

      return success(newState);
    });
  },
};
