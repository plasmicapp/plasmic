import { deleteComponent } from "@/wab/client/operations/delete-component";
import { fakeStudioCtx } from "@/wab/client/test/fake-init-ctx";
import { $$$ } from "@/wab/shared/TplQuery";
import { getBaseVariant } from "@/wab/shared/Variants";
import { assert } from "@/wab/shared/common";
import { ComponentType } from "@/wab/shared/core/components";
import { mkTplComponent } from "@/wab/shared/core/tpls";
import { Component, TplTag } from "@/wab/shared/model/classes";

describe("deleteComponent", () => {
  function setup() {
    const { studioCtx } = fakeStudioCtx();
    // Deleting a component the studio is focused on triggers an arena switch;
    // stub it out so the operation under test doesn't drive navigation.
    jest.spyOn(studioCtx, "switchToArena").mockImplementation(() => {});
    const tplMgr = studioCtx.tplMgr();
    // deleteComponent mutates the model directly, so it must run in a change.
    const runDeleteOperation = (component: Component) =>
      studioCtx.changeUnsafe(() =>
        deleteComponent(component, studioCtx.site, studioCtx, tplMgr)
      );
    return { studioCtx, runDeleteOperation };
  }

  it("deletes a component with no usages", async () => {
    const { studioCtx, runDeleteOperation } = setup();
    const component = studioCtx.addComponent("Comp", {
      type: ComponentType.Plain,
    });
    expect(studioCtx.site.components).toContain(component);

    const result = await runDeleteOperation(component);

    assert(result.result === "success", "expected success");
    expect(studioCtx.site.components).not.toContain(component);
  });

  it("deletes a page component", async () => {
    const { studioCtx, runDeleteOperation } = setup();
    const page = studioCtx.addComponent("Home", { type: ComponentType.Page });

    const result = await runDeleteOperation(page);

    assert(result.result === "success", "expected success");
    expect(studioCtx.site.components).not.toContain(page);
  });

  it("errors instead of deleting when the component is still referenced", async () => {
    const { studioCtx, runDeleteOperation } = setup();
    const target = studioCtx.addComponent("Target", {
      type: ComponentType.Plain,
    });
    const user = studioCtx.addComponent("User", {
      type: ComponentType.Plain,
    });

    // Make `user` reference `target` by instantiating it in user's tree.
    const userRoot = user.tplTree as TplTag;
    $$$(userRoot).append(mkTplComponent(target, getBaseVariant(user)));

    const result = await runDeleteOperation(target);

    expect(result.result).toEqual("error");
    expect(studioCtx.site.components).toContain(target);
  });

  it("refuses to delete the default page wrapper", async () => {
    const { studioCtx, runDeleteOperation } = setup();
    const wrapper = studioCtx.addComponent("Wrapper", {
      type: ComponentType.Plain,
    });
    studioCtx.site.pageWrapper = wrapper;

    const result = await runDeleteOperation(wrapper);

    expect(result.result).toEqual("error");
    expect(studioCtx.site.components).toContain(wrapper);
  });

  it("refuses to delete a sub-component", async () => {
    const { studioCtx, runDeleteOperation } = setup();
    const parent = studioCtx.addComponent("Parent", {
      type: ComponentType.Plain,
    });
    const sub = studioCtx.addComponent("Sub", {
      type: ComponentType.Plain,
    });
    sub.superComp = parent;
    parent.subComps.push(sub);

    const result = await runDeleteOperation(sub);

    expect(result.result).toEqual("error");
    expect(studioCtx.site.components).toContain(sub);
  });
});
