import { FreeBoxInsertion, insertBySpec, NodeTargeter } from "@/wab/client/Dnd";
import { setupComponentWithTplTree } from "@/wab/client/operations/__testonly__/utils";
import { insertTplAsChild } from "@/wab/client/operations/insert-tpl";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { assert } from "@/wab/shared/common";
import * as Tpls from "@/wab/shared/core/tpls";
import { ValTag } from "@/wab/shared/core/val-nodes";
import { Box, Pt } from "@/wab/shared/geom";
import { vi } from "vitest";

vi.mock("@/wab/client/coords", () => ({
  clientToFramePt: (pt: Pt) => pt,
}));
vi.mock("@/wab/client/dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/wab/client/dom")>()),
  getPaddingRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
}));
vi.mock("@/wab/shared/core/selection", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/wab/shared/core/selection")>()),
  SQ: (val: ValTag) => ({
    layoutChildren: () => ({ toArray: () => val.children }),
  }),
}));

describe("list-item drops", () => {
  it.each([
    ["list-item", false, false, "relative"],
    ["list-item", true, false, "relative"],
    ["list-item", false, true, "absolute"],
    ["block", false, false, "absolute"],
  ] as const)(
    "display=%s, existing child=%s, absolute drop=%s",
    (display, hasChild, absolute, position) => {
      const item = Tpls.mkTplTagX("li", {});
      const root = Tpls.mkTplTagX("ul", {}, item);
      const ctx = setupComponentWithTplTree(root);
      const vs = ctx.vtm.ensureBaseVariantSetting(item);
      vs.rs.values = { display };
      const selectable = new ValTag({
        tpl: item,
        children: [],
        className: `uid-${vs.rs.uid}`,
        key: "item",
        fullKey: "item",
        frameUid: 1,
        fibers: [],
        parent: undefined,
        valOwner: undefined,
        slotInfo: undefined,
      });
      if (hasChild) {
        const content = Tpls.mkTplTagX("div", {});
        item.children.push(content);
        content.parent = item;
        selectable.children.push(
          new ValTag({
            tpl: content,
            children: [],
            className: "",
            key: "content",
            fullKey: "content",
            frameUid: 1,
            fibers: [],
            parent: selectable,
            valOwner: undefined,
            slotInfo: undefined,
          }),
        );
      }
      const box = new Box(0, 0, 100, 100);
      const nodeBox: ConstructorParameters<typeof FreeBoxInsertion>[0] = {
        selectable,
        dom: document.createElement("li"),
        box,
        paddingBox: box,
        boxInScaler: box,
        flowDir: "vertical",
        isInFlex: false,
        isInFlexReverse: false,
        acceptsChildren: true,
        acceptsNeighbors: true,
        measuredGrid: undefined,
        containerType: "free",
      };
      // Supply measured geometry; exercise real targeting and insertion dispatch.
      vi.spyOn(
        NodeTargeter.prototype as unknown as { calcBoxes: () => unknown },
        "calcBoxes",
      ).mockReturnValue({
        nodeBoxes: [nodeBox],
        insertionBoxes: [],
        nodeBoxToBeforeAfter: new Map(),
        frameRect: { left: 0, top: 0, width: 100, height: 100 },
      });
      const tryInsertAsChild = vi.fn((node, parent, opts) =>
        insertTplAsChild(node, parent, ctx, opts).isOk(),
      );
      const vc = {
        valState: () => ({}),
        setDndTentativeInsertion: vi.fn(),
        getViewOps: () => ({ tryInsertAsChild }),
      } as unknown as ViewCtx;
      const targeter = new NodeTargeter(vc);
      const pt = new Pt(50, 50);
      const ins = absolute
        ? targeter.getAbsInsertion(pt)
        : targeter.getInsertion(pt);
      assert(ins instanceof FreeBoxInsertion, "expected child insertion");
      const nested = ctx.vtm.mkTplTagX("ul");
      insertBySpec(vc, ins, nested, false);
      expect(nested.parent).toBe(item);
      expect(
        ctx.vtm.effectiveVariantSetting(nested).rsh().get("position"),
      ).toBe(position);
      expect(tryInsertAsChild).toHaveBeenCalledWith(
        nested,
        item,
        expect.objectContaining({ forceFree: position === "absolute" }),
      );
    },
  );
});
