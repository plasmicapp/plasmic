import { tuple } from "@/wab/shared/common";
import { CommitParentGraph, PkgVersionId } from "@/wab/shared/ApiSchema";
import { countBy, uniq } from "lodash";

/** Return all unique ancestors start from given node. */
export function ancestors(
  graph: CommitParentGraph,
  node: PkgVersionId,
  // The first call creates the cache, and the recursive
  // calls re-use the same map to avoid computing the same
  // value multiple times for the same parent (which could
  // result in an exponential runtime)
  memoizedValues = new Map<PkgVersionId, PkgVersionId[]>()
): PkgVersionId[] {
  const cached = memoizedValues.get(node);
  if (cached) {
    return cached;
  }
  const res = uniq([
    node,
    ...graph[node].flatMap((parent) =>
      // Pass the `memoizedValues` in the recursive calls
      ancestors(graph, parent, memoizedValues)
    ),
  ]);
  memoizedValues.set(node, res);
  return res;
}

/** Return the graph filtered to only the specified nodes. */
export function subgraph(
  graph: CommitParentGraph,
  nodesToKeep: PkgVersionId[]
): CommitParentGraph {
  const nodesToKeepSet = new Set(nodesToKeep);
  return Object.fromEntries(
    nodesToKeep.map((node) =>
      tuple(
        node,
        graph[node].filter((parent) => nodesToKeepSet.has(parent))
      )
    )
  );
}

/** Return all nodes that have no children. */
export function leaves(graph: CommitParentGraph) {
  const numChildren = countBy(
    Object.values(graph).flatMap((parents) => parents)
  );
  return Object.keys(graph).filter(
    (node) => (numChildren[node] ?? 0) === 0
  ) as PkgVersionId[];
}
