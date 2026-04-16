import { Bundle } from "@/wab/shared/bundler";
import _advancedBundle from "@/wab/shared/codegen/react-p/server-queries/__tests__/bundles/advanced-component-server-queries.json";
import _simpleBundle from "@/wab/shared/codegen/react-p/server-queries/__tests__/bundles/simple-component-server-queries.json";
import { collectComponentServerQueries } from "@/wab/shared/codegen/react-p/server-queries/collect";
import { serializeServerQueryTree } from "@/wab/shared/codegen/react-p/server-queries/serialize-tree";
import {
  ServerNode,
  ServerQueryTree,
  ServerRepeatedContextNode,
  ServerVisibilityContextNode,
} from "@/wab/shared/codegen/react-p/server-queries/types";
import { ServerQueryWithOperation } from "@/wab/shared/codegen/react-p/server-queries/utils";
import { ExprCtx } from "@/wab/shared/core/exprs";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { Component, Site } from "@/wab/shared/model/classes";
import { generateSiteFromBundle } from "@/wab/shared/tests/site-tests-utils";

function findInServerNode(node: ServerNode, visitor: (n: ServerNode) => void) {
  const stack = [node];
  while (stack.length) {
    const n = stack.pop() as ServerNode;
    visitor(n);
    stack.push(...n.children);
  }
}

export function findAllServerQueries(
  node: ServerNode
): ServerQueryWithOperation[] {
  const queries: ServerQueryWithOperation[] = [];

  findInServerNode(node, (n: ServerNode) => {
    if (n.type === "component") {
      queries.push(...n.queries);
    }
  });
  return queries;
}

/**
 * Checks if a server node tree has any server queries.
 */
export function hasServerQueries(tree: ServerQueryTree): boolean {
  return findAllServerQueries(tree.rootNode).length > 0;
}

export function findAllRepeatedContexts(
  node: ServerNode
): ServerRepeatedContextNode[] {
  const contexts: ServerRepeatedContextNode[] = [];

  findInServerNode(node, (n: ServerNode) => {
    if (n.type === "repeated") {
      contexts.push(n);
    }
  });
  return contexts;
}

function findTestComponent(site: Site): Component {
  const component = site.components.find((c) => c.name === "TestPage");
  expect(component).toBeDefined();
  return component as Component;
}

function findAllVisibilityNodes(
  node: ServerNode
): ServerVisibilityContextNode[] {
  const result: ServerVisibilityContextNode[] = [];
  const stack = [node];
  while (stack.length) {
    const n = stack.pop() as ServerNode;
    if (n.type === "visibility") {
      result.push(n);
    }
    stack.push(...n.children);
  }
  return result;
}

describe("Component server queries", () => {
  const exprCtx: ExprCtx = {
    component: null,
    projectFlags: DEVFLAGS,
    inStudio: false,
  };

  describe("collectComponentServerQueries for simple component instance", () => {
    const site = generateSiteFromBundle(_simpleBundle as [string, Bundle][]);

    it("should find static page and component queries", () => {
      const component = findTestComponent(site);
      const tree = collectComponentServerQueries({ site, component, exprCtx });

      expect(hasServerQueries(tree)).toBe(true);
      const allQueries = findAllServerQueries(tree.rootNode);

      // Page has one query
      expect(tree.rootNode.queries).toHaveLength(1);
      expect(tree.rootNode.queries[0].name).toBe("query");

      // Page + component has two queries
      expect(allQueries[0].name).toBe("query");
      expect(allQueries[1].name).toBe("cmpQuery");
    });
  });

  describe("collectComponentServerQueries for dynamic component queries", () => {
    const site = generateSiteFromBundle(_advancedBundle as [string, Bundle][]);

    it("should find page queries, repeated component query, and nested Ship queries", () => {
      const component = findTestComponent(site);

      const tree = collectComponentServerQueries({ site, component, exprCtx });

      expect(hasServerQueries(tree)).toBe(true);
      const allQueries = findAllServerQueries(tree.rootNode);

      // Page has two queries: films (fetches list) and dep (depends on films result)
      expect(tree.rootNode.queries).toHaveLength(2);
      expect(tree.rootNode.queries[0].name).toBe("films");
      expect(tree.rootNode.queries[1].name).toBe("dep");

      // Traversal order (DFS via stack, LIFO):
      // TestPage (films, dep) → visibilityNode → ExtraData (extra) → repeatedNode → Film (mainCharacter) → Ship (firstShip, firstPilot)
      expect(allQueries).toHaveLength(6);
      expect(allQueries[0].name).toBe("films");
      expect(allQueries[1].name).toBe("dep");
      expect(allQueries[2].name).toBe("extra");
      expect(allQueries[3].name).toBe("mainCharacter");
      expect(allQueries[4].name).toBe("firstShip");
      expect(allQueries[5].name).toBe("firstPilot");
    });

    it("should detect repeated context wrapping the Film component", () => {
      const component = findTestComponent(site);
      const tree = collectComponentServerQueries({ site, component, exprCtx });

      const repeatedContexts = findAllRepeatedContexts(tree.rootNode);

      // Should have one repeated context (div iterating over films)
      expect(repeatedContexts).toHaveLength(1);
      expect(repeatedContexts[0].itemName).toBe("currentItem");
      expect(repeatedContexts[0].indexName).toBe("currentIndex");
    });

    it("should detect visibility nodes: one on TestPage (ExtraData) and one in Film (Ship)", () => {
      const component = findTestComponent(site);
      const tree = collectComponentServerQueries({ site, component, exprCtx });

      const visibilityNodes = findAllVisibilityNodes(tree.rootNode);

      // Two visibility nodes: TestPage wraps ExtraData, Film wraps Ship
      expect(visibilityNodes).toHaveLength(2);
      // Both should wrap a single component node
      for (const node of visibilityNodes) {
        expect(node.children).toHaveLength(1);
        expect(node.children[0].type).toBe("component");
      }
      // TestPage's visibility node is in the page's direct children
      const pageVisibilityNode = tree.rootNode.children.find(
        (c) => c.type === "visibility"
      );
      expect(pageVisibilityNode).toBeDefined();
    });

    it("should find Ship component nested inside Film (under visibility node) with two queries", () => {
      const component = findTestComponent(site);
      const tree = collectComponentServerQueries({ site, component, exprCtx });

      // Film is inside a repeated node; find it
      const repeatedNode = findAllRepeatedContexts(tree.rootNode)[0];
      expect(repeatedNode.children).toHaveLength(1);

      const filmNode = repeatedNode.children[0];
      expect(filmNode.type).toBe("component");
      if (filmNode.type !== "component") {
        return;
      }
      expect(filmNode.queries[0].name).toBe("mainCharacter");

      // Film's Ship instance is wrapped in a visibility node (conditional on mainCharacter data)
      expect(filmNode.children).toHaveLength(1);
      const filmVisibilityNode = filmNode.children[0];
      expect(filmVisibilityNode.type).toBe("visibility");
      if (filmVisibilityNode.type !== "visibility") {
        return;
      }

      const shipNode = filmVisibilityNode.children[0];
      expect(shipNode.type).toBe("component");
      if (shipNode.type !== "component") {
        return;
      }

      // Ship has two queries; firstPilot depends on firstShip
      expect(shipNode.queries).toHaveLength(2);
      expect(shipNode.queries[0].name).toBe("firstShip");
      expect(shipNode.queries[1].name).toBe("firstPilot");
    });
  });

  describe("end-to-end: collect → serialize (JS code check)", () => {
    const advancedSite = generateSiteFromBundle(
      _advancedBundle as [string, Bundle][]
    );

    it("should serialize with fn as direct JS reference and args as function", () => {
      const component = findTestComponent(advancedSite);

      const tree = collectComponentServerQueries({
        site: advancedSite,
        component,
        exprCtx,
      });

      const serializedCode = serializeServerQueryTree(tree, exprCtx);

      // The serialized output should be JS code
      expect(serializedCode).toContain("fn: $$.fetch");
      // args should be a function expression
      expect(serializedCode).toContain("args: ({ $q, $props, $ctx, $state })");
      // Should have a repeated node
      expect(serializedCode).toContain('type: "repeated"');
      // collectionExpr should be a function
      expect(serializedCode).toContain(
        "collectionExpr: ({ $q, $props, $ctx, $state })"
      );
      // Children of repeated nodes should destructure item vars
      expect(serializedCode).toContain("{ currentItem, currentIndex }");
      // Should have a visibility node for the ExtraData conditional section
      expect(serializedCode).toContain('type: "visibility"');
    });
  });
});
