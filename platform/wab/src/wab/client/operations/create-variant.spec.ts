import { createComponent } from "@/wab/client/operations/create-component";
import { createVariant } from "@/wab/client/operations/create-variant";
import { createVariantGroup } from "@/wab/client/operations/create-variant-group";
import { setupComponentWithTplTree } from "@/wab/client/operations/tests/utils";
import { VariantOptionsType } from "@/wab/shared/TplMgr";
import { assert } from "@/wab/shared/common";
import { ComponentType } from "@/wab/shared/core/components";
import * as Tpls from "@/wab/shared/core/tpls";
import { ComponentVariantGroup } from "@/wab/shared/model/classes";

describe("createVariant", () => {
  function setupWithGroup() {
    const { site, tplMgr } = setupComponentWithTplTree(
      Tpls.mkTplTagX("div", {})
    );
    const created = createComponent({
      tplMgr,
      name: "CopilotVariantTest",
      type: ComponentType.Plain,
    });
    assert(created.result === "success", "setup failed");

    const groupResult = createVariantGroup({
      component: created.component,
      tplMgr,
      name: "state",
      optionsType: VariantOptionsType.singleChoice,
    });
    assert(groupResult.result === "success", "group setup failed");

    return {
      site,
      tplMgr,
      component: created.component,
      group: groupResult.group,
    };
  }

  it("adds a new variant to an existing group", () => {
    const { tplMgr, component, group } = setupWithGroup();
    const before = group.variants.length;

    const result = createVariant({
      component,
      tplMgr,
      variantGroup: group,
      name: "hovered",
    });

    assert(result.result === "success", "expected success result");
    expect(group.variants.length).toEqual(before + 1);
    expect(result.variant.name).toEqual("hovered");
    expect(group.variants).toContain(result.variant);
  });

  it("returns error if group does not belong to component", () => {
    const { tplMgr, component } = setupWithGroup();
    const strayGroup = { param: { variable: { name: "stray" } } };

    const result = createVariant({
      component,
      tplMgr,
      variantGroup: strayGroup as unknown as ComponentVariantGroup,
      name: "foo",
    });

    expect(result.result).toEqual("error");
  });

  it("rejects adding variants to a standalone group", () => {
    const { tplMgr } = setupComponentWithTplTree(Tpls.mkTplTagX("div", {}));
    const created = createComponent({
      tplMgr,
      name: "CopilotStandaloneTest",
      type: ComponentType.Plain,
    });
    assert(created.result === "success", "setup failed");

    const groupResult = createVariantGroup({
      component: created.component,
      tplMgr,
      name: "isRounded",
      optionsType: VariantOptionsType.standalone,
    });
    assert(groupResult.result === "success", "group setup failed");
    const standaloneGroup = groupResult.group;
    const before = standaloneGroup.variants.length;

    const result = createVariant({
      component: created.component,
      tplMgr,
      variantGroup: standaloneGroup,
      name: "extra",
    });

    expect(result.result).toEqual("error");
    // The implicit variant stays the only one — invariant preserved.
    expect(standaloneGroup.variants.length).toEqual(before);
  });
});
