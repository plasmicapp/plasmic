import { customFunctionId } from "@/wab/shared/code-components/code-components";
import {
  DynamicExprCode,
  ServerComponentNode,
  ServerNode,
  ServerQueryTree,
} from "@/wab/shared/codegen/react-p/server-queries/types";
import { ServerQueryWithOperation } from "@/wab/shared/codegen/react-p/server-queries/utils";
import { serializeStateSpecs } from "@/wab/shared/codegen/react-p/states";
import { SerializerBaseContext } from "@/wab/shared/codegen/react-p/types";
import { jsLiteral, toVarName } from "@/wab/shared/codegen/util";
import {
  ExprCtx,
  asCode,
  stripParens,
  stripParensAndMaybeConvertToIife,
} from "@/wab/shared/core/exprs";
import { parseCodeExpression } from "@/wab/shared/eval/expression-parser";
import {
  CustomCode,
  CustomFunctionExpr,
  isKnownCustomCode,
} from "@/wab/shared/model/classes";
import { convertToFunction } from "@/wab/shared/parser-utils";
import { groupBy } from "lodash";

/**
 * Wraps a DynamicExprCode string in a ContextFn arrow function.
 * If scopedItemVars are provided, they are destructured from ctx.$scopedItemVars.
 *
 * Example:
 *   makeContextFn("$props.userId", []) → "({ $q, $props, $ctx, $state }) => ($props.userId)"
 *   makeContextFn("currentItem", ["currentItem", "currentIndex"])
 *     → "({ $q, $props, $ctx, $state, $scopedItemVars: { currentItem, currentIndex } }) => (currentItem)"
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
 *   makeArgsFn(["$props.url"], []) → "({ $q, $props, $ctx, $state }) => [$props.url]"
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
  ctx: SerializerBaseContext
): string {
  return serializeComponentNode(tree.rootNode, ctx, []);
}

/**
 * Serializes just root-level queries as a component node JS code string.
 * Used for page metadata generation (no child component queries needed).
 */
export function serializeRootComponentQueries(
  queries: ServerQueryWithOperation[],
  ctx: SerializerBaseContext
): string {
  const hasStates = ctx.component.states.some(
    (state) => !state.tplNode || !ctx.fakeTpls.includes(state.tplNode)
  );
  const stateSpecs = hasStates ? serializeStateSpecs(ctx.component, ctx) : "[]";
  const queriesEntries = queries
    .map(
      (q) => `${toVarName(q.name)}: ${serializeServerQuery(q, ctx.exprCtx, [])}`
    )
    .join(", ");
  return `{
  type: "component",
  queries: { ${queriesEntries} },
  propsContext: {},
  stateSpecs: ${stateSpecs},
  children: [],
}`;
}

function serializeComponentNode(
  node: ServerComponentNode,
  ctx: SerializerBaseContext,
  scopedItemVars: string[]
): string {
  const { exprCtx } = ctx;
  const queriesEntries = node.queries
    .map(
      (q) =>
        `${toVarName(q.name)}: ${serializeServerQuery(
          q,
          exprCtx,
          scopedItemVars
        )}`
    )
    .join(", ");
  const propsEntries = Object.entries(node.propsContext)
    .map(([k, v]) => `${jsLiteral(k)}: ${makeContextFn(v, scopedItemVars)}`)
    .join(", ");
  const childrenStr = node.children
    .map((c) => serializeServerNode(c, ctx, scopedItemVars))
    .join(", ");
  const hasStates = node.states.some(
    (state) => !state.tplNode || !ctx.fakeTpls.includes(state.tplNode)
  );
  const stateSpecsCode = hasStates
    ? serializeStateSpecs(node.component, ctx)
    : "[]";
  return `{
  type: "component",
  queries: { ${queriesEntries} },
  stateSpecs: ${stateSpecsCode},
  propsContext: { ${propsEntries} },
  children: [${childrenStr}],
}`;
}

function serializeServerNode(
  node: ServerNode,
  ctx: SerializerBaseContext,
  scopedItemVars: string[]
): string {
  const { type } = node;
  switch (type) {
    case "component":
      return serializeComponentNode(node, ctx, scopedItemVars);
    case "codeComponent": {
      const propsEntries = Object.entries(node.propsContext)
        .map(([k, v]) => `${jsLiteral(k)}: ${makeContextFn(v, scopedItemVars)}`)
        .join(", ");
      const childrenStr = node.children
        .map((c) => serializeServerNode(c, ctx, scopedItemVars))
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
        .map((c) => serializeServerNode(c, ctx, scopedItemVars))
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
        .map((c) => serializeServerNode(c, ctx, scopedItemVars))
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
        .map((c) => serializeServerNode(c, ctx, childScopedVars))
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
  scopedItemVars: string[]
): string {
  if (isKnownCustomCode(query.op)) {
    return serializeCustomCode(query.uuid, query.op, scopedItemVars);
  } else {
    return serializeCustomFunctionExpr(query.op, exprCtx, scopedItemVars);
  }
}

function serializeCustomCode(
  queryUuid: string,
  op: CustomCode,
  scopedItemVars: string[]
): string {
  const { usedDollarVarKeys } = parseCodeExpression(stripParens(op.code));

  const paramList =
    scopedItemVars.length > 0
      ? `{ $q, $props, $ctx, $state, $scopedItemVars: { ${scopedItemVars.join(
          ", "
        )} } }`
      : `{ $q, $props, $ctx, $state }`;

  // $q and $state may be references to `StatefulQueryResult.data` which throws
  // `PlasmicUndefinedDataErrorPromise` to indicate it's blocked.
  // Therefore, we need to explicitly access `$q.queryName.data` for queries
  // and `$state.referencesQuery` for states.
  const $qDeps = [...usedDollarVarKeys.$q];
  const $qAccessLines = $qDeps.map((k) => `    $q[${jsLiteral(k)}].data;`);
  const $stateDeps = [...usedDollarVarKeys.$state];
  // Access the most-specific path, e.g. `$state.tpl.input` over `$state.tpl`.
  const $statePaths = $stateDeps.filter(
    (path) => !$stateDeps.some((other) => other.startsWith(path + "."))
  );
  const $stateAccessLines = $statePaths.map(
    (p) =>
      `    $state${p
        .split(".")
        .map((seg) => `[${JSON.stringify(seg)}]`)
        .join("")};`
  );
  const $allAccessLines = [...$qAccessLines, ...$stateAccessLines];

  // Filter each $ variable to only referenced keys so the cache key depends
  // only on values the code actually uses.
  // filter("$q") -> `{ "greeting": $q["greeting"], }` or `{}`
  // Dotted $state paths (e.g. "user.name") collapse to top-level key "user".
  // There is an equivalent runtime version of this logic in canvas-rendering
  const filter = (varName: "$ctx" | "$props" | "$q" | "$state") => {
    const topLevelKeys = [
      ...new Set([...usedDollarVarKeys[varName]].map((k) => k.split(".")[0])),
    ];
    if (topLevelKeys.length === 0) {
      return "{}";
    }
    const entries = topLevelKeys.map((k) => {
      const key = jsLiteral(k);
      return `        ${key}: ${varName}[${key}]`;
    });
    return `{\n${entries.join(",\n")},\n      }`;
  };
  const argsReturn = `{
      $ctx: ${filter("$ctx")},
      $props: ${filter("$props")},
      $q: ${filter("$q")},
      $state: ${filter("$state")},
    }`;
  const argsCode = `(${paramList}) => {\n${
    $allAccessLines.length > 0 ? $allAccessLines.join("\n") + "\n" : ""
  }    return [${argsReturn}];\n  }`;
  return `{
  id: ${jsLiteral(`custom:${queryUuid}`)},
  fn: ${convertToFunction(
    stripParens(op.code),
    "{ $q, $props, $ctx, $state }"
  )},
  args: ${argsCode},
}`;
}

function serializeCustomFunctionExpr(
  op: CustomFunctionExpr,
  exprCtx: ExprCtx,
  scopedItemVars: string[]
): string {
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
