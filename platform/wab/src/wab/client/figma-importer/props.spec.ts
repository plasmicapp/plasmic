import { InstanceNode } from "@/wab/client/figma-importer/plugin-types";
import { fromFigmaComponentToTplProps } from "@/wab/client/figma-importer/props";
import { fakeStudioCtx } from "@/wab/client/test/fake-init-ctx";
import { mkComponentVariantGroup, mkVariant } from "@/wab/shared/Variants";
import { hackyCast } from "@/wab/shared/common";
import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { ParamExportType, mkParam, mkVar } from "@/wab/shared/core/lang";
import { mkTplTagX } from "@/wab/shared/core/tpls";
import { StateParam } from "@/wab/shared/model/classes";
import { typeFactory } from "@/wab/shared/model/model-util";

function createFigmaTestData(getCodeComponentMeta: jest.FunctionLike) {
  const child = {
    type: "INSTANCE",
    name: "ButtonSwap",
    componentPropertyReferences: {
      mainComponent: "swapChild",
    },
    children: [],
  };

  const node: Partial<InstanceNode> = {
    componentProperties: {
      "Error message#1": {
        type: "TEXT",
        value: "ERROR_MESSAGE_1",
      },
      "Filled value#2": {
        type: "TEXT",
        value: "FILLED_VALUE_2",
      },
      "value#3": {
        type: "TEXT",
        value: "VALUE_3",
      },
      "isDisabled#4": {
        type: "BOOLEAN",
        value: "false",
      },
      color: {
        type: "VARIANT",
        value: "primary",
      },
      swapChild: {
        type: "INSTANCE_SWAP",
        value: "FIGMA_INTERNAL_ID1",
      },
      slotValue: {
        type: "TEXT",
        value: "SLOT_VALUE",
      },
      Type: {
        type: "VARIANT",
        value: "ghost",
      },
    },
    exposedInstances: [
      hackyCast<InstanceNode>({
        name: "exposedInst",
        type: "INSTANCE",
        children: [],
        componentProperties: {
          "Exposed prop 1#12:34": {
            type: "TEXT",
            value: "exposedProp1",
          },
        },
      }),
    ],
    type: "INSTANCE",
    children: [
      // @ts-expect-error - child is not a full InstanceNode
      child,
    ],
    mainComponent: {
      id: "FIGMA_INTERNAL_ID2",
      name: "Button",
    },
    parent: null,
  };

  const TypeVariantParam = {
    variable: mkVar("type"),
  } as StateParam;

  const component = mkComponent({
    name: "Button",
    type: ComponentType.Code,
    params: [
      mkParam({
        // We should identify that this prop matches "Error message#1"
        name: "errorMessage",
        type: typeFactory.text(),
        exportType: ParamExportType.External,
        paramType: "prop",
      }),
      mkParam({
        name: "filledValue",
        type: typeFactory.text(),
        exportType: ParamExportType.External,
        paramType: "prop",
      }),
      mkParam({
        name: "value",
        type: typeFactory.text(),
        exportType: ParamExportType.External,
        paramType: "prop",
      }),
      mkParam({
        name: "isDisabled",
        type: typeFactory.bool(),
        exportType: ParamExportType.External,
        paramType: "prop",
      }),
      mkParam({
        name: "color",
        type: typeFactory.text(),
        exportType: ParamExportType.External,
        paramType: "prop",
      }),
      mkParam({
        name: "secondaryColor",
        type: typeFactory.text(),
        exportType: ParamExportType.External,
        paramType: "prop",
      }),
      mkParam({
        name: "slotValue",
        type: typeFactory.renderable(),
        exportType: ParamExportType.External,
        paramType: "slot",
      }),
      TypeVariantParam,
    ],
    variantGroups: [
      mkComponentVariantGroup({
        // The param is neglible for this test
        param: TypeVariantParam,
        multi: false,
        variants: ["primary", "secondary", "ghost"].map((type) => {
          return mkVariant({
            name: `btn-${type}`,
          });
        }),
      }),
    ],
    tplTree: mkTplTagX("div"),
  });

  const { studioCtx } = fakeStudioCtx();
  // @ts-expect-error - assign fake function to get code component meta
  studioCtx.getCodeComponentMeta = getCodeComponentMeta;

  return {
    studioCtx,
    node,
    component,
  };
}

describe("Figma importer slot handling", () => {
  describe("fromFigmaComponentToTplProps", () => {
    it("should directly map props if no transform function is provided", () => {
      const getCodeComponentMeta = jest.fn().mockReturnValue({});
      const { studioCtx, node, component } =
        createFigmaTestData(getCodeComponentMeta);
      expect(
        fromFigmaComponentToTplProps(studioCtx, component, node as InstanceNode)
      ).toEqual([
        ["errorMessage", "ERROR_MESSAGE_1"],
        ["filledValue", "FILLED_VALUE_2"],
        ["value", "VALUE_3"],
        ["color", "primary"],
      ]);
      expect(getCodeComponentMeta).toHaveBeenCalledWith(component);
    });

    it("should call transform function if provided", () => {
      const figmaPropsTransform = jest.fn().mockImplementation((props) => {
        return {
          ...props,
          secondaryColor: `derived-${props.color}`,
          type: `btn-${props.Type}`,
        };
      });

      const getCodeComponentMeta = jest.fn().mockReturnValue({
        figmaPropsTransform,
      });
      const { studioCtx, node, component } =
        createFigmaTestData(getCodeComponentMeta);
      expect(
        fromFigmaComponentToTplProps(studioCtx, component, node as InstanceNode)
      ).toEqual([
        ["errorMessage", "ERROR_MESSAGE_1"],
        ["filledValue", "FILLED_VALUE_2"],
        ["value", "VALUE_3"],
        ["color", "primary"],
        ["secondaryColor", "derived-primary"],
        [
          "type",
          expect.objectContaining({
            variants: [component.variantGroups[0].variants[2]],
          }),
        ],
      ]);
      expect(getCodeComponentMeta).toHaveBeenCalledWith(component);
      expect(figmaPropsTransform).toHaveBeenCalledWith({
        // All props expect for ones that match slots should be here
        "Error message": "ERROR_MESSAGE_1",
        "Filled value": "FILLED_VALUE_2",
        value: "VALUE_3",
        isDisabled: false,
        color: "primary",
        swapChild: "ButtonSwap",
        Type: "ghost",
        "Exposed prop 1": "exposedProp1",
      });
    });
  });
});
