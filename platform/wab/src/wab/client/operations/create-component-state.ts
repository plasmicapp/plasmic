import { OperationResult } from "@/wab/client/operations/common";
import {
  validateStateAccessType,
  validateStateInitialValue,
} from "@/wab/client/operations/utils/validate-state-changes";
import { TplMgr } from "@/wab/shared/TplMgr";
import { isCodeComponent } from "@/wab/shared/core/components";
import { codeLit, tryExtractJson } from "@/wab/shared/core/exprs";
import { mkParamsForState } from "@/wab/shared/core/lang";
import {
  NormalStateVariableType,
  StateAccessType,
  addComponentState,
  genOnChangeParamName,
  getDefaultValueForStateVariableType,
  mkState,
} from "@/wab/shared/core/states";
import { Component, Expr, Site, State } from "@/wab/shared/model/classes";

export type CreateComponentStateResult = OperationResult<{ state: State }>;

/**
 * Create an explicit state variable on the component. The name is deduped
 * against existing param/tpl names (numeric suffix), and the change-handler
 * param is derived from it. The initial value is any expression; omitting it
 * (or passing null) uses the variable type's default. Statically-known values
 * are validated against the variable type.
 */
export function createComponentState(opts: {
  site: Site;
  component: Component;
  tplMgr: TplMgr;
  name: string;
  variableType?: NormalStateVariableType;
  accessType?: StateAccessType;
  initialValue?: Expr | null;
}): CreateComponentStateResult {
  const {
    site,
    component,
    tplMgr,
    variableType = "text",
    accessType = "private",
    initialValue,
  } = opts;

  if (isCodeComponent(component)) {
    return {
      result: "error",
      message: `Component "${component.name}" is a code component; its states are managed by its code registration.`,
    };
  }
  if (!opts.name.trim()) {
    return { result: "error", message: "State name cannot be empty." };
  }
  if (initialValue !== undefined && initialValue !== null) {
    const staticValue = tryExtractJson(initialValue);
    const invalidMessage =
      staticValue !== undefined
        ? validateStateInitialValue(variableType, staticValue)
        : validateStateAccessType(accessType, initialValue);
    if (invalidMessage) {
      return { result: "error", message: invalidMessage };
    }
  }

  const name = tplMgr.getUniqueParamName(component, opts.name);
  const onChangeProp = tplMgr.getUniqueParamName(
    component,
    genOnChangeParamName(name)
  );
  const { valueParam, onChangeParam } = mkParamsForState({
    name,
    onChangeProp,
    variableType,
    accessType,
    defaultExpr:
      initialValue ??
      codeLit(getDefaultValueForStateVariableType(variableType)),
  });
  const state = mkState({
    param: valueParam,
    onChangeParam,
    variableType,
    accessType,
  });
  addComponentState(site, component, state);
  return { result: "success", state };
}
