import { toVarName } from "@/wab/shared/codegen/util";
import { tryEvalExpr } from "@/wab/shared/eval";

export function getDataQueryState(
  env: Record<string, any> | undefined,
  queryName?: string
) {
  return queryName
    ? tryEvalExpr(
        `$queries.${toVarName(queryName)}`,
        env as Record<string, any>
      )
    : undefined;
}
