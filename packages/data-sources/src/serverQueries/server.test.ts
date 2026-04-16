/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { noopFn } from "../utils";
import { executePlasmicQueries } from "./server";
import { ContextFn, QueryComponentNode } from "./types";

const asyncFunc = async (...args: unknown[]) => `${args[0]}-done`;

function makeTestRootNodeWithFn(
  fn: (...args: unknown[]) => Promise<unknown>,
  queryOrder: string[]
): QueryComponentNode {
  const allQueries: Record<
    string,
    {
      id: string;
      fn: (...args: unknown[]) => Promise<unknown>;
      args: ContextFn<unknown[]>;
    }
  > = {
    dep1: { id: "depFn", fn, args: () => ["dep1-param"] },
    dep2: { id: "depFn", fn, args: () => ["dep2-param"] },
    dep3: {
      id: "depFn",
      fn,
      args: ({ $q }) => ["dep3-param", $q.dep1.data, $q.dep2.data],
    },
    result: {
      id: "resultFn",
      fn,
      args: ({ $q }) => ["result-param", $q.dep3.data],
    },
  };
  return {
    type: "component",
    queries: Object.fromEntries(
      queryOrder.map((key) => [key, allQueries[key]])
    ),
    propsContext: {},
    children: [],
  };
}

const testPermutations = [
  { name: "topDown", order: ["result", "dep3", "dep2", "dep1"] },
  { name: "bottomUp", order: ["dep1", "dep2", "dep3", "result"] },
  { name: "mixed", order: ["dep2", "result", "dep1", "dep3"] },
];

describe("executePlasmicQueries (flat-style via tree)", () => {
  testPermutations.forEach(({ name, order }) => {
    describe(`permutation: ${name} ${order.join(", ")}`, () => {
      it("resolves if all queries resolve", async () => {
        const rootNode = makeTestRootNodeWithFn(asyncFunc, order);
        const result = await executePlasmicQueries(rootNode, {
          $props: {},
          $ctx: {},
        });
        expect(result.cache).toEqual({
          'depFn:["dep1-param"]': "dep1-param-done",
          'depFn:["dep2-param"]': "dep2-param-done",
          'depFn:["dep3-param","dep1-param-done","dep2-param-done"]':
            "dep3-param-done",
          'resultFn:["result-param","dep3-param-done"]': "result-param-done",
        });
      });

      it("resolves zero/falsy values as valid data", async () => {
        const resolveMap: Record<string, unknown> = {
          "dep1-param": null,
          "dep2-param": false,
          "dep3-param": 0,
          "result-param": "",
        };
        const zeroAsyncFunc = async (...args: unknown[]) =>
          resolveMap[args[0] as string];
        const rootNode = makeTestRootNodeWithFn(zeroAsyncFunc, order);
        const result = await executePlasmicQueries(rootNode, {
          $props: {},
          $ctx: {},
        });
        expect(result.cache).toEqual({
          'depFn:["dep1-param"]': null,
          'depFn:["dep2-param"]': false,
          'depFn:["dep3-param",null,false]': 0,
          'resultFn:["result-param",0]': "",
        });
      });

      it("rejects if any query rejects", async () => {
        const failingFunc = async (...args: unknown[]) => {
          if (args[0] === "dep2-param") {
            throw new Error("dep2-fail");
          }
          return `${args[0]}-done`;
        };
        const rootNode = makeTestRootNodeWithFn(failingFunc, order);
        const queryData = executePlasmicQueries(rootNode, {
          $props: {},
          $ctx: {},
        });
        queryData.catch(noopFn);
        await expect(queryData).rejects.toThrowError();
      });
    });
  });
});

describe("executePlasmicQueries (tree)", () => {
  it("executes queries using $props", async () => {
    const fetchUser = async (userId: unknown) => ({ userId });

    const rootNode: QueryComponentNode = {
      type: "component",
      queries: {
        userQuery: {
          id: "fetchUser",
          fn: fetchUser,
          args: ({ $props }) => [$props.userId],
        },
      },
      propsContext: {},
      children: [],
    };

    const result = await executePlasmicQueries(rootNode, {
      $props: { userId: 456 },
      $ctx: {},
    });

    expect(Object.values(result.cache)[0]).toEqual({ userId: 456 });
  });

  it("handles dependent queries and exposes results in the queries field", async () => {
    const getList = async () => ["a", "b", "c"];
    const getItem = async (list: unknown) => ({
      count: (list as string[]).length,
    });

    const rootNode: QueryComponentNode = {
      type: "component",
      queries: {
        list: { id: "getList", fn: getList, args: () => [] },
        item: { id: "getItem", fn: getItem, args: ({ $q }) => [$q.list.data] },
      },
      propsContext: {},
      children: [],
    };

    const { cache, queries } = await executePlasmicQueries(rootNode, {
      $props: {},
      $ctx: {},
    });

    expect(Object.keys(cache)).toHaveLength(2);
    expect(queries.list).toEqual({
      key: "getList:[]",
      data: ["a", "b", "c"],
      isLoading: false,
    });
    expect(queries.item).toEqual({
      key: 'getItem:[["a","b","c"]]',
      data: { count: 3 },
      isLoading: false,
    });
  });

  it("handles visibility conditions (static false hides children; query-dependent triggers multi-round discovery)", async () => {
    // Static case: permanently false visibility skips all children.
    const fetchConditional = async () => ({ data: "conditional" });
    const staticNode: QueryComponentNode = {
      type: "component",
      queries: {},
      propsContext: {},
      children: [
        {
          type: "visibility",
          visibilityExpr: () => false,
          children: [
            {
              type: "component",
              queries: {
                skipped: {
                  id: "fetchConditional",
                  fn: fetchConditional,
                  args: () => [],
                },
              },
              propsContext: {},
              children: [],
            },
          ],
        },
      ],
    };
    const resultHidden = await executePlasmicQueries(staticNode, {
      $props: {},
      $ctx: {},
    });
    expect(Object.keys(resultHidden.cache)).toHaveLength(0);

    // Query-dependent case: round 1 treats children as hidden (query unsettled →
    // visibilityExpr blocked → false); round 2 reveals them once query resolves.
    const checkVisibility = async () => true;
    const queryNode: QueryComponentNode = {
      type: "component",
      queries: {
        visCheck: {
          id: "checkVisibility",
          fn: checkVisibility,
          args: () => [],
        },
      },
      propsContext: {},
      children: [
        {
          type: "visibility",
          visibilityExpr: ({ $q }) => $q.visCheck.data === true,
          children: [
            {
              type: "component",
              queries: {
                conditionalQuery: {
                  id: "fetchConditional",
                  fn: fetchConditional,
                  args: () => [],
                },
              },
              propsContext: {},
              children: [],
            },
          ],
        },
      ],
    };
    const resultVisible = await executePlasmicQueries(queryNode, {
      $props: {},
      $ctx: {},
    });
    // visCheck (round 1) + conditionalQuery (round 2) = 2
    expect(Object.keys(resultVisible.cache)).toHaveLength(2);
  });

  it("handles repeated elements with static collection", async () => {
    const fetchItem = async (id: unknown) => ({
      id,
      name: `Item ${id}`,
    });

    const rootNode: QueryComponentNode = {
      type: "component",
      queries: {},
      propsContext: {},
      children: [
        {
          type: "repeated",
          collectionExpr: ({ $props }) => $props.items as unknown[],
          itemName: "currentItem",
          indexName: "currentIndex",
          children: [
            {
              type: "component",
              queries: {
                itemQuery: {
                  id: "fetchItem",
                  fn: fetchItem,
                  args: ({ $props }) => [($props.currentItem as any).id],
                },
              },
              propsContext: {
                currentItem: ({ $scopedItemVars }) =>
                  $scopedItemVars.currentItem,
              },
              children: [],
            },
          ],
        },
      ],
    };

    const result = await executePlasmicQueries(rootNode, {
      $props: { items: [{ id: 1 }, { id: 2 }, { id: 3 }] },
      $ctx: {},
    });

    expect(Object.keys(result.cache)).toHaveLength(3);
  });

  it("handles repeated elements with query-dependent collection and nested dependent queries", async () => {
    // Collection depends on a root query (triggers multi-round tree walk).
    // Each child component also has an intra-component dependency (summary depends on character).
    const getFilms = async () => [
      { title: "Film A", characterUrl: "/char/1" },
      { title: "Film B", characterUrl: "/char/2" },
    ];
    const getCharacter = async (url: unknown) => ({
      name: `Character from ${url}`,
    });
    const getSummary = async (char: unknown) => ({
      upper: (char as any).name.toUpperCase(),
    });

    const rootNode: QueryComponentNode = {
      type: "component",
      queries: {
        films: { id: "getFilms", fn: getFilms, args: () => [] },
      },
      propsContext: {},
      children: [
        {
          type: "repeated",
          collectionExpr: ({ $q }) => $q.films.data as unknown[],
          itemName: "currentItem",
          indexName: "currentIndex",
          children: [
            {
              type: "component",
              queries: {
                character: {
                  id: "getCharacter",
                  fn: getCharacter,
                  args: ({ $props }) => [
                    ($props.currentItem as any).characterUrl,
                  ],
                },
                summary: {
                  id: "getSummary",
                  fn: getSummary,
                  args: ({ $q }) => [$q.character.data],
                },
              },
              propsContext: {
                currentItem: ({ $scopedItemVars }) =>
                  $scopedItemVars.currentItem,
              },
              children: [],
            },
          ],
        },
      ],
    };

    const result = await executePlasmicQueries(rootNode, {
      $props: {},
      $ctx: {},
    });

    // films (round 1) + 2 character + 2 summary (round 2) = 5 total
    expect(Object.keys(result.cache)).toHaveLength(5);

    const summaryEntries = Object.entries(result.cache).filter(([k]) =>
      k.startsWith("getSummary")
    );
    expect(summaryEntries).toHaveLength(2);
    expect(summaryEntries.map(([, v]) => v)).toEqual(
      expect.arrayContaining([
        { upper: "CHARACTER FROM /CHAR/1" },
        { upper: "CHARACTER FROM /CHAR/2" },
      ])
    );
  });

  it("handles visibility inside a repeated element (combined traversal)", async () => {
    // Visibility node inside repeated: $scopedItemVars must be available to visibilityExpr.
    const fetchActive = async (id: unknown) => ({ id });

    const rootNode: QueryComponentNode = {
      type: "component",
      queries: {},
      propsContext: {},
      children: [
        {
          type: "repeated",
          collectionExpr: () => [
            { id: 1, active: true },
            { id: 2, active: false },
            { id: 3, active: true },
          ],
          itemName: "item",
          indexName: "itemIdx",
          children: [
            {
              type: "visibility",
              visibilityExpr: ({ $scopedItemVars }) =>
                ($scopedItemVars.item as any).active,
              children: [
                {
                  type: "component",
                  queries: {
                    activeQuery: {
                      id: "fetchActive",
                      fn: fetchActive,
                      args: ({ $props }) => [($props.item as any).id],
                    },
                  },
                  propsContext: {
                    item: ({ $scopedItemVars }) => $scopedItemVars.item,
                  },
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    };

    const result = await executePlasmicQueries(rootNode, {
      $props: {},
      $ctx: {},
    });

    // Only active items (id 1 and id 3) have queries run
    expect(Object.keys(result.cache)).toHaveLength(2);
    expect(Object.values(result.cache)).toEqual(
      expect.arrayContaining([{ id: 1 }, { id: 3 }])
    );
  });

  it("handles data providers", async () => {
    const fetchWithContext = async (val: unknown) => ({
      received: val,
    });

    const rootNode: QueryComponentNode = {
      type: "component",
      queries: {},
      propsContext: {},
      children: [
        {
          type: "dataProvider",
          name: "myData",
          data: () => "provided data",
          children: [
            {
              type: "component",
              queries: {
                contextQuery: {
                  id: "fetchWithContext",
                  fn: fetchWithContext,
                  args: ({ $ctx }) => [$ctx.myData],
                },
              },
              propsContext: {},
              children: [],
            },
          ],
        },
      ],
    };

    const result = await executePlasmicQueries(rootNode, {
      $props: {},
      $ctx: {},
    });

    expect(Object.values(result.cache)[0]).toEqual({
      received: "provided data",
    });
  });

  describe("with component nested and nested dependent queries", () => {
    // nestedFn and nestedDependentFn are captured by the rootNode's fn wrappers below,
    // so reassigning them in a test body takes effect when executePlasmicQueries runs.
    let nestedFn: (...args: unknown[]) => Promise<unknown>;
    let nestedDependentFn: (...args: unknown[]) => Promise<unknown>;
    let rootNode: QueryComponentNode;

    beforeEach(() => {
      nestedFn = async (val: unknown) => ({ nested: val });
      nestedDependentFn = async (nested: unknown) => ({
        dependent: (nested as any).nested,
      });
      rootNode = {
        type: "component",
        queries: {
          firstQuery: {
            id: "fetchFirst",
            fn: async () => ({ first: true }),
            args: () => [],
          },
          secondQuery: {
            id: "fetchSecond",
            fn: async (id: unknown) => ({ second: true, id }),
            args: ({ $props }) => [$props.userId],
          },
        },
        propsContext: {},
        children: [
          {
            type: "component",
            queries: {
              nestedQuery: {
                id: "fetchNested",
                fn: (...args: unknown[]) => nestedFn(...args),
                args: ({ $props }) => [$props.passedProp],
              },
              nestedDependentQuery: {
                id: "fetchNestedDependent",
                fn: (...args: unknown[]) => nestedDependentFn(...args),
                args: ({ $q }) => [$q.nestedQuery.data],
              },
            },
            propsContext: {
              passedProp: ({ $props }) => $props.userId,
            },
            children: [],
          },
        ],
      };
    });

    it("handles multiple queries in the same component and passes props to a child component", async () => {
      const result = await executePlasmicQueries(rootNode, {
        $props: { userId: 999 },
        $ctx: {},
      });

      expect(Object.keys(result.cache)).toHaveLength(4);
      const nestedEntry = Object.entries(result.cache).find(([k]) =>
        k.startsWith("fetchNested:")
      );
      expect(nestedEntry?.[1]).toEqual({ nested: 999 });
      const dependentEntry = Object.entries(result.cache).find(([k]) =>
        k.startsWith("fetchNestedDependent")
      );
      expect(dependentEntry?.[1]).toEqual({ dependent: 999 });
    });

    it("throws an error in nestedDependentQuery", async () => {
      // nestedQuery succeeds and nestedDependentFn IS called with its result,
      // but the fn itself throws — contrasting with when nestedQuery fails and
      // nestedDependentFn's params resolve to an error so its fn is never invoked.
      const nestedDependentError = new Error("nestedDependent-fail");
      const nestedDependentMock = vi
        .fn()
        .mockRejectedValue(nestedDependentError);
      nestedDependentFn = nestedDependentMock;

      await expect(
        executePlasmicQueries(rootNode, { $props: { userId: 999 }, $ctx: {} })
      ).rejects.toBe(nestedDependentError);

      expect(nestedDependentMock).toHaveBeenCalledTimes(1);
      expect(nestedDependentMock).toHaveBeenCalledWith({ nested: 999 });
    });
  });

  it("codeComponent with serverRenderingConfig=false skips all children", async () => {
    const fetchData = async () => ({ data: "should not run" });

    const rootNode: QueryComponentNode = {
      type: "component",
      queries: {},
      propsContext: {},
      children: [
        {
          type: "codeComponent",
          serverRenderingConfig: false,
          propsContext: {},
          children: [
            {
              type: "component",
              queries: {
                skippedQuery: {
                  id: "fetchData",
                  fn: fetchData,
                  args: () => [],
                },
              },
              propsContext: {},
              children: [],
            },
          ],
        },
      ],
    };

    const result = await executePlasmicQueries(rootNode, {
      $props: {},
      $ctx: {},
    });
    expect(Object.keys(result.cache)).toHaveLength(0);
  });

  it("codeComponent passes evaluated propsContext to children", async () => {
    const fetchData = async (val: unknown) => ({ val });

    const rootNode: QueryComponentNode = {
      type: "component",
      queries: {},
      propsContext: {},
      children: [
        {
          type: "codeComponent",
          propsContext: {
            passedProp: ({ $props }) => $props.rootValue,
          },
          children: [
            {
              type: "component",
              queries: {
                childQuery: {
                  id: "fetchData",
                  fn: fetchData,
                  args: ({ $props }) => [$props.propFromCode],
                },
              },
              propsContext: {
                propFromCode: ({ $props }) => $props.passedProp,
              },
              children: [],
            },
          ],
        },
      ],
    };

    const result = await executePlasmicQueries(rootNode, {
      $props: { rootValue: "hello" },
      $ctx: {},
    });

    expect(Object.values(result.cache)[0]).toEqual({ val: "hello" });
  });

  it("queries field contains only root component queries, not child component queries", async () => {
    const rootNode: QueryComponentNode = {
      type: "component",
      queries: {
        rootQuery: {
          id: "getRoot",
          fn: async () => "root-data",
          args: () => [],
        },
      },
      propsContext: {},
      children: [
        {
          type: "component",
          queries: {
            childQuery: {
              id: "getChild",
              fn: async () => "child-data",
              args: () => [],
            },
          },
          propsContext: {},
          children: [],
        },
      ],
    };

    const result = await executePlasmicQueries(rootNode, {
      $props: {},
      $ctx: {},
    });

    expect(Object.keys(result.cache)).toHaveLength(2);
    expect(Object.keys(result.queries)).toEqual(["rootQuery"]);
    expect(result.queries.rootQuery).toMatchObject({
      data: "root-data",
      isLoading: false,
    });
    expect(result.queries["childQuery"]).toBeUndefined();
  });
});
