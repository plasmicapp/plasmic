/**
 * @vitest-environment jsdom
 */

import { render } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { _testonly } from "./client";
import { executePlasmicQueries } from "./server";
import {
  TestComponent,
  TestProvider,
  createTestTree,
} from "./testonly/test-queries";

const { GLOBAL_CACHE } = _testonly;

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
    const asyncFunc = async (...args: unknown[]) => `${args[0]}-server-done`;

    const rootNode = createTestTree();
    // Override args to not depend on $q so the server can execute them directly.
    rootNode.queries = {
      dep1: { id: "depFn", fn: asyncFunc, args: () => ["dep1-param"] },
      dep2: { id: "depFn", fn: asyncFunc, args: () => ["dep2-param"] },
      dep3: {
        id: "depFn",
        fn: asyncFunc,
        args: ({ $q }) => ["dep3-param", $q.dep1.data, $q.dep2.data],
      },
      result: {
        id: "resultFn",
        fn: asyncFunc,
        args: ({ $q }) => ["result-param", $q.dep3.data],
      },
    };

    const { cache: serverQueryData } = await executePlasmicQueries(rootNode, {
      $props: {},
      $ctx: {},
    });

    expect(Object.keys(serverQueryData)).toHaveLength(4);

    const renderResult = render(<TestComponent tree={rootNode} />, {
      wrapper: ({ children }) => (
        <TestProvider prefetchedCache={serverQueryData}>
          {children}
        </TestProvider>
      ),
    });
    container = renderResult.container;
    unmount = renderResult.unmount;

    // Should not suspend — all data was prefetched
    expect(container.innerHTML).not.toContain("TestProvider SUSPENDED");
    // asyncFunc returns `${args[0]}-server-done`, so the result query returns "result-param-server-done"
    expect(container.innerHTML).toContain("result-param-server-done");
  });
});
