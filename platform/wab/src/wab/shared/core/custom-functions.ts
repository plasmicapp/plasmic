import {
  CustomFunctionParam,
  isFlattenedObjectPropType,
  maybePropTypeToDisplayName,
  maybePropTypeToRequired,
  normalizeCustomFunctionParams,
} from "@/wab/shared/code-components/code-components";
import { arrayRemove } from "@/wab/shared/collections";
import { withoutNils } from "@/wab/shared/common";
import {
  ExprCtx,
  clone,
  getRawCode,
  isFallbackSet,
  stripParens,
} from "@/wab/shared/core/exprs";
import {
  InvalidArg,
  ValidationType,
  mkInvalidArgKey,
} from "@/wab/shared/core/invalid-arg";
import { customFunctionId } from "@/wab/shared/core/query-ids";
import { findExprsInNode } from "@/wab/shared/core/tpls";
import { tryEvalExpr } from "@/wab/shared/eval";
import { parseCodeExpression } from "@/wab/shared/eval/expression-parser";
import {
  CustomFunction,
  CustomFunctionExpr,
  ProjectDependency,
  TplNode,
  isKnownCustomFunctionExpr,
  isKnownEventHandler,
} from "@/wab/shared/model/classes";
import { convertToFunction } from "@/wab/shared/parser-utils";
import { smartHumanize } from "@/wab/shared/strs";
import type {
  PlasmicQuery,
  PlasmicQueryResult,
  QueryExecutionContext,
} from "@plasmicapp/data-sources";
import {
  _safeExecResult as safeExecResult,
  throwIfPlasmicUndefinedDataError,
} from "@plasmicapp/data-sources";
import { groupBy, pick, pickBy } from "lodash";
import { computedFn } from "mobx-utils";

export {
  _StatefulQueryResult as StatefulQueryResult,
  type _StatefulQueryState as StatefulQueryState,
} from "@plasmicapp/data-sources";

/**
 * Wraps a query function so its fetch uses the shared studio cache keyed by `id` + args.
 * This guarantees a non-deterministic function is executed once per cache key.
 */
export type ServerQueryFetchWrapper = (
  id: string,
  fn: (...args: any[]) => Promise<any>,
  ...args: any[]
) => Promise<any>;

export function getEnvForPlasmicQueries(
  env: Record<string, any>
): Record<string, any> {
  return pickBy(
    env,
    (_value, key) =>
      key === "$ctx" ||
      key === "$props" ||
      key === "$q" ||
      key === "$state" ||
      key === "$dataTokens" ||
      key === "$$" ||
      key === "$steps" ||
      // depending on whether the env is at display or evaluation stage, we may receive either stored or displayable data tokens
      key.startsWith("$dataTokens_")
  );
}

/**
 * Builds a runtime `PlasmicQuery` node for Studio editor.
 *
 * In production codegen, the static env only contains $$ and $dataTokens.
 * In Studio editor, the static env also includes $q, which are static relative
 * to this query the user is currently editing.
 *
 * `queryId` should be the canonical key (e.g. `makeCustomCodeQueryKey`)
 */
export function buildCustomCodePlasmicQuery(
  queryId: string,
  code: string,
  getRawEnv: () => Record<string, any>
): PlasmicQuery<(executionCtx: QueryExecutionContext) => Promise<unknown>> {
  // Static env is passed in as a function to prevent re-creating the query
  // when dynamic context ($ctx, $props, $q, $state) changes.
  // It would be better if call sites control re-creation explicitly when
  // static context ($$, $dataTokens) changes.
  // TODO: Switch getStaticEnv function to staticEnv object
  return {
    id: `${queryId}.$.${code}`,
    fn: buildCustomCodeFn(code, getRawEnv),
    args: buildCustomCodeArgs(code, getRawEnv),
  };
}

/**
 * Wraps a PlasmicQuery node's fetcher with `wrapFetch` (shared studio cache),
 * keyed by its own SWR `id` so the cache entry tracks the same identity.
 */
export function wrapPlasmicQueryFetch<
  Q extends PlasmicQuery<(...args: any[]) => Promise<unknown>>
>(node: Q, wrapFetch: ServerQueryFetchWrapper): Q {
  const innerFn = node.fn;
  const id = node.id;
  return {
    ...node,
    fn: ((...args: any[]) => wrapFetch(id, innerFn as any, ...args)) as Q["fn"],
  };
}

// Compiling the factory only depends on the code body and the static key
// names, not their values, so memoize it. computedFn keeps only the
// most-recently-observed entry, which is enough since one custom-code query
// is being edited at a time.
const getCustomCodeFactory = computedFn(function getCustomCodeFactory(
  code: string,
  staticKeysJson: string
): Function {
  return new Function(
    ...(JSON.parse(staticKeysJson) as string[]),
    `return async ({ $ctx, $props, $q, $state } = {}) => {
      return (${convertToFunction(stripParens(code))})();
    }`
  );
});

function buildCustomCodeFn(
  code: string,
  getRawEnv: () => Record<string, any>
): (executionCtx: QueryExecutionContext) => Promise<unknown> {
  return (executionCtx: QueryExecutionContext): Promise<unknown> => {
    const staticEnv = pickBy(
      getRawEnv(),
      (_value, key) =>
        key === "$$" || key === "$dataTokens" || key.startsWith("$dataTokens_")
    );
    const staticKeys = Object.keys(staticEnv);
    const staticValues = Object.values(staticEnv);

    let factory: Function;
    try {
      factory = getCustomCodeFactory(code, JSON.stringify(staticKeys));
    } catch (err) {
      console.warn("Failed to compile custom code query:", err);
      return Promise.reject(err);
    }

    let fn: Function;
    try {
      fn = factory(...staticValues);
    } catch (err) {
      console.warn("Failed to create custom code query:", err);
      return Promise.reject(err);
    }

    try {
      return fn(executionCtx);
    } catch (err) {
      throwIfPlasmicUndefinedDataError(err);
      console.warn("Failed to execute custom code query:", err);
      return Promise.reject(err);
    }
  };
}

function buildCustomCodeArgs(
  code: string,
  getRawEnv: () => Record<string, any>
): (executionCtx: QueryExecutionContext) => [QueryExecutionContext] {
  const { usedDollarVarKeys } = parseCodeExpression(stripParens(code));
  const depCtxNames = Array.from(usedDollarVarKeys.$ctx);
  const depPropsNames = Array.from(usedDollarVarKeys.$props);
  const depQueryNames = Array.from(usedDollarVarKeys.$q);
  // There is an equivalent codegen version of this logic in serialize-tree.
  const depStateTopLevelNames = [
    ...new Set(
      Array.from(usedDollarVarKeys.$state).map((k) => k.split(".")[0])
    ),
  ];
  return (executionCtx) => {
    // Match the fn-wrapper merge: outer $q from rawEnv, then inner from
    // the framework — so the cache key correctly tracks both sources.
    const merged$q = {
      ...((getRawEnv().$q ?? {}) as Record<string, PlasmicQueryResult>),
      ...executionCtx.$q,
    };
    return [
      {
        $ctx: pick(executionCtx.$ctx, depCtxNames),
        $props: pick(executionCtx.$props, depPropsNames),
        $q: pick(merged$q, depQueryNames),
        $state: pick(executionCtx.$state, depStateTopLevelNames),
      },
    ];
  };
}

export function getCustomFunctionParams(
  expr: CustomFunctionExpr,
  env: Record<string, any> | undefined,
  exprCtx: ExprCtx,
  currGlobalThis?: typeof globalThis
) {
  const { func, args } = expr;
  const argsMap = groupBy(args, (arg) => arg.argType.argName);
  return (
    func.params.map((param) => {
      if (argsMap[param.argName]) {
        const clonedExpr = clone(argsMap[param.argName][0].expr);
        if (isFallbackSet(clonedExpr)) {
          clonedExpr.fallback = undefined;
        }
        const result = tryEvalExpr(
          getRawCode(clonedExpr, exprCtx),
          env ?? {},
          currGlobalThis
        );
        if (result.err) {
          // Surface the error to indicate prop eval error instead of downstream error
          throwIfPlasmicUndefinedDataError(result.err);
          throw new Error(
            `Failed to evaluate query parameter "${param.argName}": ${
              (result.err as Error).message ?? String(result.err)
            }`
          );
        }
        return result.val;
      }
      return undefined;
    }) ?? []
  );
}

export function getInvalidFunctionArgs(
  args: unknown[],
  func: CustomFunction,
  registeredParams: readonly CustomFunctionParam[] | undefined
): Record<string, InvalidArg> | undefined {
  const argByName = new Map<string, unknown>(
    func.params.map((param, i) => [param.argName, args[i]])
  );
  const invalidArgs: Record<string, InvalidArg> = {};
  for (const param of normalizeCustomFunctionParams(registeredParams)) {
    const arg = argByName.get(param.name);

    if (isFlattenedObjectPropType(param)) {
      const flattenedFields = param.fields ?? {};
      for (const [fieldName, fieldPropType] of Object.entries(
        flattenedFields
      )) {
        if (
          maybePropTypeToRequired(fieldPropType) &&
          (arg == null || (arg as Record<string, unknown>)[fieldName] == null)
        ) {
          invalidArgs[mkInvalidArgKey([param.name, fieldName])] = {
            validationType: ValidationType.Required,
            displayLabel:
              maybePropTypeToDisplayName(fieldPropType) ??
              smartHumanize(fieldName),
          };
        }
      }
    } else if (maybePropTypeToRequired(param) && arg == null) {
      invalidArgs[mkInvalidArgKey([param.name])] = {
        validationType: ValidationType.Required,
        displayLabel:
          maybePropTypeToDisplayName(param) ?? smartHumanize(param.name),
      };
    }
  }
  return Object.keys(invalidArgs).length > 0 ? invalidArgs : undefined;
}

export function getOldToNewCustomFunctions(
  oldDep: ProjectDependency,
  newDep?: ProjectDependency
) {
  const oldToNewFunctions = new Map<
    CustomFunction,
    CustomFunction | undefined
  >();

  const newFuncsById = Object.fromEntries(
    newDep
      ? newDep.site.customFunctions.map((f) => [customFunctionId(f), f])
      : []
  );

  for (const oldFunc of oldDep.site.customFunctions) {
    const funcId = customFunctionId(oldFunc);
    const newFunc = newFuncsById[funcId];
    oldToNewFunctions.set(oldFunc, newFunc);
  }

  return oldToNewFunctions;
}

export function fixCustomFunctionExpr(
  oldToNewFunctions: Map<CustomFunction, CustomFunction | undefined>,
  expr: CustomFunctionExpr | undefined | null
) {
  // Empty function, we can't do anything
  if (!expr?.func) {
    return expr;
  }

  if (oldToNewFunctions.has(expr.func)) {
    const newFunc = oldToNewFunctions.get(expr.func);
    if (!newFunc) {
      // The function has been deleted, so this expr should be removed
      return null;
    } else {
      expr.func = newFunc;
      expr.args = withoutNils(
        expr.args.map((arg) => {
          const newArgType = newFunc.params.find(
            (param) => param.argName === arg.argType.argName
          );
          if (!newArgType) {
            return null;
          }
          arg.argType = newArgType;
          return arg;
        })
      );
    }
  }
  return expr;
}

export function fixCustomFunctionsInTpl(
  oldToNewFunctions: Map<CustomFunction, CustomFunction | undefined>,
  tpl: TplNode
) {
  for (const { expr } of findExprsInNode(tpl)) {
    if (isKnownEventHandler(expr)) {
      for (const interaction of expr.interactions) {
        for (const arg of [...interaction.args]) {
          if (isKnownCustomFunctionExpr(arg.expr)) {
            const fixedExpr = fixCustomFunctionExpr(
              oldToNewFunctions,
              arg.expr
            );
            if (fixedExpr) {
              arg.expr = fixedExpr;
            } else {
              arrayRemove(interaction.args, arg);
            }
          }
        }
      }
    }
  }
}

/**
 * A plain-object snapshot of a StatefulQueryResult's data/error. The `data` getter on
 * StatefulQueryResult throws the suspense promise while loading and the rejection error
 * when errored. We use `safeExecResult` to map those into plain fields, treating the
 * suspense promise as "not an error": loading query = `{ data: undefined, error: undefined }`
 */
export interface UnwrappedQueryResult {
  /** Resolved data, or undefined while loading/errored. */
  data: unknown;
  /** Real rejection error, otherwse undefined. */
  error: unknown;
}

export function unwrapStatefulQueryResult(
  result: PlasmicQueryResult
): UnwrappedQueryResult {
  const r = safeExecResult(() => result.data);
  return {
    data: "data" in r ? r.data : undefined,
    error: "error" in r ? r.error : undefined,
  };
}

export const _testonly = { getCustomCodeFactory };
