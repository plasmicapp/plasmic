import { getSlotArgs } from "@/wab/shared/SlotUtils";
import { isBaseVariant } from "@/wab/shared/Variants";
import {
  CodeComponentServerMeta,
  DynamicExprCode,
  ServerCodeComponentNode,
  ServerComponentNode,
  ServerNode,
  ServerQueryCollectionContext,
  ServerQueryTree,
  ServerRepeatedContextNode,
  ServerVisibilityContextNode,
} from "@/wab/shared/codegen/react-p/server-queries/types";
import {
  ServerQueryWithOperation,
  isServerQueryWithOperation,
} from "@/wab/shared/codegen/react-p/server-queries/utils";
import { SerializerBaseContext } from "@/wab/shared/codegen/react-p/types";
import {
  getRepetitionElementName,
  getRepetitionIndexName,
  isCodeComponent,
} from "@/wab/shared/core/components";
import { ExprCtx, getRawCode } from "@/wab/shared/core/exprs";
import { isTplComponent, isTplSlot, isTplTag } from "@/wab/shared/core/tpls";
import {
  Component,
  TplComponent,
  TplNode,
  TplTag,
  isKnownRenderExpr,
} from "@/wab/shared/model/classes";

/**
 * Collect component server queries by traversing the render tree and building a representation
 * of all server queries, data providers, repeated elements, and visibility conditions.
 *
 * Used to execute server queries in non-page components during SSR/SSG.
 * The resulting tree can:
 * 1. Identify all queries that need to be executed
 * 2. Track query dependencies
 * 3. Handle repeated elements
 * 4. Track data provider contexts used in query parameters
 */
export function collectComponentServerQueries(
  params: Pick<SerializerBaseContext, "site" | "component" | "exprCtx">,
  codeComponentMeta?: Map<Component, CodeComponentServerMeta>
): ServerQueryTree {
  const { site, component, exprCtx } = params;
  const componentMap = new Map<string, Component>();
  for (const comp of site.components) {
    componentMap.set(comp.uuid, comp);
  }

  const ctx: ServerQueryCollectionContext = {
    site,
    componentMap,
    codeComponentMeta: codeComponentMeta ?? new Map(),
  };

  const rootNode = collectComponentNode(ctx, component, exprCtx, {});

  return {
    rootComponent: component,
    rootNode,
  };
}

function collectComponentNode(
  ctx: ServerQueryCollectionContext,
  component: Component,
  exprCtx: ExprCtx,
  propsContext: Record<string, DynamicExprCode>
): ServerComponentNode {
  // Get server queries with operations
  const queries = component.serverQueries.filter(
    isServerQueryWithOperation
  ) as ServerQueryWithOperation[];

  // Traverse the component's tpl tree to find children
  const children = collectTplNode(ctx, component.tplTree, exprCtx);

  return {
    type: "component",
    component,
    queries,
    propsContext,
    children,
  };
}

/**
 * Collects server nodes from a TplNode tree.
 */
function collectTplNode(
  ctx: ServerQueryCollectionContext,
  node: TplNode,
  exprCtx: ExprCtx
): ServerNode[] {
  if (isTplTag(node)) {
    return collectTplTag(ctx, node, exprCtx);
  } else if (isTplComponent(node)) {
    return collectTplComponent(ctx, node, exprCtx);
  } else if (isTplSlot(node)) {
    // Slot defaultContents  may contain server queries, so traverse them here.
    const children: ServerNode[] = [];
    for (const child of node.defaultContents) {
      children.push(...collectTplNode(ctx, child, exprCtx));
    }
    return children;
  }
  return [];
}

/**
 * Collects server nodes from a TplTag.
 * Handles visibility conditions and repetition.
 */
function collectTplTag(
  ctx: ServerQueryCollectionContext,
  node: TplTag,
  exprCtx: ExprCtx
): ServerNode[] {
  const baseVs = node.vsettings.find((vs) => isBaseVariant(vs.variants));

  // Collect children first
  let childNodes: ServerNode[] = [];
  for (const child of node.children) {
    childNodes.push(...collectTplNode(ctx, child, exprCtx));
  }
  // Wrap with visibility condition if present
  if (baseVs?.dataCond) {
    const visibilityExpr = getRawCode(baseVs.dataCond, exprCtx);
    if (visibilityExpr !== "true") {
      childNodes = wrapWithVisibility(visibilityExpr, childNodes);
    }
  }
  // Wrap with repetition if present
  if (baseVs?.dataRep) {
    const collectionExpr = getRawCode(baseVs.dataRep.collection, exprCtx);
    const itemName = getRepetitionElementName(baseVs.dataRep);
    const indexName = getRepetitionIndexName(baseVs.dataRep);

    childNodes = wrapWithRepeated(
      collectionExpr,
      itemName,
      indexName,
      childNodes
    );
  }
  return childNodes;
}

/**
 * Collects server nodes from a TplComponent.
 * This is where we recurse into child Plasmic components and handle code components.
 */
function collectTplComponent(
  ctx: ServerQueryCollectionContext,
  node: TplComponent,
  exprCtx: ExprCtx
): ServerNode[] {
  const component = node.component;
  const baseVs = node.vsettings.find((vs) => isBaseVariant(vs.variants));

  const propsContext = extractPropsContext(node, exprCtx);
  const slotChildren = collectSlotContents(ctx, node, exprCtx);

  let resultNodes: ServerNode[];

  if (isCodeComponent(component)) {
    // Handle code components
    resultNodes = collectCodeComponent(
      ctx,
      node,
      propsContext,
      slotChildren,
      exprCtx
    );
  } else {
    // Handle Plasmic components
    const componentNode = collectComponentNode(
      ctx,
      component,
      exprCtx,
      propsContext
    );
    // Merge slot children into the component node's children
    componentNode.children.push(...slotChildren);
    resultNodes = [componentNode];
  }

  // Wrap with visibility condition if present
  if (baseVs?.dataCond) {
    const visibilityExpr = getRawCode(baseVs.dataCond, exprCtx);
    if (visibilityExpr !== "true") {
      resultNodes = wrapWithVisibility(visibilityExpr, resultNodes);
    }
  }
  // Wrap with repetition if present
  if (baseVs?.dataRep) {
    const collectionExpr = getRawCode(baseVs.dataRep.collection, exprCtx);
    const itemName = getRepetitionElementName(baseVs.dataRep);
    const indexName = getRepetitionIndexName(baseVs.dataRep);

    resultNodes = wrapWithRepeated(
      collectionExpr,
      itemName,
      indexName,
      resultNodes
    );
  }
  return resultNodes;
}

/**
 * Collects server nodes for a code component.
 */
function collectCodeComponent(
  ctx: ServerQueryCollectionContext,
  node: TplComponent,
  propsContext: Record<string, DynamicExprCode>,
  slotChildren: ServerNode[],
  _exprCtx: ExprCtx
): ServerNode[] {
  const component = node.component;
  const meta = ctx.codeComponentMeta.get(component);

  const codeComponentNode: ServerCodeComponentNode = {
    type: "codeComponent",
    component,
    propsContext,
    serverRenderingConfig: meta?.serverRendering ?? true,
    children: slotChildren,
  };

  return [codeComponentNode];
}

/**
 * Extracts props passed to a TplComponent as expression code.
 */
function extractPropsContext(
  node: TplComponent,
  exprCtx: ExprCtx
): Record<string, DynamicExprCode> {
  const propsContext: Record<string, DynamicExprCode> = {};

  // Get all variant settings and extract args
  for (const vs of node.vsettings) {
    // Only process base variant for now
    // TODO: Handle conditional props based on variants
    if (!isBaseVariant(vs.variants)) {
      continue;
    }

    // Extract from attrs
    for (const [attrName, expr] of Object.entries(vs.attrs)) {
      try {
        propsContext[attrName] = getRawCode(expr, exprCtx);
      } catch {
        // Some expressions may not be serializable, skip them
      }
    }

    // Extract from args
    for (const arg of vs.args) {
      if (isKnownRenderExpr(arg.expr)) {
        // Render expressions are handled separately as slot contents
        continue;
      }
      try {
        const propName = arg.param.variable.name;
        propsContext[propName] = getRawCode(arg.expr, exprCtx);
      } catch {
        // Some expressions may not be serializable, skip them
      }
    }
  }
  return propsContext;
}

/**
 * Collect server nodes from slot contents of a TplComponent.
 */
function collectSlotContents(
  ctx: ServerQueryCollectionContext,
  node: TplComponent,
  exprCtx: ExprCtx
): ServerNode[] {
  const children: ServerNode[] = [];
  const slotArgs = getSlotArgs(node);

  for (const arg of slotArgs) {
    if (isKnownRenderExpr(arg.expr)) {
      // Collect from each tpl in the slot content
      for (const tpl of arg.expr.tpl) {
        children.push(...collectTplNode(ctx, tpl, exprCtx));
      }
    }
  }

  return children;
}

/**
 * Wraps nodes with a visibility condition.
 */
function wrapWithVisibility(
  visibilityExpr: DynamicExprCode,
  children: ServerNode[]
): ServerNode[] {
  if (children.length === 0) {
    return [];
  }

  const visibilityNode: ServerVisibilityContextNode = {
    type: "visibility",
    visibilityExpr,
    children,
  };
  return [visibilityNode];
}

/**
 * Wraps nodes with a repetition context.
 */
function wrapWithRepeated(
  collectionExpr: DynamicExprCode,
  itemName: string,
  indexName: string,
  children: ServerNode[]
): ServerNode[] {
  if (children.length === 0) {
    return [];
  }

  const repeatedNode: ServerRepeatedContextNode = {
    type: "repeated",
    collectionExpr,
    itemName,
    indexName,
    children,
  };
  return [repeatedNode];
}
