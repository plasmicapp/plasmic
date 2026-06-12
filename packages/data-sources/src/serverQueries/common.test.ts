/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  StatefulQueryResult,
  createDollarQueries,
  createInitial$State,
  resolveParams,
  safeExec,
  wrapDollarQueriesForMetadata,
  wrapDollarQueriesWithFallbacks,
} from "./common";
import { asyncFunc, asyncFuncCalls } from "./testonly/test-common";
import { PlasmicQueryResult } from "./types";

describe("StatefulQueryResult", () => {
  beforeEach(() => {
    asyncFuncCalls.length = 0;
  });

  it("initial -> loading", () => {
    const result = new StatefulQueryResult();
    expect(result.key).toEqual(null);
    expect(result.isLoading).toEqual(true);
    const originalPromise = unwrapData(result);
    expect(originalPromise).toBeInstanceOf(Promise);

    result.loadingPromise("test-key", asyncFunc());
    expect(result.key).toEqual("test-key");
    expect(result.isLoading).toEqual(true);
    expect(unwrapData(result)).toBe(originalPromise);
  });

  it("loading -> resolved", async () => {
    const result = new StatefulQueryResult();
    const originalPromise = unwrapData(result);
    result.loadingPromise("test-key", asyncFunc());

    asyncFuncCalls[0].resolve("test-done");
    await vi.waitFor(() => expect(result.isLoading).toEqual(false));
    expect(result.key).toEqual("test-key");
    expect(unwrapData(result)).toEqual("test-done");
    await expect(originalPromise).resolves.toEqual("test-done");
  });

  it("loading -> error", async () => {
    const result = new StatefulQueryResult();
    const originalPromise = unwrapData(result);
    result.loadingPromise("test-key", asyncFunc());

    const error = new Error("test-error");
    asyncFuncCalls[0].reject(error);
    await vi.waitFor(() => expect(result.isLoading).toEqual(false));
    expect(result.key).toEqual("test-key");
    expect(() => unwrapData(result)).toThrowError(error);
    await expect(originalPromise).rejects.toBe(error);
  });

  it("toJSON", () => {
    const result = new StatefulQueryResult();
    expect(result.toJSON()).toBe(result.current);
    expect(JSON.stringify(result)).toEqual('{"state":"initial","key":null}');
  });
});

describe("createDollarQueries", () => {
  it("creates empty object for empty array", () => {
    const $queries = createDollarQueries([]);
    expect($queries).toEqual({});
  });

  it("creates StatefulQueryResult for every query names", () => {
    const $queries = createDollarQueries(["query1", "query2", "query3"]);
    expect(Object.keys($queries)).toEqual(["query1", "query2", "query3"]);
    expect($queries.query1).toBeInstanceOf(StatefulQueryResult);
    expect($queries.query2).toBeInstanceOf(StatefulQueryResult);
    expect($queries.query3).toBeInstanceOf(StatefulQueryResult);
    expect($queries.query1).not.toBe($queries.query2);
    expect($queries.query2).not.toBe($queries.query3);
    expect($queries.query3).not.toBe($queries.query1);
  });
});

describe("resolveParams", () => {
  it("returns ready for empty params", () => {
    expect(resolveParams("queryId", () => [] as [])).toEqual({
      status: "ready",
      resolvedParams: [],
      cacheKey: "$q.$.queryId.$.[]",
    });
  });
  it("returns ready for null params", () => {
    expect(resolveParams("queryId", () => [null])).toEqual({
      status: "ready",
      resolvedParams: [null],
      cacheKey: "$q.$.queryId.$.[null]",
    });
  });
  it("returns ready for undefined params", () => {
    expect(resolveParams("queryId", () => [undefined])).toEqual({
      status: "ready",
      resolvedParams: [undefined],
      cacheKey: '$q.$.queryId.$.["ρ:UNDEFINED"]',
    });
  });
  it("returns ready for simple params", () => {
    expect(
      resolveParams("queryId", () => ["foo", 42] as [string, number])
    ).toEqual({
      status: "ready",
      resolvedParams: ["foo", 42],
      cacheKey: '$q.$.queryId.$.["foo",42]',
    });
  });
  it("returns error for other errors", () => {
    expect(
      resolveParams("queryId", () => {
        throw new Error("other error");
      })
    ).toMatchObject({
      status: "error",
      error: {
        message: "Error resolving function params",
        cause: { message: "other error" },
      },
    });
  });
  it("works with StatefulQueryResult, blocked -> ready", () => {
    const queryResult = new StatefulQueryResult();
    expect(resolveParams("queryId", () => ["foo", queryResult.data])).toEqual({
      status: "blocked",
      promise: queryResult.settable.promise,
    });

    queryResult.resolvePromise("key", "done");
    expect(resolveParams("queryId", () => ["foo", queryResult.data])).toEqual({
      status: "ready",
      resolvedParams: ["foo", "done"],
      cacheKey: '$q.$.queryId.$.["foo","done"]',
    });
  });
  it("works with StatefulQueryResult, blocked -> error", () => {
    const queryResult = new StatefulQueryResult();
    expect(resolveParams("queryId", () => ["foo", queryResult.data])).toEqual({
      status: "blocked",
      promise: queryResult.settable.promise,
    });

    queryResult.rejectPromise("key", new Error("other error"));
    expect(
      resolveParams("queryId", () => ["foo", queryResult.data])
    ).toMatchObject({
      status: "error",
      error: {
        message: "Error resolving function params",
        cause: { message: "other error" },
      },
    });
  });
});

describe("wrapDollarQueriesWithFallbacks, wrapDollarQueriesForMetadata", () => {
  const ifUndefined = () => "LOADING";
  const ifError = () => "ERROR";

  it("replaces undefined/error with fallback values", () => {
    const $queries = createDollarQueries(["loading", "rejected", "resolved"]);
    const $fallback = wrapDollarQueriesWithFallbacks(
      $queries,
      ifUndefined,
      ifError
    );
    expect(String($fallback.loading.data)).toEqual("LOADING"); // String() forces Symbol.toPrimitive usage
    expect(`${$fallback.rejected.data}`).toEqual("LOADING"); // `${}` forces Symbol.toPrimitive usage
    expect(String($fallback.resolved.data)).toEqual("LOADING");

    ($queries.resolved as StatefulQueryResult).resolvePromise(
      "resolved-key",
      "RESOLVED"
    );
    expect(String($fallback.loading.data)).toEqual("LOADING");
    expect(String($fallback.rejected.data)).toEqual("LOADING");
    expect(String($fallback.loading.data)).toEqual("LOADING");
    expect(String($fallback.rejected.data)).toEqual("LOADING");
    expect($fallback.resolved.data).toEqual("RESOLVED");

    ($queries.rejected as StatefulQueryResult).rejectPromise(
      "rejected-key",
      "REJECTED"
    );
    expect(String($fallback.loading.data)).toEqual("LOADING");
    expect(String($fallback.rejected.data)).toEqual("ERROR");
    expect($fallback.resolved.data).toEqual("RESOLVED");

    const $metadata = wrapDollarQueriesForMetadata($queries);
    expect(
      `loading:${$metadata.loading.data} rejected:${$metadata.rejected.data} resolved:${$metadata.resolved.data}`
    ).toEqual("loading:… rejected:[ERROR] resolved:RESOLVED");
  });

  it("replaces fallback values in nested accesses", () => {
    const $queries = createDollarQueries(["loading", "rejected"]);
    const $fallback = wrapDollarQueriesWithFallbacks(
      $queries,
      ifUndefined,
      ifError
    );
    ($queries.rejected as StatefulQueryResult).rejectPromise(
      "rejected-key",
      "REJECTED"
    );

    // @ts-expect-error testing proxy
    expect($fallback.loading.data.a).toEqual({});
    // @ts-expect-error testing proxy
    expect(String($fallback.loading.data.a)).toEqual("LOADING");
    // @ts-expect-error testing proxy
    expect($fallback.rejected.data.a).toEqual({});
    // @ts-expect-error testing proxy
    expect(String($fallback.rejected.data.a)).toEqual("ERROR");

    // @ts-expect-error testing proxy
    expect($fallback.loading.data.a[0]).toEqual({});
    // @ts-expect-error testing proxy
    expect(String($fallback.loading.data.a[0])).toEqual("LOADING");
    // @ts-expect-error testing proxy
    expect($fallback.rejected.data.a[0]).toEqual({});
    // @ts-expect-error testing proxy
    expect(String($fallback.rejected.data.a[0])).toEqual("ERROR");

    // @ts-expect-error testing proxy
    expect($fallback.loading.data.a[0].b).toEqual({});
    // @ts-expect-error testing proxy
    expect(String($fallback.loading.data.a[0].b)).toEqual("LOADING");
    // @ts-expect-error testing proxy
    expect($fallback.rejected.data.a[0].b).toEqual({});
    // @ts-expect-error testing proxy
    expect(String($fallback.rejected.data.a[0].b)).toEqual("ERROR");
  });
});

describe("createInitial$State", () => {
  it("returns undefined without initVal", () => {
    const $state = createInitial$State({}, {}, {}, [
      { path: "count", type: "private" },
    ]);
    expect($state.count).toBeUndefined();
  });

  it("returns propValue", () => {
    const $state = createInitial$State({}, { value: "from prop" }, {}, [
      {
        path: "value",
        valueProp: "value",
        type: "writable",
      },
    ]);
    expect($state.value).toEqual("from prop");
  });

  it("returns initVal", () => {
    const $state = createInitial$State({}, {}, {}, [
      { path: "value", initVal: "from initVal", type: "private" },
    ]);
    expect($state.value).toBe("from initVal");
  });

  it("invokes initFunc with execution context and returns it", () => {
    const $ctx = { ctxName: "ctxValue" };
    const $props = { propName: "propValue" };
    const $queryStates = { queryName: new StatefulQueryResult() };
    $queryStates.queryName.resolvePromise("queryKey", "queryValue");

    const $state = createInitial$State($ctx, $props, $queryStates, [
      {
        path: "stateName",
        initVal: "stateValue",
        type: "private",
      },
      {
        path: "merged",
        initFunc: (executionCtx) =>
          [
            executionCtx.$ctx.ctxName,
            executionCtx.$props.propName,
            `${executionCtx.$q.queryName.key}:${executionCtx.$q.queryName.data}`,
            executionCtx.$state.stateName,
          ].join(","),
        type: "private",
      },
    ]);
    expect($state.merged).toEqual(
      "ctxValue,propValue,queryKey:queryValue,stateValue"
    );
    expect($state.stateName).toEqual("stateValue");
  });

  it("returns or throws from query", () => {
    const $queryStates = { query: new StatefulQueryResult() };
    const $state = createInitial$State({}, {}, $queryStates, [
      {
        path: "dependsOnQuery",
        initFunc: ({ $q }) => $q.query.data,
        type: "private",
      },
    ]);
    expect(() => $state.dependsOnQuery).toThrow("Query is not done");

    $queryStates.query.resolvePromise("qureyKey", "done");
    expect($state.dependsOnQuery).toEqual("done");
  });

  it("caches successful initFunc results but retries on throw", () => {
    const $queryStates = { query: new StatefulQueryResult() };
    const initFunc = vi.fn(({ $q }) => $q.query.data);
    const $state = createInitial$State({}, {}, $queryStates, [
      { path: "value", initFunc, type: "private" },
    ]);

    // Throws keep re-running so the next read can pick up a settled query.
    expect(() => $state.value).toThrow();
    expect(() => $state.value).toThrow();
    expect(initFunc).toHaveBeenCalledTimes(2);

    // First successful read computes and caches.
    $queryStates.query.resolvePromise("k", "done");
    expect($state.value).toEqual("done");
    expect(initFunc).toHaveBeenCalledTimes(3);

    // Subsequent reads return the cached value without re-invoking initFunc.
    expect($state.value).toEqual("done");
    expect($state.value).toEqual("done");
    expect(initFunc).toHaveBeenCalledTimes(3);
  });

  it("returns objects for nested path prefixes", () => {
    const $state = createInitial$State({}, {}, {}, [
      { path: "tpl.value", initVal: "from initVal", type: "private" },
      { path: "tpl.noInit", type: "private" },
      { path: "tpl2.noInit", type: "private" },
    ]);

    expect($state.tpl).toBeTypeOf("object");
    const $stateTpl = $state.tpl as Record<string, unknown>;
    expect($stateTpl.value).toEqual("from initVal");
    expect($stateTpl.noInit).toBeUndefined();

    expect($state.tpl2).toBeTypeOf("object");
    const $stateTpl2 = $state.tpl2 as Record<string, unknown>;
    expect($stateTpl2.noInit).toBeUndefined();

    expect($state.value).toBeUndefined();
    expect($state.noInit).toBeUndefined();
  });

  it("returns stable sub-proxies (same reference on repeated access)", () => {
    const $state = createInitial$State({}, {}, {}, [
      { path: "tpl.value", type: "private" },
    ]);
    expect($state.tpl).toBe($state.tpl);
  });

  it("returns undefined for repeated specs", () => {
    const $state = createInitial$State({}, {}, {}, [
      { path: "items[].selected", initVal: "", type: "private" },
    ]);
    expect($state["items"]).toBeUndefined();
    expect($state["items[]"]).toBeUndefined();
  });

  it("skips only [] specs and still builds the rest of the state", () => {
    const $queryStates = { query: new StatefulQueryResult() };
    $queryStates.query.resolvePromise("k", "queryValue");

    const $state = createInitial$State({}, {}, $queryStates, [
      { path: "items[].selected", initVal: "", type: "private" },
      { path: "count", initVal: 7, type: "private" },
      { path: "tpl.label", initVal: "hi", type: "private" },
      {
        path: "fromQuery",
        initFunc: ({ $q }) => $q.query.data,
        type: "private",
      },
      { path: "after[].x", initVal: "", type: "private" },
    ]);

    // The [] specs are skipped entirely.
    expect($state["items"]).toBeUndefined();
    expect($state["items[]"]).toBeUndefined();
    expect($state["after"]).toBeUndefined();

    // ...but every non-[] spec around them still works.
    expect($state.count).toBe(7);
    expect(($state.tpl as Record<string, unknown>).label).toBe("hi");
    expect($state.fromQuery).toBe("queryValue");
    expect(Object.keys($state)).toEqual(["count", "tpl", "fromQuery"]);
  });

  it("matches JavaScript object behavior", () => {
    const jsState = {
      foo: "$.foo",
      tpl: { foo: "$.tpl.foo" },
    };

    const $state = createInitial$State({}, {}, {}, [
      { path: "foo", initVal: "$.foo", type: "private" },
      { path: "tpl.foo", initVal: "$.tpl.foo", type: "private" },
    ]);

    function expectJavaScriptBehavior(state: typeof jsState) {
      // is typeof object
      expect(state).toBeTypeOf("object");
      expect(state.tpl).toBeTypeOf("object");

      // implements keys, values, entries
      expect(Object.keys(state)).toEqual(["foo", "tpl"]);
      expect(Object.values(state)).toEqual(["$.foo", { foo: "$.tpl.foo" }]);
      expect(Object.entries(state)).toEqual([
        ["foo", "$.foo"],
        ["tpl", { foo: "$.tpl.foo" }],
      ]);
      expect(Object.keys(state.tpl)).toEqual(["foo"]);
      expect(Object.values(state.tpl)).toEqual(["$.tpl.foo"]);
      expect(Object.entries(state.tpl)).toEqual([["foo", "$.tpl.foo"]]);

      // implements in
      expect("foo" in state).toBe(true);
      expect("tpl" in state).toBe(true);
      expect("unknown" in state).toBe(false);
      expect("foo" in state.tpl).toBe(true);
      expect("unknown" in state.tpl).toBe(false);

      // unknown keys return undefined
      expect(state["unknown"]).toBeUndefined();
      expect(state["tpl"]["unknown"]).toBeUndefined();

      // implements conversion
      expect(String(state)).toEqual("[object Object]");
      expect(JSON.stringify(state)).toEqual(
        '{"foo":"$.foo","tpl":{"foo":"$.tpl.foo"}}'
      );
    }
    expectJavaScriptBehavior(jsState);
    expectJavaScriptBehavior($state as typeof jsState);
  });
});

/** Returns data or thrown promise, throws other error. */
function unwrapData(result: PlasmicQueryResult) {
  return safeExec(
    () => result.data,
    (promise) => promise,
    (err) => {
      throw err;
    }
  );
}
