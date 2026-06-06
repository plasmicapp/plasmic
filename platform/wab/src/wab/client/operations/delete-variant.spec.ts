import { createVariant } from "@/wab/client/operations/create-variant";
import { deleteVariant } from "@/wab/client/operations/delete-variant";
import { fakeStudioCtx } from "@/wab/client/test/fake-init-ctx";
import { VariantOptionsType } from "@/wab/shared/TplMgr";
import { ensureVariantSetting, getBaseVariant } from "@/wab/shared/Variants";
import { toVarName } from "@/wab/shared/codegen/util";
import { assert } from "@/wab/shared/common";
import { ComponentType } from "@/wab/shared/core/components";
import { customCode } from "@/wab/shared/core/exprs";
import { TplTag } from "@/wab/shared/model/classes";

describe("deleteVariant", () => {
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
    const created = createVariant({
      component,
      tplMgr,
      variantGroup: group,
      name: "small",
    });
    assert(created.result === "success", "variant setup failed");
    return { studioCtx, tplMgr, component, group, variant: created.variant };
  }

  it("deletes a variant from its group", async () => {
    const { studioCtx, tplMgr, component, group, variant } = setup();
    expect(group.variants).toContain(variant);

    const result = await deleteVariant(
      variant,
      component,
      studioCtx.site,
      studioCtx,
      tplMgr
    );

    assert(result.result === "success", "expected success");
    expect(group.variants).not.toContain(variant);
    expect(result.messages.length).toBeGreaterThan(0);
  });

  it("refuses to delete the base variant", async () => {
    const { studioCtx, tplMgr, component } = setup();

    const result = await deleteVariant(
      getBaseVariant(component),
      component,
      studioCtx.site,
      studioCtx,
      tplMgr
    );

    expect(result.result).toEqual("error");
  });

  it("errors with references when the variant group is used in the component", async () => {
    const { studioCtx, tplMgr, component, group, variant } = setup();

    // Reference the variant group's state in the component tree.
    const root = component.tplTree as TplTag;
    const baseVs = ensureVariantSetting(root, [getBaseVariant(component)]);
    baseVs.dataCond = customCode(
      `$state.${toVarName(group.param.variable.name)}`
    );

    const result = await deleteVariant(
      variant,
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
    // Variant is left untouched.
    expect(group.variants).toContain(variant);
  });
});
