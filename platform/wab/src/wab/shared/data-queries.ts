import { toVarName } from "./codegen/util";
import { tryEvalExpr } from "./eval";

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
