import { renameTpl } from "@/wab/client/operations/rename-tpl";
import { setupComponentWithTplTree } from "@/wab/client/operations/tests/utils";
import { mkBaseVariant } from "@/wab/shared/Variants";
import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import {
  addComponentState,
  mkValueStateForTextInput,
} from "@/wab/shared/core/states";
import * as Tpls from "@/wab/shared/core/tpls";

describe("renameTpl", () => {
  it("renames an element", () => {
    const child = Tpls.mkTplTagX("div", {});
    const root = Tpls.mkTplTagX("div", {}, child);
    const { component, tplMgr } = setupComponentWithTplTree(root);

    const result = renameTpl(child, "myDiv", { component, tplMgr });

    expect(result).toEqual({ result: "success", newName: "myDiv" });
    expect(child.name).toEqual("myDiv");
  });

  it("clears the name when given empty string", () => {
    const child = Tpls.mkTplTagX("div", { name: "oldName" });
    const root = Tpls.mkTplTagX("div", {}, child);
    const { component, tplMgr } = setupComponentWithTplTree(root);

    const result = renameTpl(child, "", { component, tplMgr });

    expect(result).toEqual({ result: "success", newName: null });
    expect(child.name).toBeNull();
  });

  it("clears the name when given null", () => {
    const child = Tpls.mkTplTagX("div", { name: "oldName" });
    const root = Tpls.mkTplTagX("div", {}, child);
    const { component, tplMgr } = setupComponentWithTplTree(root);

    const result = renameTpl(child, null, { component, tplMgr });

    expect(result).toEqual({ result: "success", newName: null });
    expect(child.name).toBeNull();
  });

  it("generates unique name when there is a conflict", () => {
    const child1 = Tpls.mkTplTagX("div", { name: "myDiv" });
    const child2 = Tpls.mkTplTagX("div", {});
    const root = Tpls.mkTplTagX("div", {}, child1, child2);
    const { component, tplMgr } = setupComponentWithTplTree(root);

    const result = renameTpl(child2, "myDiv", { component, tplMgr });

    expect(result).toEqual({ result: "success", newName: "myDiv 2" });
    expect(child2.name).toEqual("myDiv 2");
  });

  it("returns error when clearing name on TplComponent with public states", () => {
    const innerRoot = Tpls.mkTplTagX("input", {});
    const innerComponent = mkComponent({
      tplTree: innerRoot,
      type: ComponentType.Plain,
    });

    const baseVariant = mkBaseVariant();
    const tplComponent = Tpls.mkTplComponent(innerComponent, baseVariant);
    tplComponent.name = "myInput";
    const root = Tpls.mkTplTagX("div", {}, tplComponent);
    const { component, site, tplMgr } = setupComponentWithTplTree(root);

    site.components.push(innerComponent);

    // Add a public state to the inner component
    const state = mkValueStateForTextInput(innerRoot, innerComponent, tplMgr);
    state.accessType = "readonly";
    addComponentState(site, innerComponent, state);

    const result = renameTpl(tplComponent, "", { component, tplMgr });

    expect(result).toEqual({
      result: "error",
      message: "Instances of components with public states must be named.",
    });
    expect(tplComponent.name).toEqual("myInput");
  });
});
