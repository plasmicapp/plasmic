import { getComponentStatesContext } from "@/wab/client/commands/context-utils";
import { Command, stringPrompt } from "@/wab/client/commands/types";
import { getStateVarName } from "@/wab/shared/core/states";
import { Component, State } from "@/wab/shared/model/classes";

export const changeStateVariableNameCommand: Command<
  {
    varName: string;
  },
  {
    state: State;
    component: Component;
  }
> = {
  meta: ({ state }) => {
    return {
      id: "component.changeStateVariableName",
      name: "component.changeStateVariableName",
      title: `Change State -> ${getStateVarName(state)} Variable Name`,
      description: "Rename state variable for a given component",
      args: {
        varName: stringPrompt({}),
      },
    };
  },
  context: getComponentStatesContext,
  execute: async (studioCtx, { varName }, { component, state }) => {
    return await studioCtx.change(({ success }) => {
      if (varName) {
        studioCtx.tplMgr().renameParam(component, state.param, varName);
        if (state.onChangeParam) {
          // Also rename the onChangeParam to be derived from
          // the new name
          studioCtx
            .tplMgr()
            .renameParam(
              component,
              state.onChangeParam,
              `On ${varName} Change`
            );
        }
      }
      return success();
    });
  },
};
