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
import {
  CustomFunction,
  CustomFunctionExpr,
  ProjectDependency,
  TplNode,
  isKnownCustomFunctionExpr,
  isKnownEventHandler,
} from "@/wab/shared/model/classes";
import type { PlasmicQueryResult } from "@plasmicapp/data-sources";
import { SWRResponse } from "@plasmicapp/query";
import {
  _StatefulQueryResult as StatefulQueryResult,
  _StatefulQueryState as StatefulQueryState,
  unstable_createDollarQueries as createDollarQueries,
  unstable_usePlasmicQueries as usePlasmicQueries,
} from "@plasmicapp/react-web/lib/data-sources";
import { groupBy } from "lodash";
import React from "react";

export {
  _StatefulQueryResult as StatefulQueryResult,
  type _StatefulQueryState as StatefulQueryState,
} from "@plasmicapp/react-web/lib/data-sources";

export interface CustomFunctionOpResult<T> {
  queryState: StatefulQueryState<T>;
  swrResponse: SWRResponse<T>;
}

export function useCustomFunctionOp(
  fnId: string,
  fn: (...args: any[]) => any,
  expr: CustomFunctionExpr | undefined,
  env: Record<string, any> | undefined,
  exprCtx: ExprCtx,
  currGlobalThis?: typeof globalThis
): CustomFunctionOpResult<unknown> {
  // Using the fnId as the queryId since query object may not be created yet.
  const $queries = React.useMemo(() => createDollarQueries([fnId]), [fnId]);
  const queries = React.useMemo(() => {
    return {
      [fnId]: {
        id: fnId,
        fn,
        execParams: () =>
          expr
            ? getCustomFunctionParams(expr, env, exprCtx, currGlobalThis)
            : [],
      },
    };
  }, [fnId, fn, expr, env, exprCtx, currGlobalThis]);
  const { [fnId]: swrResponse } = usePlasmicQueries($queries, queries);

  // $query is a mutable object and will not trigger React updates as normal,
  // so we secretly use the internal state which is guaranteed to be change.
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
export interface UnwrappedQueryResult extends PlasmicQueryResult {
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
    key: result.key,
    isLoading: result.isLoading,
    data,
    error,
  };
}
