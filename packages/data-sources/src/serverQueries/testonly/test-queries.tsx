import { PlasmicQueryDataProvider } from "@plasmicapp/query";
import * as React from "react";
import { expect, vi } from "vitest";
import { usePlasmicQueries } from "../client";
import { PlasmicQueryResult, QueryComponentNode } from "../types";
import {
  asyncFunc,
  asyncFuncCalls,
  expectQueryLoading,
  expectQueryRejected,
  expectQueryResolved,
  findAsyncFuncCall,
} from "./test-common";

// Below can be used as a reference for codegen

/** Used to override default query args. */
export interface TestQueriesProps {
  dep1Args?: unknown[];
  dep2Args?: unknown[];
  dep3Args?: unknown[];
  resultArgs?: unknown[];
}

export function createTestTree(): QueryComponentNode {
  return {
    type: "component",
    queries: {
      result: {
        id: "resultFn",
        fn: asyncFunc,
        args: ({ $q, $props }) => {
          const props = $props as TestQueriesProps;
          return props?.resultArgs ?? ["result-param", $q.dep3.data];
        },
      },
      dep3: {
        id: "depFn",
        fn: asyncFunc,
        args: ({ $q, $props }) => {
          const props = $props as TestQueriesProps;
          return props?.dep3Args ?? ["dep3-param", $q.dep1.data, $q.dep2.data];
        },
      },
      dep2: {
        id: "depFn",
        fn: asyncFunc,
        args: ({ $props }) => {
          const props = $props as TestQueriesProps;
          return props?.dep2Args ?? ["dep2-param"];
        },
      },
      dep1: {
        id: "depFn",
        fn: asyncFunc,
        args: ({ $props }) => {
          const props = $props as TestQueriesProps;
          return props?.dep1Args ?? ["dep1-param"];
        },
      },
    },
    propsContext: {},
    children: [],
  };
}

export function TestComponent({
  tree,
  $props,
}: {
  tree: QueryComponentNode;
  $props?: TestQueriesProps;
}) {
  const $q = usePlasmicQueries(tree, $props ?? {}, {});
  return JSON.stringify($q.result.data);
}

export function TestProvider({
  children,
  prefetchedCache,
}: {
  children: React.ReactNode;
  prefetchedCache?: Record<string, any>;
}) {
  const swrCache = React.useMemo(() => new Map(), []);
  const [suspenseCount, setSuspenseCount] = React.useState(0);
  return (
    <>
      <TestErrorBoundary>
        <React.Suspense
          fallback={
            <TestSuspenseCounter
              onMount={() => setSuspenseCount((x) => x + 1)}
            />
          }
        >
          <PlasmicQueryDataProvider
            provider={() => swrCache}
            prefetchedCache={prefetchedCache}
          >
            <main>{children}</main>
          </PlasmicQueryDataProvider>
        </React.Suspense>
      </TestErrorBoundary>
      <footer>[suspense count: {suspenseCount}]</footer>
    </>
  );
}

function TestSuspenseCounter({ onMount }: { onMount: () => void }) {
  React.useEffect(() => {
    onMount();
  }, []);
  return `TestProvider SUSPENDED`;
}

// ErrorBoundary's are noisy before React 19.
// https://github.com/facebook/react/issues/15069
// TODO: Use new React 19 createRoot API to suppress logs
class TestErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return `TestProvider ERROR: ${this.state.error}`;
    } else {
      return this.props.children;
    }
  }
}

/**
 * Test permutations of queries to ensure order of codegen does not matter.
 *
 * Use `.slice(0, 1)` to limit tests when debugging.
 * `topDown` is purposely first since it usually causes the most issues.
 */
export const testPermutations = Object.entries({
  topDown: ["result", "dep3", "dep2", "dep1"],
  bottomUp: ["dep1", "dep2", "dep3", "result"],
  mixed: ["dep2", "result", "dep1", "dep3"],
}).map(([name, perm]) => ({
  name: `${name} ${perm.join(", ")}`,
  tree: {
    ...createTestTree(),
    queries: reorderKeys(createTestTree().queries, perm),
  },
}));

function reorderKeys<T extends Record<string, unknown>>(
  obj: T,
  keyOrder: string[]
): T {
  const reordered = {} as T;
  for (const key of keyOrder) {
    reordered[key as keyof T] = obj[key as keyof T];
  }
  return reordered;
}

// Functions for validating behavior specific to queries in this file

export interface TestState {
  current: Record<string, PlasmicQueryResult>;
}

export async function expectInitialState(result: TestState) {
  await vi.waitFor(() => expect(asyncFuncCalls).toHaveLength(2));
  expect(findAsyncFuncCall("dep1-param").args).toEqual(["dep1-param"]);
  expect(findAsyncFuncCall("dep2-param").args).toEqual(["dep2-param"]);
  expectQueryLoading(result.current.dep1);
  expectQueryLoading(result.current.dep2);
  expectQueryLoading(result.current.dep3);
  expectQueryLoading(result.current.result);
}

export async function runResolveTest(state: TestState) {
  findAsyncFuncCall("dep1-param").resolve("dep1-done");
  findAsyncFuncCall("dep2-param").resolve("dep2-done");
  await vi.waitFor(() => expectQueryResolved(state.current.dep1, "dep1-done"));
  await vi.waitFor(() => expectQueryResolved(state.current.dep2, "dep2-done"));
  await vi.waitFor(() => expect(asyncFuncCalls).toHaveLength(3));
  expect(findAsyncFuncCall("dep3-param").args).toEqual([
    "dep3-param",
    "dep1-done",
    "dep2-done",
  ]);
  expectQueryLoading(state.current.dep3);
  expectQueryLoading(state.current.result);

  findAsyncFuncCall("dep3-param").resolve("dep3-done");
  await vi.waitFor(() => expectQueryResolved(state.current.dep3, "dep3-done"));
  await vi.waitFor(() => expect(asyncFuncCalls).toHaveLength(4));
  expect(findAsyncFuncCall("result-param").args).toEqual([
    "result-param",
    "dep3-done",
  ]);
  expectQueryResolved(state.current.dep1, "dep1-done");
  expectQueryResolved(state.current.dep2, "dep2-done");
  expectQueryLoading(state.current.result);

  findAsyncFuncCall("result-param").resolve("result-done");
  await vi.waitFor(() =>
    expectQueryResolved(state.current.result, "result-done")
  );
  expectQueryResolved(state.current.dep1, "dep1-done");
  expectQueryResolved(state.current.dep2, "dep2-done");
  expectQueryResolved(state.current.dep3, "dep3-done");
}

export async function runResolveZeroTest(state: TestState) {
  findAsyncFuncCall("dep1-param").resolve(null);
  findAsyncFuncCall("dep2-param").resolve(false);
  await vi.waitFor(() => expect(asyncFuncCalls).toHaveLength(3));
  findAsyncFuncCall("dep3-param").resolve(0);
  await vi.waitFor(() => expect(asyncFuncCalls).toHaveLength(4));
  findAsyncFuncCall("result-param").resolve("");

  await vi.waitFor(() => expectQueryResolved(state.current.result, ""));
  expectQueryResolved(state.current.dep1, null);
  expectQueryResolved(state.current.dep2, false);
  expectQueryResolved(state.current.dep3, 0);
}

export async function runRejectTest(result: TestState) {
  findAsyncFuncCall("dep1-param").resolve("dep1-done");
  await vi.waitFor(() => expectQueryResolved(result.current.dep1, "dep1-done"));
  expectQueryLoading(result.current.dep2);
  expectQueryLoading(result.current.dep3);
  expectQueryLoading(result.current.result);

  findAsyncFuncCall("dep2-param").reject(new Error("dep2-fail"));
  await vi.waitFor(() => expectQueryRejected(result.current.dep2, "dep2-fail"));
  await vi.waitFor(() =>
    expectQueryRejected(result.current.dep3, "Error resolving function params")
  );
  await vi.waitFor(() =>
    expectQueryRejected(
      result.current.result,
      "Error resolving function params"
    )
  );
}
