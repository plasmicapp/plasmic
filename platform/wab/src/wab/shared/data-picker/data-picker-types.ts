import { isNonNil } from "@/wab/shared/common";
import { alwaysOmitKeys } from "@/wab/shared/core/exprs";
import {
  UNINITIALIZED_BOOLEAN,
  UNINITIALIZED_NUMBER,
  UNINITIALIZED_OBJECT,
  UNINITIALIZED_STRING,
} from "@/wab/shared/model/model-util";
import { DataMeta, mkMetaName } from "@plasmicapp/host";

export type DataPickerOpts = {
  showAdvancedFields: boolean;
};

export const allowedSymbols = [
  UNINITIALIZED_NUMBER,
  UNINITIALIZED_STRING,
  UNINITIALIZED_BOOLEAN,
  UNINITIALIZED_OBJECT,
];

/** `typeof` types plus a few useful types. */
export type VariableType =
  // typeof
  | "undefined"
  | "boolean"
  | "number"
  | "bigint"
  | "string"
  | "symbol"
  | "object"
  | "function"
  // extended
  | "null"
  | "array"
  | "react-element";

/** A better `typeof`. This could be moved to commons later. */
export function getVariableType(value: any): VariableType {
  if (value === undefined) {
    return "undefined";
  } else if (value === null) {
    return "null";
  } else if (Array.isArray(value)) {
    return "array";
  } else if (typeof value === "object" && value.$$typeof) {
    // Make a special effort to detect React elements, which often come from $props with
    // renderable params. Walking React elements is dangerous because their props can
    // lead to canvas-rendering objects we store in element props, which may lead to
    // walking the Site data model or even other DOM trees and the top `window`.
    return "react-element";
  } else if (value === UNINITIALIZED_STRING) {
    return "string";
  } else if (value === UNINITIALIZED_NUMBER) {
    return "number";
  } else if (value === UNINITIALIZED_BOOLEAN) {
    return "boolean";
  } else if (value === UNINITIALIZED_OBJECT) {
    return "object";
  }
  return typeof value;
}

/** If type has a nested column / list of sub-items. */
export function isListType(type: VariableType) {
  return type === "object" || type === "array";
}

const dataPickerSupportedTypes = [
  "null",
  "undefined",
  "boolean",
  "number",
  "string",
  "object",
  "array",
  "function",
] as const;

export type DataPickerSupportedVariableType =
  (typeof dataPickerSupportedTypes)[number];

export function isTypeSupported(
  variableType: VariableType
): variableType is DataPickerSupportedVariableType {
  return (dataPickerSupportedTypes as readonly string[]).includes(variableType);
}

export function dataPickerShouldHideKey(
  key: string,
  data: Record<string, any>,
  pathPrefix: (string | number)[] | undefined,
  opts: DataPickerOpts
) {
  if (key === "$$" && !pathPrefix?.length) {
    return true;
  }
  if (key.startsWith("__plasmic")) {
    return true;
  }
  if (data[key]?.isPlasmicUndefinedDataProxy) {
    return true;
  }
  const meta: DataMeta | undefined = data[mkMetaName(key)];
  if (isNonNil(meta)) {
    if (meta.hidden) {
      return true;
    }
    if (!opts.showAdvancedFields && meta.advanced) {
      return true;
    }
  }
  if (alwaysOmitKeys.has([...(pathPrefix ?? []), key].join("."))) {
    return true;
  }
  const variableType = getVariableType(data[key]);
  return !isTypeSupported(variableType) && !allowedSymbols.includes(data[key]);
}
