import { mkCustomFunctionExpr } from "@/wab/shared/codegen/react-p/server-queries/test-utils";
import {
  buildCustomCodeFn,
  getCustomFunctionParams,
  unwrapStatefulQueryResult,
} from "@/wab/shared/core/custom-functions";
import { ExprCtx } from "@/wab/shared/core/exprs";
import { _StatefulQueryResult as StatefulQueryResult } from "@plasmicapp/data-sources";

describe("unwrapStatefulQueryResult", () => {
  it("returns loading true in initial state", () => {
    const result = new StatefulQueryResult();
    expect(unwrapStatefulQueryResult(result)).toEqual({
      isLoading: true,
      data: undefined,
      error: expect.any(Promise),
    });
  });

  it("returns loading true when loading", () => {
    const result = new StatefulQueryResult();
    result.loadingPromise("my-key", { then: () => {} } as Promise<unknown>);
    expect(unwrapStatefulQueryResult(result)).toEqual({
      isLoading: true,
      data: undefined,
      error: expect.any(Promise),
    });
  });

  it("returns data when query resolved", () => {
    const result = new StatefulQueryResult();
    result.resolvePromise("my-key", { rows: [1, 2, 3] });
    expect(unwrapStatefulQueryResult(result)).toEqual({
      isLoading: false,
      data: { rows: [1, 2, 3] },
      error: undefined,
    });
  });

  it("returns error when query rejected", () => {
    const result = new StatefulQueryResult();
    const err = new Error("HttpError: 404");
    result.rejectPromise("my-key", err);
    expect(unwrapStatefulQueryResult(result)).toEqual({
      isLoading: false,
      data: undefined,
      error: err,
    });
  });
});

describe("buildCustomCodeFn", () => {
  it("resolves data accessed from a settled $q", () => {
    const $q = { dep: new StatefulQueryResult() };
    $q.dep.resolvePromise("my-key", 42);
    const fn = buildCustomCodeFn("$q.dep.data", { $q });
    expect(fn()).toBe(42);
  });

  it("rethrows PlasmicUndefinedDataErrorPromise from a loading $q", async () => {
    const $q = { dep: new StatefulQueryResult() };
    const fn = buildCustomCodeFn("$q.dep.data", { $q });

    let thrown: unknown;
    try {
      await fn();
    } catch (err) {
      thrown = err;
    }
    expect((thrown as any)?.plasmicType).toBe("PlasmicUndefinedDataError");
  });

  it("returns a rejected promise for normal runtime errors", async () => {
    const fn = buildCustomCodeFn("foo.bar", { $q: {} });
    await expect(fn()).rejects.toThrow();
  });
});

describe("getCustomFunctionParams", () => {
  const exprCtx: ExprCtx = {
    component: null,
    projectFlags: {} as ExprCtx["projectFlags"],
    inStudio: true,
  };

  it("rethrows unresolved query params", () => {
    const expr = mkCustomFunctionExpr(
      "testFunc",
      ["value"],
      [{ name: "value", code: "$q.dep.data" }]
    );
    const $query = new StatefulQueryResult();

    let thrown: unknown;
    try {
      getCustomFunctionParams(expr, { $q: { dep: $query } }, exprCtx);
    } catch (err) {
      thrown = err;
    }

    expect((thrown as any)?.plasmicType).toBe("PlasmicUndefinedDataError");
  });
});
