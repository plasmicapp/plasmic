import { getComponentStatesContext } from "@/wab/client/commands/context-utils";

import { Command } from "@/wab/client/commands/types";
import { getStateVarName } from "@/wab/shared/core/states";
import { Component, State } from "@/wab/shared/model/classes";

export const removeStateVariableCommand: Command<
  {},
  {
    state: State;
    component: Component;
  }
> = {
  meta: ({ state }) => ({
    id: "component.removeStateVariable",
    name: "component.removeStateVariable",
    title: `Remove State -> ${getStateVarName(state)}`,
    description: "Remove an existing state variable from a component",
    args: {},
  }),
  context: getComponentStatesContext,
  execute: async (studioCtx, _, { component, state }) => {
    return await studioCtx.change(({ success }) => {
      try {
        studioCtx.siteOps().removeState(component, state);
      } catch {
        // Not a problem if the state was already removed
      }

      return success();
    });
  },
};
