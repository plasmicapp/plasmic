import {
  BranchId,
  CommitGraph,
  CommitParentGraph,
  PkgVersionId,
  ProjectId,
} from "@/wab/shared/ApiSchema";
import {
  ancestors,
  getLowestCommonAncestor,
  leaves,
  subgraph,
} from "@/wab/shared/site-diffs/commit-graph";

const projectId = "projectId" as ProjectId;

const parentGraph = {
  "1": [],
  "2": ["1"],
  "3": ["1"],
  "4": ["2"],
  "5": ["4", "3"],
  "6": ["5", "4"],
  "7": ["4"],
  "8": ["7"],
  "9": ["5", "8"],
} as CommitParentGraph;

const commitGraph = {
  // One branch for each commit in the parentGraph
  branches: Object.fromEntries(
    Object.keys(parentGraph).map((key) => [key, key])
  ),
  parents: parentGraph,
} as CommitGraph;

describe("commit-graph", () => {
  describe("ancestors", () => {
    it("should return the list of ancestors for a given node", () => {
      expect(ancestors(parentGraph, "1" as PkgVersionId)).toEqual(["1"]);
      expect(ancestors(parentGraph, "2" as PkgVersionId)).toEqual(["2", "1"]);
      expect(ancestors(parentGraph, "3" as PkgVersionId)).toEqual(["3", "1"]);
      expect(ancestors(parentGraph, "5" as PkgVersionId)).toEqual([
        "5",
        "4",
        "2",
        "1",
        "3",
      ]);
      expect(ancestors(parentGraph, "6" as PkgVersionId)).toEqual([
        "6",
        "5",
        "4",
        "2",
        "1",
        "3",
      ]);
      expect(ancestors(parentGraph, "8" as PkgVersionId)).toEqual([
        "8",
        "7",
        "4",
        "2",
        "1",
      ]);
    });
  });

  describe("subgraph", () => {
    it("should filter a graph based on a set of nodes", () => {
      expect(
        subgraph(parentGraph, ["1", "2", "3", "4"] as PkgVersionId[])
      ).toEqual({
        "1": [],
        "2": ["1"],
        "3": ["1"],
        "4": ["2"],
      });

      expect(
        subgraph(parentGraph, ["5", "6", "7", "8"] as PkgVersionId[])
      ).toEqual({
        "5": [],
        "6": ["5"],
        "7": [],
        "8": ["7"],
      });

      expect(subgraph(parentGraph, ["1", "5", "9"] as PkgVersionId[])).toEqual({
        "1": [],
        "5": [],
        "9": ["5"],
      });
    });
  });

  describe("leaves", () => {
    it("should return nodes without ancestors in a graph", () => {
      expect(leaves(parentGraph)).toEqual(["6", "9"]);

      expect(
        leaves(subgraph(parentGraph, ["1", "2", "3", "4"] as PkgVersionId[]))
      ).toEqual(["3", "4"]);

      expect(
        leaves(subgraph(parentGraph, ["5", "6", "7", "8"] as PkgVersionId[]))
      ).toEqual(["6", "8"]);
    });
  });

  describe("getLowestCommonAncestor", () => {
    it("should return the toPkgVersionId for single commit merges", () => {
      expect(
        getLowestCommonAncestor(
          projectId,
          commitGraph,
          "2" as BranchId,
          "1" as BranchId
        )
      ).toEqual("1");

      expect(
        getLowestCommonAncestor(
          projectId,
          commitGraph,
          "3" as BranchId,
          "1" as BranchId
        )
      ).toEqual("1");

      expect(
        getLowestCommonAncestor(
          projectId,
          commitGraph,
          "4" as BranchId,
          "2" as BranchId
        )
      ).toEqual("2");

      expect(
        getLowestCommonAncestor(
          projectId,
          commitGraph,
          "5" as BranchId,
          "4" as BranchId
        )
      ).toEqual("4");

      expect(
        getLowestCommonAncestor(
          projectId,
          commitGraph,
          "5" as BranchId,
          "3" as BranchId
        )
      ).toEqual("3");
    });

    it("should return ancestors to handle parallel commits", () => {
      expect(
        getLowestCommonAncestor(
          projectId,
          commitGraph,
          "7" as BranchId,
          "5" as BranchId
        )
      ).toEqual("4");

      expect(
        getLowestCommonAncestor(
          projectId,
          commitGraph,
          "8" as BranchId,
          "6" as BranchId
        )
      ).toEqual("4");

      expect(
        getLowestCommonAncestor(
          projectId,
          commitGraph,
          "9" as BranchId,
          "6" as BranchId
        )
      ).toEqual("5");

      expect(
        getLowestCommonAncestor(
          projectId,
          commitGraph,
          "9" as BranchId,
          "5" as BranchId
        )
      ).toEqual("5");
    });
  });
});
