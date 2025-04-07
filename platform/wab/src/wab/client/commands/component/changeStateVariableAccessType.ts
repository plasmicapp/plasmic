import { getComponentStatesContext } from "@/wab/client/commands/context-utils";
import { choicePrompt, Command } from "@/wab/client/commands/types";
import {
  getAccessTypeDisplayName,
  getStateVarName,
  STATE_ACCESS_TYPES,
  StateAccessType,
} from "@/wab/shared/core/states";
import { State } from "@/wab/shared/model/classes";

export const changeStateVariableAccessTypeCommand: Command<
  {
    accessType: StateAccessType;
  },
  {
    state: State;
  }
> = {
  meta: ({ state }) => {
    return {
      id: "component.changeStateVariableAccessType",
      name: "component.changeStateVariableAccessType",
      title: `Change State -> ${getStateVarName(state)} Access Type`,
      description:
        "Change component's state variable access type to 'readonly', 'writeable' or 'private'",
      args: {
        accessType: choicePrompt({
          options: STATE_ACCESS_TYPES.map((type) => ({
            id: type,
            label: getAccessTypeDisplayName(type),
            value: type,
          })),
        }),
      },
    };
  },
  context: getComponentStatesContext,
  execute: async (studioCtx, { accessType }, { state }) => {
    return await studioCtx.change(({ success }) => {
      if (accessType) {
        studioCtx.siteOps().updateState(state, {
          accessType,
        });
      }
      return success();
    });
  },
};
