import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  StatefulQueryResult,
  createDollarQueries,
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
    expect(resolveParams(() => [] as [])).toEqual({
      status: "ready",
      resolvedParams: [],
    });
  });
  it("returns ready for null params", () => {
    expect(resolveParams(() => [null])).toEqual({
      status: "ready",
      resolvedParams: [null],
    });
  });
  it("returns ready for undefined params", () => {
    expect(resolveParams(() => [undefined])).toEqual({
      status: "ready",
      resolvedParams: [undefined],
    });
  });
  it("returns ready for simple params", () => {
    expect(resolveParams(() => ["foo", 42] as [string, number])).toEqual({
      status: "ready",
      resolvedParams: ["foo", 42],
    });
  });
  it("returns error for other errors", () => {
    expect(
      resolveParams(() => {
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
    expect(resolveParams(() => ["foo", queryResult.data])).toEqual({
      status: "blocked",
      promise: queryResult.settable.promise,
    });

    queryResult.resolvePromise("key", "done");
    expect(resolveParams(() => ["foo", queryResult.data])).toEqual({
      status: "ready",
      resolvedParams: ["foo", "done"],
    });
  });
  it("works with StatefulQueryResult, blocked -> error", () => {
    const queryResult = new StatefulQueryResult();
    expect(resolveParams(() => ["foo", queryResult.data])).toEqual({
      status: "blocked",
      promise: queryResult.settable.promise,
    });

    queryResult.rejectPromise("key", new Error("other error"));
    expect(resolveParams(() => ["foo", queryResult.data])).toMatchObject({
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
