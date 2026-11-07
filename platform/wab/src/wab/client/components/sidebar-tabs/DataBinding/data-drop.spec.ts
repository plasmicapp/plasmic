import {
  canUseDataDragPath,
  getDataDropTargetRegistry,
} from "@/wab/client/components/sidebar-tabs/DataBinding/data-drop";
import type { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import type { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { Pt } from "@/wab/shared/geom";

describe("DataDropTargetRegistry", () => {
  it("marks every compatible target for the duration of a drag", () => {
    const registry = getDataDropTargetRegistry({} as StudioCtx);
    const acceptedState = vi.fn();
    const rejectedState = vi.fn();
    const payload = {
      path: ["$state", "name"],
      label: "name",
      value: "Ada",
      varType: "string" as const,
      sourceViewCtx: {} as ViewCtx,
      envKeys: ["$state"],
    };

    registry.register({
      getElement: () => null,
      accepts: () => true,
      onDropData: vi.fn(),
      setHoverState: acceptedState,
    });
    registry.register({
      getElement: () => null,
      accepts: () => "Expected a number",
      onDropData: vi.fn(),
      setHoverState: rejectedState,
    });

    registry.beginDrag(payload);

    expect(acceptedState).toHaveBeenLastCalledWith({
      isDragging: true,
      isHovered: false,
      acceptance: true,
    });
    expect(rejectedState).toHaveBeenLastCalledWith({
      isDragging: true,
      isHovered: false,
      acceptance: "Expected a number",
    });

    registry.clear();
    expect(acceptedState).toHaveBeenLastCalledWith({
      isDragging: false,
      isHovered: false,
    });
    expect(rejectedState).toHaveBeenLastCalledWith({
      isDragging: false,
      isHovered: false,
    });
  });

  it("focuses an accepted target after dropping", () => {
    const bottomPanelInput = document.createElement("input");
    const target = document.createElement("div");
    target.tabIndex = -1;
    document.body.append(bottomPanelInput, target);
    bottomPanelInput.focus();

    const registry = getDataDropTargetRegistry({} as StudioCtx);
    const onDropData = vi.fn();
    registry.register({
      getElement: () => target,
      accepts: () => true,
      onDropData,
      setHoverState: vi.fn(),
    });
    const payload = {
      path: ["$state", "name"],
      label: "name",
      value: "Ada",
      varType: "string" as const,
      sourceViewCtx: {} as ViewCtx,
      envKeys: ["$state"],
    };

    const pt = new Pt(0, 0);
    registry.drag(payload, pt);

    expect(registry.drop(payload, pt)).toBe(true);
    expect(onDropData).toHaveBeenCalledWith(payload, pt);
    expect(document.activeElement).toBe(target);

    bottomPanelInput.remove();
    target.remove();
  });
});

const components = { A: {}, B: {} };
const mkViewCtx = (name: keyof typeof components) =>
  ({ currentComponent: () => components[name] }) as unknown as ViewCtx;
const sameVc = mkViewCtx("A");

describe("provider-scoped data drops", () => {
  const payload = {
    path: ["$ctx", "product", "name"],
    label: "name",
    value: "Product",
    varType: "string" as const,
    sourceViewCtx: mkViewCtx("A"),
    envKeys: ["$ctx"],
  };

  it.each([
    undefined,
    {},
    { $ctx: {} },
    { $ctx: null },
    { $ctx: { other: {} } },
  ])("rejects a missing provider binding in %j", (env) => {
    expect(canUseDataDragPath(payload, env, sameVc)).toBe(
      "This data is not available here",
    );
  });

  it.each([{ name: "Product" }, {}, null, undefined, false, 0, ""])(
    "accepts an in-scope provider regardless of its current value (%j)",
    (product) => {
      expect(canUseDataDragPath(payload, { $ctx: { product } }, sameVc)).toBe(
        true,
      );
    },
  );

  it.each(["$q", "$queries", "$state"])(
    "checks the %s binding in the target env",
    (root) => {
      const drag = { ...payload, path: [root, "onlyA", "data", "name"] };
      expect(canUseDataDragPath(drag, { [root]: {} }, sameVc)).toBe(
        "This data is not available here",
      );
      expect(
        canUseDataDragPath(drag, { [root]: { onlyA: undefined } }, sameVc),
      ).toBe(true);
      expect(
        canUseDataDragPath(drag, { [root]: { onlyA: null } }, sameVc),
      ).toBe(true);
    },
  );

  it("rejects component-scoped data from another component", () => {
    const drag = { ...payload, path: ["$props", "slug"] };
    const env = { $props: { slug: "a" } };
    expect(canUseDataDragPath(drag, env, sameVc)).toBe(true);
    expect(canUseDataDragPath(drag, env, mkViewCtx("B"))).toBe(
      "This data is not available here",
    );
    expect(
      canUseDataDragPath(
        { ...payload, sourceViewCtx: mkViewCtx("B") },
        { $ctx: { product: {} } },
        sameVc,
      ),
    ).toBe(true);
  });

  it("checks only the binding, allowing loading or optional nested fields", () => {
    expect(
      canUseDataDragPath(
        { ...payload, path: ["currentItem", "name"] },
        { currentItem: undefined },
        sameVc,
      ),
    ).toBe(true);
    expect(
      canUseDataDragPath(
        { ...payload, path: ["currentItem", "name"] },
        { $ctx: {} },
        sameVc,
      ),
    ).not.toBe(true);
    expect(
      canUseDataDragPath({ ...payload, path: ["$ctx"] }, { $ctx: {} }, sameVc),
    ).toBe(true);
  });
});
