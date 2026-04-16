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
  PlasmicQueryResult,
  QueryComponentNode,
} from "@plasmicapp/data-sources";
import {
  _StatefulQueryResult as StatefulQueryResult,
  _StatefulQueryState as StatefulQueryState,
  makeQueryCacheKey,
  unstable_usePlasmicQueries as usePlasmicQueries,
} from "@plasmicapp/data-sources";
import type { SWRResponse } from "@plasmicapp/query";
import { usePlasmicDataConfig } from "@plasmicapp/query";
import { groupBy, pickBy } from "lodash";
import React from "react";

export {
  _StatefulQueryResult as StatefulQueryResult,
  type _StatefulQueryState as StatefulQueryState,
} from "@plasmicapp/data-sources";

interface CustomFunctionOpArgs {
  fnId: string;
  fn: (...args: any[]) => any;
  expr: CustomFunctionExpr;
  env: Record<string, any> | undefined;
  exprCtx: ExprCtx;
  currGlobalThis?: typeof globalThis;
}

export interface CustomCodeOpArgs {
  fnId: string;
  code: CustomCode;
  env: Record<string, any> | undefined;
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
      key === "$q" ||
      key === "$ctx" ||
      key === "$dataTokens" ||
      key === "$$" ||
      // depending on whether the env is at display or evaluation stage, we may receive either stored or displayable data tokens
      key.startsWith("$dataTokens_")
  );
}

export function buildCustomCodeFn(
  code: string,
  rawEnv: Record<string, any> | undefined
): () => Promise<unknown> {
  const env = getEnvForPlasmicQueries(rawEnv ?? {});
  const envKeys = Object.keys(env);
  let fn: Function;
  try {
    fn = new Function(...envKeys, `return (${convertToFunction(code)})()`);
  } catch (err) {
    console.warn("Failed to compile custom code query:", err);
    return () => Promise.reject(err);
  }
  return () => {
    try {
      const envValues = Object.values(env);
      return fn(...envValues);
    } catch (err) {
      console.warn("Failed to execute custom code query:", err);
      return Promise.reject(err);
    }
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
  const env = args?.env;
  const exprCtx = args && !isCustomCodeOpArgs(args) ? args.exprCtx : undefined;
  const currGlobalThis =
    args && !isCustomCodeOpArgs(args) ? args.currGlobalThis : undefined;
  const code = args && isCustomCodeOpArgs(args) ? args.code : undefined;

  const { mutate } = usePlasmicDataConfig();
  const rootProps = env?.$props ?? {};
  const rootCtx = env?.$ctx ?? {};
  const rootState = env?.$state as Record<string, unknown> | undefined;
  const envRef = React.useRef(env);
  envRef.current = env;

  const queryTree = React.useMemo(
    (): QueryComponentNode =>
      code
        ? {
            type: "component",
            queries: {
              [fnId]: {
                id: `${fnId}:${code.code}`,
                // Rebuild with current env on each invocation so env changes are reflected
                fn: () => buildCustomCodeFn(code.code, envRef.current)(),
                args: () => [],
              },
            },
            propsContext: {},
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
            children: [],
          },
    [fnId, fn, expr, exprCtx, currGlobalThis, code]
  );
  // Even if no args are present, we still need to run the hooks to obey
  // React hook rules, but we will ignore the results and return undefined.
  const $queries = usePlasmicQueries(queryTree, rootProps, rootCtx, rootState);
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
          if (
            (result.err as any)?.plasmicType !== "PlasmicUndefinedDataError"
          ) {
            throw new Error(
              `Failed to evaluate query parameter "${param.argName}": ${
                (result.err as Error).message ?? String(result.err)
              }`
            );
          }
          return undefined;
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
