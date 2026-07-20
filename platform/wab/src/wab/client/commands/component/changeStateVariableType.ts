import { getComponentStatesContext } from "@/wab/client/commands/context-utils";
import { choicePrompt, Command } from "@/wab/client/commands/types";
import {
  getStateVarName,
  NORMAL_STATE_VARIABLE_TYPES,
  NormalStateVariableType,
} from "@/wab/shared/core/states";
import { State } from "@/wab/shared/model/classes";
import { ok } from "neverthrow";

export const changeStateVariableTypeCommand: Command<
  {
    type: NormalStateVariableType | null;
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
          options: NORMAL_STATE_VARIABLE_TYPES.map((type) => ({
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
    return await studioCtx.change(() => {
      if (type && type !== state.variableType) {
        studioCtx.siteOps().updateState(state, {
          variableType: type,
        });
      }
      return ok();
    });
  },
};
