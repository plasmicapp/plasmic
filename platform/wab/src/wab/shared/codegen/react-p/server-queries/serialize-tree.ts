import { customFunctionId } from "@/wab/shared/code-components/code-components";
import {
  DynamicExprCode,
  ServerComponentNode,
  ServerNode,
  ServerQueryTree,
} from "@/wab/shared/codegen/react-p/server-queries/types";
import {
  ServerQueryWithOperation,
  getReferencedQueryNamesInCustomCode,
} from "@/wab/shared/codegen/react-p/server-queries/utils";
import { jsLiteral, toVarName } from "@/wab/shared/codegen/util";
import {
  ExprCtx,
  asCode,
  stripParensAndMaybeConvertToIife,
} from "@/wab/shared/core/exprs";
import { Component, isKnownCustomCode } from "@/wab/shared/model/classes";
import { convertToFunction } from "@/wab/shared/parser-utils";
import { groupBy } from "lodash";

/**
 * Wraps a DynamicExprCode string in a ContextFn arrow function.
 * If scopedItemVars are provided, they are destructured from ctx.$scopedItemVars.
 *
 * Example:
 *   makeContextFn("$props.userId", []) → "({ $props }) => ($props.userId)"
 *   makeContextFn("currentItem", ["currentItem", "currentIndex"])
 *     → "({ $scopedItemVars: { currentItem, currentIndex } }) => (currentItem)"
 */
function makeContextFn(
  exprCode: DynamicExprCode,
  scopedItemVars: string[]
): string {
  if (scopedItemVars.length > 0) {
    return `({ $q, $props, $ctx, $state, $scopedItemVars: { ${scopedItemVars.join(
      ", "
    )} } }) => (${exprCode})`;
  }
  return `({ $q, $props, $ctx, $state }) => (${exprCode})`;
}

/**
 * Wraps an array of DynamicExprCode strings in a ContextFn returning an array.
 *
 * Example:
 *   makeArgsFn(["$props.url"], []) → "({ $props }) => [$props.url]"
 */
function makeArgsFn(argExprs: string[], scopedItemVars: string[]): string {
  if (scopedItemVars.length > 0) {
    return `({ $q, $props, $ctx, $state, $scopedItemVars: { ${scopedItemVars.join(
      ", "
    )} } }) => [${argExprs.join(", ")}]`;
  }
  return `({ $q, $props, $ctx, $state }) => [${argExprs.join(", ")}]`;
}

/**
 * Serializes a ServerQueryTree to JS code for the serverQueryTree function body.
 * Emits fn as a direct function reference (e.g. $$.fetch) and wraps all dynamic
 * expressions in arrow functions.
 */
export function serializeServerQueryTree(
  tree: ServerQueryTree,
  exprCtx: ExprCtx
): string {
  return serializeComponentNode(tree.rootNode, exprCtx, []);
}

/**
 * Serializes just root-level queries as a component node JS code string.
 * Used for page metadata generation (no child component queries needed).
 */
export function serializeRootComponentQueries(
  queries: ServerQueryWithOperation[],
  exprCtx: ExprCtx,
  component?: Component
): string {
  const queriesEntries = queries
    .map(
      (q) =>
        `${toVarName(q.name)}: ${serializeServerQuery(
          q,
          exprCtx,
          [],
          component
        )}`
    )
    .join(", ");
  return `{
  type: "component",
  queries: { ${queriesEntries} },
  propsContext: {},
  children: [],
}`;
}

function serializeComponentNode(
  node: ServerComponentNode,
  exprCtx: ExprCtx,
  scopedItemVars: string[]
): string {
  const queriesEntries = node.queries
    .map(
      (q) =>
        `${toVarName(q.name)}: ${serializeServerQuery(
          q,
          exprCtx,
          scopedItemVars,
          node.component
        )}`
    )
    .join(", ");
  const propsEntries = Object.entries(node.propsContext)
    .map(([k, v]) => `${jsLiteral(k)}: ${makeContextFn(v, scopedItemVars)}`)
    .join(", ");
  const childrenStr = node.children
    .map((c) => serializeServerNode(c, exprCtx, scopedItemVars))
    .join(", ");
  return `{
  type: "component",
  queries: { ${queriesEntries} },
  propsContext: { ${propsEntries} },
  children: [${childrenStr}],
}`;
}

function serializeServerNode(
  node: ServerNode,
  exprCtx: ExprCtx,
  scopedItemVars: string[]
): string {
  const { type } = node;
  switch (type) {
    case "component":
      return serializeComponentNode(node, exprCtx, scopedItemVars);
    case "codeComponent": {
      const propsEntries = Object.entries(node.propsContext)
        .map(([k, v]) => `${jsLiteral(k)}: ${makeContextFn(v, scopedItemVars)}`)
        .join(", ");
      const childrenStr = node.children
        .map((c) => serializeServerNode(c, exprCtx, scopedItemVars))
        .join(", ");
      const configStr =
        node.serverRenderingConfig !== undefined
          ? `\n  serverRenderingConfig: ${node.serverRenderingConfig},`
          : "";
      return `{
  type: "codeComponent",
  propsContext: { ${propsEntries} },${configStr}
  children: [${childrenStr}],
}`;
    }
    case "dataProvider": {
      const { name, data } = node;
      const childrenStr = node.children
        .map((c) => serializeServerNode(c, exprCtx, scopedItemVars))
        .join(", ");
      return `{
  type: "dataProvider",
  name: ${jsLiteral(name)},
  data: ${makeContextFn(data, scopedItemVars)},
  children: [${childrenStr}],
}`;
    }
    case "visibility": {
      const childrenStr = node.children
        .map((c) => serializeServerNode(c, exprCtx, scopedItemVars))
        .join(", ");
      return `{
  type: "visibility",
  visibilityExpr: ${makeContextFn(node.visibilityExpr, scopedItemVars)},
  children: [${childrenStr}],
}`;
    }
    case "repeated": {
      const { itemName, indexName, collectionExpr } = node;
      // collectionExpr is evaluated BEFORE iteration, so it doesn't have the item vars yet
      const childScopedVars = [...scopedItemVars, itemName, indexName];
      const childrenStr = node.children
        .map((c) => serializeServerNode(c, exprCtx, childScopedVars))
        .join(", ");
      return `{
  type: "repeated",
  collectionExpr: ${makeContextFn(collectionExpr, scopedItemVars)},
  itemName: ${jsLiteral(itemName)},
  indexName: ${jsLiteral(indexName)},
  children: [${childrenStr}],
}`;
    }
  }
}

function serializeServerQuery(
  query: ServerQueryWithOperation,
  exprCtx: ExprCtx,
  scopedItemVars: string[],
  component?: Component
): string {
  const { op } = query;

  if (isKnownCustomCode(op)) {
    // fn accepts the full context so the user code can reference $q, $props, $ctx, and $state
    const depNames = component
      ? getReferencedQueryNamesInCustomCode(query, component)
      : [];
    const qEntries = depNames.map(
      (n) =>
        `${JSON.stringify(n)}: { data: $q[${JSON.stringify(
          n
        )}].data, isLoading: false, key: null }`
    );
    const qInner = qEntries.length > 0 ? ` ${qEntries.join(", ")} ` : "";
    const argsBody = `[{ $q: {${qInner}}, $props, $ctx, $state }]`;
    const argsCode =
      scopedItemVars.length > 0
        ? `({ $q, $props, $ctx, $state, $scopedItemVars: { ${scopedItemVars.join(
            ", "
          )} } }) => ${argsBody}`
        : `({ $q, $props, $ctx, $state }) => ${argsBody}`;
    return `{
  id: ${jsLiteral(`custom:${query.uuid}`)},
  fn: ${convertToFunction(op.code, "{ $q, $props, $ctx, $state }")},
  args: ${argsCode},
}`;
  }

  const namespace = op.func.namespace ? `${op.func.namespace}.` : "";
  const fnCode = `$$.${namespace}${op.func.importName}`;
  const id = customFunctionId(op.func);

  const argsMap = groupBy(op.args, (arg) => arg.argType.argName);
  const argExprs = op.func.params.map((param) => {
    const mappedArg = argsMap[param.argName];
    if (!mappedArg) {
      return "undefined";
    }
    return stripParensAndMaybeConvertToIife(
      asCode(mappedArg[0].expr, exprCtx).code
    );
  });
  return `{
  id: ${jsLiteral(id)},
  fn: ${fnCode},
  args: ${makeArgsFn(argExprs, scopedItemVars)},
}`;
}
