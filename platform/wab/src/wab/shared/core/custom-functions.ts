import { customFunctionId } from "@/wab/shared/code-components/code-components";
import { arrayRemove } from "@/wab/shared/collections";
import { swallow, withoutNils } from "@/wab/shared/common";
import {
  clone,
  ExprCtx,
  getRawCode,
  isFallbackSet,
} from "@/wab/shared/core/exprs";
import { findExprsInNode } from "@/wab/shared/core/tpls";
import { tryEvalExpr } from "@/wab/shared/eval";
import {
  CustomFunction,
  CustomFunctionExpr,
  isKnownCustomFunctionExpr,
  isKnownEventHandler,
  ProjectDependency,
  TplNode,
} from "@/wab/shared/model/classes";
import {
  executeServerQuery,
  usePlasmicServerQuery,
} from "@plasmicapp/react-web/lib/data-sources";
import { groupBy } from "lodash";

export async function executeCustomFunctionOp(
  fn: (...args: any[]) => any,
  expr: CustomFunctionExpr,
  env: Record<string, any> | undefined,
  exprCtx: ExprCtx,
  currGlobalThis?: typeof globalThis
) {
  try {
    const serverData = await executeServerQuery({
      id: customFunctionId(expr.func),
      fn,
      execParams: () =>
        getCustomFunctionParams(expr, env, exprCtx, currGlobalThis),
    });

    return serverData;
  } catch (err) {
    return { error: err };
  }
}

export function useCustomFunctionOp(
  fn: (...args: any[]) => any,
  expr: CustomFunctionExpr | undefined,
  env: Record<string, any> | undefined,
  exprCtx: ExprCtx,
  currGlobalThis?: typeof globalThis
) {
  return usePlasmicServerQuery(
    {
      id: expr ? customFunctionId(expr.func) : "",
      fn,
      execParams: () =>
        expr ? getCustomFunctionParams(expr, env, exprCtx, currGlobalThis) : [],
    },
    undefined,
    { noUndefinedDataProxy: true }
  );
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
