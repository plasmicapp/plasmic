import { InsertRelLoc } from "@/wab/client/components/canvas/view-ops";
import { insertHtmlTool } from "@/wab/client/copilot/tools/insertHtml";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { fakeStudioCtx } from "@/wab/client/test/fake-init-ctx";
import {
  ensureVariantSetting,
  getBaseVariant,
  mkVariant,
} from "@/wab/shared/Variants";
import { ComponentType } from "@/wab/shared/core/components";
import { customCode } from "@/wab/shared/core/exprs";
import { mkParam } from "@/wab/shared/core/lang";
import {
  addComponentState,
  mkValueStateForTextInput,
} from "@/wab/shared/core/states";
import * as Tpls from "@/wab/shared/core/tpls";
import { Component, TplRef, TplTag } from "@/wab/shared/model/classes";
import { typeFactory } from "@/wab/shared/model/model-util";
import {
  TplVisibility,
  getEffectiveTplVisibility,
} from "@/wab/shared/visibility-utils";
import { runInAction } from "mobx";

let studioCtx: StudioCtx;
let page: Component;

beforeEach(() => {
  ({ studioCtx } = fakeStudioCtx());
  page = studioCtx.addComponent("Page", { type: ComponentType.Page });
});

function rootDiv() {
  return page.tplTree as TplTag;
}

function addChild(tag: string, opts: Tpls.MkTplTagOpts = {}): TplTag {
  const tpl = Tpls.mkTplTagX(tag, opts);
  ensureVariantSetting(tpl, [getBaseVariant(page)]);
  studioCtx.focusedViewCtx()!.viewOps.insertAsChild(tpl, rootDiv());
  return tpl;
}

describe("insertHtml copilot tool", () => {
  describe("insertRelLoc: replace", () => {
    it("replaces a target element with new HTML", async () => {
      const sibling = addChild("span");
      const target = addChild("span");

      await insertHtmlTool.execute(studioCtx, {
        html: "<p>Hello</p>",
        componentUuid: page.uuid,
        tplUuid: target.uuid,
        insertRelLoc: "replace",
      });

      expect(target.parent).toEqual(null);
      const children = Tpls.tplChildren(rootDiv());
      expect(children).toHaveLength(2);
      expect(children[0]).toEqual(sibling);
      expect(Tpls.getTagOrComponentName(children[1])).toEqual("p");
    });

    it("preserves the target's sibling index", async () => {
      const a = addChild("span");
      const b = addChild("span");
      const c = addChild("span");

      await insertHtmlTool.execute(studioCtx, {
        html: "<p>middle</p>",
        componentUuid: page.uuid,
        tplUuid: b.uuid,
        insertRelLoc: "replace",
      });

      const children = Tpls.tplChildren(rootDiv());
      expect(children).toHaveLength(3);
      expect(children[0]).toEqual(a);
      expect(Tpls.getTagOrComponentName(children[1])).toEqual("p");
      expect(children[2]).toEqual(c);
    });

    it("replaces a target with a multi-element HTML fragment", async () => {
      const before = addChild("span");
      const target = addChild("span");
      const after = addChild("span");

      await insertHtmlTool.execute(studioCtx, {
        html: "<p>one</p><em>two</em>",
        componentUuid: page.uuid,
        tplUuid: target.uuid,
        insertRelLoc: "replace",
      });

      expect(target.parent).toEqual(null);
      const children = Tpls.tplChildren(rootDiv());
      expect(children).toHaveLength(4);
      expect(children[0]).toEqual(before);
      expect(Tpls.getTagOrComponentName(children[1])).toEqual("p");
      expect(Tpls.getTagOrComponentName(children[2])).toEqual("em");
      expect(children[3]).toEqual(after);
    });

    it("rejects replacing the component root with a multi-element fragment", async () => {
      const oldRoot = rootDiv();

      const result = await insertHtmlTool.execute(studioCtx, {
        html: "<section>a</section><aside>b</aside>",
        componentUuid: page.uuid,
        tplUuid: oldRoot.uuid,
        insertRelLoc: "replace",
      });

      expect(result).toContain("Failed to replace");
      expect(page.tplTree).toEqual(oldRoot);
    });

    it("blocks replacement when the target is referenced by a TplRef", async () => {
      const target = addChild("input");
      page.params.push(
        mkParam({
          name: "ref",
          type: typeFactory.text(),
          paramType: "prop",
          defaultExpr: new TplRef({ tpl: target }),
        })
      );

      const result = await insertHtmlTool.execute(studioCtx, {
        html: "<p>nope</p>",
        componentUuid: page.uuid,
        tplUuid: target.uuid,
        insertRelLoc: "replace",
      });

      expect(result).toContain("Failed to replace");
      expect(Tpls.tplChildren(rootDiv())).toEqual([target]);
    });

    it("blocks replacement when the target's implicit state is referenced elsewhere", async () => {
      const target = addChild("input", { name: "myInput" });
      const sibling = addChild("div");

      const state = mkValueStateForTextInput(target, page, studioCtx.tplMgr());
      addComponentState(studioCtx.site, page, state);

      const vs = ensureVariantSetting(sibling, [getBaseVariant(page)]);
      vs.dataCond = customCode(`$state.myInput.value`);

      const result = await insertHtmlTool.execute(studioCtx, {
        html: "<p>nope</p>",
        componentUuid: page.uuid,
        tplUuid: target.uuid,
        insertRelLoc: "replace",
      });

      expect(result).toContain("Failed to replace");
      expect(Tpls.tplChildren(rootDiv())).toEqual([target, sibling]);
    });
  });

  describe("insertRelLoc: replace in a non-base variant", () => {
    function activateVariant(name: string) {
      const variant = mkVariant({ name });
      runInAction(() => {
        page.variants.push(variant);
        studioCtx.focusedViewCtx()!.arenaFrame().targetVariants.push(variant);
      });
      return variant;
    }

    it("hides the target in the active combo instead of removing it", () => {
      const sibling = addChild("em");
      const target = addChild("span");
      const desktop = activateVariant("desktop");

      const viewCtx = studioCtx.focusedViewCtx()!;
      const newTpl = Tpls.mkTplTagX("p");
      ensureVariantSetting(newTpl, [getBaseVariant(page)]);

      viewCtx.viewOps.pasteNodes({
        nodes: [newTpl],
        target,
        loc: InsertRelLoc.replace,
      });

      expect(target.parent).not.toEqual(null);

      // Target is not visible in the desktop combo.
      const desktopVisibility = getEffectiveTplVisibility(target, [desktop]);
      expect(desktopVisibility).not.toEqual(TplVisibility.Visible);

      // Target is still visible in base.
      expect(getEffectiveTplVisibility(target, [getBaseVariant(page)])).toEqual(
        TplVisibility.Visible
      );

      const children = Tpls.tplChildren(rootDiv());
      expect(children).toHaveLength(3);
      expect(children).toContain(sibling);
      expect(children).toContain(target);
    });

    it("rejects replacing the component root in a variant combo", () => {
      activateVariant("desktop");

      const viewCtx = studioCtx.focusedViewCtx()!;
      const oldRoot = rootDiv();
      const newTpl = Tpls.mkTplTagX("section");
      ensureVariantSetting(newTpl, [getBaseVariant(page)]);

      viewCtx.viewOps.pasteNodes({
        nodes: [newTpl],
        target: oldRoot,
        loc: InsertRelLoc.replace,
      });

      expect(page.tplTree).toEqual(oldRoot);
      expect(Tpls.tplChildren(rootDiv())).toHaveLength(0);
    });
  });
});
