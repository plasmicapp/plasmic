import { CustomFunctionParam } from "@/wab/shared/code-components/code-components";
import { mkCustomFunctionExpr } from "@/wab/shared/codegen/react-p/server-queries/test-utils";
import {
  _testonly,
  buildCustomCodePlasmicQuery,
  getCustomFunctionParams,
  getInvalidFunctionArgs,
  unwrapStatefulQueryResult,
} from "@/wab/shared/core/custom-functions";
import { ExprCtx } from "@/wab/shared/core/exprs";
import { ValidationType } from "@/wab/shared/core/invalid-arg";
import { CustomFunction } from "@/wab/shared/model/classes";
import { typeFactory } from "@/wab/shared/model/model-util";
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

const required = (displayLabel: string) => ({
  validationType: ValidationType.Required,
  displayLabel,
});

function mkFunc(paramNames: string[]): CustomFunction {
  return new CustomFunction({
    namespace: "",
    importName: "myFunc",
    importPath: "",
    displayName: null,
    defaultExport: false,
    params: paramNames.map((p) => typeFactory.arg(p, typeFactory.text())),
    isQuery: true,
    isMutation: false,
  });
}

describe("getInvalidFunctionArgs", () => {
  it("reports nothing when there are no registered params", () => {
    const func = mkFunc(["id"]);
    expect(getInvalidFunctionArgs([undefined], func, undefined)).toEqual(
      undefined
    );
  });

  it("reports a required top-level param that is undefined or null", () => {
    const func = mkFunc(["id"]);
    const registeredParams = [
      { name: "id", type: "string", required: true },
    ] as unknown as CustomFunctionParam[];

    expect(getInvalidFunctionArgs([undefined], func, registeredParams)).toEqual(
      { id: required("ID") }
    );
    expect(getInvalidFunctionArgs([null], func, registeredParams)).toEqual({
      id: required("ID"),
    });
  });

  it("reports nothing when a required top-level param is filled (incl. falsy)", () => {
    const func = mkFunc(["id"]);
    const registeredParams = [
      { name: "id", type: "string", required: true },
    ] as unknown as CustomFunctionParam[];

    expect(getInvalidFunctionArgs(["abc"], func, registeredParams)).toEqual(
      undefined
    );
    // Falsy-but-present values (empty string, 0, false) are not "missing".
    expect(getInvalidFunctionArgs([""], func, registeredParams)).toEqual(
      undefined
    );
    expect(getInvalidFunctionArgs([0], func, registeredParams)).toEqual(
      undefined
    );
  });

  it("reports nothing when an optional param is missing", () => {
    const func = mkFunc(["id"]);
    const registeredParams = [
      { name: "id", type: "string" },
    ] as unknown as CustomFunctionParam[];

    expect(getInvalidFunctionArgs([undefined], func, registeredParams)).toEqual(
      undefined
    );
  });

  it("ignores bare-string param registrations (no required possible)", () => {
    const func = mkFunc(["id"]);
    const registeredParams = ["id"] as unknown as CustomFunctionParam[];

    expect(getInvalidFunctionArgs([undefined], func, registeredParams)).toEqual(
      undefined
    );
  });

  it("reports required fields of a flattened object param", () => {
    const func = mkFunc(["opts"]);
    const registeredParams = [
      {
        name: "opts",
        type: "object",
        display: "flatten",
        fields: {
          a: { type: "string", required: true },
          b: { type: "string" },
        },
      },
    ] as unknown as CustomFunctionParam[];

    // Whole object missing -> required field reported.
    expect(getInvalidFunctionArgs([undefined], func, registeredParams)).toEqual(
      { "opts.a": required("A") }
    );

    // Required field missing within an otherwise-set object.
    expect(
      getInvalidFunctionArgs([{ b: "set" }], func, registeredParams)
    ).toEqual({ "opts.a": required("A") });

    // Required field filled -> nothing (optional field can stay unset).
    expect(
      getInvalidFunctionArgs([{ a: "set" }], func, registeredParams)
    ).toEqual(undefined);
  });

  it("reports a required registered param that is missing from the model", () => {
    // Model is stale and doesn't yet have the param, so it has no value.
    const func = mkFunc([]);
    const registeredParams = [
      { name: "id", type: "string", required: true },
    ] as unknown as CustomFunctionParam[];

    expect(getInvalidFunctionArgs([], func, registeredParams)).toEqual({
      id: required("ID"),
    });
  });

  it("reports a mix of top-level and flattened required params", () => {
    const func = mkFunc(["id", "opts"]);
    const registeredParams = [
      { name: "id", type: "string", required: true },
      {
        name: "opts",
        type: "object",
        display: "flatten",
        fields: {
          a: { type: "string", required: true },
        },
      },
    ] as unknown as CustomFunctionParam[];

    expect(
      getInvalidFunctionArgs([undefined, undefined], func, registeredParams)
    ).toEqual({ id: required("ID"), "opts.a": required("A") });
  });
});

describe("getInvalidFunctionArgs displayLabel", () => {
  const func = mkFunc(["id", "opts"]);
  const registeredParams = [
    { name: "id", type: "string", displayName: "Identifier", required: true },
    {
      name: "opts",
      type: "object",
      display: "flatten",
      fields: {
        url: { type: "string", displayName: "URL", required: true },
        apiKey: { type: "string", required: true },
      },
    },
  ] as unknown as CustomFunctionParam[];

  it("prefers a field's registered displayName", () => {
    expect(
      getInvalidFunctionArgs(["set", { apiKey: "set" }], func, registeredParams)
    ).toEqual({ "opts.url": required("URL") });
  });

  it("humanizes a field name when there is no displayName", () => {
    expect(
      getInvalidFunctionArgs(["set", { url: "set" }], func, registeredParams)
    ).toEqual({ "opts.apiKey": required("Api key") });
  });

  it("labels a top-level param by its displayName", () => {
    expect(
      getInvalidFunctionArgs(
        [undefined, { url: "set", apiKey: "set" }],
        func,
        registeredParams
      )
    ).toEqual({ id: required("Identifier") });
  });
});
