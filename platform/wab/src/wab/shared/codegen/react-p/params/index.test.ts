import { SerializerBaseContext } from "@/wab/shared/codegen/react-p/types";
import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { mkParam } from "@/wab/shared/core/lang";
import { mkTplTagX } from "@/wab/shared/core/tpls";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { Param } from "@/wab/shared/model/classes";
import { typeFactory } from "@/wab/shared/model/model-util";
import { getArgsTypeContent, serializeArgsType } from ".";

function componentWithParams(params: Param[]) {
  return mkComponent({
    name: "comp",
    type: ComponentType.Plain,
    tplTree: mkTplTagX("div"),
    params: params,
  });
}

const DEFAULT_CTX = {
  exportOpts: {
    forceAllProps: true,
  },
  projectFlags: DEVFLAGS,
} as SerializerBaseContext;

describe("Code generation of params", () => {
  describe("getArgsTypeContent", () => {
    it("should serialize prop params", () => {
      expect(
        getArgsTypeContent({
          ...DEFAULT_CTX,
          component: componentWithParams([]),
        })
      ).toBe("{}");

      expect(
        getArgsTypeContent({
          ...DEFAULT_CTX,
          component: componentWithParams([
            mkParam({
              name: "param1",
              type: typeFactory.text(),
              paramType: "prop",
            }),
          ]),
        })
      ).toEqual(`{"param1"?: string;}`);

      expect(
        getArgsTypeContent({
          ...DEFAULT_CTX,
          component: componentWithParams([
            mkParam({
              name: "param1",
              type: typeFactory.bool(),
              paramType: "prop",
            }),
            mkParam({
              name: "param2",
              type: typeFactory.renderable(),
              paramType: "slot",
            }),
          ]),
        })
      ).toEqual(`{"param1"?: boolean;\n"param2"?: React.ReactNode;}`);
    });
  });

  describe("serializeArgsType", () => {
    it("should serialize args type declaration and list of args", () => {
      expect(
        serializeArgsType({
          ...DEFAULT_CTX,
          component: componentWithParams([]),
        })
      ).toBe(`
export type PlasmicComp__ArgsType = {};
type ArgPropType = keyof PlasmicComp__ArgsType;
export const PlasmicComp__ArgProps = new Array<ArgPropType>();
`);

      expect(
        serializeArgsType({
          ...DEFAULT_CTX,
          component: componentWithParams([
            mkParam({
              name: "param1",
              type: typeFactory.text(),
              paramType: "prop",
            }),
          ]),
        })
      ).toEqual(`
export type PlasmicComp__ArgsType = {"param1"?: string;};
type ArgPropType = keyof PlasmicComp__ArgsType;
export const PlasmicComp__ArgProps = new Array<ArgPropType>("param1");
`);

      expect(
        serializeArgsType({
          ...DEFAULT_CTX,
          component: componentWithParams([
            mkParam({
              name: "param1",
              type: typeFactory.bool(),
              paramType: "prop",
            }),
            mkParam({
              name: "param2",
              type: typeFactory.renderable(),
              paramType: "slot",
            }),
          ]),
        })
      ).toEqual(`
export type PlasmicComp__ArgsType = {"param1"?: boolean;\n"param2"?: React.ReactNode;};
type ArgPropType = keyof PlasmicComp__ArgsType;
export const PlasmicComp__ArgProps = new Array<ArgPropType>("param1", "param2");
`);
    });

    expect(
      serializeArgsType({
        ...DEFAULT_CTX,
        exportOpts: {
          forceAllProps: true,
          shouldTransformWritableStates: true,
        } as SerializerBaseContext["exportOpts"],
        component: componentWithParams([
          mkParam({
            name: "param1",
            type: typeFactory.bool(),
            paramType: "prop",
          }),
          mkParam({
            name: "param2",
            type: typeFactory.renderable(),
            paramType: "slot",
          }),
        ]),
      })
    ).toEqual(`
export type PlasmicComp__ArgsType = {"param1"?: boolean;\n"param2"?: React.ReactNode;};
type ArgPropType = keyof PlasmicComp__ArgsType;
export const PlasmicComp__ArgProps = new Array<ArgPropType>("__plasmicIsPreviewRoot", "param1", "param2");
`);
  });
});
