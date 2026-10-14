import { fakeStudioCtx } from "@/wab/client/__testonly__/fake-init-ctx";
import * as quickModals from "@/wab/client/components/quick-modals";
import { deleteVariantGroup } from "@/wab/client/operations/delete-variant-group";
import { VariantOptionsType } from "@/wab/shared/TplMgr";
import { ensureVariantSetting, getBaseVariant } from "@/wab/shared/Variants";
import { toVarName } from "@/wab/shared/codegen/util";
import { assert } from "@/wab/shared/common";
import { ComponentType } from "@/wab/shared/core/components";
import { customCode } from "@/wab/shared/core/exprs";
import { SplitStatus, SplitType } from "@/wab/shared/core/splits";
import { TplTag, isKnownGlobalVariantGroup } from "@/wab/shared/model/classes";
import { MockedFunction } from "vitest";

vi.mock("@/wab/client/components/quick-modals", () => ({
  deleteStudioElementConfirm: vi.fn(),
}));

const mockedConfirm = quickModals.deleteStudioElementConfirm as MockedFunction<
  typeof quickModals.deleteStudioElementConfirm
>;

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
      tplMgr,
    );

    assert(result.isOk(), "expected success");
    expect(component.variantGroups).not.toContain(group);
    expect(result.value.length).toBeGreaterThan(0);
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
      tplMgr,
    );

    assert(result.isOk(), "expected success");
    expect(studioCtx.site.globalVariantGroups).not.toContain(globalGroup);
  });

  it("errors with references when the group is used in the component", async () => {
    const { studioCtx, tplMgr, component, group } = setup();

    const root = component.tplTree as TplTag;
    const baseVs = ensureVariantSetting(root, [getBaseVariant(component)]);
    baseVs.dataCond = customCode(
      `$state.${toVarName(group.param.variable.name)}`,
    );

    const result = await deleteVariantGroup(
      group,
      component,
      studioCtx.site,
      studioCtx,
      tplMgr,
    );

    assert(result.isErr(), "expected error");
    assert(
      result.error.variantGroupRefs != null,
      "expected variant group refs",
    );
    expect(result.error.variantGroupRefs.length).toBeGreaterThan(0);
    // Group is left untouched.
    expect(component.variantGroups).toContain(group);
  });

  describe("global variant group used by a split", () => {
    function setupSplit() {
      const { studioCtx, tplMgr } = setup();
      const group = tplMgr.createGlobalVariantGroup("experiment");
      assert(isKnownGlobalVariantGroup(group), "expected global group");
      const variant = tplMgr.createGlobalVariant(group, "on");
      const split = tplMgr.addGlobalVariantSplit({
        group,
        variant,
        type: SplitType.Experiment,
        status: SplitStatus.New,
      });
      return { studioCtx, tplMgr, group, split };
    }

    beforeEach(() => {
      mockedConfirm.mockReset();
    });

    it("removes the split along with the group", async () => {
      const { studioCtx, tplMgr, group, split } = setupSplit();
      mockedConfirm.mockResolvedValue(true);

      const result = await deleteVariantGroup(
        group,
        undefined,
        studioCtx.site,
        studioCtx,
        tplMgr,
      );

      assert(result.isOk(), "expected success");
      expect(mockedConfirm).toHaveBeenCalled();
      expect(studioCtx.site.globalVariantGroups).not.toContain(group);
      expect(studioCtx.site.splits).not.toContain(split);
    });

    it("keeps the split when the confirmation is cancelled", async () => {
      const { studioCtx, tplMgr, group, split } = setupSplit();
      mockedConfirm.mockResolvedValue(false);

      const result = await deleteVariantGroup(
        group,
        undefined,
        studioCtx.site,
        studioCtx,
        tplMgr,
      );

      assert(result.isErr(), "expected error");
      expect(result.error.cancelled).toBe(true);
      expect(studioCtx.site.globalVariantGroups).toContain(group);
      expect(studioCtx.site.splits).toContain(split);
    });

    it("removeSplitAndGlobalVariant removes the split without throwing", async () => {
      const { studioCtx, group, split } = setupSplit();
      mockedConfirm.mockResolvedValue(true);

      await studioCtx.siteOps().removeSplitAndGlobalVariant(group);

      expect(studioCtx.site.globalVariantGroups).not.toContain(group);
      expect(studioCtx.site.splits).not.toContain(split);
    });

    it("removeSplitAndGlobalVariant keeps the split when cancelled", async () => {
      const { studioCtx, group, split } = setupSplit();
      mockedConfirm.mockResolvedValue(false);

      await studioCtx.siteOps().removeSplitAndGlobalVariant(group);

      expect(studioCtx.site.globalVariantGroups).toContain(group);
      expect(studioCtx.site.splits).toContain(split);
    });
  });
});
