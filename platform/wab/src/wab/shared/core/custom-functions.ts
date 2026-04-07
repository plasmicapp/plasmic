import { customFunctionId } from "@/wab/shared/code-components/code-components";
import { arrayRemove } from "@/wab/shared/collections";
import { swallow, withoutNils } from "@/wab/shared/common";
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
import type { PlasmicQueryResult } from "@plasmicapp/data-sources";
import { SWRResponse } from "@plasmicapp/query";
import {
  _StatefulQueryResult as StatefulQueryResult,
  _StatefulQueryState as StatefulQueryState,
  unstable_createDollarQueries as createDollarQueries,
  unstable_usePlasmicQueries as usePlasmicQueries,
} from "@plasmicapp/react-web/lib/data-sources";
import { groupBy, pickBy } from "lodash";
import React from "react";

export {
  _StatefulQueryResult as StatefulQueryResult,
  type _StatefulQueryState as StatefulQueryState,
} from "@plasmicapp/react-web/lib/data-sources";

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
  swrResponse: SWRResponse<T>;
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
  const queries = React.useMemo(() => {
    if (args) {
      if (isCustomCodeOpArgs(args)) {
        const code = args.code.code;
        const codeId = `${fnId}:${code}`;
        const fn = buildCustomCodeFn(code, args.env);
        return {
          [fnId]: {
            id: codeId,
            fn,
            execParams: () => [],
          },
        };
      } else {
        const { fn, expr, env, exprCtx, currGlobalThis } = args;
        return {
          [fnId]: {
            id: fnId,
            fn,
            execParams: () =>
              getCustomFunctionParams(expr, env, exprCtx, currGlobalThis),
          },
        };
      }
    } else {
      return {
        [fnId]: {
          id: fnId,
          fn: noopFn,
          execParams: () => [],
        },
      };
    }
  }, [
    fnId,
    args && isCustomCodeOpArgs(args) ? args.code.code : undefined,
    args && !isCustomCodeOpArgs(args) ? args.fn : undefined,
    args && !isCustomCodeOpArgs(args) ? args.expr : undefined,
    args?.env,
    args && !isCustomCodeOpArgs(args) ? args.exprCtx : undefined,
    args && !isCustomCodeOpArgs(args) ? args.currGlobalThis : undefined,
  ]);

  // Even if no args are present, we still need to run the hooks to obey
  // React hook rules, but we will ignore the results and return undefined.
  const $queries = React.useMemo(() => createDollarQueries([fnId]), [fnId]);
  const swrResponses = usePlasmicQueries($queries, queries);
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
    swrResponse: swrResponses[fnId],
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
        return (
          swallow(
            () =>
              tryEvalExpr(
                getRawCode(clonedExpr, exprCtx),
                env ?? {},
                currGlobalThis
              )?.val
          ) ?? undefined
        );
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
