import {
  _testOnlyUtils,
  RenderingCtx,
} from "@/wab/client/components/canvas/canvas-rendering";
import { SubDeps } from "@/wab/client/components/canvas/subdeps";
import { interpolatedStringToTemplatedString } from "@/wab/shared/copilot/dynamic-value-input";
import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { mkTplTagX } from "@/wab/shared/core/tpls";
import { mkDataSourceTemplate } from "@/wab/shared/data-sources-meta/data-sources";
import {
  Component,
  ComponentDataQuery,
  ComponentServerQuery,
  CustomCode,
  CustomFunction,
  CustomFunctionExpr,
  DataSourceOpExpr,
  FunctionArg,
} from "@/wab/shared/model/classes";
import { typeFactory } from "@/wab/shared/model/model-util";
import { usePlasmicQueries } from "@plasmicapp/data-sources";
import { $StateSpec, useDollarState } from "@plasmicapp/react-web";
import { act, render } from "@testing-library/react";
import React from "react";

const { getQueryFetcherHookCounts, useComponentLevelQueries } = _testOnlyUtils;

function mkEmptyComponent(): Component {
  return mkComponent({
    name: "WithQueries",
    type: ComponentType.Plain,
    tplTree: (baseVariant) => mkTplTagX("div", { baseVariant }),
  });
}

/** A legacy dataQuery whose args read `binding`. */
function mkLegacyDataQuery(binding = "{{ $q.myQuery.data }}", name = "Legacy") {
  return new ComponentDataQuery({
    uuid: `dq-${name}`,
    name,
    op: new DataSourceOpExpr({
      parent: undefined,
      sourceId: "src1",
      opId: "op1",
      opName: "getList",
      templates: {
        filters: mkDataSourceTemplate({
          fieldType: "filter[]",
          value: interpolatedStringToTemplatedString(binding),
          bindings: null,
        }),
      },
      cacheKey: undefined,
      queryInvalidation: undefined,
      roleId: undefined,
    }),
  });
}

function mkFetchFunction() {
  return new CustomFunction({
    importPath: "@plasmicpkgs/fetch",
    importName: "fetch",
    defaultExport: false,
    namespace: "plasmic",
    displayName: "Fetch",
    params: [typeFactory.arg("url", typeFactory.text())],
    isQuery: true,
    isMutation: false,
  });
}

/** A server query backed by a custom function, i.e. one needing a registration. */
function mkFunctionServerQuery(fn: CustomFunction) {
  return new ComponentServerQuery({
    uuid: "sq1",
    name: "My Query",
    op: new CustomFunctionExpr({
      func: fn,
      args: [
        new FunctionArg({
          uuid: "fa1",
          argType: fn.params[0],
          expr: interpolatedStringToTemplatedString("{{ $ctx.api }}"),
        }),
      ],
    }),
  });
}

function mkEnv() {
  return {
    $props: {},
    $ctx: {},
    $refs: {},
    $$: {},
    $queries: {},
    $q: {},
    $state: { eagerInitializeStates: () => {} },
  } as any;
}

function mkCtx(
  env: ReturnType<typeof mkEnv>,
  registeredFunctions: Map<string, any>,
  stateSpecs: $StateSpec<any>[] = []
) {
  return {
    env,
    projectFlags: {},
    stateSpecs,
    setDollarQ: vi.fn(),
    setDollarQueries: vi.fn(),
    viewCtx: {
      canvasCtx: {
        win: () => window,
        getRegisteredFunctionsMap: () => registeredFunctions,
      },
      studioCtx: {
        executeServerQuery: (_id: string, fn: any, ...args: any[]) =>
          fn(...args),
      },
    },
  } as unknown as RenderingCtx;
}

describe("useComponentLevelQueries", () => {
  it("seeds $q before initializing states that read it, and both before legacy ops", async () => {
    const component = mkEmptyComponent();
    component.serverQueries.push(
      new ComponentServerQuery({
        uuid: "sq1",
        name: "My Query",
        op: new CustomCode({ code: "(async () => [1, 2])", fallback: null }),
      })
    );
    // A mid-migrating project with a legacy op that reads a migrated server query.
    component.dataQueries.push(mkLegacyDataQuery());

    const resolved: { op?: any; err?: unknown }[] = [];
    const env = mkEnv();
    // A supported state initializer that reads a server query result.
    const stateSpecs: $StateSpec<any>[] = [
      {
        path: "fromQuery",
        type: "private",
        variableType: "array",
        initFunc: ({ $q }) => $q.myQuery.data,
      },
    ];
    const ctx = mkCtx(env, new Map(), stateSpecs);

    const sub = {
      React,
      dataSources: {
        // The server query has already settled by the time this renders.
        usePlasmicQueries: () => ({
          myQuery: { data: [1, 2], isLoading: false },
        }),
        // Mirrors resolveDataOp() in @plasmicapp/data-sources: it evaluates the
        // op during render and swallows any throw into a null op.
        usePlasmicDataOp: (dataOp: (() => any) | undefined) => {
          try {
            resolved.push({ op: dataOp?.() });
          } catch (err) {
            resolved.push({ err });
          }
          return { isLoading: false, data: undefined };
        },
      },
    } as unknown as SubDeps;

    function Harness() {
      // The real $state, built the way createCanvasComponent() does. Its env
      // env has the same mutable $q that useComponentLevelQueries seeds.
      env.$state = useDollarState(stateSpecs, env, { inCanvas: true });
      useComponentLevelQueries(sub, ctx, component);
      return null;
    }
    await act(async () => {
      render(<Harness />);
    });

    // The state initializer saw the settled query rather than an empty $q.
    expect(env.$state.fromQuery).toEqual([1, 2]);
    // ...and so did the legacy op, which runs after both, on every render.
    expect(resolved.map((r) => r.err)).toEqual(resolved.map(() => undefined));
    expect(resolved[resolved.length - 1].op).toMatchObject({
      sourceId: "src1",
      opId: "op1",
      userArgs: { filters: [[1, 2]] },
    });
    expect(env.$q).toEqual({ myQuery: { data: [1, 2], isLoading: false } });
    expect(ctx.setDollarQ).toHaveBeenCalledWith({
      myQuery: { data: [1, 2], isLoading: false },
    });
  });

  it("seeds $queries before initializing a state that reads it, while the legacy op still reads $state", async () => {
    const component = mkEmptyComponent();
    component.dataQueries.push(mkLegacyDataQuery("{{ $state.filter }}"));

    const resolved: { op?: any; err?: unknown }[] = [];
    const env = mkEnv();
    const stateSpecs: $StateSpec<any>[] = [
      {
        path: "filter",
        type: "private",
        variableType: "text",
        initFunc: () => "sport",
      },
      {
        path: "fromLegacy",
        type: "private",
        variableType: "array",
        initFunc: ({ $queries }) => $queries.legacy.data,
      },
    ];
    const ctx = mkCtx(env, new Map(), stateSpecs);

    const sub = {
      React,
      dataSources: {
        usePlasmicQueries: () => ({}),
        usePlasmicDataOp: (dataOp: (() => any) | undefined) => {
          try {
            resolved.push({ op: dataOp?.() });
          } catch (err) {
            resolved.push({ err });
          }
          return { isLoading: false, data: [3, 4] };
        },
      },
    } as unknown as SubDeps;

    function Harness() {
      env.$state = useDollarState(stateSpecs, env, { inCanvas: true });
      useComponentLevelQueries(sub, ctx, component);
      return null;
    }
    await act(async () => {
      render(<Harness />);
    });

    // The state initializer saw the seeded legacy query rather than an empty
    // $queries, which would have made `.data` a TypeError and killed the render.
    expect(env.$state.fromLegacy).toEqual([3, 4]);
    // The op read $state through the lazily-initializing proxy.
    expect(resolved.map((r) => r.err)).toEqual(resolved.map(() => undefined));
    expect(resolved[resolved.length - 1].op).toMatchObject({
      userArgs: { filters: ["sport"] },
    });
  });

  it("gives a legacy op the results of the legacy queries before it", async () => {
    const component = mkEmptyComponent();
    component.dataQueries.push(
      mkLegacyDataQuery("{{ $state.filter }}", "First")
    );
    component.dataQueries.push(
      mkLegacyDataQuery("{{ $queries.first.data }}", "Second")
    );

    const resolved: { op?: any; err?: unknown }[] = [];
    const env = mkEnv();
    const stateSpecs: $StateSpec<any>[] = [
      {
        path: "filter",
        type: "private",
        variableType: "text",
        initFunc: () => "sport",
      },
    ];
    const ctx = mkCtx(env, new Map(), stateSpecs);

    const sub = {
      React,
      dataSources: {
        usePlasmicQueries: () => ({}),
        usePlasmicDataOp: (dataOp: (() => any) | undefined) => {
          const idx = resolved.length;
          try {
            resolved.push({ op: dataOp?.() });
          } catch (err) {
            resolved.push({ err });
          }
          return { isLoading: false, data: [`q${idx}`] };
        },
      },
    } as unknown as SubDeps;

    function Harness() {
      env.$state = useDollarState(stateSpecs, env, { inCanvas: true });
      useComponentLevelQueries(sub, ctx, component);
      return null;
    }
    await act(async () => {
      render(<Harness />);
    });

    // Second read First's result from this same render, not the previous one's.
    expect(resolved.map((r) => r.err)).toEqual(resolved.map(() => undefined));
    expect(resolved[0].op).toMatchObject({ userArgs: { filters: ["sport"] } });
    expect(resolved[1].op).toMatchObject({ userArgs: { filters: [["q0"]] } });
  });

  describe("late custom function registration", () => {
    /**
     * Renders through the real `usePlasmicQueries`, which runs a `usePlasmicQuery`
     * (and therefore React hooks) per query in the tree.
     */
    function setup() {
      const component = mkEmptyComponent();
      component.serverQueries.push(mkFunctionServerQuery(mkFetchFunction()));

      // Empty on a cold load: the host hasn't run its registrations yet.
      const registeredFunctions = new Map<string, any>();
      const env = mkEnv();
      const ctx = mkCtx(env, registeredFunctions);

      const sub = {
        React,
        dataSources: {
          usePlasmicQueries,
          usePlasmicDataOp: () => ({ isLoading: false, data: undefined }),
        },
      } as unknown as SubDeps;

      function Fetcher() {
        useComponentLevelQueries(sub, ctx, component);
        return null;
      }

      return {
        component,
        ctx,
        env,
        Fetcher,
        register: () =>
          registeredFunctions.set("plasmic.fetch", {
            function: async () => [1, 2],
            meta: { name: "fetch", params: [] },
          }),
      };
    }

    it("remounts the fetcher so the new query's hooks are added on a fresh mount", async () => {
      const { component, ctx, env, Fetcher, register } = setup();

      // Mirrors wrapInComponentDataQueries(): the fetcher's identity is its hook
      // counts, so a change to them remounts rather than growing hooks in place.
      function Harness() {
        return (
          <Fetcher key={getQueryFetcherHookCounts(ctx, component).join(":")} />
        );
      }

      expect(getQueryFetcherHookCounts(ctx, component)).toEqual([0, 0]);
      const { rerender } = render(<Harness />);
      expect(Object.keys(env.$q)).toEqual([]);

      // The registration completes and the canvas re-renders.
      register();
      expect(getQueryFetcherHookCounts(ctx, component)).toEqual([0, 1]);
      await act(async () => {
        rerender(<Harness />);
      });
      expect(Object.keys(env.$q)).toEqual(["myQuery"]);
    });

    it("would break React's hook order if the fetcher were not remounted", () => {
      // Same component instance across both renders, i.e. no remount.
      const { Fetcher, register } = setup();
      const { rerender } = render(<Fetcher />);

      register();
      // React warns about the changed hook order and then throws while diffing
      // the hook it has no previous entry for.
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      // react-dom rethrows render errors through a synthetic DOM event, which jsdom reports
      // as an uncaught error. The throw is the point of this test, so cancel the report.
      const cancelErrorEvent = (e: ErrorEvent) => e.preventDefault();
      window.addEventListener("error", cancelErrorEvent);
      try {
        expect(() => rerender(<Fetcher />)).toThrow(TypeError);
        expect(consoleError.mock.calls.flat().join("\n")).toMatch(
          /change in the order of Hooks/
        );
      } finally {
        window.removeEventListener("error", cancelErrorEvent);
        consoleError.mockRestore();
      }
    });
  });
});
