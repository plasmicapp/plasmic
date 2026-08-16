import { isSlot } from "@/wab/shared/SlotUtils";
import {
  findVariantGroupForParam,
  isCodeComponent,
} from "@/wab/shared/core/components";
import { tryExtractJson } from "@/wab/shared/core/exprs";
import { valueInOptions } from "@/wab/shared/linting/lint-choice-prop-values";
import {
  Component,
  Expr,
  Param,
  isKnownStateParam,
} from "@/wab/shared/model/classes";
import {
  PropTypeData,
  getChoiceValue,
} from "@/wab/shared/model/prop-type-config";
import { ChoiceOptions } from "@plasmicapp/host";
import { isString } from "lodash";

/**
 * Validates a prop name: must be non-empty and must not end with "/"
 * (a "/" separates folder segments used to organize props in the UI).
 */
export function validatePropName(name: string): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) {
    return "Prop name cannot be empty.";
  }
  if (trimmed.endsWith("/")) {
    return `Prop name cannot end with "/".`;
  }
  return undefined;
}

/** Validates choice/multiChoice options: values must be unique. */
export function validatePropOptions(
  options: ChoiceOptions
): string | undefined {
  const values = options.map(getChoiceValue);
  if (new Set(values).size !== values.length) {
    return "Choices should not contain duplicates.";
  }
  return undefined;
}

/**
 * Checks that a prop's default or preview value expression is compatible
 * with its type:
 * - Special expressions matching the type's guard (page hrefs, image
 *   assets, style tokens, data source ops) are valid as-is.
 * - Statically-known JSON values are checked against the type's JSON shape
 *   and, for choice types with options, membership in those options.
 * - Dynamic expressions are not statically checkable and pass through.
 * - Types without a config entry are not checked (unknown kinds arise when
 *   linking code-component props).
 *
 * Returns an error message, or undefined if valid.
 */
export function validateValueForPropType(
  field: "Default" | "Preview",
  propTypeData: PropTypeData | undefined,
  options: ChoiceOptions | undefined,
  expr: Expr
): string | undefined {
  if (!propTypeData) {
    return undefined;
  }
  if (propTypeData.exprTypeGuard?.(expr)) {
    return undefined;
  }
  const jsonType = propTypeData.jsonType;
  if (!jsonType) {
    return `${field} values are not supported for "${propTypeData.label}" props.`;
  }
  const value = tryExtractJson(expr);
  if (value === undefined) {
    return undefined;
  }

  const invalidMessage = `${field} value ${JSON.stringify(
    value
  )} is not valid for a "${propTypeData.value}" prop.`;

  const matchesJsonType = () => {
    switch (jsonType) {
      case "any":
        return true;
      case "string":
        return isString(value);
      case "number":
        return (
          typeof value === "number" ||
          (isString(value) && value.trim() !== "" && !Number.isNaN(+value))
        );
      case "boolean":
        return typeof value === "boolean";
      case "string[]":
        return Array.isArray(value) && value.every((v) => isString(v));
    }
  };
  if (!matchesJsonType()) {
    return invalidMessage;
  }

  if (propTypeData.value === "choice" || propTypeData.value === "multiChoice") {
    if (propTypeData.value === "choice" && Array.isArray(value)) {
      return invalidMessage;
    }
    if (propTypeData.value === "multiChoice" && !Array.isArray(value)) {
      return invalidMessage;
    }
    if (options && options.length > 0 && !valueInOptions(options, value)) {
      return `${field} value ${JSON.stringify(
        value
      )} is not among the allowed options for this "${
        propTypeData.value
      }" prop.`;
    }
  }
  return undefined;
}

/**
 * Params on `component.params` that are not prop-shaped, each managed
 * through its own surface. Returns the error message, or undefined for a
 * prop. The value and onChange params of a read-and-write state count as
 * props: Studio lists them in the props section and edits them through the
 * prop modal. Deleting them is still blocked, by `canDeleteParam` in the
 * delete operation.
 */
export function getExcludedParamKindMessage(
  component: Component,
  param: Param
): string | undefined {
  const propName = param.variable.name;
  if (isCodeComponent(component)) {
    return `Component "${component.name}" is a code component; its props are managed by its code registration.`;
  }
  // Variant-group params are StateParams too (their linked state), so this
  // check must come before the state-param one.
  if (findVariantGroupForParam(component, param)) {
    return `Param "${propName}" backs a variant group; manage it through variant group operations.`;
  }
  if (isKnownStateParam(param) && param.state.accessType !== "writable") {
    return `Param "${propName}" is a state value param; manage it through state operations.`;
  }
  const stateOnChangeParam = component.states.find(
    (state) => state.onChangeParam === param
  );
  if (stateOnChangeParam && stateOnChangeParam.accessType === "private") {
    return `Param "${propName}" is a state change handler; it is derived from its state.`;
  }
  if (isSlot(param)) {
    return `Param "${propName}" is a slot; slots are managed through the element tree.`;
  }
  return undefined;
}
