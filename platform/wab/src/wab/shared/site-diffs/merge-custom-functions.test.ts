import { mkServerQuery } from "@/wab/shared/codegen/react-p/server-queries/__testonly__/test-utils";
import { ensure, mkShortId, only } from "@/wab/shared/common";
import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { codeLit } from "@/wab/shared/core/exprs";
import { createSite } from "@/wab/shared/core/sites";
import { mkTplTagX } from "@/wab/shared/core/tpls";
import {
  CodeLibrary,
  CustomFunction,
  CustomFunctionExpr,
  ensureKnownCustomFunctionExpr,
  ensureKnownEventHandler,
  ensureKnownQueryInvalidationExpr,
  ensureKnownTplTag,
  EventHandler,
  FunctionArg,
  Interaction,
  NameArg,
  QueryInvalidationExpr,
  QueryRef,
  Site,
} from "@/wab/shared/model/classes";
import { typeFactory } from "@/wab/shared/model/model-util";
import {
  fetchLastBundleVersion,
  testMerge,
} from "@/wab/shared/site-diffs/__testonly__/utils";
import { TplMgr } from "@/wab/shared/TplMgr";

beforeAll(async () => {
  await fetchLastBundleVersion();
});

/** Registers `getQuote`, like `createCustomFunctionFromRegistration` does. */
function registerFunction(site: Site) {
  const fn = new CustomFunction({
    namespace: null,
    importName: "getQuote",
    importPath: "./quote",
    displayName: null,
    defaultExport: false,
    params: [typeFactory.arg("id", typeFactory.text())],
    isQuery: true,
    isMutation: false,
  });
  site.customFunctions.push(fn);
  return fn;
}

/** Removes `getQuote`, like Studio's sync once the host drops it. */
function unregisterFunction(site: Site) {
  site.customFunctions = [];
}

function getComponent(site: Site) {
  return ensure(
    site.components.find((c) => c.name === "TestComponent"),
    "Missing TestComponent",
  );
}

function addQuery(site: Site) {
  getComponent(site).serverQueries.push(
    mkServerQuery(
      "quote",
      new CustomFunctionExpr({ func: getFunction(site), args: [] }),
    ),
  );
}

/**
 * A site with a component, and if `withQuery`, a registered function that the
 * component queries.
 */
function ancestorSite({ withQuery = true } = {}) {
  const site = createSite();
  new TplMgr({ site }).attachComponent(
    mkComponent({
      name: "TestComponent",
      type: ComponentType.Plain,
      tplTree: (baseVariant) => mkTplTagX("div", { baseVariant, styles: {} }),
    }),
  );
  if (withQuery) {
    registerFunction(site);
    addQuery(site);
  }
  return site;
}

function getFunction(site: Site) {
  return only(site.customFunctions);
}

function getQueryOp(site: Site) {
  return ensureKnownCustomFunctionExpr(
    only(getComponent(site).serverQueries).op,
  );
}

/**
 * Re-syncing a registered function whose param type changed replaces the
 * param's ArgType, like `createCustomFunctionFromRegistration` does.
 */
function resyncParam(site: Site) {
  getFunction(site).params = [typeFactory.arg("id", typeFactory.num())];
}

function getRootAttrs(site: Site) {
  return only(ensureKnownTplTag(getComponent(site).tplTree).vsettings).attrs;
}

/** Calls `getQuote` from an onClick interaction on the component's root. */
function addInteraction(site: Site) {
  const handler = new EventHandler({ interactions: [] });
  handler.interactions.push(
    new Interaction({
      uuid: mkShortId(),
      interactionName: "Get quote",
      actionName: "customFunctionOp",
      conditionalMode: "always",
      condExpr: null,
      parent: handler,
      args: [
        new NameArg({
          name: "customFunctionOp",
          expr: new CustomFunctionExpr({ func: getFunction(site), args: [] }),
        }),
      ],
    }),
  );
  getRootAttrs(site).onClick = handler;
}

function getQuery(site: Site, name: string) {
  return ensure(
    getComponent(site).serverQueries.find((q) => q.name === name),
    `Missing query ${name}`,
  );
}

/** Refreshes the `name` query from an onClick "Refresh data" interaction. */
function addRefresh(site: Site, name: string) {
  const handler = new EventHandler({ interactions: [] });
  handler.interactions.push(
    new Interaction({
      uuid: mkShortId(),
      interactionName: "Refresh quote",
      actionName: "invalidateDataQuery",
      conditionalMode: "always",
      condExpr: null,
      parent: handler,
      args: [
        new NameArg({
          name: "queryInvalidation",
          expr: new QueryInvalidationExpr({
            invalidationQueries: [new QueryRef({ ref: getQuery(site, name) })],
            invalidationKeys: null,
          }),
        }),
      ],
    }),
  );
  getRootAttrs(site).onClick = handler;
}

function getRefreshedQueries(site: Site) {
  const handler = ensureKnownEventHandler(getRootAttrs(site).onClick);
  return ensureKnownQueryInvalidationExpr(
    only(only(handler.interactions).args).expr,
  ).invalidationQueries;
}

function useParam(site: Site, code: string) {
  getQueryOp(site).args.push(
    new FunctionArg({
      uuid: mkShortId(),
      argType: only(getFunction(site).params),
      expr: codeLit(code),
    }),
  );
}

describe("merging custom function params", () => {
  it("remaps args when both branches re-synced the same param", () => {
    for (const useOnA of [true, false]) {
      const result = testMerge({
        ancestorSite: ancestorSite(),
        a: (site) => {
          resyncParam(site);
          if (useOnA) {
            useParam(site, "1");
          }
        },
        b: (site) => {
          resyncParam(site);
          if (!useOnA) {
            useParam(site, "1");
          }
        },
      });
      expect(result).toMatchObject({ status: "merged" });
      const mergedParam = only(getFunction(result.mergedSite).params);
      const arg = only(getQueryOp(result.mergedSite).args);
      expect(arg.argType).toBe(mergedParam);
      expect(arg.expr).toMatchObject({ code: '"1"' });
    }
  });

  it("drops args whose param was removed on the other branch", () => {
    const result = testMerge({
      ancestorSite: ancestorSite(),
      a: (site) => {
        getFunction(site).params = [];
      },
      b: (site) => useParam(site, "1"),
    });
    expect(result).toMatchObject({ status: "merged" });
    expect(getQueryOp(result.mergedSite).args).toEqual([]);
  });
});

describe("merging registrations added on both branches", () => {
  it("keeps one copy of a function and points usages at it", () => {
    for (const useOnA of [true, false]) {
      const register = (site: Site, use: boolean) => {
        registerFunction(site);
        if (use) {
          addQuery(site);
          useParam(site, "1");
        }
      };
      const result = testMerge({
        ancestorSite: ancestorSite({ withQuery: false }),
        a: (site) => register(site, useOnA),
        b: (site) => register(site, !useOnA),
      });
      expect(result).toMatchObject({ status: "merged" });
      const fn = getFunction(result.mergedSite);
      const op = getQueryOp(result.mergedSite);
      expect(op.func).toBe(fn);
      const arg = only(op.args);
      expect(arg.argType).toBe(only(fn.params));
      expect(arg.expr).toMatchObject({ code: '"1"' });
    }
  });

  it("keeps one copy of a library", () => {
    const registerLibrary = (site: Site) =>
      site.codeLibraries.push(
        new CodeLibrary({
          name: "lodash",
          importPath: "lodash",
          jsIdentifier: "_",
          importType: "default",
          namedImport: null,
          isSyntheticDefaultImport: false,
        }),
      );
    const result = testMerge({
      ancestorSite: ancestorSite({ withQuery: false }),
      a: registerLibrary,
      b: registerLibrary,
    });
    expect(result).toMatchObject({ status: "merged" });
    expect(only(result.mergedSite.codeLibraries).name).toBe("lodash");
  });

  it("keeps usages of a function added on one branch", () => {
    const result = testMerge({
      ancestorSite: ancestorSite({ withQuery: false }),
      a: (site) => {
        registerFunction(site);
        addQuery(site);
        useParam(site, "1");
      },
      b: (site) => {
        site.customFunctions.push(
          new CustomFunction({
            namespace: null,
            importName: "getOrder",
            importPath: "./order",
            displayName: null,
            defaultExport: false,
            params: [],
            isQuery: true,
            isMutation: false,
          }),
        );
      },
    });
    expect(result).toMatchObject({ status: "merged" });
    const fn = ensure(
      result.mergedSite.customFunctions.find(
        (f) => f.importName === "getQuote",
      ),
      "Missing getQuote",
    );
    const op = getQueryOp(result.mergedSite);
    expect(op.func).toBe(fn);
    expect(only(op.args).argType).toBe(only(fn.params));
  });
});

describe("merging a site that already has duplicate registrations", () => {
  it("keeps the last copy, the one codegen already uses", () => {
    const ancestor = ancestorSite();
    const current = only(ancestor.customFunctions);
    ancestor.customFunctions.unshift(
      new CustomFunction({
        namespace: null,
        importName: "getQuote",
        importPath: "./old-quote",
        displayName: null,
        defaultExport: false,
        params: [typeFactory.arg("id", typeFactory.text())],
        isQuery: true,
        isMutation: false,
      }),
    );
    const result = testMerge({
      ancestorSite: ancestor,
      a: (site) => addRefresh(site, "quote"),
      b: () => {},
    });
    expect(result).toMatchObject({ status: "merged" });
    const fn = getFunction(result.mergedSite);
    expect(fn.importPath).toBe(current.importPath);
    expect(getQueryOp(result.mergedSite).func).toBe(fn);
  });
});

describe("merging a function removed on one branch", () => {
  const ancestorWithFunction = () => {
    const site = ancestorSite({ withQuery: false });
    registerFunction(site);
    return site;
  };

  it("keeps a query added on the other branch, without the function", () => {
    const result = testMerge({
      ancestorSite: ancestorWithFunction,
      a: unregisterFunction,
      b: (site) => {
        addQuery(site);
        useParam(site, "1");
      },
    });
    expect(result).toMatchObject({ status: "merged" });
    expect(result.mergedSite.customFunctions).toEqual([]);
    expect(only(getComponent(result.mergedSite).serverQueries).op).toBeNull();
  });

  it("removes the function from an interaction added on the other branch", () => {
    const result = testMerge({
      ancestorSite: ancestorWithFunction,
      a: unregisterFunction,
      b: addInteraction,
    });
    expect(result).toMatchObject({ status: "merged" });
    const handler = ensureKnownEventHandler(
      getRootAttrs(result.mergedSite).onClick,
    );
    expect(only(handler.interactions).args).toEqual([]);
  });
});

describe("merging a query removed on one branch", () => {
  it("removes a refresh of it added on the other branch", () => {
    const result = testMerge({
      ancestorSite: ancestorSite(),
      a: (site) => {
        getComponent(site).serverQueries = [];
      },
      b: (site) => addRefresh(site, "quote"),
    });
    expect(result).toMatchObject({ status: "merged" });
    expect(getComponent(result.mergedSite).serverQueries).toEqual([]);
    expect(getRefreshedQueries(result.mergedSite)).toEqual([]);
  });

  it("moves a refresh to another query of the same function", () => {
    const result = testMerge({
      ancestorSite: () => {
        const site = ancestorSite();
        getComponent(site).serverQueries.push(
          mkServerQuery(
            "otherQuote",
            new CustomFunctionExpr({ func: getFunction(site), args: [] }),
          ),
        );
        return site;
      },
      a: (site) => {
        getComponent(site).serverQueries = [getQuery(site, "otherQuote")];
      },
      b: (site) => addRefresh(site, "quote"),
    });
    expect(result).toMatchObject({ status: "merged" });
    const refresh = only(getRefreshedQueries(result.mergedSite));
    expect(refresh).toMatchObject({
      ref: getQuery(result.mergedSite, "otherQuote"),
    });
  });
});
