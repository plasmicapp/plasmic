import { createComponent } from "@/wab/client/operations/create-component";
import { createVariantGroup } from "@/wab/client/operations/create-variant-group";
import { setupComponentWithTplTree } from "@/wab/client/operations/tests/utils";
import { VariantOptionsType } from "@/wab/shared/TplMgr";
import { assert } from "@/wab/shared/common";
import { ComponentType } from "@/wab/shared/core/components";
import * as Tpls from "@/wab/shared/core/tpls";

describe("createVariantGroup", () => {
  function setupWithComponent() {
    const { site, tplMgr } = setupComponentWithTplTree(
      Tpls.mkTplTagX("div", {})
    );
    const created = createComponent({
      tplMgr,
      name: "CopilotVGTest",
      type: ComponentType.Plain,
    });
    assert(created.result === "success", "setup failed");
    return { site, tplMgr, component: created.component };
  }

  it("adds a single-choice group", () => {
    const { tplMgr, component } = setupWithComponent();

    const result = createVariantGroup({
      component,
      tplMgr,
      name: "size",
      optionsType: VariantOptionsType.singleChoice,
    });

    assert(result.result === "success", "expected success result");
    expect(result.group.multi).toEqual(false);
    expect(result.group.param.variable.name).toEqual("size");
    expect(result.group.variants).toEqual([]);
    expect(component.variantGroups).toContain(result.group);
  });

  it("adds a multi-choice group", () => {
    const { tplMgr, component } = setupWithComponent();

    const result = createVariantGroup({
      component,
      tplMgr,
      name: "decor",
      optionsType: VariantOptionsType.multiChoice,
    });

    assert(result.result === "success", "expected success result");
    expect(result.group.multi).toEqual(true);
    expect(result.group.variants).toEqual([]);
  });

  it("adds a toggle (standalone) group with an implicit single variant", () => {
    const { tplMgr, component } = setupWithComponent();

    const result = createVariantGroup({
      component,
      tplMgr,
      name: "isActive",
      optionsType: VariantOptionsType.standalone,
    });

    assert(result.result === "success", "expected success result");
    // standalone group has a single implicit variant
    expect(result.group.variants.length).toEqual(1);
  });
});
