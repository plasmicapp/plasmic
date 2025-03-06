import * as Components from "@/wab/shared/core/components";
import { ComponentType } from "@/wab/shared/core/components";
import { mkParam } from "@/wab/shared/core/lang";
import { isSlotSelection } from "@/wab/shared/core/slots";
import * as Tpls from "@/wab/shared/core/tpls";
import {
  ensureKnownTplNode,
  isKnownTplSlot,
  TplNode,
} from "@/wab/shared/model/classes";
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

function ancestorsThroughComponentsUtils() {
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
      codeComponentMeta: type === ComponentType.Code ? ({} as any) : undefined,
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

  function describeNode({ node, layer }: Tpls.NodeWithLayer) {
    if (isSlotSelection(node)) {
      return {
        type: "slotSelection",
        slotName: node.slotParam.variable.name,
        layer,
      };
    }
    if (isKnownTplSlot(node)) {
      return {
        type: "tplSlot",
        slotName: node.param.variable.name,
        layer,
      };
    }
    return {
      type: "node",
      name: node.name,
      layer,
    };
  }

  return {
    baseVariant,
    basicComponentInstance,
    codeComponent,
    describeNode,
    plainComponent,
    tree,
  };
}
describe("ancestorsThroughComponentsWithSlotSelections", () => {
  it("should include all tpls through components", () => {
    const {
      baseVariant,
      basicComponentInstance,
      codeComponent,
      describeNode,
      tree,
    } = ancestorsThroughComponentsUtils();

    expect(
      Tpls.ancestorsThroughComponentsWithSlotSelections(
        basicComponentInstance
      ).map(describeNode)
    ).toEqual([
      { type: "node", name: "basicComponent-instance", layer: 0 },
      { type: "slotSelection", slotName: "children", layer: 0 },
      { type: "tplSlot", slotName: "children", layer: 1 },
      { type: "node", name: "plainComponent-root", layer: 1 },
      { type: "node", name: "plainComponent-instance", layer: 0 },
      { type: "slotSelection", slotName: "children", layer: 0 },
      { type: "node", name: "codeComponent-instance", layer: 0 },
      { type: "node", name: "root", layer: 0 },
    ]);

    expect(
      Tpls.ancestorsThroughComponentsWithSlotSelections(
        basicComponentInstance,
        {
          includeTplComponentRoot: true,
        }
      ).map(describeNode)
    ).toEqual([
      { type: "node", name: "basicComponent-root", layer: 1 },
      { type: "node", name: "basicComponent-instance", layer: 0 },
      { type: "slotSelection", slotName: "children", layer: 0 },
      { type: "tplSlot", slotName: "children", layer: 1 },
      { type: "node", name: "plainComponent-root", layer: 1 },
      { type: "node", name: "plainComponent-instance", layer: 0 },
      { type: "slotSelection", slotName: "children", layer: 0 },
      { type: "node", name: "codeComponent-instance", layer: 0 },
      { type: "node", name: "root", layer: 0 },
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
    ).toEqual([{ type: "node", name: "codeComponent-instance", layer: 0 }]);

    expect(
      Tpls.ancestorsThroughComponentsWithSlotSelections(codeComponentInstance, {
        includeTplComponentRoot: true,
      }).map(describeNode)
    ).toEqual([{ type: "node", name: "codeComponent-instance", layer: 0 }]);
  });
});

describe("computeAncestorsValKey", () => {
  it("should properly use the layers to ignore nodes", () => {
    const {
      baseVariant,
      basicComponentInstance,
      codeComponent,
      describeNode,
      plainComponent,
      tree,
    } = ancestorsThroughComponentsUtils();

    const ancestors = Tpls.ancestorsThroughComponentsWithSlotSelections(
      basicComponentInstance
    );
    /**
     * The order of the output is
     * 0: { type: "node", name: "basicComponent-instance", layer: 0 },
     * 1: { type: "slotSelection", slotName: "children", layer: 0 },
     * 2: { type: "tplSlot", slotName: "children", layer: 1 },
     * 3: { type: "node", name: "plainComponent-root", layer: 1 },
     * 4: { type: "node", name: "plainComponent-instance", layer: 0 },
     * 5: { type: "slotSelection", slotName: "children", layer: 0 },
     * 6: { type: "node", name: "codeComponent-instance", layer: 0 },
     * 7: { type: "node", name: "root", layer: 0 },
     */
    const ancestorsValKey = Tpls.computeAncestorsValKey(ancestors);
    expect(ancestorsValKey).toEqual(
      [ancestors[7], ancestors[6], ancestors[4], ancestors[0]]
        .map((el) => ensureKnownTplNode(el.node).uuid)
        .join(".")
    );

    const ancestorsValKey2 = Tpls.computeAncestorsValKey(ancestors.slice(2));
    expect(ancestorsValKey2).toEqual(
      [ancestors[7], ancestors[6], ancestors[4], ancestors[3], ancestors[2]]
        .map((el) => ensureKnownTplNode(el.node).uuid)
        .join(".")
    );

    const ancestorsValKey3 = Tpls.computeAncestorsValKey(ancestors.slice(3));
    expect(ancestorsValKey3).toEqual(
      [ancestors[7], ancestors[6], ancestors[4], ancestors[3]]
        .map((el) => ensureKnownTplNode(el.node).uuid)
        .join(".")
    );
  });
});
