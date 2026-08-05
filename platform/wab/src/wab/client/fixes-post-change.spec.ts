import { fakeStudioCtx } from "@/wab/client/test/fake-init-ctx";
import { RSH } from "@/wab/shared/RuleSetHelpers";
import { $$$ } from "@/wab/shared/TplQuery";
import {
  ensureVariantSetting,
  getBaseVariant,
  isPrivateStyleVariant,
} from "@/wab/shared/Variants";
import { ComponentType } from "@/wab/shared/core/components";
import { mkTplTagX } from "@/wab/shared/core/tpls";
import { ScreenSizeSpec } from "@/wab/shared/css-size";
import { ok } from "neverthrow";

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
      () => {
        // Change directly on the component
        component.name = "NewButton";
        return ok();
      }
    );

    expect(component.updatedAt).toBeGreaterThan(componentUpdatedAt);

    componentUpdatedAt = component.updatedAt!;

    await studioCtx.changeObserved(
      () => [component],
      () => {
        // Directly change the tplTree
        component.tplTree = tpls[0];
        return ok();
      }
    );

    expect(component.updatedAt).toBeGreaterThan(componentUpdatedAt);

    componentUpdatedAt = component.updatedAt!;

    await studioCtx.changeObserved(
      () => [component],
      () => {
        // Change the tpl tree by accessing the children only should still update the component
        tpls[0].children = [tpls[1]];
        return ok();
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
      () => {
        component.tplTree = gridTpl;
        return ok();
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

  it("keeps free-positioned grid children free when the grid is updated in another variant", async () => {
    const { studioCtx } = fakeStudioCtx();
    const tplMgr = studioCtx.tplMgr();

    const component = studioCtx.addComponent("GridParent", {
      type: ComponentType.Plain,
    });
    const baseVariant = getBaseVariant(component);
    const mobileVariant = tplMgr.createScreenVariant({
      name: "Mobile",
      spec: new ScreenSizeSpec(0, 640),
    });

    // Grid parent with 2 columns in base
    const gridTpl = mkTplTagX("div", { baseVariant });
    const parentBaseRsh = RSH(
      ensureVariantSetting(gridTpl, [baseVariant]).rs,
      gridTpl
    );
    parentBaseRsh.set("display", "grid");
    parentBaseRsh.set("grid-template-columns", "repeat(2, minmax(0, 1fr))");

    // Free-positioned child. Position is only set in base, but it's moved
    // around in the mobile variant
    const child = mkTplTagX("div", { baseVariant });
    const childBaseRsh = RSH(
      ensureVariantSetting(child, [baseVariant]).rs,
      child
    );
    childBaseRsh.set("position", "absolute");
    childBaseRsh.set("left", "32.1%");
    childBaseRsh.set("top", "40px");
    childBaseRsh.set("right", "auto");
    childBaseRsh.set("bottom", "auto");
    const childMobileRsh = RSH(
      ensureVariantSetting(child, [baseVariant, mobileVariant]).rs,
      child
    );
    childMobileRsh.set("left", "8px");
    $$$(gridTpl).append(child);

    // A sibling that isn't explicitly positioned, but has a leftover offset
    const sibling = mkTplTagX("div", { baseVariant });
    const siblingBaseRsh = RSH(
      ensureVariantSetting(sibling, [baseVariant]).rs,
      sibling
    );
    siblingBaseRsh.set("left", "10px");
    $$$(gridTpl).append(sibling);

    await studioCtx.changeObserved(
      () => [component],
      () => {
        component.tplTree = gridTpl;
        return ok();
      }
    );

    // Now change the parent grid to 1 column, in the mobile variant only
    await studioCtx.changeObserved(
      () => [component],
      () => {
        RSH(
          ensureVariantSetting(gridTpl, [baseVariant, mobileVariant]).rs,
          gridTpl
        ).set("grid-template-columns", "repeat(1, minmax(0, 1fr))");
        return ok();
      }
    );

    // The child's coordinates must be intact, in base and in mobile, even
    // though only base says it's free-positioned
    expect(childBaseRsh.get("position")).toBe("absolute");
    expect(childBaseRsh.get("left")).toBe("32.1%");
    expect(childBaseRsh.get("top")).toBe("40px");
    expect(childMobileRsh.getRaw("left")).toBe("8px");

    // Children that aren't explicitly positioned are still cleaned up, without
    // introducing a variant override
    expect(siblingBaseRsh.get("left")).toBe("auto");
    expect(
      sibling.vsettings.some((vs) => vs.variants.includes(mobileVariant))
    ).toBe(false);
  });
});
