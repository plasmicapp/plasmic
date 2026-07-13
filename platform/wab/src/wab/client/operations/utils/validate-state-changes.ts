import { unexpected } from "@/wab/shared/common";
import { StateAccessType, StateVariableType } from "@/wab/shared/core/states";
import { exprUsesDollarVars } from "@/wab/shared/eval/expression-parser";
import { Expr } from "@/wab/shared/model/classes";
import { isArray, isBoolean, isNumber, isPlainObject, isString } from "lodash";

/**
 * Checks that a JSON initial value is compatible with the state's variable
 * type. Returns an error message, or undefined if the value is valid.
 */
export function validateStateInitialValue(
  variableType: StateVariableType,
  value: unknown
): string | undefined {
  const validateType = () => {
    switch (variableType) {
      case "text":
      case "dateString":
        return isString(value);
      case "number":
        return isNumber(value);
      case "boolean":
        return isBoolean(value);
      case "array":
        return isArray(value);
      case "object":
        return isPlainObject(value);
      case "dateRangeStrings":
        return isArray(value) && value.every((v) => isString(v));
      default:
        unexpected(`unexpected variable type: ${variableType}`);
    }
  };

  return validateType()
    ? undefined
    : `Initial value ${JSON.stringify(
        value
      )} is not valid for a "${variableType}" state.`;
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
