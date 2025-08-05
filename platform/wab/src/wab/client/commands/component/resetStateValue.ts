import { Command } from "@/wab/client/commands/types";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { getStateVarName } from "@/wab/shared/core/states";
import { Component, State } from "@/wab/shared/model/classes";

export const resetStateValueCommand: Command<
  {},
  {
    state: State;
    viewCtx: ViewCtx;
    component: Component;
  }
> = {
  meta: ({ state }) => {
    return {
      id: "component.resetStateValue",
      name: "component.resetStateValue",
      title: `Reset State -> ${getStateVarName(state)}`,
      description: "Reset state variable value to it's initial value",
      args: {},
    };
  },
  context: (studioCtx) => {
    const viewCtx = studioCtx.focusedViewCtx();
    const component = viewCtx?.component;
    const regularStateVariables = component?.states.filter(
      (state) => state.variableType !== "variant" && !state.tplNode
    );

    if (!(viewCtx && component && regularStateVariables?.length)) {
      return [];
    }

    return component.states.map((state) => ({ component, state, viewCtx }));
  },
  execute: async (studioCtx, _, { state, viewCtx }) => {
    return await studioCtx.change(({ success }) => {
      const initialValue = viewCtx.getStateCurrentInitialValue(state);
      viewCtx.setCanvasStateValue(state, initialValue);

      return success();
    });
  },
};
