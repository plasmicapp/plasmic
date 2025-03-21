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
import { countBy, intersection } from "lodash";

/** Return all unique ancestors start from given node. */
export function ancestors(
  graph: CommitParentGraph,
  node: PkgVersionId
): PkgVersionId[] {
  const result: PkgVersionId[] = [];
  const stack: PkgVersionId[] = [node];
  const seen = new Set<PkgVersionId>();
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (seen.has(current)) {
      continue;
    }
    seen.add(current);
    result.push(current);
    for (const parent of [...graph[current]].reverse()) {
      stack.push(parent);
    }
  }
  return result;
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
