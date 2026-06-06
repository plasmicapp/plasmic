import * as quickModals from "@/wab/client/components/quick-modals";
import { createVariant } from "@/wab/client/operations/create-variant";
import { deleteResourcesWithUsages } from "@/wab/client/operations/delete-resources";
import { fakeStudioCtx } from "@/wab/client/test/fake-init-ctx";
import { VariantOptionsType } from "@/wab/shared/TplMgr";
import { assert } from "@/wab/shared/common";
import { ComponentType } from "@/wab/shared/core/components";
import { Variant } from "@/wab/shared/model/classes";

jest.mock("@/wab/client/components/quick-modals", () => ({
  deleteStudioElementConfirm: jest.fn(),
}));

const mockedConfirm =
  quickModals.deleteStudioElementConfirm as jest.MockedFunction<
    typeof quickModals.deleteStudioElementConfirm
  >;

describe("deleteResourcesWithUsages", () => {
  function setup() {
    const { studioCtx } = fakeStudioCtx();
    jest.spyOn(studioCtx, "switchToArena").mockImplementation(() => {});
    const tplMgr = studioCtx.tplMgr();
    const component = studioCtx.addComponent("Comp", {
      type: ComponentType.Plain,
    });
    const group = tplMgr.createVariantGroup({
      component,
      name: "size",
      optionsType: VariantOptionsType.singleChoice,
    });
    const makeVariant = (name: string): Variant => {
      const created = createVariant({
        component,
        tplMgr,
        variantGroup: group,
        name,
      });
      assert(created.result === "success", "variant setup failed");
      return created.variant;
    };
    // A second component used to populate usage summaries.
    const userComp = studioCtx.addComponent("User", {
      type: ComponentType.Plain,
    });
    return { studioCtx, tplMgr, component, group, makeVariant, userComp };
  }

  beforeEach(() => {
    mockedConfirm.mockReset();
  });

  it("deletes a resource with no usages without showing a dialog", async () => {
    const { studioCtx, makeVariant } = setup();
    const variant = makeVariant("small");
    const onDelete = jest.fn();

    const result = await deleteResourcesWithUsages(
      studioCtx,
      [{ resource: variant, usageSummary: {}, usageCount: 0 }],
      onDelete,
      { behaviour: "confirm-if-referenced", deleteLabel: "variant" }
    );

    expect(mockedConfirm).not.toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalledWith(variant);
    expect(result.deletedResources).toEqual([variant]);
    expect(result.messages).toHaveLength(1);
    expect(result.errors).toEqual([]);
  });

  it("errors instead of deleting when behaviour is error-if-referenced and there are usages", async () => {
    const { studioCtx, makeVariant, userComp } = setup();
    const variant = makeVariant("small");
    const onDelete = jest.fn();

    const result = await deleteResourcesWithUsages(
      studioCtx,
      [
        {
          resource: variant,
          usageSummary: { components: [userComp] },
          usageCount: 1,
        },
      ],
      onDelete,
      { behaviour: "error-if-referenced", deleteLabel: "variant" }
    );

    expect(onDelete).not.toHaveBeenCalled();
    expect(mockedConfirm).not.toHaveBeenCalled();
    expect(result.deletedResources).toEqual([]);
    expect(result.errors).toHaveLength(1);
  });

  it("shows a confirmation dialog when referenced and deletes if confirmed", async () => {
    const { studioCtx, makeVariant, userComp } = setup();
    const variant = makeVariant("small");
    const onDelete = jest.fn();
    mockedConfirm.mockResolvedValue(true);

    const result = await deleteResourcesWithUsages(
      studioCtx,
      [
        {
          resource: variant,
          usageSummary: { components: [userComp] },
          usageCount: 1,
        },
      ],
      onDelete,
      { behaviour: "confirm-if-referenced", deleteLabel: "variant" }
    );

    expect(mockedConfirm).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(variant);
    expect(result.deletedResources).toEqual([variant]);
  });

  it("does not delete when the confirmation dialog is declined", async () => {
    const { studioCtx, makeVariant, userComp } = setup();
    const variant = makeVariant("small");
    const onDelete = jest.fn();
    mockedConfirm.mockResolvedValue(false);

    const result = await deleteResourcesWithUsages(
      studioCtx,
      [
        {
          resource: variant,
          usageSummary: { components: [userComp] },
          usageCount: 1,
        },
      ],
      onDelete,
      { behaviour: "confirm-if-referenced", deleteLabel: "variant" }
    );

    expect(mockedConfirm).toHaveBeenCalledTimes(1);
    expect(onDelete).not.toHaveBeenCalled();
    expect(result.deletedResources).toEqual([]);
    expect(result.messages).toEqual([]);
    expect(result.cancelled).toEqual(true);
    expect(result.errors).toHaveLength(1);
  });

  it("deletes referenced resources without a dialog when behaviour is delete-if-referenced", async () => {
    const { studioCtx, makeVariant, userComp } = setup();
    const variant = makeVariant("small");
    const onDelete = jest.fn();

    const result = await deleteResourcesWithUsages(
      studioCtx,
      [
        {
          resource: variant,
          usageSummary: { components: [userComp] },
          usageCount: 1,
        },
      ],
      onDelete,
      { behaviour: "delete-if-referenced", deleteLabel: "variant" }
    );

    expect(mockedConfirm).not.toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalledWith(variant);
    expect(result.deletedResources).toEqual([variant]);
  });

  it("defaults to confirm-if-referenced when no behaviour is given", async () => {
    const { studioCtx, makeVariant, userComp } = setup();
    const variant = makeVariant("small");
    const onDelete = jest.fn();
    mockedConfirm.mockResolvedValue(false);

    await deleteResourcesWithUsages(
      studioCtx,
      [
        {
          resource: variant,
          usageSummary: { components: [userComp] },
          usageCount: 1,
        },
      ],
      onDelete,
      { deleteLabel: "variant" }
    );

    expect(mockedConfirm).toHaveBeenCalledTimes(1);
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("invokes onDelete and records a message for each resource", async () => {
    const { studioCtx, makeVariant } = setup();
    const small = makeVariant("small");
    const large = makeVariant("large");
    const onDelete = jest.fn();

    const result = await deleteResourcesWithUsages(
      studioCtx,
      [
        { resource: small, usageSummary: {}, usageCount: 0 },
        { resource: large, usageSummary: {}, usageCount: 0 },
      ],
      onDelete,
      { behaviour: "delete-if-referenced", deleteLabel: "variant" }
    );

    expect(onDelete).toHaveBeenCalledTimes(2);
    expect(onDelete).toHaveBeenNthCalledWith(1, small);
    expect(onDelete).toHaveBeenNthCalledWith(2, large);
    expect(result.deletedResources).toEqual([small, large]);
    expect(result.messages).toHaveLength(2);
  });

  it("is a no-op when given an empty resource list", async () => {
    const { studioCtx } = setup();
    const onDelete = jest.fn();
    const changeObservedSpy = jest.spyOn(studioCtx, "changeObserved");

    const result = await deleteResourcesWithUsages(studioCtx, [], onDelete, {
      behaviour: "delete-if-referenced",
      deleteLabel: "variant",
    });

    expect(onDelete).not.toHaveBeenCalled();
    expect(changeObservedSpy).not.toHaveBeenCalled();
    expect(result.deletedResources).toEqual([]);
    expect(result.messages).toEqual([]);
    changeObservedSpy.mockRestore();
  });
});
