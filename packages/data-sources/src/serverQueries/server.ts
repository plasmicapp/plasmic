import {
  assertUnexpectedNodeType,
  resolveParams,
  safeExecResult,
  StatefulQueryResult,
} from "./common";
import { makeQueryCacheKey } from "./makeQueryCacheKey";
import {
  ExecutePlasmicQueriesResult,
  PlasmicQuery,
  PlasmicQueryResult,
  QueryCodeComponentNode,
  QueryComponentNode,
  QueryDataProviderNode,
  QueryExecutionContext,
  QueryExecutionInitialContext,
  QueryNode,
  QueryRepeatedNode,
  QueryVisibilityNode,
} from "./types";

interface DiscoveredQuery {
  $query: StatefulQueryResult;
  query: PlasmicQuery;
}

const ROOT_COMPONENT_KEY_PATH = "root";

function appendKeyPath(currentKeyPath: string, currentInput: string): string {
  return currentKeyPath ? `${currentKeyPath}/${currentInput}` : currentInput;
}

function executeQueryTree(
  rootNode: QueryComponentNode,
  options: QueryExecutionInitialContext,
  queriesByComponent: Map<string, Record<string, StatefulQueryResult>>
): DiscoveredQuery[] {
  const { $props, $ctx } = options;

  const initialContext: QueryExecutionContext = {
    $props,
    $ctx,
    $state: {},
    $q: {} as Record<string, StatefulQueryResult>,
    $scopedItemVars: {},
  };

  return executeComponentNode(rootNode, {
    context: initialContext,
    parentKeyPath: "",
    childIndex: 0,
    queriesByComponent,
  });
}

interface ExecuteNodeParams {
  context: QueryExecutionContext;
  parentKeyPath: string;
  childIndex: number;
  queriesByComponent: Map<string, Record<string, StatefulQueryResult>>;
}

type NodeType = QueryNode["type"];

type ExecuteNodeParamsByType = {
  [K in NodeType]: {
    node: Extract<QueryNode, { type: K }>;
    params: ExecuteNodeParams;
    type: K;
  };
}[NodeType];

function executeNode(
  node: QueryNode,
  params: ExecuteNodeParams
): DiscoveredQuery[] {
  const p = { node, params, type: node.type } as ExecuteNodeParamsByType;
  switch (p.type) {
    case "component":
      return executeComponentNode(p.node, p.params);
    case "codeComponent":
      return executeCodeComponentNode(p.node, p.params);
    case "dataProvider":
      return executeDataProviderNode(p.node, p.params);
    case "visibility":
      return executeVisibilityNode(p.node, p.params);
    case "repeated":
      return executeRepeatedNode(p.node, p.params);
    default:
      assertUnexpectedNodeType(p);
  }
}

function executeComponentNode(
  node: QueryComponentNode,
  params: ExecuteNodeParams
): DiscoveredQuery[] {
  const {
    context: parentContext,
    parentKeyPath,
    childIndex,
    queriesByComponent,
  } = params;
  const isRoot = parentKeyPath === "";
  let componentKeyPath: string;
  let evaluatedProps: Record<string, unknown>;
  if (isRoot) {
    componentKeyPath = ROOT_COMPONENT_KEY_PATH;
    evaluatedProps = parentContext.$props;
  } else {
    componentKeyPath = appendKeyPath(parentKeyPath, `c${childIndex}`);
    evaluatedProps = {};
    for (const [propName, propFn] of Object.entries(node.propsContext)) {
      const result = safeExecResult(() => propFn(parentContext));
      if (!("data" in result)) {
        return [];
      }

      evaluatedProps[propName] = result.data;
    }
  }

  let componentQueries = queriesByComponent.get(componentKeyPath);
  if (!componentQueries) {
    componentQueries = {};
    queriesByComponent.set(componentKeyPath, componentQueries);
  }

  const componentContext: QueryExecutionContext = {
    $props: evaluatedProps,
    $ctx: parentContext.$ctx,
    $state: parentContext.$state,
    $q: componentQueries,
    $scopedItemVars: parentContext.$scopedItemVars,
  };

  const discovered: DiscoveredQuery[] = [];

  for (const [queryName, query] of Object.entries(node.queries)) {
    if (componentQueries[queryName]) {
      continue;
    }

    const $query = new StatefulQueryResult();
    componentQueries[queryName] = $query;

    const capturedContext = componentContext;
    const capturedArgsFn = query.args;

    const plasmicQuery: PlasmicQuery = {
      id: query.id,
      fn: query.fn,
      execParams: () => capturedArgsFn(capturedContext),
    };

    discovered.push({ $query, query: plasmicQuery });
  }

  node.children.forEach((child, idx) => {
    discovered.push(
      ...executeNode(child, {
        context: componentContext,
        parentKeyPath: componentKeyPath,
        childIndex: idx,
        queriesByComponent,
      })
    );
  });

  return discovered;
}

function executeCodeComponentNode(
  node: QueryCodeComponentNode,
  params: ExecuteNodeParams
): DiscoveredQuery[] {
  if (node.serverRenderingConfig === false) {
    return [];
  }

  const { context, parentKeyPath, childIndex, queriesByComponent } = params;
  const nodeKeyPath = appendKeyPath(parentKeyPath, `cc${childIndex}`);

  const evaluatedProps: Record<string, unknown> = {};
  for (const [propName, propFn] of Object.entries(node.propsContext)) {
    const result = safeExecResult(() => propFn(context));
    if ("data" in result) {
      evaluatedProps[propName] = result.data;
    } else {
      return [];
    }
  }

  const childContext: QueryExecutionContext = {
    $props: evaluatedProps,
    $ctx: context.$ctx,
    $state: context.$state,
    $q: context.$q,
    $scopedItemVars: context.$scopedItemVars,
  };

  return node.children.flatMap((child, idx) =>
    executeNode(child, {
      context: childContext,
      parentKeyPath: nodeKeyPath,
      childIndex: idx,
      queriesByComponent,
    })
  );
}

function executeDataProviderNode(
  node: QueryDataProviderNode,
  params: ExecuteNodeParams
): DiscoveredQuery[] {
  const { context, parentKeyPath, childIndex, queriesByComponent } = params;

  const nodeKeyPath = appendKeyPath(parentKeyPath, `dp${childIndex}`);
  const dataResult = safeExecResult(() => node.data(context));
  if (!("data" in dataResult)) {
    return [];
  }

  const childContext: QueryExecutionContext = {
    $props: context.$props,
    $ctx: {
      ...context.$ctx,
      [node.name]: dataResult.data,
    },
    $state: context.$state,
    $q: context.$q,
    $scopedItemVars: context.$scopedItemVars,
  };

  return node.children.flatMap((child, idx) =>
    executeNode(child, {
      context: childContext,
      parentKeyPath: nodeKeyPath,
      childIndex: idx,
      queriesByComponent,
    })
  );
}

function executeVisibilityNode(
  node: QueryVisibilityNode,
  params: ExecuteNodeParams
): DiscoveredQuery[] {
  const { context, parentKeyPath, childIndex, queriesByComponent } = params;
  const nodeKeyPath = appendKeyPath(parentKeyPath, `v${childIndex}`);
  const visibilityResult = safeExecResult(() => node.visibilityExpr(context));
  if (!("data" in visibilityResult) || !visibilityResult.data) {
    return [];
  }

  return node.children.flatMap((child, idx) =>
    executeNode(child, {
      context,
      parentKeyPath: nodeKeyPath,
      childIndex: idx,
      queriesByComponent,
    })
  );
}

function executeRepeatedNode(
  node: QueryRepeatedNode,
  params: ExecuteNodeParams
): DiscoveredQuery[] {
  const { context, parentKeyPath, childIndex, queriesByComponent } = params;
  const nodeKeyPath = appendKeyPath(parentKeyPath, `r${childIndex}`);
  const collectionResult = safeExecResult(() => node.collectionExpr(context));
  if (!("data" in collectionResult) || !Array.isArray(collectionResult.data)) {
    return [];
  }

  return collectionResult.data.flatMap((item, index) => {
    const itemContext: QueryExecutionContext = {
      $props: context.$props,
      $ctx: context.$ctx,
      $state: context.$state,
      $q: context.$q,
      $scopedItemVars: {
        ...context.$scopedItemVars,
        [node.itemName]: item,
        [node.indexName]: index,
      },
    };

    const itemKeyPath = appendKeyPath(nodeKeyPath, `i${index}`);

    return node.children.flatMap((child, idx) =>
      executeNode(child, {
        context: itemContext,
        parentKeyPath: itemKeyPath,
        childIndex: idx,
        queriesByComponent,
      })
    );
  });
}

/**
 * Executes all queries from a serialized component tree and returns query results.
 *
 * 1. Walk the tree to discover queries, creating StatefulQueryResult + PlasmicQuery
 * 2. Execute all newly discovered queries in parallel
 * 3. After all settle, re-walk. Discover queries from newly expanded repeated nodes
 * Continue until no new queries found.
 */
export async function executePlasmicQueries(
  rootNode: QueryComponentNode,
  options: QueryExecutionInitialContext
): Promise<ExecutePlasmicQueriesResult> {
  const queriesByComponent = new Map<
    string,
    Record<string, StatefulQueryResult>
  >();

  const discoveredQueries: DiscoveredQuery[] = [];

  while (true) {
    const newQueries = executeQueryTree(rootNode, options, queriesByComponent);

    if (newQueries.length === 0) {
      break;
    }
    discoveredQueries.push(...newQueries);

    await Promise.all(
      newQueries.map((d) =>
        executePlasmicQuery(d.$query, d.query).catch(() => {
          // Errors are stored in the StatefulQueryResult
        })
      )
    );
  }

  const cache: Record<string, unknown> = {};
  for (const d of discoveredQueries) {
    if ("data" in d.$query.current) {
      cache[d.$query.current.key!] = d.$query.current.data;
    }
  }

  const queries: Record<string, PlasmicQueryResult> = {};
  const rootQueries = queriesByComponent.get(ROOT_COMPONENT_KEY_PATH);
  if (rootQueries) {
    for (const [name, $query] of Object.entries(rootQueries)) {
      if ("data" in $query.current) {
        queries[name] = {
          key: $query.key,
          data: $query.current.data,
          isLoading: false,
        };
      }
    }
  }

  for (const d of discoveredQueries) {
    if ("error" in d.$query.current) {
      throw d.$query.current.error;
    }
  }

  return { cache, queries };
}

export async function executePlasmicQuery<T>(
  $query: StatefulQueryResult<T>,
  query: PlasmicQuery<(...args: unknown[]) => Promise<T>>
): Promise<PlasmicQueryResult<T> & { current: { state: "done" } }> {
  if ($query.current.state === "loading" || $query.current.state === "done") {
    return $query.getDoneResult();
  }

  do {
    const paramsResult = resolveParams(query.execParams);
    switch (paramsResult.status) {
      case "blocked": {
        try {
          await paramsResult.promise;
        } catch {
          // The blocked param may error, but for simplicity,
          // we loop and try resolving params again.
        }
        continue;
      }
      case "ready": {
        const cacheKey = makeQueryCacheKey(
          query.id,
          paramsResult.resolvedParams
        );
        $query.loadingPromise(
          cacheKey,
          query.fn(...paramsResult.resolvedParams)
        );
        return $query.getDoneResult();
      }
      case "error": {
        $query.rejectPromise(null, paramsResult.error);
        throw paramsResult.error;
      }
    }
  } while (true);
}
