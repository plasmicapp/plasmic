import {
  BranchId,
  CommitGraph,
  CommitParentGraph,
  MainBranchId,
  PkgVersionId,
  ProjectId,
} from "@/wab/shared/ApiSchema";
import { tuple } from "@/wab/shared/common";
import { captureMessage } from "@sentry/node";
import { countBy, intersection, uniq } from "lodash";

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

export function getLowestCommonAncestor(
  projectId: ProjectId,
  graph: CommitGraph,
  fromBranchId?: BranchId,
  toBranchId?: BranchId,
  fromPkgVersionId?: PkgVersionId,
  toPkgVersionId?: PkgVersionId
) {
  // Lowest common ancestors algorithm - find the "best" merge-base.
  // From https://git-scm.com/docs/git-merge-base: One common ancestor is better than another common ancestor if the latter is an ancestor of the former.
  const fromAncestors = ancestors(
    graph.parents,
    fromPkgVersionId ?? graph.branches[fromBranchId ?? MainBranchId]
  );
  const toAncestors = ancestors(
    graph.parents,
    toPkgVersionId ?? graph.branches[toBranchId ?? MainBranchId]
  );
  const commonAncestors = intersection(fromAncestors, toAncestors);
  const ancestorsSubgraph = subgraph(graph.parents, commonAncestors);
  const lowestCommonAncestors = leaves(ancestorsSubgraph);

  // If there are multiple LCAs, log a warning.
  if (lowestCommonAncestors.length > 1) {
    captureMessage(
      "Warning: multiple merge-bases (lowest common ancestors) found",
      {
        extra: {
          projectId,
          fromBranchId,
          toBranchId,
          graph,
          lowestCommonAncestors,
        },
      }
    );
  }

  // Choose an arbitrary LCA (not sure if this is the right behavior, need to research git some more, but anyway this is not possible for now given the operations we allow in the UI).
  const [lowestCommonAncestor] = lowestCommonAncestors;

  return lowestCommonAncestor;
}
