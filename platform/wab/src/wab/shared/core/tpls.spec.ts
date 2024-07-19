import * as Components from "@/wab/shared/core/components";
import { ComponentType } from "@/wab/shared/core/components";
import { mkParam } from "@/wab/shared/core/lang";
import { isSlotSelection, SlotSelection } from "@/wab/shared/core/slots";
import * as Tpls from "@/wab/shared/core/tpls";
import { isKnownTplSlot, TplNode } from "@/wab/shared/model/classes";
import { withoutUids } from "@/wab/shared/model/model-meta";
import { typeFactory } from "@/wab/shared/model/model-util";
import { mkBaseVariant } from "@/wab/shared/Variants";
import * as STpls from "@/wab/test/tpls";

describe("clone", () =>
  it("should handle TplComponents", function () {
    const component = Components.mkComponent({
      tplTree: Tpls.mkTplTagX("div", {}),
      type: ComponentType.Plain,
    });
    const tpl = Tpls.mkTplComponent(component, STpls.TEST_GLOBAL_VARIANT, []);
    const clone = Tpls.clone(tpl);
    return expect(withoutUids(clone)).toEqual(withoutUids(tpl));
  }));

describe("flattenTpls", () =>
  it("should work", function () {
    const xs: TplNode[] = [];
    const flattened = Tpls.flattenTpls(
      (xs[0] = Tpls.mkTplTag("div", [
        (xs[1] = STpls.mkTplTestText("hello")),
        (xs[2] = Tpls.mkTplTag("span")),
        (xs[3] = Tpls.mkTplTag("span")),
        (xs[4] = STpls.mkTplTestText("goodbye")),
      ]))
    );
    return expect(flattened).toEqual(xs);
  }));

describe("ancestorsThroughComponentsWithSlotSelections", () => {
  it("should include all tpls through components", () => {
    // Using a single base variant for everything to simplify the test
    // this doesn't affect the execution of ancestorsThroughComponentsWithSlotSelections
    const baseVariant = mkBaseVariant();

    const basicComponent = Components.mkComponent({
      tplTree: Tpls.mkTplTagX(
        "div",
        {
          name: "basicComponent-root",
        },
        []
      ),
      type: ComponentType.Plain,
    });

    function createComponentWithSlot(name: string, type: ComponentType) {
      const slotParam = mkParam({
        name: "children",
        type: typeFactory.renderable(),
        paramType: "slot",
      });

      const tplSlot = Tpls.mkSlot(slotParam);

      const tplTree = Tpls.mkTplTagX(
        "div",
        {
          name: `${name}-root`,
        },
        [tplSlot]
      );

      const component = Components.mkComponent({
        tplTree,
        params: [slotParam],
        type,
        codeComponentMeta:
          type === ComponentType.Code ? ({} as any) : undefined,
      });
      return component;
    }

    const basicComponentInstance = Tpls.mkTplComponentX({
      name: "basicComponent-instance",
      component: basicComponent,
      baseVariant,
    });

    const plainComponent = createComponentWithSlot(
      "plainComponent",
      ComponentType.Plain
    );
    const codeComponent = createComponentWithSlot(
      "codeComponent",
      ComponentType.Code
    );

    const tree = Tpls.mkTplTagX(
      "div",
      {
        name: "root",
      },
      [
        Tpls.mkTplComponentX({
          name: "codeComponent-instance",
          component: codeComponent,
          baseVariant,
          children: [
            Tpls.mkTplComponentX({
              name: "plainComponent-instance",
              component: plainComponent,
              baseVariant,
              children: [basicComponentInstance],
            }),
          ],
        }),
      ]
    );

    function describeNode(node: TplNode | SlotSelection) {
      if (isSlotSelection(node)) {
        return {
          type: "slotSelection",
          slotName: node.slotParam.variable.name,
        };
      }
      if (isKnownTplSlot(node)) {
        return {
          type: "tplSlot",
          slotName: node.param.variable.name,
        };
      }
      return {
        type: "node",
        name: node.name,
      };
    }

    expect(
      Tpls.ancestorsThroughComponentsWithSlotSelections(
        basicComponentInstance
      ).map(describeNode)
    ).toEqual([
      { type: "node", name: "basicComponent-instance" },
      { type: "slotSelection", slotName: "children" },
      { type: "tplSlot", slotName: "children" },
      { type: "node", name: "plainComponent-root" },
      { type: "node", name: "plainComponent-instance" },
      { type: "slotSelection", slotName: "children" },
      { type: "node", name: "codeComponent-instance" },
      { type: "node", name: "root" },
    ]);

    expect(
      Tpls.ancestorsThroughComponentsWithSlotSelections(
        basicComponentInstance,
        {
          includeTplComponentRoot: true,
        }
      ).map(describeNode)
    ).toEqual([
      { type: "node", name: "basicComponent-root" },
      { type: "node", name: "basicComponent-instance" },
      { type: "slotSelection", slotName: "children" },
      { type: "tplSlot", slotName: "children" },
      { type: "node", name: "plainComponent-root" },
      { type: "node", name: "plainComponent-instance" },
      { type: "slotSelection", slotName: "children" },
      { type: "node", name: "codeComponent-instance" },
      { type: "node", name: "root" },
    ]);

    const codeComponentInstance = Tpls.mkTplComponentX({
      name: "codeComponent-instance",
      component: codeComponent,
      baseVariant,
    });

    expect(
      Tpls.ancestorsThroughComponentsWithSlotSelections(
        codeComponentInstance
      ).map(describeNode)
    ).toEqual([{ type: "node", name: "codeComponent-instance" }]);

    expect(
      Tpls.ancestorsThroughComponentsWithSlotSelections(codeComponentInstance, {
        includeTplComponentRoot: true,
      }).map(describeNode)
    ).toEqual([{ type: "node", name: "codeComponent-instance" }]);
  });
});
