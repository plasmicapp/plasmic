import { mkShortId } from "@/wab/shared/common";
import { FinalToken, MutableToken } from "@/wab/shared/core/tokens";
import { DataToken } from "@/wab/shared/model/classes";
import type { Opaque } from "type-fest";

export type DataTokenType = "number" | "string" | "code";
export type DataTokenValue = Opaque<string, "DataTokenValue">;

/**
 * Determine the type of a data token based on its value
 */
export function getDataTokenType(value: string): DataTokenType {
  try {
    const parsed = JSON.parse(value);
    const type = typeof parsed;
    if (type === "string" || type === "number") {
      return type;
    }
    // Objects, arrays, null (valid JSON) are also considered code expressions
    return "code";
  } catch (e) {
    // Invalid JSON means it's a code expression (e.g. `a + b`)
    return "code";
  }
}

export const dataTypes: Record<
  DataTokenType,
  { label: string; defaultValue: any; defaultSerializedValue: string }
> = {
  string: {
    label: "Text",
    defaultValue: "",
    defaultSerializedValue: '""',
  },
  number: {
    label: "Number",
    defaultValue: 0,
    defaultSerializedValue: "0",
  },
  code: {
    label: "Code Expression",
    defaultValue: undefined,
    defaultSerializedValue: "(undefined)",
  },
};

/**
 * Sort data token categories in canonical order (string, number, any)
 * Uses the key order from dataTypes as the source of truth
 */
export function sortDataTokenCategories(
  categories: DataTokenType[]
): DataTokenType[] {
  const canonicalOrder = Object.keys(dataTypes) as DataTokenType[];
  return categories.sort(
    (a, b) => canonicalOrder.indexOf(a) - canonicalOrder.indexOf(b)
  );
}

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
