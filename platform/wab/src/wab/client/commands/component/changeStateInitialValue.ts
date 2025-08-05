import { getComponentStatesContext } from "@/wab/client/commands/context-utils";
import { Command, stringPrompt } from "@/wab/client/commands/types";
import { getStateVarName } from "@/wab/shared/core/states";
import { Expr, State } from "@/wab/shared/model/classes";

export const changeStateInitialValueCommand: Command<
  {
    expr: Expr | undefined;
  },
  {
    state: State;
  }
> = {
  // @ts-expect-error - args.expr type depends on the type of the selected state. Should be fixed in Omnibar UI integration.
  meta: ({ state }) => {
    return {
      id: `component.changeStateInitialValue.${state.uid}`,
      name: "component.changeStateInitialValue",
      title: `Change State -> ${getStateVarName(state)} Initial Value`,
      description: "Change component's state initial value",
      args: {
        expr: stringPrompt({}),
      },
    };
  },
  context: getComponentStatesContext,
  execute: async (studioCtx, { expr }, { state }) => {
    return await studioCtx.change(({ success }) => {
      state.param.defaultExpr = expr;
      return success();
    });
  },
};
