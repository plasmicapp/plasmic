import { getComponentContext } from "@/wab/client/commands/context-utils";
import { Command } from "@/wab/client/commands/types";
import { createComponentState } from "@/wab/client/operations/create-component-state";
import { ensureOk } from "@/wab/commons/neverthrow-utils";
import { DEFAULT_STATE_VARIABLE_NAME } from "@/wab/shared/core/states";
import { Component, State } from "@/wab/shared/model/classes";
import { ok } from "neverthrow";

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
    return studioCtx.change(() => {
      const state = ensureOk(
        createComponentState({
          site: studioCtx.site,
          component,
          tplMgr: studioCtx.tplMgr(),
          name: DEFAULT_STATE_VARIABLE_NAME,
        })
      );
      return ok(state);
    });
  },
};
