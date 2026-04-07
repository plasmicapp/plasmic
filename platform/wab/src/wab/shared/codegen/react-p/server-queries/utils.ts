import { toVarName } from "@/wab/shared/codegen/util";
import { parseCodeExpression } from "@/wab/shared/eval/expression-parser";
import type {
  Component,
  ComponentServerQuery,
  CustomCode,
  CustomFunctionExpr,
} from "@/wab/shared/model/classes";
import { isKnownCustomCode } from "@/wab/shared/model/classes";

export type ServerQueryOp = CustomFunctionExpr | CustomCode;

export type ServerQueryWithOperation = ComponentServerQuery & {
  op: ServerQueryOp;
};

export function isServerQueryWithOperation(
  query: ComponentServerQuery
): query is ServerQueryWithOperation {
  return !!query.op;
}

/**
 * Returns the varNames of other server queries that a custom code
 * server query depends on.
 * @param query The custom code server query to analyze
 * @param component The component containing all server queries
 * @returns varNames of dependent queries, or empty if op is not CustomCode
 */
export function getReferencedQueryNamesInCustomCode(
  query: ServerQueryWithOperation,
  component: Component
): string[] {
  if (!isKnownCustomCode(query.op)) {
    return [];
  }
  const referencedQueries = parseCodeExpression(query.op.code).usedDollarVarKeys
    .$q;
  return component.serverQueries
    .filter(
      (q) =>
        q.uuid !== query.uuid &&
        isServerQueryWithOperation(q) &&
        referencedQueries.has(toVarName(q.name))
    )
    .map((q) => toVarName(q.name));
}
