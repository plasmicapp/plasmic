import {
  ComponentServerQuery,
  CustomFunctionExpr,
} from "@/wab/shared/model/classes";

export type ServerQueryWithOperation = ComponentServerQuery & {
  op: CustomFunctionExpr;
};

export function isServerQueryWithOperation(
  query: ComponentServerQuery
): query is ServerQueryWithOperation {
  return !!query.op;
}
