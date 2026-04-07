import { serializeArgsType } from "@/wab/shared/codegen/react-p/params";
import {
  getDataTokensFromServerQueries,
  serializeCreateDollarQueries,
} from "@/wab/shared/codegen/react-p/server-queries/index";
import {
  makePlasmicClientRscComponentName,
  makePlasmicServerRscComponentName,
} from "@/wab/shared/codegen/react-p/server-queries/serializer";
import {
  mkComponentWithQueries,
  mkCustomCodeOp,
  mkCustomFunctionExpr,
  mkServerQuery,
} from "@/wab/shared/codegen/react-p/server-queries/test-utils";
import { SerializerBaseContext } from "@/wab/shared/codegen/react-p/types";
import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { mkParam } from "@/wab/shared/core/lang";
import { mkTplTagX } from "@/wab/shared/core/tpls";
import { DEVFLAGS } from "@/wab/shared/devflags";
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

describe("Code generation of server queries", () => {
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

  describe("serializeCreateDollarQueries", () => {
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

      const result = serializeCreateDollarQueries(makeCtx(component));
      expect(result).toContain('"myQuery"');
      expect(result).toContain('id: "fetchData"');
      expect(result).toContain("fn: $$.fetchData");
      expect(result).toContain("$ctx.apiUrl");
      expect(result).toContain("10");
    });

    it("serializes a custom code server query (no await)", () => {
      const query = mkServerQuery("myQuery", mkCustomCodeOp("1 + 2"));
      const component = mkComponentWithQueries(query);

      const result = serializeCreateDollarQueries(makeCtx(component));
      expect(result).toContain('"myQuery"');
      expect(result).toContain('id: "custom:' + query.uuid);
      expect(result).toContain("fn: () => {"); // no async
      expect(result).toContain("return 1 + 2;");
      expect(result).toContain("execParams: () => []");
    });

    it("serializes a custom code server query (with await)", () => {
      const query = mkServerQuery(
        "myQuery",
        mkCustomCodeOp(`await new Promise(r => r(3000))`)
      );
      const component = mkComponentWithQueries(query);

      const result = serializeCreateDollarQueries(makeCtx(component));
      expect(result).toContain('"myQuery"');
      expect(result).toContain('id: "custom:' + query.uuid);
      expect(result).toContain("fn: async () => {"); // has async
      expect(result).toContain("return await new Promise(r => r(3000))");
      expect(result).toContain("execParams: () => []");
    });

    it("adds implicit return for multi-statement code", () => {
      const component = mkComponentWithQueries(
        mkServerQuery(
          "myQuery",
          mkCustomCodeOp("const x = 1;\nconst y = 2;\nx + y")
        )
      );

      const result = serializeCreateDollarQueries(makeCtx(component));
      expect(result).toContain("const x = 1;");
      expect(result).toContain("const y = 2;");
      expect(result).toContain("return x + y;");
    });

    it("skips queries without operations", () => {
      const component = mkComponentWithQueries(
        mkServerQuery("configured", mkCustomCodeOp("1")),
        mkServerQuery("unconfigured", null)
      );

      const result = serializeCreateDollarQueries(makeCtx(component));
      expect(result).toContain('"configured"');
      expect(result).not.toContain('"unconfigured"');
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

      const result = serializeCreateDollarQueries(makeCtx(component));
      expect(result).toContain(
        "execParams: () => [$q.queryA.data, $q.queryB.data]"
      );
    });

    it("does not include self-references in $q dependencies", () => {
      const component = mkComponentWithQueries(
        mkServerQuery("myQuery", mkCustomCodeOp("$q.myQuery"))
      );

      const result = serializeCreateDollarQueries(makeCtx(component));
      expect(result).toContain("execParams: () => []");
    });

    it("returns empty string when ctx.hasServerQueries is false", () => {
      const { component } = basicComponentsWithServerQueries();
      expect(serializeCreateDollarQueries(makeCtx(component, false))).toBe("");
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
});
