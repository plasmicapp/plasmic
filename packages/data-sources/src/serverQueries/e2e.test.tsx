/**
 * @vitest-environment jsdom
 */

import { render } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { _testonly } from "./client";
import { QueryComponentNode, executePlasmicQueries } from "./server";
import {
  TestComponent,
  TestProvider,
  create$Queries,
  createQueries,
} from "./testonly/test-queries";

const { GLOBAL_CACHE } = _testonly;

function makeE2ERootNode(
  fn: (...args: unknown[]) => Promise<unknown>
): QueryComponentNode {
  return {
    type: "component",
    queries: {
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
    },
    propsContext: {},
    children: [],
  };
}

describe("executePlasmicQueries -> usePlasmicQueries (e2e)", () => {
  let unmount: () => void;
  let container: HTMLElement;

  beforeEach(() => {
    GLOBAL_CACHE.clear();
  });

  afterEach(() => {
    expect(container.innerHTML).toContain(`[suspense count: 0]`);
    unmount();
  });

  it("server prefetched cache hydrates client-side queries without suspend", async () => {
    // Server-side: execute queries with immediate-resolve functions
    const asyncFunc = async (...args: unknown[]) => `${args[0]}-server-done`;

    const rootNode = makeE2ERootNode(asyncFunc);
    const { cache: serverQueryData } = await executePlasmicQueries(rootNode, {
      $props: {},
      $ctx: {},
    });

    // Verify server produced expected cache
    expect(Object.keys(serverQueryData)).toHaveLength(4);

    // Client-side: render with prefetched cache
    const renderResult = render(
      <TestComponent
        create$Queries={create$Queries}
        createQueries={createQueries}
      />,
      {
        wrapper: ({ children }) => (
          <TestProvider prefetchedCache={serverQueryData}>
            {children}
          </TestProvider>
        ),
      }
    );
    container = renderResult.container;
    unmount = renderResult.unmount;

    // Should not suspend (data is prefetched)
    expect(container.innerHTML).not.toContain("TestProvider SUSPENDED");
  });
});
