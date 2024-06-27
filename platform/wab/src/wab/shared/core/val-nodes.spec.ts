import { ensure, ensureInstance } from "@/wab/shared/common";
import { SQ } from "@/wab/shared/core/selection";
import { ValState } from "@/wab/shared/eval/val-state";
import {
  ensureKnownTplTag,
  TplComponent,
  TplNode,
} from "@/wab/shared/model/classes";
import { TplMgr } from "@/wab/shared/TplMgr";
import { getBaseVariant } from "@/wab/shared/Variants";
import { createSite } from "@/wab/shared/core/sites";
import { SlotSelection } from "@/wab/shared/core/slots";
import { componentLib, Wrapper3 } from "@/wab/test/eval";
import { buildValTree, TEST_GLOBAL_VARIANT } from "@/wab/test/tpls";
import { mkTplComponentFlex, mkTplComponentX, mkTplTagX } from "@/wab/shared/core/tpls";
import { bestValForTpl, ValNode, ValTag } from "@/wab/shared/core/val-nodes";
type NumPath = number[];
describe("bestValForTpl", () => {
  const site = createSite();
  const tplMgr = new TplMgr({ site });
  const rootComp = tplMgr.addComponent();
  const baseVariant = getBaseVariant(rootComp);
  function test({
    tpl,
    initialIndexes,
    initialLabels,
    expectedIndexes,
    target,
    frameNum = 0,
    expectedLabels,
  }: {
    tpl: TplNode;
    initialIndexes?: NumPath;
    initialLabels?: string;
    expectedIndexes?: NumPath;
    expectedLabels?: string;
    target: TplNode | SlotSelection;
    frameNum?: number;
  }) {
    const tplRoot = (rootComp.tplTree = div(tpl));
    const root = mkTplComponentX({
      component: rootComp,
      baseVariant: TEST_GLOBAL_VARIANT,
    });
    const sysTree = buildValTree(root);
    const valTree = ensureInstance(sysTree.contents![0], ValTag);
    const valState = new ValState({
      sysRoot: sysTree,
      globalRoot: sysTree,
    });
    const initialVal = initialLabels
      ? SQ(valTree, valState)
          .fullstack()
          .selectByLabels(initialLabels)
          .last()
          .get()
      : SQ(valTree, valState)
          .fullstack()
          .selectByIndexes(ensure(initialIndexes, () => `Shouldn't be null`))
          .last()
          .get();
    const selectedVal = bestValForTpl(
      target,
      frameNum,
      valState,
      ensureInstance(initialVal, ValNode),
      tplRoot
    );
    const sq = SQ(selectedVal, valState);
    if (expectedLabels) {
      if (sq.get() instanceof SlotSelection) {
        expect(sq.parent().fullstack().labelsPath() + " (slot)").toEqual(
          expectedLabels
        );
      } else {
        expect(sq.fullstack().labelsPath()).toEqual(expectedLabels);
      }
    } else {
      expect(sq.fullstack().indexPath()).toEqual(
        ensure(expectedIndexes, () => `Shouldn't be null`)
      );
    }
  }
  const Slotted = componentLib.Slotted();
  function div(...children: TplNode[]) {
    return mkTplTagX("div", {}, ...children);
  }
  function slotted(...children: TplNode[]) {
    return mkTplComponentX({
      component: Slotted,
      children,
      baseVariant,
    });
  }
  function wrapper3() {
    return mkTplComponentFlex(Wrapper3, baseVariant);
  }
  it("works with slotted component args (same frame)", () => {
    let target: TplNode;
    // The val tree looks like this.  The left bars indicate component stack
    // frame depth.
    //
    // |  slotted
    // ||   div
    // ||     slot
    // |        slotted <-- target
    // ||         div
    // ||           slot
    // |              slotted <-- initial
    test({
      tpl: slotted((target = slotted(slotted(div())))),
      initialLabels: "Slotted div <slot> Slotted div <slot> Slotted",
      target,
      expectedLabels: "Slotted:0 div:0 <slot>:0 Slotted:0",
    });
    // Reverse target/initial
    test({
      tpl: slotted(slotted((target = slotted(div())))),
      initialLabels: "Slotted div <slot> Slotted",
      target,
      expectedLabels:
        "Slotted:0 div:0 <slot>:0 Slotted:0 div:0 <slot>:0" + " Slotted:0",
    });
  });
  it("works within a non-root frame", () => {
    test({
      tpl: wrapper3(),
      initialLabels: "Wrapper3 div",
      target: ensureKnownTplTag(Wrapper3.tplTree).children[0],
      frameNum: 1,
      expectedLabels: "Wrapper3:0 div:0 Wrapper2:0",
    });
  });
  it("can pop up frames", () => {
    test({
      tpl: wrapper3(),
      initialLabels: "Wrapper3 div Wrapper2 div",
      target: ensure(Wrapper3.tplTree, () => `Shouldn't be null`),
      frameNum: 1,
      expectedLabels: "Wrapper3:0 div:0",
    });
  });
  it("works targeting SlotSelections", () => {
    let target: TplComponent;
    test({
      tpl: slotted(div((target = slotted(div())))),
      initialLabels: "Slotted div <slot> div",
      target: new SlotSelection({ tpl: target, slotParam: Slotted.params[0] }),
      expectedLabels: "Slotted:0 div:0 <slot>:0 div:0 Slotted:0 (slot)",
    });
  });
});
