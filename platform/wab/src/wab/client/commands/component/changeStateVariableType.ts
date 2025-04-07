import { getComponentStatesContext } from "@/wab/client/commands/context-utils";
import { choicePrompt, Command } from "@/wab/client/commands/types";
import { codeLit } from "@/wab/shared/core/exprs";
import {
  getDefaultValueForStateVariableType,
  getStateVarName,
  STATE_VARIABLE_TYPES,
  StateVariableType,
} from "@/wab/shared/core/states";
import { State } from "@/wab/shared/model/classes";

export const changeStateVariableTypeCommand: Command<
  {
    type: StateVariableType | null;
  },
  {
    state: State;
  }
> = {
  meta: ({ state }) => {
    return {
      id: "component.changeStateVariableType",
      name: "component.changeStateVariableType",
      title: `Change State -> ${getStateVarName(state)} Variable Type`,
      description: "Change state variable type for a given component",
      args: {
        type: choicePrompt({
          options: STATE_VARIABLE_TYPES.map((type) => ({
            id: type,
            label: type,
            value: type,
          })),
        }),
      },
    };
  },
  context: getComponentStatesContext,
  execute: async (studioCtx, { type }, { state }) => {
    return await studioCtx.change(({ success }) => {
      if (type && type !== state.variableType) {
        studioCtx.siteOps().updateState(state, {
          variableType: type,
        });
        state.param.defaultExpr = codeLit(
          getDefaultValueForStateVariableType(type)
        );
      }
      return success();
    });
  },
};
