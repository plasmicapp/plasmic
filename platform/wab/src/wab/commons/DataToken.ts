import { mkShortId } from "@/wab/shared/common";
import { FinalToken, MutableToken } from "@/wab/shared/core/tokens";
import { DataToken } from "@/wab/shared/model/classes";
import type { Opaque } from "type-fest";

export type DataTokenType = "number" | "string" | "any";
export type DataTokenValue = Opaque<string, "DataTokenValue">;

/**
 * Determine the type of a data token based on its value
 */
export function getDataTokenType(value: string): DataTokenType {
  let type: string;
  try {
    const parsed = JSON.parse(value);
    type = typeof parsed;
    if (type === "string" || type === "number") {
      return type;
    }
    return "any";
  } catch (e) {
    return "any";
  }
}

export const dataTypes: Record<
  DataTokenType,
  { label: string; defaultValue: any; defaultSerializedValue: string }
> = {
  number: {
    label: "Number",
    defaultValue: 0,
    defaultSerializedValue: "0",
  },
  string: {
    label: "String",
    defaultValue: "",
    defaultSerializedValue: '""',
  },
  any: {
    label: "Any Data",
    defaultValue: null,
    defaultSerializedValue: "null",
  },
};

/**
 * Create a new DataToken
 */
export function mkDataToken({
  name,
  value,
  uuid,
  isRegistered = false,
}: {
  name: string;
  value: string;
  uuid?: string;
  isRegistered?: boolean;
}) {
  return new DataToken({
    name,
    type: "Data",
    value,
    uuid: uuid || mkShortId(),
    variantedValues: [],
    isRegistered,
    regKey: undefined,
  });
}

/**
 * Checks if a data token is editable.
 */
export function isDataTokenEditable(
  token: FinalToken<DataToken>
): token is MutableToken<DataToken> {
  return token instanceof MutableToken;
}
