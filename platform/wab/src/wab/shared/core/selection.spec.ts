import { ensureInstance } from "@/wab/shared/common";
import { SQ } from "@/wab/shared/core/selection";
import { ValState } from "@/wab/shared/eval/val-state";
import { getSlotParams } from "@/wab/shared/SlotUtils";
import { TplMgr } from "@/wab/shared/TplMgr";
import { getBaseVariant } from "@/wab/shared/Variants";
import { createSite } from "@/wab/shared/core/sites";
import { SlotSelection } from "@/wab/shared/core/slots";
import { componentLib } from "@/wab/test/eval";
import { buildValTree, TEST_GLOBAL_VARIANT } from "@/wab/test/tpls";
import { mkTplComponentX, mkTplTagSimple } from "@/wab/shared/core/tpls";
import { ValComponent } from "@/wab/shared/core/val-nodes";

describe("SelQuery", () => {
  const site = createSite();
  const tplMgr = new TplMgr({ site });
  const rootComp = tplMgr.addComponent();
  rootComp.tplTree = mkTplComponentX({
    component: componentLib.Slotted(),
    children: mkTplTagSimple("div"),
    baseVariant: getBaseVariant(rootComp),
  });
  const container = mkTplComponentX({
    component: rootComp,
    baseVariant: TEST_GLOBAL_VARIANT,
  });
  const sysTree = buildValTree(container);
  const valTree = ensureInstance(sysTree.contents![0], ValComponent);
  const valState = new ValState({
    sysRoot: sysTree,
    globalRoot: sysTree,
  });
  const sq = SQ(valTree, valState);
  const child = sq.fullstack().children();
  const valSlot = child.children();
  const slotSelection = new SlotSelection({
    val: valTree,
    slotParam: getSlotParams(valTree.tpl.component)[0],
  });
  const [slotArg] = [...valTree.slotArgs.values()][0];
  describe("ancestors", () => {
    it("works", () => {
      expect(SQ(slotArg, valState).ancestors().toArray()).toEqual([
        slotArg,
        slotSelection,
        valTree,
      ]);
      expect(SQ(slotArg, valState).fullstack().ancestors().toArray()).toEqual([
        slotArg,
        valSlot.get(),
        child.get(),
        valTree,
      ]);
    });
  });
  describe("descendantsDfsLocal", () => {
    it("returns SlotSelection and slot args", () => {
      expect(sq.descendantsDfs().toArray()).toEqual([
        valTree,
        slotSelection,
        slotArg,
      ]);
      expect(sq.fullstack().descendantsDfs().toArray()).toEqual([
        valTree,
        child.get(),
        valSlot.get(),
        slotArg,
      ]);
    });
  });
});
