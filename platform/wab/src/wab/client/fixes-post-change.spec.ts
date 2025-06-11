import { fakeStudioCtx } from "@/wab/client/test/fake-init-ctx";
import { ComponentType } from "@/wab/shared/core/components";
import { mkTplTagX } from "@/wab/shared/core/tpls";

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
});
