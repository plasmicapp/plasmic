import { deleteTpl } from "@/wab/client/operations/delete-tpl";
import { TplMgr } from "@/wab/shared/TplMgr";
import { ensureVariantSetting, mkBaseVariant } from "@/wab/shared/Variants";
import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { customCode } from "@/wab/shared/core/exprs";
import { mkParam } from "@/wab/shared/core/lang";
import { createSite } from "@/wab/shared/core/sites";
import {
  addComponentState,
  mkValueStateForTextInput,
} from "@/wab/shared/core/states";
import * as Tpls from "@/wab/shared/core/tpls";
import { TplRef, TplTag } from "@/wab/shared/model/classes";
import { typeFactory } from "@/wab/shared/model/model-util";
import { createVariantTplMgr } from "@/wab/shared/tests/site-tests-utils";

function setup(tplTree: TplTag) {
  const component = mkComponent({
    tplTree,
    type: ComponentType.Plain,
  });
  const site = createSite();
  site.components.push(component);
  Tpls.trackComponentSite(component, site);
  Tpls.trackComponentRoot(component);
  const tplMgr = new TplMgr({ site });
  const vtm = createVariantTplMgr(site, tplMgr);
  return { component, site, tplMgr, vtm };
}

describe("deleteTpl", () => {
  it("deletes a child element from the tree", () => {
    const child = Tpls.mkTplTagX("span", {});
    const root = Tpls.mkTplTagX("div", {}, child);
    const { component, site, vtm } = setup(root);

    const result = deleteTpl([child], { component, site, vtm });

    expect(result).toEqual({ result: "deleted" });
    expect(root.children).toHaveLength(0);
  });

  it("deletes multiple children at once", () => {
    const child1 = Tpls.mkTplTagX("span", {});
    const child2 = Tpls.mkTplTagX("span", {});
    const child3 = Tpls.mkTplTagX("span", {});
    const root = Tpls.mkTplTagX("div", {}, child1, child2, child3);
    const { component, site, vtm } = setup(root);

    const result = deleteTpl([child1, child3], { component, site, vtm });

    expect(result).toEqual({ result: "deleted" });
    expect(root.children).toHaveLength(1);
    expect(root.children).toContain(child2);
  });

  it("returns error when deleting the root element", () => {
    const root = Tpls.mkTplTagX("div", {});
    const { component, site, vtm } = setup(root);

    const result = deleteTpl([root], { component, site, vtm });

    expect(result).toEqual({
      result: "error",
      message: "Cannot remove the root element.",
    });
  });

  it("returns error when element is referenced by a TplRef", () => {
    const target = Tpls.mkTplTagX("input", {});
    const root = Tpls.mkTplTagX("div", {}, target);
    const { component, site, vtm } = setup(root);

    // Add a param with a TplRef pointing to target
    const param = mkParam({
      name: "ref",
      type: typeFactory.text(),
      paramType: "prop",
      defaultExpr: new TplRef({ tpl: target }),
    });
    component.params.push(param);

    const result = deleteTpl([target], { component, site, vtm });

    expect(result.result).toEqual("error");
  });

  it("returns error when element has implicit state referenced in component", () => {
    const child = Tpls.mkTplTagX("input", { name: "myInput" });
    const sibling = Tpls.mkTplTagX("div", {});
    const root = Tpls.mkTplTagX("div", {}, child, sibling);
    const { component, site, tplMgr, vtm } = setup(root);

    // Create a named state attached to the child element
    const state = mkValueStateForTextInput(child, component, tplMgr);
    addComponentState(site, component, state);

    // Add a reference to this state's variable in the sibling
    const baseVariant = mkBaseVariant();
    const vs = ensureVariantSetting(sibling, [baseVariant]);
    vs.dataCond = customCode(`$state.myInput.value`);

    const result = deleteTpl([child], { component, site, vtm });

    expect(result.result).toBe("error");
    if (result.result === "error") {
      expect(result.message).toContain("variable");
      expect(result.message).toContain("referenced in the current component");
    }
  });

  it("removes empty list container parent after deleting last child", () => {
    const listItem = Tpls.mkTplTagX("li", {});
    const listContainer = Tpls.mkTplTag("ul", [listItem]);
    const root = Tpls.mkTplTagX("div", {}, listContainer);
    const { component, site, vtm } = setup(root);

    const result = deleteTpl([listItem], { component, site, vtm });

    expect(result).toEqual({ result: "deleted" });
    // The list container (ul) should also be removed since it became empty
    expect(root.children).toHaveLength(0);
  });
});
