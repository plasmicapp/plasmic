import {
  canInsertTplAsChild,
  insertTplAsChild,
  insertTplAt,
} from "@/wab/client/operations/insert-tpl";
import { setupComponentWithTplTree } from "@/wab/client/operations/tests/utils";
import { ensureVariantSetting, getBaseVariant } from "@/wab/shared/Variants";
import { assert } from "@/wab/shared/common";
import { mkParam } from "@/wab/shared/core/lang";
import * as Tpls from "@/wab/shared/core/tpls";
import {
  ColumnsConfig,
  SlotParam,
  TplTag,
  ensureKnownSlotParam,
} from "@/wab/shared/model/classes";
import { typeFactory } from "@/wab/shared/model/model-util";

function setup(root: TplTag) {
  const { component, site, tplMgr, vtm } = setupComponentWithTplTree(root);
  return { component, site, tplMgr, vtm, ctx: { vtm, tplMgr } };
}

describe("insertTplAt", () => {
  it("appends and prepends into a container", () => {
    const movedA = Tpls.mkTplTagX("span", {});
    const movedB = Tpls.mkTplTagX("span", {});
    const existing = Tpls.mkTplTagX("span", {});
    const container = Tpls.mkTplTagX("div", {}, existing);
    const root = Tpls.mkTplTagX("div", {}, movedA, movedB, container);
    const { ctx } = setup(root);

    expect(insertTplAt(movedA, container, "append", ctx).isOk()).toBe(true);
    expect(container.children).toEqual([existing, movedA]);

    expect(insertTplAt(movedB, container, "prepend", ctx).isOk()).toBe(true);
    expect(container.children).toEqual([movedB, existing, movedA]);
    expect(movedA.parent).toBe(container);
    expect(movedB.parent).toBe(container);
    expect(root.children).toEqual([container]);
  });

  it("inserts before and after a sibling", () => {
    const a = Tpls.mkTplTagX("span", {});
    const b = Tpls.mkTplTagX("span", {});
    const c = Tpls.mkTplTagX("span", {});
    const root = Tpls.mkTplTagX("div", {}, a, b, c);
    const { ctx } = setup(root);

    expect(insertTplAt(a, c, "after", ctx).isOk()).toBe(true);
    expect(root.children).toEqual([b, c, a]);

    expect(insertTplAt(a, b, "before", ctx).isOk()).toBe(true);
    expect(root.children).toEqual([a, b, c]);
  });

  it("keeps the same-parent as-child no-op guard (canvas free-move contract)", () => {
    const a = Tpls.mkTplTagX("span", {});
    const b = Tpls.mkTplTagX("span", {});
    const root = Tpls.mkTplTagX("div", {}, a, b);
    const { ctx } = setup(root);

    // Re-appending an existing child to its own parent must NOT reorder;
    // canvas free-move relies on this to only update position styles.
    expect(insertTplAt(a, root, "append", ctx).isOk()).toBe(true);
    expect(root.children).toEqual([a, b]);
  });

  it("rejects inserting into a non-container", () => {
    const moved = Tpls.mkTplTagX("span", {});
    const img = Tpls.mkTplTagX("img", {});
    const root = Tpls.mkTplTagX("div", {}, moved, img);
    const { ctx } = setup(root);

    const result = insertTplAt(moved, img, "append", ctx);
    assert(result.isErr(), "expected error result");
    expect(result.error).toMatchObject({ type: "CantAddToAtomic" });
    expect(root.children).toEqual([moved, img]);
  });

  it("rejects inserting an element into its own descendant", () => {
    const grandchild = Tpls.mkTplTagX("span", {});
    const child = Tpls.mkTplTagX("div", {}, grandchild);
    const root = Tpls.mkTplTagX("div", {}, child);
    const { ctx } = setup(root);

    const result = insertTplAt(child, grandchild, "append", ctx);
    assert(result.isErr(), "expected error result");
    expect(result.error).toMatchObject({ type: "CantAddToSelfDescendant" });
    expect(child.parent).toBe(root);
  });

  it("rejects adding a sibling to the root element", () => {
    const moved = Tpls.mkTplTagX("span", {});
    const root = Tpls.mkTplTagX("div", {}, moved);
    const { ctx } = setup(root);

    const result = insertTplAt(moved, root, "after", ctx);
    assert(result.isErr(), "expected error result");
    expect(result.error).toMatchObject({ type: "CantAddSiblingToRoot" });
  });
});

describe("insertTplAsChild", () => {
  it("converts a text-block parent into a container before inserting", () => {
    const moved = Tpls.mkTplTagX("span", {});
    const textBlock = Tpls.mkTplTagX("button", {
      type: Tpls.TplTagType.Text,
    });
    const root = Tpls.mkTplTagX("div", {}, moved, textBlock);
    const { ctx } = setup(root);

    const result = insertTplAsChild(moved, textBlock, ctx);

    expect(result.isOk()).toBe(true);
    // The text block became a plain container holding [text child, moved]
    expect(textBlock.type).toEqual(Tpls.TplTagType.Other);
    expect(textBlock.children).toHaveLength(2);
    expect(Tpls.isTplTextBlock(textBlock.children[0])).toBe(true);
    expect(textBlock.children[1]).toBe(moved);
    expect(moved.parent).toBe(textBlock);
  });

  it("adopts the new parent's layout on reparent, resetting stale offsets", () => {
    const moved = Tpls.mkTplTagX("div", {});
    const flexParent = Tpls.mkTplTagX("div", {});
    const root = Tpls.mkTplTagX("div", {}, moved, flexParent);
    const { component, ctx } = setup(root);

    const baseVariant = getBaseVariant(component);
    const movedVs = ensureVariantSetting(moved, [baseVariant]);
    movedVs.rs.values = { left: "10px", top: "20px" };
    const parentVs = ensureVariantSetting(flexParent, [baseVariant]);
    parentVs.rs.values = { display: "flex", "flex-direction": "row" };

    expect(insertTplAsChild(moved, flexParent, ctx).isOk()).toBe(true);
    // Relative positioning adopted: offsets neutralized to auto. (position
    // itself stays unset — it already reads as "relative" by default.)
    expect(movedVs.rs.values["left"]).toEqual("auto");
    expect(movedVs.rs.values["top"]).toEqual("auto");
  });

  it("redistributes column sizes when a column is added to a columns container", () => {
    const col1 = Tpls.mkTplTagX("div", { type: Tpls.TplTagType.Column });
    const col2 = Tpls.mkTplTagX("div", { type: Tpls.TplTagType.Column });
    const columns = Tpls.mkTplTag("div", [col1, col2]);
    columns.type = Tpls.TplTagType.Columns;
    const root = Tpls.mkTplTagX("div", {}, columns);
    const { component, ctx } = setup(root);

    const baseVariant = getBaseVariant(component);
    const vs = ensureVariantSetting(columns, [baseVariant]);
    vs.columnsConfig = new ColumnsConfig({
      breakUpRows: false,
      colsSizes: [6, 6],
    });

    const col3 = Tpls.mkTplTagX("div", { type: Tpls.TplTagType.Column });
    expect(insertTplAsChild(col3, columns, ctx).isOk()).toBe(true);
    expect(columns.children).toEqual([col1, col2, col3]);
    expect(vs.columnsConfig.colsSizes).toHaveLength(3);
  });

  it("rejects non-column children in a columns container and columns escaping it", () => {
    const col = Tpls.mkTplTagX("div", { type: Tpls.TplTagType.Column });
    const columns = Tpls.mkTplTag("div", [col]);
    columns.type = Tpls.TplTagType.Columns;
    const plain = Tpls.mkTplTagX("span", {});
    const other = Tpls.mkTplTagX("div", {});
    const root = Tpls.mkTplTagX("div", {}, columns, plain, other);
    const { ctx } = setup(root);

    const plainIntoColumns = insertTplAsChild(plain, columns, ctx);
    assert(plainIntoColumns.isErr(), "expected error result");
    expect(plainIntoColumns.error).toMatchObject({
      type: "CantAddNonColumnToColumns",
    });
    const colIntoOther = insertTplAsChild(col, other, ctx);
    assert(colIntoOther.isErr(), "expected error result");
    expect(colIntoOther.error).toMatchObject({
      type: "CantAddColumnToNonColumns",
    });
    const plainAfterCol = insertTplAt(plain, col, "after", ctx);
    assert(plainAfterCol.isErr(), "expected error result");
    expect(plainAfterCol.error).toMatchObject({
      type: "CantAddNonColumnSiblingToColumn",
    });
  });
});

describe("canInsertTplAsChild", () => {
  it("rejects component cycles", () => {
    const root = Tpls.mkTplTagX("div", {});
    const { component, ctx } = setup(root);

    const selfInstance = Tpls.mkTplComponentX({
      component,
      baseVariant: getBaseVariant(component),
    });

    expect(canInsertTplAsChild(selfInstance, root, ctx)).toMatchObject({
      type: "ComponentCycle",
    });
  });

  it("rejects nested slots", () => {
    const slotContent = Tpls.mkTplTagX("div", {});
    const root = Tpls.mkTplTagX("div", {});
    const { component, ctx } = setup(root);

    const paramA = ensureKnownSlotParam(
      mkParam({
        name: "children",
        type: typeFactory.renderable(),
        paramType: "slot",
      })
    );
    component.params.push(paramA);
    const slotA = Tpls.mkSlot(paramA, [slotContent]);
    root.children.push(slotA);
    slotA.parent = root;

    const paramB = mkParam({
      name: "extra",
      type: typeFactory.renderable(),
      paramType: "slot",
    });
    const slotB = Tpls.mkSlot(paramB as SlotParam);

    expect(canInsertTplAsChild(slotB, slotContent, ctx)).toMatchObject({
      type: "NestedSlots",
    });
  });

  it("applies the injected slot default-contents gate", () => {
    const root = Tpls.mkTplTagX("div", {});
    const { component, ctx, vtm, tplMgr } = setup(root);

    const param = ensureKnownSlotParam(
      mkParam({
        name: "children",
        type: typeFactory.renderable(),
        paramType: "slot",
      })
    );
    component.params.push(param);
    const slot = Tpls.mkSlot(param);
    root.children.push(slot);
    slot.parent = root;

    const moved = Tpls.mkTplTagX("span", {});

    // Tool can edit default slot content
    expect(canInsertTplAsChild(moved, slot, ctx)).toBe(true);

    // Studio-like gate that disallows editing default contents.
    expect(
      canInsertTplAsChild(moved, slot, {
        vtm,
        tplMgr,
        canEditSlotDefaultContents: () => false,
      })
    ).toMatchObject({ type: "CantAddToSlotOutOfContext" });
  });
});
