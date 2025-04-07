import { getStateDisplayName } from "@/wab/shared/core/states";
import { Component } from "@/wab/shared/model/classes";

export const getStateVariableChoiceOptions = (component: Component) => {
  const regularStateVariables = component.states.filter(
    (state) => state.variableType !== "variant" && !state.tplNode
  );

  return {
    options: (regularStateVariables || []).map((state) => ({
      label: getStateDisplayName(state),
      value: state,
      id: state.uid,
    })),
  };
};
