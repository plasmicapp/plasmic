import { deleteVariantGroup } from "@/wab/client/operations/delete-variant-group";
import { fakeStudioCtx } from "@/wab/client/test/fake-init-ctx";
import { VariantOptionsType } from "@/wab/shared/TplMgr";
import { ensureVariantSetting, getBaseVariant } from "@/wab/shared/Variants";
import { toVarName } from "@/wab/shared/codegen/util";
import { assert } from "@/wab/shared/common";
import { ComponentType } from "@/wab/shared/core/components";
import { customCode } from "@/wab/shared/core/exprs";
import { TplTag } from "@/wab/shared/model/classes";

describe("deleteVariantGroup", () => {
  function setup() {
    const { studioCtx } = fakeStudioCtx();
    const tplMgr = studioCtx.tplMgr();
    const component = studioCtx.addComponent("Comp", {
      type: ComponentType.Plain,
    });
    const group = tplMgr.createVariantGroup({
      component,
      name: "size",
      optionsType: VariantOptionsType.singleChoice,
    });
    return { studioCtx, tplMgr, component, group };
  }

  it("deletes a component variant group", async () => {
    const { studioCtx, tplMgr, component, group } = setup();
    expect(component.variantGroups).toContain(group);

    const result = await deleteVariantGroup(
      group,
      component,
      studioCtx.site,
      studioCtx,
      tplMgr
    );

    assert(result.result === "success", "expected success");
    expect(component.variantGroups).not.toContain(group);
    expect(result.messages.length).toBeGreaterThan(0);
  });

  it("deletes a global variant group", async () => {
    const { studioCtx, tplMgr } = setup();
    const globalGroup = tplMgr.createGlobalVariantGroup("theme");
    expect(studioCtx.site.globalVariantGroups).toContain(globalGroup);

    const result = await deleteVariantGroup(
      globalGroup,
      undefined,
      studioCtx.site,
      studioCtx,
      tplMgr
    );

    assert(result.result === "success", "expected success");
    expect(studioCtx.site.globalVariantGroups).not.toContain(globalGroup);
  });

  it("errors with references when the group is used in the component", async () => {
    const { studioCtx, tplMgr, component, group } = setup();

    const root = component.tplTree as TplTag;
    const baseVs = ensureVariantSetting(root, [getBaseVariant(component)]);
    baseVs.dataCond = customCode(
      `$state.${toVarName(group.param.variable.name)}`
    );

    const result = await deleteVariantGroup(
      group,
      component,
      studioCtx.site,
      studioCtx,
      tplMgr
    );

    expect(result.result).toEqual("error");
    if (result.result === "error") {
      assert(result.variantGroupRefs != null, "expected variant group refs");
      expect(result.variantGroupRefs.length).toBeGreaterThan(0);
    }
    // Group is left untouched.
    expect(component.variantGroups).toContain(group);
  });
});
