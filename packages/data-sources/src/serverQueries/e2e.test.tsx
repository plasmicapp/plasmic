/**
 * @vitest-environment jsdom
 */

import { render } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { _testonly } from "./client";
import { executePlasmicQueries } from "./server";
import {
  asyncFuncCalls,
  expectQueryResolved,
  findAsyncFuncCall,
} from "./testonly/test-common";
import {
  TestComponent,
  TestProvider,
  testPermutations,
} from "./testonly/test-queries";

const { GLOBAL_CACHE } = _testonly;

describe("executePlasmicQuery -> usePlasmicQueries", () => {
  let unmount: () => void;
  let container: HTMLElement;
  let expectedAsyncFuncCalls: number;

  beforeEach(() => {
    asyncFuncCalls.length = 0;
    expectedAsyncFuncCalls = 0;
    GLOBAL_CACHE.clear();
  });

  afterEach(async () => {
    expect(container.innerHTML).toContain(`[suspense count: 0]`);

    unmount();

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(
      asyncFuncCalls.length,
      `actual calls:\n\t${asyncFuncCalls.map((c) => c.args).join("\n\t")}\n`
    ).toEqual(expectedAsyncFuncCalls);
    expect(
      GLOBAL_CACHE.size,
      `actual cache:\n\t${[...GLOBAL_CACHE.entries()].join("\n\t")}\n`
    ).toEqual(0);
  });

  testPermutations.forEach(({ name, create$Queries, createQueries }) => {
    describe(`permutation: ${name}`, () => {
      it("resolves if all queries resolve", async () => {
        const server$queries = create$Queries();
        const serverQueryDataPromise = executePlasmicQueries(
          server$queries,
          createQueries({}, server$queries)
        );
        await vi.waitFor(() => expect(asyncFuncCalls).toHaveLength(2));
        findAsyncFuncCall("dep1-param").resolve("dep1-server-done");
        findAsyncFuncCall("dep2-param").resolve("dep2-server-done");
        await vi.waitFor(() => expect(asyncFuncCalls).toHaveLength(3));
        findAsyncFuncCall("dep3-param").resolve("dep3-server-done");
        await vi.waitFor(() => expect(asyncFuncCalls).toHaveLength(4));
        findAsyncFuncCall("result-param").resolve("result-server-done");
        await vi.waitFor(() =>
          expectQueryResolved(server$queries.dep1, "dep1-server-done")
        );
        expectQueryResolved(server$queries.dep2, "dep2-server-done");
        expectQueryResolved(server$queries.dep3, "dep3-server-done");
        expectQueryResolved(server$queries.result, "result-server-done");
        const serverQueryData = await serverQueryDataPromise;

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

        expect(container.innerHTML).not.toContain("TestProvider SUSPENDED");
        expect(container.innerHTML).toContain("result-server-done");

        expectedAsyncFuncCalls = 4;
      });
    });
  });
});
