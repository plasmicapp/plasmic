import { $$$ } from "@/wab/shared/TplQuery";
import {
  ensureBaseVariantSetting,
  getBaseVariant,
} from "@/wab/shared/Variants";
import { serializeArgsType } from "@/wab/shared/codegen/react-p/params";
import { pageReferencesSearchParams } from "@/wab/shared/codegen/react-p/serialize-utils";
import {
  getDataTokensFromServerQueries,
  serializeRootServerQueryTree,
  serializeServerComponentBody,
} from "@/wab/shared/codegen/react-p/server-queries/index";
import {
  makePlasmicClientRscComponentName,
  makePlasmicServerRscComponentName,
  serializeMakeAppRouterPageCtx,
} from "@/wab/shared/codegen/react-p/server-queries/serializer";
import {
  mkComponentWithQueries,
  mkCustomCodeOp,
  mkCustomFunctionExpr,
  mkServerQuery,
} from "@/wab/shared/codegen/react-p/server-queries/test-utils";
import { SerializerBaseContext } from "@/wab/shared/codegen/react-p/types";
import {
  ComponentType,
  mkComponent,
  mkPageMeta,
} from "@/wab/shared/core/components";
import { codeLit, customCode } from "@/wab/shared/core/exprs";
import { mkParam, mkParamsForState } from "@/wab/shared/core/lang";
import { mkState } from "@/wab/shared/core/states";
import { mkTplInlinedText, mkTplTagX } from "@/wab/shared/core/tpls";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { ExprText } from "@/wab/shared/model/classes";
import { typeFactory } from "@/wab/shared/model/model-util";

function basicComponentsWithServerQueries() {
  const component = mkComponent({
    name: "component",
    type: ComponentType.Page,
    tplTree: mkTplTagX("div"),
    params: [
      mkParam({
        name: "param1",
        type: typeFactory.text(),
        paramType: "prop",
      }),
    ],
  });

  component.serverQueries = [
    mkServerQuery("query1", mkCustomFunctionExpr("func1")),
    mkServerQuery(
      "query2",
      mkCustomFunctionExpr(
        "func2",
        ["param1", "param2"],
        [
          { name: "param1", code: "$ctx.pagePath" },
          { name: "param2", code: "$ctx.params.slug" },
        ]
      )
    ),
    mkServerQuery("query3", null),
    mkServerQuery(
      "query4",
      mkCustomFunctionExpr(
        "func4",
        ["param2", "param1"],
        [
          { name: "param1", code: "$ctx.pagePath" },
          { name: "param2", code: "$ctx.params.slug" },
        ]
      )
    ),
    mkServerQuery(
      "query5",
      mkCustomFunctionExpr(
        "func5",
        ["param2", "param1", "param3"],
        [
          { name: "param3", code: "$ctx.pagePath" },
          { name: "param2", code: "$ctx.params.slug" },
        ]
      )
    ),
  ];

  const componentWithoutQueries = mkComponent({
    name: "componentWithoutQueries",
    type: ComponentType.Page,
    tplTree: mkTplTagX("div"),
  });

  return { component, componentWithoutQueries };
}

function makePageWithDynamicText(code: string) {
  const component = mkComponent({
    name: "AdvancedPage",
    type: ComponentType.Page,
    tplTree: mkTplTagX("div"),
  });
  component.pageMeta = mkPageMeta({ path: "/advanced" });

  const baseVariant = getBaseVariant(component);
  const textTpl = mkTplInlinedText("", [baseVariant], "div");
  ensureBaseVariantSetting(textTpl).text = new ExprText({
    expr: customCode(code),
    html: false,
  });
  $$$(component.tplTree).append(textTpl);

  return component;
}

describe("Code generation of server queries", () => {
  describe("serializeMakeAppRouterPageCtx", () => {
    function serializePageCtx(component: ReturnType<typeof mkComponent>) {
      return serializeMakeAppRouterPageCtx(
        { component } as SerializerBaseContext,
        "PageProps",
        { usesSearchParams: pageReferencesSearchParams(component) }
      );
    }

    it("awaits searchParams when page render expressions reference $ctx.query", () => {
      const component = makePageWithDynamicText("$ctx.query.myquery");

      expect(pageReferencesSearchParams(component)).toBe(true);
      expect(serializePageCtx(component)).toContain(
        "query: (await searchParams) ?? {},"
      );
    });

    it("keeps query static when page render expressions do not reference $ctx.query", () => {
      const component = makePageWithDynamicText("$ctx.params.slug");

      expect(pageReferencesSearchParams(component)).toBe(false);
      expect(serializePageCtx(component)).toContain("query: {},");
    });

    it("awaits searchParams when server query args reference $ctx.query", () => {
      const component = mkComponentWithQueries(
        mkServerQuery(
          "query",
          mkCustomFunctionExpr(
            "func",
            ["param"],
            [{ name: "param", code: "$ctx.query.myquery" }]
          )
        )
      );
      component.pageMeta = mkPageMeta({ path: "/advanced" });

      expect(pageReferencesSearchParams(component)).toBe(true);
      expect(serializePageCtx(component)).toContain(
        "query: (await searchParams) ?? {},"
      );
    });
  });

  describe("makePlasmicServerRscComponentName", () => {
    it("should return the expected server component name", () => {
      const { component, componentWithoutQueries } =
        basicComponentsWithServerQueries();

      expect(makePlasmicServerRscComponentName(component)).toEqual(
        "PlasmicComponentServer"
      );

      expect(
        makePlasmicServerRscComponentName(componentWithoutQueries)
      ).toEqual("PlasmicComponentWithoutQueriesServer");
    });
  });

  describe("makePlasmicClientRscComponentName", () => {
    it("should return the expected client component name", () => {
      const { component, componentWithoutQueries } =
        basicComponentsWithServerQueries();

      expect(makePlasmicClientRscComponentName(component)).toEqual(
        "ClientComponent"
      );

      expect(
        makePlasmicClientRscComponentName(componentWithoutQueries)
      ).toEqual("ClientComponentWithoutQueries");
    });
  });

  describe("serializeArgsType", () => {
    it("should serialize server queries as args", () => {
      const { component } = basicComponentsWithServerQueries();

      expect(
        serializeArgsType({
          component,
          exprCtx: {
            component: null,
            projectFlags: DEVFLAGS,
            inStudio: false,
          },
          exportOpts: {
            forceAllProps: true,
          },
          projectFlags: DEVFLAGS,
        } as SerializerBaseContext)
      ).toEqual(`
export type PlasmicComponent__ArgsType = {"param1"?: string;};
type ArgPropType = keyof PlasmicComponent__ArgsType;
export const PlasmicComponent__ArgProps = new Array<ArgPropType>("param1");
`);
    });
  });

  describe("serializeRootServerQueryTree", () => {
    function makeCtx(
      component: ReturnType<typeof mkComponent>,
      hasServerQueries = true
    ) {
      return {
        component,
        hasServerQueries,
        exprCtx: {
          component: null,
          projectFlags: DEVFLAGS,
          inStudio: false,
        },
      } as SerializerBaseContext;
    }

    it("serializes a CustomFunctionExpr server query", () => {
      const component = mkComponentWithQueries(
        mkServerQuery(
          "myQuery",
          mkCustomFunctionExpr(
            "fetchData",
            ["url", "limit"],
            [
              { name: "url", code: "$ctx.apiUrl" },
              { name: "limit", code: "10" },
            ]
          )
        )
      );

      const result = serializeRootServerQueryTree(makeCtx(component));
      expect(result).toContain("myQuery");
      expect(result).toContain('id: "fetchData"');
      expect(result).toContain("fn: $$.fetchData");
      expect(result).toContain(
        `  args: ({ $q, $props, $ctx, $state }) => [$ctx.apiUrl, 10],`
      );
    });

    it("serializes a custom code server query (no await)", () => {
      const query = mkServerQuery("myQuery", mkCustomCodeOp("1 + 2"));
      const component = mkComponentWithQueries(query);

      const result = serializeRootServerQueryTree(makeCtx(component));
      expect(result).toContain("myQuery");
      expect(result).toContain('id: "custom-code:' + query.uuid);
      expect(result).toContain("fn: ({ $q, $props, $ctx, $state }) => {"); // no async
      expect(result).toContain("return 1 + 2;");
      expect(result).toContain(
        `
  args: ({ $q, $props, $ctx, $state }) => {
    return [{
      $ctx: {},
      $props: {},
      $q: {},
      $state: {},
    }];
  },`
      );
    });

    it("serializes a custom code server query (with await)", () => {
      const query = mkServerQuery(
        "myQuery",
        mkCustomCodeOp(`await new Promise(r => r(3000))`)
      );
      const component = mkComponentWithQueries(query);

      const result = serializeRootServerQueryTree(makeCtx(component));
      expect(result).toContain("myQuery");
      expect(result).toContain('id: "custom-code:' + query.uuid);
      expect(result).toContain("fn: async ({ $q, $props, $ctx, $state }) => {"); // has async
      expect(result).toContain("return await new Promise(r => r(3000))");
      expect(result).toContain(
        `
  args: ({ $q, $props, $ctx, $state }) => {
    return [{
      $ctx: {},
      $props: {},
      $q: {},
      $state: {},
    }];
  },`
      );
    });

    it("adds implicit return for multi-statement code", () => {
      const component = mkComponentWithQueries(
        mkServerQuery(
          "myQuery",
          mkCustomCodeOp("const x = 1;\nconst y = 2;\nx + y")
        )
      );

      const result = serializeRootServerQueryTree(makeCtx(component));
      expect(result).toContain("const x = 1;");
      expect(result).toContain("const y = 2;");
      expect(result).toContain("return x + y;");
    });

    it("skips queries without operations", () => {
      const component = mkComponentWithQueries(
        mkServerQuery("configured", mkCustomCodeOp("1")),
        mkServerQuery("unconfigured", null)
      );

      const result = serializeRootServerQueryTree(makeCtx(component));
      expect(result).toContain("configured");
      expect(result).not.toContain("unconfigured");
    });

    it("serializes custom code query with multiple $q dependencies", () => {
      const component = mkComponentWithQueries(
        mkServerQuery("queryA", mkCustomFunctionExpr("fnA", [], [])),
        mkServerQuery("queryB", mkCustomFunctionExpr("fnB", [], [])),
        mkServerQuery(
          "combined",
          mkCustomCodeOp("[$q.queryA, $q.queryB. $q.queryA]")
        )
      );

      const result = serializeRootServerQueryTree(makeCtx(component));
      expect(result).toContain("fn: ({ $q, $props, $ctx, $state }) => {");
      expect(result).toContain(
        `
  args: ({ $q, $props, $ctx, $state }) => {
    $q["queryA"].data;
    $q["queryB"].data;
    return [{
      $ctx: {},
      $props: {},
      $q: {
        "queryA": $q["queryA"],
        "queryB": $q["queryB"],
      },
      $state: {},
    }];
  },`
      );
    });

    it("serializes custom code query with single $q dependency", () => {
      const component = mkComponentWithQueries(
        mkServerQuery("greeting", mkCustomCodeOp(`"Welcome to Mars"`)),
        mkServerQuery(
          "fullGreeting",
          mkCustomCodeOp(`$q.greeting.data + ", enjoy your stay!"`)
        )
      );

      const result = serializeRootServerQueryTree(makeCtx(component));
      expect(result).toContain("fn: ({ $q, $props, $ctx, $state }) => {");
      expect(result).toContain(
        `
  args: ({ $q, $props, $ctx, $state }) => {
    $q["greeting"].data;
    return [{
      $ctx: {},
      $props: {},
      $q: {
        "greeting": $q["greeting"],
      },
      $state: {},
    }];
  },`
      );
    });

    it("includes self-references in $q dependencies", () => {
      const component = mkComponentWithQueries(
        mkServerQuery("myQuery", mkCustomCodeOp("$q.myQuery"))
      );

      const result = serializeRootServerQueryTree(makeCtx(component));
      expect(result).toContain(
        `
  args: ({ $q, $props, $ctx, $state }) => {
    $q["myQuery"].data;
    return [{
      $ctx: {},
      $props: {},
      $q: {
        "myQuery": $q["myQuery"],
      },
      $state: {},
    }];
  },`
      );
    });

    it("eagerly accesses $state properties referenced in custom code", () => {
      const component = mkComponentWithQueries(
        mkServerQuery("stateDepQuery", mkCustomCodeOp(`$state.myStateVar`))
      );
      const result = serializeRootServerQueryTree(makeCtx(component));
      expect(result).toContain(
        `
  args: ({ $q, $props, $ctx, $state }) => {
    $state["myStateVar"];
    return [{
      $ctx: {},
      $props: {},
      $q: {},
      $state: {
        "myStateVar": $state["myStateVar"],
      },
    }];
  },`
      );
    });

    it("uses varNames (not display names) as query tree keys", () => {
      // Query names with spaces get converted to camelCase so that $q.fullGreeting
      // works in args functions, not $q["Full Greeting"]
      const component = mkComponentWithQueries(
        mkServerQuery("Greeting", mkCustomCodeOp(`"hello"`)),
        mkServerQuery("Full Greeting", mkCustomCodeOp(`$q.greeting.data + "!"`))
      );

      const result = serializeRootServerQueryTree(makeCtx(component));
      // Keys should be varNames, not display names
      expect(result).toContain("fullGreeting"); // unquoted key in queries object
      expect(result).not.toContain('"Greeting"');
      expect(result).not.toContain('"Full Greeting"');
      expect(result).toContain(
        `
  args: ({ $q, $props, $ctx, $state }) => {
    $q["greeting"].data;
    return [{
      $ctx: {},
      $props: {},
      $q: {
        "greeting": $q["greeting"],
      },
      $state: {},
    }];
  },`
      );
    });

    it("returns empty string when ctx.hasServerQueries is false", () => {
      const { component } = basicComponentsWithServerQueries();
      expect(serializeRootServerQueryTree(makeCtx(component, false))).toBe("");
    });
  });

  describe("getDataTokensFromServerQueries", () => {
    it("returns empty set for queries without operations", () => {
      const queries = [mkServerQuery("q1", null)];
      expect(getDataTokensFromServerQueries(queries)).toEqual(new Set());
    });

    it("returns empty set for queries with no data token references", () => {
      const queries = [
        mkServerQuery("q1", mkCustomCodeOp("1 + 2")),
        mkServerQuery("q2", mkCustomFunctionExpr("fn", [], [])),
      ];
      expect(getDataTokensFromServerQueries(queries)).toEqual(new Set());
    });

    it("extracts data token identifiers from CustomCode ops", () => {
      const queries = [
        mkServerQuery("q1", mkCustomCodeOp("$dataTokens_abc123_myToken.value")),
        mkServerQuery("q2", mkCustomFunctionExpr("fn", [], [])),
      ];
      const result = getDataTokensFromServerQueries(queries);
      expect(result).toEqual(new Set(["$dataTokens_abc123_myToken"]));
    });

    it("extracts data token identifiers from CustomFunctionExpr args", () => {
      const queries = [
        mkServerQuery("q1", mkCustomCodeOp("1 + 2")),
        mkServerQuery(
          "q1",
          mkCustomFunctionExpr(
            "fn",
            ["p1"],
            [{ name: "p1", code: "$dataTokens_xyz789_apiKey" }]
          )
        ),
      ];
      const result = getDataTokensFromServerQueries(queries);
      expect(result).toEqual(new Set(["$dataTokens_xyz789_apiKey"]));
    });

    it("deduplicates token identifiers across queries", () => {
      const queries = [
        mkServerQuery("q1", mkCustomCodeOp("$dataTokens_abc123_token.value")),
        mkServerQuery("q2", mkCustomCodeOp("$dataTokens_abc123_token.other")),
        mkServerQuery(
          "q2",
          mkCustomFunctionExpr(
            "fn",
            ["p1"],
            [{ name: "p1", code: "$dataTokens_proj2_tokenB" }]
          )
        ),
      ];
      const result = getDataTokensFromServerQueries(queries);
      expect(result).toEqual(
        new Set(["$dataTokens_abc123_token", "$dataTokens_proj2_tokenB"])
      );
    });
  });

  describe("serializeServerComponentBody", () => {
    it("passes $props and $ctx to unstable_executePlasmicQueries", () => {
      // Page component with a server query that references $state, plus a
      // private number state with a default value. stateSpecs is now carried
      // on the serverQueryTree itself, so the component body does not need to
      // declare a separate stateSpecs const.
      const component = mkComponentWithQueries(
        mkServerQuery(
          "myQuery",
          mkCustomFunctionExpr(
            "fetchData",
            ["id"],
            [{ name: "id", code: "$state.counter" }]
          )
        )
      );
      const { valueParam, onChangeParam } = mkParamsForState({
        name: "counter",
        variableType: "number",
        accessType: "private",
        onChangeProp: "onCounterChange",
        defaultExpr: codeLit(42),
      });
      const state = mkState({
        param: valueParam,
        onChangeParam,
        accessType: "private",
        variableType: "number",
      });
      component.states.push(state);
      component.params.push(valueParam, onChangeParam);

      const ctx = {
        component,
        hasServerQueries: true,
        exprCtx: {
          component: null,
          projectFlags: DEVFLAGS,
          inStudio: false,
        },
        exportOpts: { shouldTransformWritableStates: false },
        fakeTpls: [],
        projectFlags: DEVFLAGS,
      } as unknown as SerializerBaseContext;

      const body = serializeServerComponentBody(ctx);

      expect(body).not.toContain("$refs");
      // No separate stateSpecs const — it lives on the tree.
      expect(body).not.toContain("const stateSpecs =");
      expect(body).toContain("{ $props: rest, $ctx: ctx }");
    });
  });
});
