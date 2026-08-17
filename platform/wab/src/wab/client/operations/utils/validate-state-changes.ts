import {
  getExpectedValuesForVariantGroup,
  resolveVariantGroupValue,
} from "@/wab/shared/Variants";
import { ensure, unexpected } from "@/wab/shared/common";
import { StateAccessType, StateVariableType } from "@/wab/shared/core/states";
import { exprUsesDollarVars } from "@/wab/shared/eval/expression-parser";
import { Expr, VariantGroup } from "@/wab/shared/model/classes";
import { isArray, isBoolean, isNumber, isPlainObject, isString } from "lodash";

/**
 * Checks that a JSON initial value is compatible with the state's variable
 * type. Returns an error message, or undefined if the value is valid.
 */
export function validateStateInitialValue(
  variableType: StateVariableType,
  value: unknown,
  group?: VariantGroup
): string | undefined {
  const typeError = () =>
    `Initial value ${JSON.stringify(
      value
    )} is not valid for a "${variableType}" state.`;
  switch (variableType) {
    case "text":
    case "dateString":
      return isString(value) ? undefined : typeError();
    case "number":
      return isNumber(value) ? undefined : typeError();
    case "boolean":
      return isBoolean(value) ? undefined : typeError();
    case "array":
      return isArray(value) ? undefined : typeError();
    case "object":
      return isPlainObject(value) ? undefined : typeError();
    case "dateRangeStrings":
      return isArray(value) && value.every((v) => isString(v))
        ? undefined
        : typeError();
    case "variant":
      return validateVariantGroupInitialValue(
        ensure(
          group,
          "a variant group is required to validate a variant-typed state"
        ),
        value
      );
    default:
      unexpected(`unexpected variable type: ${variableType}`);
  }
}

function validateVariantGroupInitialValue(
  group: VariantGroup,
  value: unknown
): string | undefined {
  const { unknownValues } = resolveVariantGroupValue(group, value);
  if (unknownValues.length === 0) {
    return undefined;
  }
  return `Initial value refers to ${unknownValues
    .map((v) => JSON.stringify(v))
    .join(", ")}, which ${
    unknownValues.length === 1 ? "is not a variant" : "are not variants"
  } of group "${
    group.param.variable.name
  }"; expected values: ${getExpectedValuesForVariantGroup(group)}.`;
}

/**
 * Checks that a state's access type is compatible with its initial value
 * expression. A writable state's initial value becomes a prop default
 * evaluated at the instantiation site, so it must not reference $-vars that
 * only exist inside the owning component. Returns an error message, or
 * undefined if the combination is valid.
 */
export function validateStateAccessType(
  accessType: StateAccessType,
  initialValueExpr: Expr | null | undefined
): string | undefined {
  return accessType === "writable" &&
    initialValueExpr &&
    exprUsesDollarVars(initialValueExpr)
    ? "Initial value for read-and-write state cannot contain references to dynamic values that are available only in the current component context."
    : undefined;
}
