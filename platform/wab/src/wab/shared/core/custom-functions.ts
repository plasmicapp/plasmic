import { customFunctionId } from "@/wab/shared/code-components/code-components";
import { arrayRemove } from "@/wab/shared/collections";
import { withoutNils } from "@/wab/shared/common";
import {
  ExprCtx,
  clone,
  getRawCode,
  isFallbackSet,
} from "@/wab/shared/core/exprs";
import { findExprsInNode } from "@/wab/shared/core/tpls";
import { tryEvalExpr } from "@/wab/shared/eval";
import { parseCodeExpression } from "@/wab/shared/eval/expression-parser";
import { noopFn } from "@/wab/shared/functions";
import {
  CustomCode,
  CustomFunction,
  CustomFunctionExpr,
  ProjectDependency,
  TplNode,
  isKnownCustomCode,
  isKnownCustomFunctionExpr,
  isKnownEventHandler,
} from "@/wab/shared/model/classes";
import { convertToFunction } from "@/wab/shared/parser-utils";
import type {
  PlasmicQuery,
  PlasmicQueryResult,
  QueryComponentNode,
  QueryExecutionContext,
} from "@plasmicapp/data-sources";
import {
  _StatefulQueryResult as StatefulQueryResult,
  _StatefulQueryState as StatefulQueryState,
  makeQueryCacheKey,
  throwIfPlasmicUndefinedDataError,
  unstable_usePlasmicQueries as usePlasmicQueries,
} from "@plasmicapp/data-sources";
import type { SWRResponse } from "@plasmicapp/query";
import { usePlasmicDataConfig } from "@plasmicapp/query";
import { groupBy, pick, pickBy } from "lodash";
import { computedFn } from "mobx-utils";
import React from "react";

export {
  _StatefulQueryResult as StatefulQueryResult,
  type _StatefulQueryState as StatefulQueryState,
} from "@plasmicapp/data-sources";

interface CustomFunctionOpArgs {
  fnId: string;
  fn: (...args: any[]) => any;
  expr: CustomFunctionExpr;
  env: Record<string, any>;
  exprCtx: ExprCtx;
  currGlobalThis?: typeof globalThis;
}

export interface CustomCodeOpArgs {
  fnId: string;
  code: CustomCode;
  env: Record<string, any>;
}

export type ServerQueryOpArgs = CustomFunctionOpArgs | CustomCodeOpArgs;

export interface ServerQueryOpResult<T> {
  queryState: StatefulQueryState<T>;
  swrResponse: Pick<SWRResponse<T>, "mutate">;
}

function isCustomCodeOpArgs(args: ServerQueryOpArgs): args is CustomCodeOpArgs {
  return "code" in args && isKnownCustomCode(args.code);
}

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
    id: `${queryId}:${code}`,
    fn: buildCustomCodeFn(code, getRawEnv),
    args: buildCustomCodeArgs(code, getRawEnv),
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
      return (${convertToFunction(code)})();
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
  const { usedDollarVarKeys } = parseCodeExpression(code);
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

const NOOP_ID = "__noop__";

/** Runs a server query op (CustomFunctionExpr or CustomCode). */
export function useServerQueryOp(
  args: ServerQueryOpArgs
): ServerQueryOpResult<unknown>;
export function useServerQueryOp(args: undefined): undefined;
export function useServerQueryOp(
  args: ServerQueryOpArgs | undefined
): ServerQueryOpResult<unknown> | undefined;
export function useServerQueryOp(
  args: ServerQueryOpArgs | undefined
): ServerQueryOpResult<unknown> | undefined {
  const fnId = args?.fnId ?? NOOP_ID;
  const fn = args && !isCustomCodeOpArgs(args) ? args.fn : noopFn;
  const expr = args && !isCustomCodeOpArgs(args) ? args.expr : undefined;
  const env = args?.env ?? {};
  const exprCtx = args && !isCustomCodeOpArgs(args) ? args.exprCtx : undefined;
  const currGlobalThis =
    args && !isCustomCodeOpArgs(args) ? args.currGlobalThis : undefined;
  const code = args && isCustomCodeOpArgs(args) ? args.code : undefined;

  const { mutate } = usePlasmicDataConfig();
  const rootProps = env.$props ?? {};
  const rootCtx = env.$ctx ?? {};
  const rootState: Record<string, unknown> | null = env.$state ?? null;
  const envRef = React.useRef(env);
  envRef.current = env;

  const queryTree = React.useMemo(
    (): QueryComponentNode =>
      code
        ? {
            type: "component",
            queries: {
              [fnId]: buildCustomCodePlasmicQuery(
                fnId,
                code.code,
                () => envRef.current
              ),
            },
            propsContext: {},
            stateSpecs: [],
            children: [],
          }
        : {
            type: "component",
            queries: {
              [fnId]: {
                id: fnId,
                fn,
                args: ({ $q, $props, $ctx, $state }) =>
                  expr
                    ? getCustomFunctionParams(
                        expr,
                        {
                          ...(envRef.current ?? {}),
                          $q: { ...(envRef.current?.$q ?? {}), ...$q },
                          $props,
                          $ctx,
                          $state,
                        },
                        exprCtx!,
                        currGlobalThis
                      )
                    : [],
              },
            },
            propsContext: {},
            stateSpecs: [],
            children: [],
          },
    [fnId, fn, expr, exprCtx, currGlobalThis, code]
  );
  // Even if no args are present, we still need to run the hooks to obey
  // React hook rules, but we will ignore the results and return undefined.
  const $queries = usePlasmicQueries(queryTree, rootCtx, rootProps, rootState);
  const swrResponse = React.useMemo(
    () => ({
      mutate: async () => {
        const params = expr
          ? getCustomFunctionParams(
              expr,
              {
                ...(envRef.current ?? {}),
                $q: { ...(envRef.current?.$q ?? {}), ...$queries },
                $props: rootProps,
                $ctx: rootCtx,
              },
              exprCtx!,
              currGlobalThis
            )
          : [];
        return mutate(makeQueryCacheKey(fnId, params));
      },
    }),
    [rootProps, rootCtx, expr, exprCtx, fnId, mutate, $queries, currGlobalThis]
  );

  if (fnId === NOOP_ID) {
    return undefined;
  }

  // $query is a mutable object and will not trigger React updates as normal,
  // so we secretly use the internal state which is guaranteed to change.
  const $query = $queries[fnId];
  const queryState = ($query as StatefulQueryResult)
    .current as StatefulQueryState;
  return {
    queryState,
    swrResponse,
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
 * A plain-object snapshot of a StatefulQueryResult. Unlike StatefulQueryResult,
 * this is safe to compare by value — the `data` getter on StatefulQueryResult
 * throws (for Suspense/error-boundary semantics), so we catch and surface the
 * thrown value as `error` instead, making all fields readable without side effects.
 */
export interface UnwrappedQueryResult extends Omit<PlasmicQueryResult, "key"> {
  error: unknown;
}

export function unwrapStatefulQueryResult(
  result: StatefulQueryResult
): UnwrappedQueryResult {
  let data: unknown = undefined;
  let error: unknown = undefined;
  try {
    data = result.data;
  } catch (e) {
    error = e;
  }
  return {
    isLoading: result.isLoading,
    data,
    error,
  };
}

export const _testonly = { getCustomCodeFactory };
