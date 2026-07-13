import { OperationResult } from "@/wab/client/operations/common";
import {
  validateStateAccessType,
  validateStateInitialValue,
} from "@/wab/client/operations/utils/validate-state-changes";
import { TplMgr } from "@/wab/shared/TplMgr";
import {
  getComponentDisplayName,
  isCodeComponent,
} from "@/wab/shared/core/components";
import { codeLit, tryExtractJson } from "@/wab/shared/core/exprs";
import {
  NormalStateVariableType,
  StateAccessType,
  findImplicitUsages,
  getDefaultValueForStateVariableType,
  getStateVarName,
  updateStateAccessType,
} from "@/wab/shared/core/states";
import {
  Component,
  Expr,
  Site,
  State,
  isKnownVariantGroupState,
} from "@/wab/shared/model/classes";
import { convertVariableTypeToWabType } from "@/wab/shared/model/model-util";
import { uniq } from "lodash";

export type UpdateComponentStateResult = OperationResult<{}>;

export interface ComponentStateChanges {
  name?: string;
  variableType?: NormalStateVariableType;
  accessType?: StateAccessType;
  initialValue?: Expr | null;
}

/**
 * Update fields of an existing state variable. All requested changes are
 * validated up front, so an error result means nothing was changed.
 *
 * Field semantics:
 * - name: deduped rename; `$state`/`$props` references and the change-handler
 *   param are fixed up automatically.
 * - variableType: resets the initial value to the new type's default, unless
 *   an initialValue is provided in the same call.
 * - accessType: making a state private is rejected while other components
 *   reference its implicit copies; making it writable is rejected while the
 *   initial value references `$`-vars.
 * - initialValue: any expression; null clears the initial value.
 *   Statically-known values are validated against the variable type.
 *
 * Implicit states only support accessType changes (that is how a child
 * element's state gets exposed from the component); variant-group states are
 * managed through variant group operations instead.
 */
export function updateComponentState(
  state: State,
  changes: ComponentStateChanges,
  opts: {
    site: Site;
    component: Component;
    tplMgr: TplMgr;
  }
): UpdateComponentStateResult {
  const { site, component, tplMgr } = opts;
  const { name, variableType, accessType, initialValue } = changes;
  const stateName = getStateVarName(state);

  if (isCodeComponent(component)) {
    return {
      result: "error",
      message: `Component "${component.name}" is a code component; its states are managed by its code registration.`,
    };
  }
  if (isKnownVariantGroupState(state)) {
    return {
      result: "error",
      message: `State "${stateName}" backs a variant group; manage it through variant group operations.`,
    };
  }
  if (
    name === undefined &&
    variableType === undefined &&
    accessType === undefined &&
    initialValue === undefined
  ) {
    return {
      result: "error",
      message: `No changes provided for state "${stateName}".`,
    };
  }

  if (
    state.tplNode &&
    (name !== undefined ||
      variableType !== undefined ||
      initialValue !== undefined)
  ) {
    return {
      result: "error",
      message: `State "${stateName}" is an implicit state of element "${state.tplNode.name}"; only its access type can be changed.`,
    };
  }

  if (name !== undefined && !name.trim()) {
    return { result: "error", message: "State name cannot be empty." };
  }

  if (initialValue !== undefined && initialValue !== null) {
    const staticValue = tryExtractJson(initialValue);
    if (staticValue !== undefined) {
      const invalidMessage = validateStateInitialValue(
        variableType ?? state.variableType,
        staticValue
      );
      if (invalidMessage) {
        return { result: "error", message: invalidMessage };
      }
    }
  }
  if (accessType === "private" && state.accessType !== "private") {
    const referencingComponents = uniq(
      findImplicitUsages(site, state).map((usage) => usage.component)
    );
    if (referencingComponents.length > 0) {
      return {
        result: "error",
        message: `Variable is referenced in ${referencingComponents
          .map((c) => getComponentDisplayName(c))
          .join(", ")}.`,
      };
    }
  }
  // Only an accessType change or an incoming initial value can produce the
  // invalid writable-with-dynamic-initial-value combination.
  if (accessType !== undefined || initialValue !== undefined) {
    const finalDefaultExpr =
      initialValue !== undefined
        ? initialValue
        : variableType !== undefined && variableType !== state.variableType
        ? codeLit(getDefaultValueForStateVariableType(variableType))
        : state.param.defaultExpr;
    const invalidMessage = validateStateAccessType(
      accessType ?? (state.accessType as StateAccessType),
      finalDefaultExpr
    );
    if (invalidMessage) {
      return { result: "error", message: invalidMessage };
    }
  }

  if (name !== undefined) {
    tplMgr.renameParam(component, state.param, name);
  }
  if (variableType !== undefined && variableType !== state.variableType) {
    state.param.type = convertVariableTypeToWabType(variableType);
    state.variableType = variableType;
    state.param.defaultExpr = codeLit(
      getDefaultValueForStateVariableType(variableType)
    );
  }
  if (initialValue !== undefined) {
    state.param.defaultExpr = initialValue;
  }
  if (accessType !== undefined && accessType !== state.accessType) {
    updateStateAccessType(site, component, state, accessType);
  }
  return { result: "success" };
}
