import { getArenaFrames } from "@/wab/shared/Arenas";
import { componentsReferencingDataToken } from "@/wab/shared/cached-selectors";
import { makeShortProjectId, toVarName } from "@/wab/shared/codegen/util";
import { ensure, mkShortId } from "@/wab/shared/common";
import { isFrameComponent } from "@/wab/shared/core/components";
import { walkDependencyTree } from "@/wab/shared/core/project-deps";
import {
  finalDataTokensForDep,
  siteFinalDataTokens,
} from "@/wab/shared/core/site-data-tokens";
import { GeneralUsageSummary } from "@/wab/shared/core/sites";
import { FinalToken, MutableToken } from "@/wab/shared/core/tokens";
import { tryEvalExpr } from "@/wab/shared/eval";
import { makeDataTokenIdentifier } from "@/wab/shared/eval/expression-parser";
import { DataToken, Site } from "@/wab/shared/model/classes";
import { mkMetaName } from "@plasmicapp/host";
import { upperFirst } from "lodash";
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
  token: FinalToken<DataToken> | DataToken,
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
 * Computes flat data tokens for a given site and evaluation environment.
 *
 *   $dataTokens_12345_token1: value1,  // flat identifiers for evaluation
 *   $dataTokens_12345_token2: value2,
 *   $dataTokens_1T8AH_token1: value1,
 * }
 */
type EvaluatedDataTokens =
  | { $dataTokens: Record<string, any>; pickerEnv: Record<string, any> }
  | undefined;

export function computeDataTokens(
  site: Site,
  siteId: string,
  evalEnv?: Record<string, any>
): EvaluatedDataTokens {
  const $dataTokens: Record<string, any> = {};
  const pickerEnv: Record<string, any> = {};
  const localShortId = makeShortProjectId(siteId);

  const computeProjectTokensForEval = (
    tokens: readonly FinalToken<DataToken>[],
    shortId: string
  ) => {
    for (const token of tokens) {
      const tokenVarName = toVarName(token.name);
      const value = computeDataTokenValue(token, evalEnv);
      const tokenIdentifier = makeDataTokenIdentifier(shortId, tokenVarName);
      $dataTokens[tokenIdentifier] = value;
      $dataTokens[mkMetaName(tokenIdentifier)] = { hidden: true };
    }
  };

  const computeProjectTokensForPicker = (
    tokens: readonly FinalToken<DataToken>[],
    envObj: Record<string, any>
  ) => {
    for (const token of tokens) {
      const tokenVarName = toVarName(token.name);
      const value = computeDataTokenValue(token, evalEnv);
      // Nested token structure for DataPicker eval/code completion
      envObj[mkMetaName(tokenVarName)] = { label: token.name };
      envObj[tokenVarName] = value;
    }
  };

  const localTokens = siteFinalDataTokens(site);
  computeProjectTokensForEval(localTokens, localShortId);
  computeProjectTokensForPicker(localTokens, pickerEnv);

  const directDepIds = new Set(
    site.projectDependencies.map((dep) => dep.projectId)
  );

  // Walk all dependencies (including transitive) for canvas evaluation
  let hasDependencyTokens = false;
  for (const dep of walkDependencyTree(site, "all")) {
    const depTokens = finalDataTokensForDep(site, dep.site);
    if (depTokens.length) {
      hasDependencyTokens = true;
      const depShortId = makeShortProjectId(dep.projectId);
      computeProjectTokensForEval(depTokens, depShortId);

      // Only show direct dependencies in the data picker UI
      if (directDepIds.has(dep.projectId)) {
        const depVarName = toVarName(dep.name);
        pickerEnv[mkMetaName(depVarName)] = { label: dep.name };
        pickerEnv[depVarName] = {};
        computeProjectTokensForPicker(depTokens, pickerEnv[depVarName]);
      }
    }
  }

  if (!localTokens.length && !hasDependencyTokens) {
    return undefined;
  }
  return { $dataTokens, pickerEnv };
}

/**
 * @param site - The site containing the data token
 * @param dataToken - The data token to extract usages for
 * @returns A summary of the usages of the data token
 */
export function extractDataTokenUsages(
  projectId: string,
  site: Site,
  dataToken: DataToken
): GeneralUsageSummary {
  const usingComponents = [
    ...componentsReferencingDataToken(projectId, site, dataToken),
  ];

  const arenaFrames = site.arenas.flatMap((arena) => getArenaFrames(arena));

  const usingFrames = usingComponents.filter(isFrameComponent).map((c) =>
    ensure(
      arenaFrames.find((frame) => frame.container.component === c),
      () => `Couldn't find arenaFrame for component ${c.name} (${c.uuid})`
    )
  );

  return {
    components: usingComponents.filter((c) => !isFrameComponent(c)),
    frames: usingFrames,
  };
}

/**
 * Generates an appropriate name for a data token, created specifically for a prop by right-clicking it
 */
export function generateDataTokenName(propName: string) {
  return upperFirst(propName.replace(/-/g, " "));
}
