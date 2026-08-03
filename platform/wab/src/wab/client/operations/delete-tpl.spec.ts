import {
  computeTplsToDelete,
  deleteTpl,
} from "@/wab/client/operations/delete-tpl";
import { setupComponentWithTplTree } from "@/wab/client/operations/tests/utils";
import { ensureVariantSetting, mkBaseVariant } from "@/wab/shared/Variants";
import { customCode } from "@/wab/shared/core/exprs";
import { mkParam } from "@/wab/shared/core/lang";
import {
  addComponentState,
  mkValueStateForTextInput,
} from "@/wab/shared/core/states";
import * as Tpls from "@/wab/shared/core/tpls";
import { TplRef } from "@/wab/shared/model/classes";
import { typeFactory } from "@/wab/shared/model/model-util";

describe("deleteTpl", () => {
  it("deletes a child element from the tree", () => {
    const child = Tpls.mkTplTagX("span", {});
    const root = Tpls.mkTplTagX("div", {}, child);
    const { component, site, vtm } = setupComponentWithTplTree(root);

    const result = deleteTpl([child], { component, site, vtm });

    expect(result).toEqual({ result: "deleted" });
    expect(root.children).toHaveLength(0);
  });

  it("deletes multiple children at once", () => {
    const child1 = Tpls.mkTplTagX("span", {});
    const child2 = Tpls.mkTplTagX("span", {});
    const child3 = Tpls.mkTplTagX("span", {});
    const root = Tpls.mkTplTagX("div", {}, child1, child2, child3);
    const { component, site, vtm } = setupComponentWithTplTree(root);

    const result = deleteTpl([child1, child3], { component, site, vtm });

    expect(result).toEqual({ result: "deleted" });
    expect(root.children).toHaveLength(1);
    expect(root.children).toContain(child2);
  });

  it("returns error when deleting the root element", () => {
    const root = Tpls.mkTplTagX("div", {});
    const { component, site, vtm } = setupComponentWithTplTree(root);

    const result = deleteTpl([root], { component, site, vtm });

    expect(result).toEqual({
      result: "error",
      message: "Cannot remove the root element.",
    });
  });

  it("returns error when element is referenced by a TplRef", () => {
    const target = Tpls.mkTplTagX("input", {});
    const root = Tpls.mkTplTagX("div", {}, target);
    const { component, site, vtm } = setupComponentWithTplTree(root);

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
    const { component, site, tplMgr, vtm } = setupComponentWithTplTree(root);

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

  it("deletes list item and container when both specified", () => {
    const listItem = Tpls.mkTplTagX("li", {});
    const listContainer = Tpls.mkTplTag("ul", [listItem]);
    const root = Tpls.mkTplTagX("div", {}, listContainer);
    const { component, site, vtm } = setupComponentWithTplTree(root);

    const result = deleteTpl([listContainer, listItem], {
      component,
      site,
      vtm,
    });

    expect(result).toEqual({ result: "deleted" });
    expect(Tpls.tryGetTplOwnerComponent(listItem)).toBeUndefined();
    expect(Tpls.tryGetTplOwnerComponent(listContainer)).toBeUndefined();
    expect(Tpls.tryGetTplOwnerComponent(root)).toBe(component);
    expect(root.children).toHaveLength(0);
  });

  it("deletes list item and container if empty", () => {
    const listItem = Tpls.mkTplTagX("li", {});
    const listContainer = Tpls.mkTplTag("ul", [listItem]);
    const root = Tpls.mkTplTagX("div", {}, listContainer);
    const { component, site, vtm } = setupComponentWithTplTree(root);

    const result = deleteTpl([listItem], { component, site, vtm });

    expect(result).toEqual({ result: "deleted" });
    expect(Tpls.tryGetTplOwnerComponent(listItem)).toBeUndefined();
    expect(Tpls.tryGetTplOwnerComponent(listContainer)).toBeUndefined();
    expect(Tpls.tryGetTplOwnerComponent(root)).toBe(component);
    expect(root.children).toHaveLength(0);
  });

  it("delete list item and container unless root", () => {
    const listItem = Tpls.mkTplTagX("li", {});
    const listContainer = Tpls.mkTplTag("ul", [listItem]);
    const { component, site, vtm } = setupComponentWithTplTree(listContainer);

    const result = deleteTpl([listItem], { component, site, vtm });

    expect(result).toEqual({ result: "deleted" });
    expect(Tpls.tryGetTplOwnerComponent(listItem)).toBeUndefined();
    expect(Tpls.tryGetTplOwnerComponent(listContainer)).toBe(component);
    expect(listContainer.children).toHaveLength(0);
  });

  it("returns error when the cascaded list container is referenced by a TplRef", () => {
    const listItem = Tpls.mkTplTagX("li", {});
    const listContainer = Tpls.mkTplTag("ul", [listItem]);
    const root = Tpls.mkTplTagX("div", {}, listContainer);
    const { component, site, vtm } = setupComponentWithTplTree(root);

    // Add a param with a TplRef pointing to the list container, which
    // deleting the last li would cascade-delete.
    const param = mkParam({
      name: "ref",
      type: typeFactory.text(),
      paramType: "prop",
      defaultExpr: new TplRef({ tpl: listContainer }),
    });
    component.params.push(param);

    const result = deleteTpl([listItem], { component, site, vtm });

    expect(result.result).toEqual("error");
    expect(root.children).toHaveLength(1);
  });
});

describe("computeTplsToDelete", () => {
  it("includes the list container when deleting its only item", () => {
    const listItem = Tpls.mkTplTagX("li", {});
    const listContainer = Tpls.mkTplTag("ul", [listItem]);
    Tpls.mkTplTagX("div", {}, listContainer);

    expect(computeTplsToDelete([listItem])).toEqual([listItem, listContainer]);
  });

  it("excludes the list container when other items remain", () => {
    const listItem1 = Tpls.mkTplTagX("li", {});
    const listItem2 = Tpls.mkTplTagX("li", {});
    const listContainer = Tpls.mkTplTag("ul", [listItem1, listItem2]);
    Tpls.mkTplTagX("div", {}, listContainer);

    expect(computeTplsToDelete([listItem1])).toEqual([listItem1]);
  });

  it("includes the list container when deleting all items at once", () => {
    const listItem1 = Tpls.mkTplTagX("li", {});
    const listItem2 = Tpls.mkTplTagX("li", {});
    const listContainer = Tpls.mkTplTag("ul", [listItem1, listItem2]);
    Tpls.mkTplTagX("div", {}, listContainer);

    expect(computeTplsToDelete([listItem1, listItem2])).toEqual([
      listItem1,
      listItem2,
      listContainer,
    ]);
  });

  it("excludes a list container that has no parent (root)", () => {
    const listItem = Tpls.mkTplTagX("li", {});
    Tpls.mkTplTag("ul", [listItem]);

    expect(computeTplsToDelete([listItem])).toEqual([listItem]);
  });

  it("returns only the tpls for non-list parents", () => {
    const child = Tpls.mkTplTagX("span", {});
    Tpls.mkTplTagX("div", {}, child);

    expect(computeTplsToDelete([child])).toEqual([child]);
  });
});
