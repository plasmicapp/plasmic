import { strictZip } from "@/wab/shared/common";
import { isKnownFunctionType, Type } from "@/wab/shared/model/classes";
import {
  isChoiceType,
  isOptionsType,
  normalizeToChoiceObjects,
} from "@/wab/shared/model/model-util";
import { xor } from "lodash";

/**
 * Whether an inner prop is compatible for linking with an outer prop
 * @param innerType type of the inner prop
 * @param outerType type of the outer prop
 */
export function isLinkCompatible(innerType: Type, outerType: Type): boolean {
  if (isKnownFunctionType(innerType) !== isKnownFunctionType(outerType)) {
    return false;
  }
  if (isKnownFunctionType(innerType) && isKnownFunctionType(outerType)) {
    return (
      innerType.params.length === outerType.params.length &&
      strictZip(innerType.params, outerType.params).every(
        // Not using typesEqual because it is more strict
        // For example, it checks if the function arg names are equal
        ([a, b]) => a.type.name === b.type.name
      )
    );
  }

  if (innerType.name === outerType.name) {
    // option types (multi/single choice) must share the exact same options
    if (isOptionsType(innerType) && isOptionsType(outerType)) {
      const innerValues = normalizeToChoiceObjects(innerType.options).map(
        (o) => o.value
      );
      const outerValues = normalizeToChoiceObjects(outerType.options).map(
        (o) => o.value
      );
      return xor(innerValues, outerValues).length === 0;
    }
    return true;
  }

  // The only cross-type link we allow: a text prop reading a single choice
  return (
    innerType.name === "text" &&
    isChoiceType(outerType) &&
    normalizeToChoiceObjects(outerType.options).every(
      (o) => typeof o.value === "string"
    )
  );
}
