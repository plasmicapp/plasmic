import { swallow } from "@/wab/shared/common";
import {
  clone,
  ExprCtx,
  getRawCode,
  isFallbackSet,
} from "@/wab/shared/core/exprs";
import { tryEvalExpr } from "@/wab/shared/eval";
import { CustomFunctionExpr } from "@/wab/shared/model/classes";
import { CustomFunctionRegistration } from "@plasmicapp/host";
import { groupBy } from "lodash";

export async function executeCustomFunctionOp(
  fn: CustomFunctionRegistration,
  expr: CustomFunctionExpr,
  env: Record<string, any> | undefined,
  exprCtx: ExprCtx,
  globalThis?: any
) {
  const argLits = getCustomFunctionParams(expr, env, exprCtx, globalThis);
  try {
    const serverData = await fn.function(...argLits);

    return serverData;
  } catch (err) {
    return { error: err };
  }
}

export function getCustomFunctionParams(
  expr: CustomFunctionExpr,
  env: Record<string, any> | undefined,
  exprCtx: ExprCtx,
  globalThis?: any
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
                globalThis
              )?.val
          ) ?? undefined
        );
      }
      return undefined;
    }) ?? []
  );
}
