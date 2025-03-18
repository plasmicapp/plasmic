import { serializeArgsType } from "@/wab/shared/codegen/react-p/params";
import {
  makePlasmicClientRscComponentName,
  makePlasmicServerRscComponentName,
  serializeServerQueryEntryType,
} from "@/wab/shared/codegen/react-p/server-queries/serializer";
import { SerializerBaseContext } from "@/wab/shared/codegen/react-p/types";
import { mkShortId } from "@/wab/shared/common";
import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { customCode } from "@/wab/shared/core/exprs";
import { mkParam } from "@/wab/shared/core/lang";
import { mkTplTagX } from "@/wab/shared/core/tpls";
import { DEVFLAGS } from "@/wab/shared/devflags";
import {
  ComponentServerQuery,
  CustomFunction,
  CustomFunctionExpr,
  FunctionArg,
} from "@/wab/shared/model/classes";
import { typeFactory } from "@/wab/shared/model/model-util";

function mkServerQuery(name: string, op: CustomFunctionExpr | null) {
  return new ComponentServerQuery({
    uuid: mkShortId(),
    name,
    op,
  });
}

function mkCustomFunctionExpr(
  name: string,
  params: string[],
  args: Array<{
    name: string;
    code: string;
  }>
) {
  return new CustomFunctionExpr({
    func: new CustomFunction({
      namespace: "",
      importName: name,
      importPath: "",
      defaultExport: false,
      params: params.map((p) => typeFactory.arg(p, typeFactory.text())),
      isQuery: true,
    }),
    args: args.map(
      (arg) =>
        new FunctionArg({
          uuid: mkShortId(),
          argType: typeFactory.arg(arg.name, typeFactory.text()),
          expr: customCode(arg.code),
        })
    ),
  });
}

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
    mkServerQuery("query1", mkCustomFunctionExpr("func1", [], [])),
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

  describe("serializeServerQueryEntryType", () => {
    it("should serialize typescript definition of queries result", () => {
      const { component, componentWithoutQueries } =
        basicComponentsWithServerQueries();

      expect(serializeServerQueryEntryType(component))
        .toEqual(`$serverQueries?: {
query1: Awaited<ReturnType<typeof func1>>;
query2: Awaited<ReturnType<typeof func2>>;
query4: Awaited<ReturnType<typeof func4>>;
query5: Awaited<ReturnType<typeof func5>>;
};`);

      expect(serializeServerQueryEntryType(componentWithoutQueries)).toBeNull();
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
export type PlasmicComponent__ArgsType = {"param1"?: string;\n$serverQueries?: {
query1: Awaited<ReturnType<typeof func1>>;
query2: Awaited<ReturnType<typeof func2>>;
query4: Awaited<ReturnType<typeof func4>>;
query5: Awaited<ReturnType<typeof func5>>;
};};
type ArgPropType = keyof PlasmicComponent__ArgsType;
export const PlasmicComponent__ArgProps = new Array<ArgPropType>("param1", "$serverQueries");
`);
    });
  });
});
