import { toVarName } from "@/wab/shared/codegen/util";
import { mkShortId } from "@/wab/shared/common";
import {
  finalDataTokensForDep,
  siteFinalDataTokens,
} from "@/wab/shared/core/site-data-tokens";
import { FinalToken, MutableToken } from "@/wab/shared/core/tokens";
import { tryEvalExpr } from "@/wab/shared/eval";
import { DataToken, Site } from "@/wab/shared/model/classes";
import { mkMetaName } from "@plasmicapp/host";
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

/**
 * Computes a single data token value from its token definition.
 */
export function computeDataTokenValue(
  token: FinalToken<DataToken>,
  evalEnv?: Record<string, any>
): any {
  const tokenType = getDataTokenType(token.value);

  try {
    if (tokenType === "code") {
      // For code tokens, evaluate in the provided environment, or empty object if not provided
      const env = evalEnv ?? {};
      const evalResult = tryEvalExpr(token.value, env);
      return evalResult.val;
    } else {
      // For non-code tokens (string, number), parse the JSON value
      return JSON.parse(token.value);
    }
  } catch (e) {
    // If evaluation or parsing fails, set to undefined
    return undefined;
  }
}

/**
 * Computes data tokens for a given site and evaluation environment.
 * Includes both local tokens and imported tokens from project's direct dependencies.
 *
 * @param site - The site containing data tokens
 * @param evalEnv - The environment to use for evaluating code tokens (optional)
 * @returns A record of data token values keyed by var names, with metadata for labels.
 *          Returns undefined if no tokens exist.
 */
export function computeDataTokens(
  site: Site,
  evalEnv?: Record<string, any>
): Record<string, any> | undefined {
  const dataTokens: Record<string, any> = {};
  // Add local data tokens
  for (const token of siteFinalDataTokens(site)) {
    const varName = toVarName(token.name);
    dataTokens[varName] = computeDataTokenValue(token, evalEnv);
    dataTokens[mkMetaName(varName)] = { label: token.name };
  }

  // Add data tokens from direct dependencies
  for (const dep of site.projectDependencies) {
    for (const token of finalDataTokensForDep(site, dep.site)) {
      const varName = toVarName(token.name);
      // Skip imported data tokens if their names conflict with existing ones
      if (!(varName in dataTokens)) {
        dataTokens[varName] = computeDataTokenValue(token, evalEnv);
        dataTokens[mkMetaName(varName)] = {
          label: `${token.name} (${dep.name})`,
        };
      }
    }
  }

  return dataTokens;
}
