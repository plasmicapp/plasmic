import { ContextFunc } from "@/wab/client/commands/types";
import { Component, State } from "@/wab/shared/model/classes";

export const getComponentContext: ContextFunc<{ component: Component }> = (
  studioCtx
) => {
  const viewCtx = studioCtx.focusedViewCtx();
  const component = viewCtx?.component;
  if (!component) {
    return [];
  }

  return [
    {
      component,
    },
  ];
};

export const getComponentStatesContext: ContextFunc<{
  state: State;
  component: Component;
}> = (studioCtx) => {
  const viewCtx = studioCtx.focusedViewCtx();
  const component = viewCtx?.component;
  if (!component) {
    return [];
  }

  return component.states.map((state) => ({ component, state }));
};
