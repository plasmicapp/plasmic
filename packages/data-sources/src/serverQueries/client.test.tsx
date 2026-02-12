/**
 * @vitest-environment jsdom
 */

import { usePlasmicDataConfig } from "@plasmicapp/query";
import { act, getByText, render, renderHook } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { _testonly, usePlasmicQueries } from "./client";
import { makeQueryCacheKey } from "./makeQueryCacheKey";
import {
  asyncFuncCalls,
  expectQueryLoading,
  expectQueryResolved,
  findAsyncFuncCall,
} from "./testonly/test-common";
import {
  TestComponent,
  TestProvider,
  TestQueriesProps,
  TestState,
  create$Queries as create$QueriesOrig,
  createQueries as createQueriesOrig,
  expectInitialState,
  runRejectTest,
  runResolveTest,
  runResolveZeroTest,
  testPermutations,
} from "./testonly/test-queries";

const { GLOBAL_CACHE } = _testonly;

describe("usePlasmicQueries", () => {
  let unmount: () => void;
  let expectedAsyncFuncCalls: number;
  let expectedGlobalCacheLeak: number;

  beforeEach(() => {
    asyncFuncCalls.length = 0;
    expectedAsyncFuncCalls = 0;
    expectedGlobalCacheLeak = 0;
    GLOBAL_CACHE.clear();
  });

  afterEach(async () => {
    unmount();

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(
      asyncFuncCalls.length,
      `actual calls:\n\t${asyncFuncCalls.map((c) => c.args).join("\n\t")}\n`
    ).toEqual(expectedAsyncFuncCalls);
    expect(
      GLOBAL_CACHE.size,
      `actual cache:\n\t${[...GLOBAL_CACHE.entries()].join("\n\t")}\n`
    ).toEqual(expectedGlobalCacheLeak);
  });

  describe("test as hook", () => {
    let rerender: (props: TestQueriesProps) => void;
    let state: TestState;

    it("resolves with global shared cache", async () => {
      const renderHookResult = renderHook(
        () => {
          const $queries = React.useMemo(create$QueriesOrig, []);
          const queries = React.useMemo(
            () => createQueriesOrig({}, $queries),
            [$queries]
          );
          usePlasmicQueries($queries, queries);
          return $queries;
        },
        {
          // can only have 1 test like this since it uses global shared cache
          wrapper: undefined,
        }
      );
      state = renderHookResult.result;
      unmount = renderHookResult.unmount;

      await expectInitialState(state);
      await runResolveTest(state);

      expectedAsyncFuncCalls = 4;
    });

    testPermutations.forEach(({ name, create$Queries, createQueries }) => {
      describe(`permutation: ${name}`, () => {
        describe("default queries", () => {
          beforeEach(async () => {
            const renderHookResult = renderHook(
              (props: TestQueriesProps) => {
                const $queries = React.useMemo(create$Queries, []);
                const queries = React.useMemo(() => {
                  return createQueries(props, $queries);
                }, [props, $queries]);
                usePlasmicQueries($queries, queries);
                return $queries;
              },
              {
                wrapper: TestProvider,
              }
            );
            state = renderHookResult.result;
            rerender = renderHookResult.rerender;
            unmount = renderHookResult.unmount;

            await expectInitialState(state);
          });

          it("resolves if all queries resolve", async () => {
            await runResolveTest(state);
            expectedAsyncFuncCalls = 4;
          });

          it("resolves zero values", async () => {
            await runResolveZeroTest(state);
            expectedAsyncFuncCalls = 4;
          });

          it("rejects if any query rejects", async () => {
            await runRejectTest(state);
            expectedAsyncFuncCalls = 2;
          });

          it("reruns queries, with dep1 arg changed and same result", async () => {
            await runResolveTest(state);

            // Change dep1 param
            rerender({
              dep1Args: ["dep1-param-changed"],
            });
            await vi.waitFor(() => expectQueryLoading(state.current.dep1));
            expectQueryResolved(state.current.dep2, "dep2-done");
            expectQueryLoading(state.current.dep3); // blocked on dep1
            expectQueryLoading(state.current.result); // blocked on dep3

            // Resolve dep1 to same result
            await vi.waitFor(() => expect(asyncFuncCalls).toHaveLength(5));
            findAsyncFuncCall("dep1-param-changed").resolve("dep1-done");
            await vi.waitFor(() =>
              expectQueryResolved(state.current.dep1, "dep1-done")
            );
            // Dependent queries see same dep1 result and resolve instantly
            expectQueryResolved(state.current.dep2, "dep2-done");
            expectQueryResolved(state.current.dep3, "dep3-done");
            expectQueryResolved(state.current.result, "result-done");

            expectedAsyncFuncCalls = 5;
          });

          it("reruns queries, with dep2, dep3, and result changed", async () => {
            await runResolveTest(state);

            // Change dep2 param
            rerender({
              dep2Args: ["dep2-param-changed"],
            });
            await vi.waitFor(() => expectQueryLoading(state.current.dep2));
            expectQueryResolved(state.current.dep1, "dep1-done");
            expectQueryLoading(state.current.dep3); // blocked on dep2
            expectQueryLoading(state.current.result); // blocked on dep3

            // Resolve dep2 with changed result
            await vi.waitFor(() => expect(asyncFuncCalls).toHaveLength(5));
            findAsyncFuncCall("dep2-param-changed").resolve(
              "dep2-done-changed"
            );
            await vi.waitFor(() =>
              expectQueryResolved(state.current.dep2, "dep2-done-changed")
            );
            expectQueryResolved(state.current.dep1, "dep1-done");
            expectQueryLoading(state.current.dep3); // loading
            expectQueryLoading(state.current.result); // blocked on dep3

            // Resolve dep3 with changed result
            await vi.waitFor(() => expect(asyncFuncCalls).toHaveLength(6));
            findAsyncFuncCall(
              "dep3-param",
              "dep1-done",
              "dep2-done-changed"
            ).resolve("dep3-done-changed");
            await vi.waitFor(() =>
              expectQueryResolved(state.current.dep3, "dep3-done-changed")
            );
            expectQueryResolved(state.current.dep1, "dep1-done");
            expectQueryResolved(state.current.dep2, "dep2-done-changed");
            expectQueryLoading(state.current.result); // loading

            await vi.waitFor(() => expect(asyncFuncCalls).toHaveLength(7));
            findAsyncFuncCall("result-param", "dep3-done-changed").resolve(
              "result-done-changed"
            );
            await vi.waitFor(() =>
              expectQueryResolved(state.current.result, "result-done-changed")
            );
            expectQueryResolved(state.current.dep1, "dep1-done");
            expectQueryResolved(state.current.dep2, "dep2-done-changed");
            expectQueryResolved(state.current.dep3, "dep3-done-changed");
            expectQueryResolved(state.current.result, "result-done-changed");

            expectedAsyncFuncCalls = 7;
          });
        });

        describe("cached queries", () => {
          it("resolves immediately if cached", async () => {
            const renderHookResult = renderHook(
              () => {
                const $queries = React.useMemo(create$Queries, []);
                const queries = React.useMemo(
                  () => createQueries({}, $queries),
                  [$queries]
                );
                usePlasmicQueries($queries, queries);
                return $queries;
              },
              {
                wrapper: ({ children }) => (
                  <TestProvider
                    prefetchedCache={{
                      [makeQueryCacheKey("depFn", ["dep1-param"])]:
                        "dep1-cached",
                      [makeQueryCacheKey("depFn", ["dep2-param"])]:
                        "dep2-cached",
                      [makeQueryCacheKey("depFn", [
                        "dep3-param",
                        "dep1-cached",
                        "dep2-cached",
                      ])]: "dep3-cached",
                      [makeQueryCacheKey("resultFn", [
                        "result-param",
                        "dep3-cached",
                      ])]: "result-cached",
                    }}
                  >
                    {children}
                  </TestProvider>
                ),
              }
            );
            state = renderHookResult.result;
            unmount = renderHookResult.unmount;

            expect(asyncFuncCalls).toHaveLength(0);
            expectQueryResolved(state.current.dep1, "dep1-cached");
            expectQueryResolved(state.current.dep2, "dep2-cached");
            expectQueryResolved(state.current.dep3, "dep3-cached");
            expectQueryResolved(state.current.result, "result-cached");
          });

          it("resolves zero values immediately if cached", async () => {
            const renderHookResult = renderHook(
              () => {
                const $queries = React.useMemo(create$Queries, []);
                const queries = React.useMemo(
                  () => createQueries({}, $queries),
                  [$queries]
                );
                usePlasmicQueries($queries, queries);
                return $queries;
              },
              {
                wrapper: ({ children }) => (
                  <TestProvider
                    prefetchedCache={{
                      [makeQueryCacheKey("depFn", ["dep1-param"])]: null,
                      [makeQueryCacheKey("depFn", ["dep2-param"])]: false,
                      [makeQueryCacheKey("depFn", [
                        "dep3-param",
                        null,
                        false,
                      ])]: 0,
                      [makeQueryCacheKey("resultFn", ["result-param", 0])]: "",
                    }}
                  >
                    {children}
                  </TestProvider>
                ),
              }
            );
            state = renderHookResult.result;
            unmount = renderHookResult.unmount;

            expect(asyncFuncCalls).toHaveLength(0);
            expectQueryResolved(state.current.dep1, null);
            expectQueryResolved(state.current.dep2, false);
            expectQueryResolved(state.current.dep3, 0);
            expectQueryResolved(state.current.result, "");
          });
        });
      });
    });
  });

  describe("test as component", () => {
    let container: HTMLElement;
    let expectedSuspenseCount: number;

    beforeEach(() => {
      expectedSuspenseCount = 0;
    });

    afterEach(() => {
      expect(container.innerHTML).toContain(
        `[suspense count: ${expectedSuspenseCount}]`
      );
    });

    testPermutations
      .slice(0, 1)
      .forEach(({ name, create$Queries, createQueries }) => {
        describe(`permutation: ${name}`, () => {
          it("shows result if all queries resolve", async () => {
            const renderResult = render(
              <TestComponent
                create$Queries={create$Queries}
                createQueries={createQueries}
              />,
              {
                wrapper: TestProvider,
              }
            );
            container = renderResult.container;
            unmount = renderResult.unmount;

            await runResolveTestInComponent(container);

            expectedSuspenseCount = 2;
            expectedAsyncFuncCalls = 4;
          });

          it("shows error if any query rejects", async () => {
            const renderResult = render(
              <TestComponent
                create$Queries={create$Queries}
                createQueries={createQueries}
              />,
              {
                wrapper: TestProvider,
              }
            );
            container = renderResult.container;
            unmount = renderResult.unmount;

            await act(async () => {
              expect(container.innerHTML).toContain("TestProvider SUSPENDED");
              expect(container.innerHTML).toContain("suspense count: 1");
              expect(asyncFuncCalls).toHaveLength(2);
              findAsyncFuncCall("dep1-param").resolve("dep1-done");
              findAsyncFuncCall("dep2-param").reject(new Error("dep2-fail"));
            });
            await act(async () => {
              expect(container.innerHTML).toContain(
                "TestProvider ERROR: Error: Error resolving function params"
              );
            });

            expectedSuspenseCount = 1;
            expectedAsyncFuncCalls = 2;
            // GLOBAL_CACHE is still holding promises since SWR never cached them.
            expectedGlobalCacheLeak = 2;
          });

          it("reruns queries, with dep1 arg changed and same result", async () => {
            const renderResult = render(
              <TestComponent
                create$Queries={create$Queries}
                createQueries={createQueries}
              />,
              {
                wrapper: TestProvider,
              }
            );
            container = renderResult.container;
            unmount = renderResult.unmount;
            const rerender = renderResult.rerender;

            await runResolveTestInComponent(container);

            // Change dep1 param
            rerender(
              <TestComponent
                create$Queries={create$Queries}
                createQueries={createQueries}
                $props={{ dep1Args: ["dep1-param-changed"] }}
              />
            );

            await act(async () => {
              expect(container.innerHTML).toContain("TestProvider SUSPENDED");
              expect(container.innerHTML).toContain("suspense count: 3");
              expect(asyncFuncCalls).toHaveLength(5);
              // Resolve dep1 to same result
              findAsyncFuncCall("dep1-param-changed").resolve("dep1-done");
            });
            await act(async () => {
              // Dependent queries see same dep1 result and resolve instantly
              expect(container.innerHTML).toContain("result-done");
            });

            expectedSuspenseCount = 3;
            expectedAsyncFuncCalls = 5;
          });

          it("reruns queries, with dep2, dep3, and result changed", async () => {
            const renderResult = render(
              <TestComponent
                create$Queries={create$Queries}
                createQueries={createQueries}
              />,
              {
                wrapper: TestProvider,
              }
            );
            container = renderResult.container;
            unmount = renderResult.unmount;

            await runResolveTestInComponent(container);

            // Change dep2 param
            renderResult.rerender(
              <TestComponent
                create$Queries={create$Queries}
                createQueries={createQueries}
                $props={{ dep2Args: ["dep2-param-changed"] }}
              />
            );

            await act(async () => {
              expect(container.innerHTML).toContain("TestProvider SUSPENDED");
              expect(container.innerHTML).toContain("suspense count: 3");
              await vi.waitFor(() => expect(asyncFuncCalls).toHaveLength(5));
              // Resolve dep2 with changed result
              findAsyncFuncCall("dep2-param-changed").resolve(
                "dep2-done-changed"
              );
              await vi.waitFor(() => expect(asyncFuncCalls).toHaveLength(6));
              // Resolve dep3 with changed result
              findAsyncFuncCall(
                "dep3-param",
                "dep1-done",
                "dep2-done-changed"
              ).resolve("dep3-done-changed");
              // Resolve result with changed result
              await vi.waitFor(() => expect(asyncFuncCalls).toHaveLength(7));
              findAsyncFuncCall("result-param", "dep3-done-changed").resolve(
                "result-done-changed"
              );
            });
            await act(async () => {
              expect(container.innerHTML).toContain("suspense count: 4");
              expect(container.innerHTML).toContain("result-done-changed");
            });

            expectedSuspenseCount = 4;
            expectedAsyncFuncCalls = 7;
          });
        });
      });

    describe("invalidation", () => {
      beforeEach(async () => {
        const InvalidateTestComponent = () => {
          const { mutate } = usePlasmicDataConfig();
          const $queries = React.useMemo(create$QueriesOrig, [
            create$QueriesOrig,
          ]);
          const queries = React.useMemo(
            () => createQueriesOrig({}, $queries),
            [createQueriesOrig, $queries]
          );
          usePlasmicQueries($queries, queries);
          return (
            <>
              <span>{JSON.stringify($queries.result.data)}</span>
              <button
                onClick={() =>
                  mutate(makeQueryCacheKey("depFn", ["dep1-param"]))
                }
              >
                Invalidate dep1
              </button>
              <button
                onClick={() =>
                  mutate(makeQueryCacheKey("depFn", ["dep2-param"]))
                }
              >
                Invalidate dep2
              </button>
              <button
                onClick={() =>
                  mutate(
                    makeQueryCacheKey("depFn", [
                      "dep3-param",
                      "dep1-done",
                      "dep2-done",
                    ])
                  )
                }
              >
                Invalidate dep3
              </button>
              <button
                onClick={() =>
                  mutate(
                    makeQueryCacheKey("resultFn", ["result-param", "dep3-done"])
                  )
                }
              >
                Invalidate result
              </button>
            </>
          );
        };

        const renderResult = render(<InvalidateTestComponent />, {
          wrapper: TestProvider,
        });
        container = renderResult.container;
        unmount = renderResult.unmount;

        await runResolveTestInComponent(container);

        // Clear async func calls to find new calls after invalidation
        asyncFuncCalls.length = 0;
      });

      it("invalidates result", async () => {
        getByText(container, "Invalidate result").click();
        await act(async () => {
          await vi.waitFor(() =>
            expect(container.innerHTML).toContain("TestProvider SUSPENDED")
          );
        });
        await act(async () => {
          expect(container.innerHTML).toContain("suspense count: 3");
          expect(asyncFuncCalls).toHaveLength(1);
          findAsyncFuncCall("result-param").resolve("result-redone");
        });
        await act(async () => {
          expect(container.innerHTML).toContain("result-redone");
        });

        expectedSuspenseCount = 3;
        expectedAsyncFuncCalls = 1;
      });

      it("invalidates dep3", async () => {
        getByText(container, "Invalidate dep3").click();
        await act(async () => {
          // In the current implementation, invalidation will not propagate,
          // so result will not change until dep3 resolves.
          expect(container.innerHTML).toContain("result-done");
          expect(asyncFuncCalls).toHaveLength(1);
          findAsyncFuncCall("dep3-param").resolve("dep3-redone");
        });
        await act(async () => {
          expect(container.innerHTML).toContain("TestProvider SUSPENDED");
          expect(container.innerHTML).toContain("[suspense count: 3]");
          expect(asyncFuncCalls).toHaveLength(2);
          findAsyncFuncCall("result-param", "dep3-redone").resolve(
            "result-redone"
          );
        });
        await act(async () => {
          expect(container.innerHTML).toContain("result-redone");
        });

        expectedSuspenseCount = 3;
        expectedAsyncFuncCalls = 2;
      });

      it("invalidates dep2", async () => {
        getByText(container, "Invalidate dep2").click();
        await act(async () => {
          // In the current implementation, invalidation will not propagate,
          // so result will not change until dep3 resolves.
          expect(container.innerHTML).toContain("result-done");
          expect(asyncFuncCalls).toHaveLength(1);
          findAsyncFuncCall("dep2-param").resolve("dep2-redone");
        });
        await act(async () => {
          expect(container.innerHTML).toContain("result-done");
          expect(asyncFuncCalls).toHaveLength(2);
          findAsyncFuncCall("dep3-param", "dep1-done", "dep2-redone").resolve(
            "dep3-redone"
          );
        });
        await act(async () => {
          expect(container.innerHTML).toContain("TestProvider SUSPENDED");
          expect(container.innerHTML).toContain("[suspense count: 3]");
          expect(asyncFuncCalls).toHaveLength(3);
          findAsyncFuncCall("result-param", "dep3-redone").resolve(
            "result-redone"
          );
        });
        await act(async () => {
          expect(container.innerHTML).toContain("result-redone");
        });

        expectedSuspenseCount = 3;
        expectedAsyncFuncCalls = 3;
      });

      it("invalidates dep1", async () => {
        getByText(container, "Invalidate dep1").click();
        await act(async () => {
          // In the current implementation, invalidation will not propagate,
          // so result will not change until dep3 resolves.
          expect(container.innerHTML).toContain("result-done");
          expect(asyncFuncCalls).toHaveLength(1);
          findAsyncFuncCall("dep1-param").resolve("dep1-redone");
        });
        await act(async () => {
          expect(container.innerHTML).toContain("result-done");
          expect(asyncFuncCalls).toHaveLength(2);
          findAsyncFuncCall("dep3-param", "dep1-redone", "dep2-done").resolve(
            "dep3-redone"
          );
        });
        await act(async () => {
          expect(container.innerHTML).toContain("TestProvider SUSPENDED");
          expect(container.innerHTML).toContain("[suspense count: 3]");
          expect(asyncFuncCalls).toHaveLength(3);
          findAsyncFuncCall("result-param", "dep3-redone").resolve(
            "result-redone"
          );
        });
        await act(async () => {
          expect(container.innerHTML).toContain("result-redone");
        });

        expectedSuspenseCount = 3;
        expectedAsyncFuncCalls = 3;
      });
    });
  });
});

async function runResolveTestInComponent(container: HTMLElement) {
  await act(async () => {
    expect(container.innerHTML).toContain("TestProvider SUSPENDED");
    expect(asyncFuncCalls).toHaveLength(2);
    expect(container.innerHTML).toContain(`[suspense count: 1]`);
    findAsyncFuncCall("dep1-param").resolve("dep1-done");
    findAsyncFuncCall("dep2-param").resolve("dep2-done");
    await vi.waitFor(() => expect(asyncFuncCalls).toHaveLength(3));
    findAsyncFuncCall("dep3-param").resolve("dep3-done");
    await vi.waitFor(() => expect(asyncFuncCalls).toHaveLength(4));
    findAsyncFuncCall("result-param").resolve("result-done");
  });
  await act(async () => {
    expect(container.innerHTML).toContain(`[suspense count: 2]`);
    expect(container.innerHTML).toContain("result-done");
  });
}
