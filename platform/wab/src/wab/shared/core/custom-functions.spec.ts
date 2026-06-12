import { mkCustomFunctionExpr } from "@/wab/shared/codegen/react-p/server-queries/test-utils";
import {
  _testonly,
  buildCustomCodePlasmicQuery,
  getCustomFunctionParams,
  unwrapStatefulQueryResult,
} from "@/wab/shared/core/custom-functions";
import { ExprCtx } from "@/wab/shared/core/exprs";
import {
  QueryExecutionContext,
  _StatefulQueryResult as StatefulQueryResult,
} from "@plasmicapp/data-sources";
import { autorun, observable, runInAction } from "mobx";

const { getCustomCodeFactory } = _testonly;

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

describe("buildCustomCodePlasmicQuery", () => {
  const emptyCtx: QueryExecutionContext = {
    $ctx: {},
    $props: {},
    $q: {},
    $state: {},
  };
  const runQuery = async (
    code: string,
    staticEnv: Record<string, any>,
    executionCtx: Partial<QueryExecutionContext>
  ) => {
    const query = buildCustomCodePlasmicQuery("test", code, () => staticEnv);
    return query.fn(
      ...query.args({
        ...emptyCtx,
        ...executionCtx,
      })
    );
  };

  it("computes the id from the queryId + code", () => {
    const query = buildCustomCodePlasmicQuery("my-id", "1", () => ({}));
    expect(query.id).toBe("my-id.$.1");
  });

  it("resolves data accessed from a settled $q passed via env arg", async () => {
    const $q = { dep: new StatefulQueryResult() };
    $q.dep.resolvePromise("my-key", 42);
    await expect(runQuery("$q.dep.data", {}, { $q })).resolves.toBe(42);
  });

  it("rethrows PlasmicUndefinedDataErrorPromise from a loading $q", async () => {
    const $q = { dep: new StatefulQueryResult() };
    let thrown: unknown;
    try {
      await runQuery("$q.dep.data", {}, { $q });
    } catch (err) {
      thrown = err;
    }
    expect((thrown as any)?.plasmicType).toBe("PlasmicUndefinedDataError");
  });

  it("returns a rejected promise for normal runtime errors", async () => {
    await expect(runQuery("foo.bar", {}, {})).rejects.toThrow();
  });

  it("exposes $props, $ctx, $state from the resolved env arg", async () => {
    await expect(
      runQuery(
        "`${$ctx.page}-${$props.id}-${$state.count}`",
        {},
        {
          $ctx: { page: "home" },
          $props: { id: "x" },
          $q: {},
          $state: { count: 3 },
        }
      )
    ).resolves.toBe("home-x-3");
  });

  it("exposes static $$ and $dataTokens_* via the closure", async () => {
    await expect(
      runQuery(
        "$$.upper($dataTokens_proj_name)",
        {
          $$: { upper: (s: string) => s.toUpperCase() },
          $dataTokens_proj_name: "abc",
        },
        {}
      )
    ).resolves.toBe("ABC");
  });

  it("re-reads the static env on every fn invocation", async () => {
    let value = "first";
    const query = buildCustomCodePlasmicQuery(
      "test",
      "$dataTokens_proj_name",
      () => ({ $dataTokens_proj_name: value })
    );
    const [resolvedQctx] = query.args(emptyCtx);
    await expect(query.fn(resolvedQctx)).resolves.toBe("first");
    value = "second";
    await expect(query.fn(resolvedQctx)).resolves.toBe("second");
  });

  it("does not memoize the compiled factory outside a reaction", () => {
    // getCustomCodeFactory only memoizes while its result is observed in a reaction.
    expect(getCustomCodeFactory("2", JSON.stringify([]))).not.toBe(
      getCustomCodeFactory("2", JSON.stringify([]))
    );
  });

  it("returns the same compiled factory while it is observed", () => {
    const tick = observable.box(0);
    const seen = new Set<Function>();
    let runs = 0;
    const dispose = autorun(() => {
      runs++;
      tick.get();
      seen.add(getCustomCodeFactory("1", JSON.stringify([])));
    });
    try {
      expect(runs).toBe(1);
      runInAction(() => tick.set(tick.get() + 1));
      expect(runs).toBe(2);
      expect(seen.size).toBe(1);
    } finally {
      dispose();
    }
  });

  it("narrows args to only the $ctx/$props/$q/$state keys referenced", () => {
    const $q = {
      c: new StatefulQueryResult(),
      unused: new StatefulQueryResult(),
    };
    const query = buildCustomCodePlasmicQuery(
      "test",
      "$ctx.a + $props.b + $q.c.data + $state.d.e",
      () => ({})
    );
    expect(
      query.args({
        $q,
        $ctx: { a: 1, ignoredCtx: 99 },
        $props: { b: 2, ignoredProp: 99 },
        $state: { d: { e: 3 }, ignoredState: 99 },
      })
    ).toEqual([
      {
        $ctx: { a: 1 },
        $props: { b: 2 },
        $q: { c: $q.c },
        $state: { d: { e: 3 } },
      },
    ]);
  });

  it("returns empty arg buckets when the user code references nothing", () => {
    const query = buildCustomCodePlasmicQuery("test", "1 + 1", () => ({}));
    expect(
      query.args({
        $q: { foo: new StatefulQueryResult() },
        $ctx: { a: 1 },
        $props: { b: 2 },
        $state: { c: 3 },
      })
    ).toEqual([{ $ctx: {}, $props: {}, $q: {}, $state: {} }]);
  });

  it("merges static env $q and executionCtx $q", () => {
    const parentResult = new StatefulQueryResult();
    parentResult.resolvePromise("p", "parent-value");
    const innerResult = new StatefulQueryResult();
    innerResult.resolvePromise("i", "inner-value");

    const query = buildCustomCodePlasmicQuery("test", "$q.same.data", () => ({
      $q: { same: parentResult },
    }));

    expect(
      query.args({
        $ctx: {},
        $props: {},
        $q: { same: innerResult },
        $state: {},
      })
    ).toEqual([
      { $ctx: {}, $props: {}, $q: { same: innerResult }, $state: {} },
    ]);
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
