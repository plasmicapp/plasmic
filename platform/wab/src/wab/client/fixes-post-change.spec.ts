import { fakeStudioCtx } from "@/wab/client/test/fake-init-ctx";
import { ComponentType } from "@/wab/shared/core/components";
import { mkTplTagX } from "@/wab/shared/core/tpls";
import { RSH } from "@/wab/shared/RuleSetHelpers";
import { $$$ } from "@/wab/shared/TplQuery";
import {
  ensureVariantSetting,
  getBaseVariant,
  isPrivateStyleVariant,
} from "@/wab/shared/Variants";

describe("Fixes post change", () => {
  it("updates component.updatedAt", async () => {
    const { studioCtx } = fakeStudioCtx();
    const component = studioCtx.addComponent("Button", {
      type: ComponentType.Plain,
    });
    const tpls = [mkTplTagX("div"), mkTplTagX("div"), mkTplTagX("div")];

    // New components should start with an updatedAt
    expect(component.updatedAt).not.toBeNil();

    let componentUpdatedAt = component.updatedAt!;

    await studioCtx.changeObserved(
      () => [component],
      ({ success }) => {
        // Change directly on the component
        component.name = "NewButton";
        return success();
      }
    );

    expect(component.updatedAt).toBeGreaterThan(componentUpdatedAt);

    componentUpdatedAt = component.updatedAt!;

    await studioCtx.changeObserved(
      () => [component],
      ({ success }) => {
        // Directly change the tplTree
        component.tplTree = tpls[0];
        return success();
      }
    );

    expect(component.updatedAt).toBeGreaterThan(componentUpdatedAt);

    componentUpdatedAt = component.updatedAt!;

    await studioCtx.changeObserved(
      () => [component],
      ({ success }) => {
        // Change the tpl tree by accessing the children only should still update the component
        tpls[0].children = [tpls[1]];
        return success();
      }
    );

    expect(component.updatedAt).toBeGreaterThan(componentUpdatedAt);

    componentUpdatedAt = component.updatedAt!;

    await studioCtx.changeUnsafe(() => {
      // Using changeUnsafe should still update the component if it's observed already
      tpls[1].children = [tpls[2]];
    });

    expect(component.updatedAt).toBeGreaterThan(componentUpdatedAt);
  });

  it("does not propagate parent's private style variants to grid children", async () => {
    const { studioCtx } = fakeStudioCtx();
    const tplMgr = studioCtx.tplMgr();

    const component = studioCtx.addComponent("GridParent", {
      type: ComponentType.Plain,
    });
    const baseVariant = getBaseVariant(component);

    // Create a grid tpl
    const gridTpl = mkTplTagX("div", { baseVariant });
    const parentBaseVs = ensureVariantSetting(gridTpl, [baseVariant]);
    RSH(parentBaseVs.rs, gridTpl).set("display", "grid");

    // Create a child with base variant setting
    const child = mkTplTagX("span", { baseVariant });
    ensureVariantSetting(child, [baseVariant]);
    $$$(gridTpl).append(child);

    // Create a private hover variant for the grid parent
    const parentHoverVariant = tplMgr.createPrivateStyleVariant(
      component,
      gridTpl,
      [":hover"]
    );

    // Add a variant setting for hover on the parent
    ensureVariantSetting(gridTpl, [baseVariant, parentHoverVariant]);

    // Verify initial state - child should have only 1 vsetting (base)
    expect(child.vsettings.length).toBe(1);

    // Set the grid tpl as the component's tplTree (triggers fixups)
    await studioCtx.changeObserved(
      () => [component],
      ({ success }) => {
        component.tplTree = gridTpl;
        return success();
      }
    );

    // After the fixup runs, verify the child does NOT have any variant settings
    // with the parent's private hover variant
    const childHasParentHoverVariant = child.vsettings.some((vs) =>
      vs.variants.some((v) => isPrivateStyleVariant(v) && v.forTpl !== child)
    );

    expect(childHasParentHoverVariant).toBe(false);

    // Child should still only have base variant setting (not parent's hover)
    expect(child.vsettings.length).toBe(1);
    expect(child.vsettings[0].variants).toEqual([baseVariant]);
  });
});
