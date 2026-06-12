import { switchType } from "@/wab/shared/common";
import {
  ComponentServerQuery,
  CustomCode,
  CustomFunction,
  CustomFunctionExpr,
} from "@/wab/shared/model/classes";
import type { Opaque } from "type-fest";

export type CustomFunctionId = Opaque<string, "CustomFunctionId">;

/**
 * The stable id for a custom function: `<namespace>.<importName>`
 */
export function customFunctionId(f: CustomFunction) {
  return `${f.namespace ? f.namespace + "." : ""}${
    f.importName
  }` as CustomFunctionId;
}

/**
 * Query ID for a custom-code data query
 */
export function makeCustomCodeQueryKey(uuid: string): string {
  return `custom-code:${uuid}`;
}

/**
 * Get the cache key id for a server query, used in makeQueryCacheKey to build SWR cache
 * keys (`$q.$.<id>.$.<stableStringify(args)>`). undefined if the query has no operation.
 */
export function serverQueryId(query: ComponentServerQuery): string | undefined {
  const op = query.op;
  if (!op) {
    return undefined;
  }
  return switchType(op)
    .when(CustomCode, () => makeCustomCodeQueryKey(query.uuid))
    .when(CustomFunctionExpr, (expr) => customFunctionId(expr.func))
    .result();
}
