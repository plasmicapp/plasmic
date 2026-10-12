import { setupComponentWithTplTree } from "@/wab/client/operations/__testonly__/utils";
import { createVariantGroup } from "@/wab/client/operations/create-variant-group";
import {
  canInsertTplAsChild,
  insertTplAsChild,
  insertTplAt,
} from "@/wab/client/operations/insert-tpl";
import { unwrap } from "@/wab/commons/neverthrow-utils";
import { VariantOptionsType } from "@/wab/shared/TplMgr";
import { $$$ } from "@/wab/shared/TplQuery";
import { ensureVariantSetting, getBaseVariant } from "@/wab/shared/Variants";
import { assert } from "@/wab/shared/common";
import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { mkParam } from "@/wab/shared/core/lang";
import { SlotSelection } from "@/wab/shared/core/slots";
import * as Tpls from "@/wab/shared/core/tpls";
import { Pt } from "@/wab/shared/geom";
import {
  CodeComponentMeta,
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

  describe("PLA-12899", () => {
    function setupList() {
      const content = Tpls.mkTplTagX("div", {});
      const item = Tpls.mkTplTagX("li", {}, content);
      const nextItem = Tpls.mkTplTagX("li", {});
      const list = Tpls.mkTplTagX("ul", {}, item, nextItem);
      const root = Tpls.mkTplTagX("div", {}, list);
      const result = setup(root);
      const text = result.vtm.mkTplInlinedText("Parent item", "div");
      content.children.push(text);
      text.parent = content;
      result.vtm.ensureBaseVariantSetting(item).rs.values = {
        display: "list-item",
      };
      const nestedItem = result.vtm.mkTplTagX("li");
      result.vtm.ensureBaseVariantSetting(nestedItem).rs.values = {
        display: "list-item",
      };
      const nested = result.vtm.mkTplTagX("ul", undefined, [nestedItem]);
      return {
        ...result,
        root,
        list,
        item,
        nextItem,
        content,
        text,
        nested,
        nestedItem,
      };
    }

    it.each([false, true])(
      "%s PLA-12899 new nested list stays in normal flow",
      (withOffset) => {
        const {
          ctx,
          vtm,
          list,
          item,
          nextItem,
          content,
          text,
          nested,
          nestedItem,
        } = setupList();
        if (withOffset) {
          vtm.ensureBaseVariantSetting(nested).rs.values = {
            position: "relative",
            left: "12px",
            top: "24px",
            right: "6px",
            bottom: "8px",
          };
        }

        expect(insertTplAsChild(nested, item, ctx).isOk()).toBe(true);
        expect(item.children).toEqual([content, nested]);
        expect(content.children).toEqual([text]);
        expect(vtm.ensureBaseVariantSetting(text).text).toMatchObject({
          text: "Parent item",
        });
        expect(list.children).toEqual([item, nextItem]);
        expect(item.tag).toBe("li");
        expect(vtm.effectiveVariantSetting(item).rsh().get("display")).toBe(
          "list-item",
        );
        expect(nested.tag).toBe("ul");
        expect(nested.children).toEqual([nestedItem]);
        expect(nested.parent).toBe(item);
        const styles = vtm.effectiveVariantSetting(nested).rsh();
        expect(styles.get("position")).toBe("relative");
        for (const prop of ["left", "top", "right", "bottom"]) {
          expect(styles.get(prop)).toBe("auto");
        }
      },
    );

    it("PLA-12899 reparent nested list stays in normal flow", () => {
      const { ctx, vtm, root, list, item, nextItem, content, text, nested } =
        setupList();
      root.children.push(nested);
      nested.parent = root;
      vtm.ensureBaseVariantSetting(nested).rs.values = { position: "relative" };

      expect(insertTplAsChild(nested, item, ctx).isOk()).toBe(true);
      expect(root.children).toEqual([list]);
      expect(item.children).toEqual([content, nested]);
      expect(content.children).toEqual([text]);
      expect(vtm.ensureBaseVariantSetting(text).text).toMatchObject({
        text: "Parent item",
      });
      expect(list.children).toEqual([item, nextItem]);
      expect(nested.parent).toBe(item);
      const styles = vtm.effectiveVariantSetting(nested).rsh();
      expect(styles.get("position")).toBe("relative");
      for (const prop of ["left", "top", "right", "bottom"]) {
        expect(styles.get(prop)).toBe("auto");
      }
    });

    it.each(["free container", "forceFree", "keepFree"])(
      "PLA-12899 intentional absolute positioning: %s",
      (mode) => {
        const { ctx, vtm, root, item, nested } = setupList();
        vtm.ensureBaseVariantSetting(root).rs.values = { display: "block" };
        if (mode === "keepFree") {
          vtm.ensureBaseVariantSetting(nested).rs.values = {
            position: "absolute",
          };
        }
        expect(
          insertTplAsChild(
            nested,
            mode === "free container" ? root : item,
            ctx,
            {
              forceFree: mode === "forceFree",
              keepFree: mode === "keepFree",
            },
          ).isOk(),
        ).toBe(true);
        const styles = vtm.effectiveVariantSetting(nested).rsh();
        expect(styles.get("position")).toBe("absolute");
        expect(styles.get("left")).toBe("0px");
        expect(styles.get("top")).toBe("0px");
      },
    );
  });

  describe("an absolutely positioned element in a code component's slot", () => {
    // A free-floating element holding a code component instance that fills it,
    // with a marker placed in the instance's "children" slot by percentages.
    // The marker has its own offsets in a second variant too. A second marker
    // sits in the instance's "header" slot.
    function setupMarkerInSlot() {
      const outsider = Tpls.mkTplTagX("div", {});
      const root = Tpls.mkTplTagX(
        "div",
        {},
        Tpls.mkTplTagX("div", {}, outsider),
      );
      const { component, site, tplMgr, vtm, ctx } = setup(root);
      vtm.ensureBaseVariantSetting(root).rs.values = { display: "block" };

      const [childrenParam, headerParam] = ["children", "header"].map((name) =>
        ensureKnownSlotParam(
          mkParam({ name, type: typeFactory.renderable(), paramType: "slot" }),
        ),
      );
      const panel = mkComponent({
        name: "Panel",
        type: ComponentType.Code,
        tplTree: Tpls.mkTplTagX(
          "div",
          {},
          Tpls.mkSlot(headerParam),
          Tpls.mkSlot(childrenParam),
        ),
        params: [headerParam, childrenParam],
        codeComponentMeta: {} as CodeComponentMeta,
      });
      site.components.push(panel);
      const panelInstance = Tpls.mkTplComponentX({
        component: panel,
        baseVariant: getBaseVariant(component),
      });
      $$$(root).append(panelInstance);

      const marker = Tpls.mkTplTagX("div", {});
      $$$(panelInstance).append(marker);
      const baseVs = vtm.ensureBaseVariantSetting(marker);
      baseVs.rs.values = { position: "absolute", left: "48.66%", top: "63.4%" };

      const mobile = unwrap(
        createVariantGroup({
          component,
          tplMgr,
          name: "mobile",
          optionsType: VariantOptionsType.standalone,
        }),
      ).variants[0];
      const mobileVs = ensureVariantSetting(marker, [mobile]);
      mobileVs.rs.values = { left: "10%", top: "20%" };

      const headerMarker = Tpls.mkTplTagX("div", {});
      $$$(
        new SlotSelection({ tpl: panelInstance, slotParam: headerParam }),
      ).append(headerMarker);
      vtm.ensureBaseVariantSetting(headerMarker).rs.values = {
        position: "absolute",
        left: "25%",
        top: "10%",
      };

      return {
        ctx,
        panelInstance,
        childrenParam,
        headerParam,
        headerMarker,
        marker,
        outsider,
        mobile,
        baseVs,
        mobileVs,
      };
    }

    // The canvas drops at a pixel point in the instance's box; it has already
    // written the dragged offsets in the marker's own units by then.
    const dropPoint = new Pt(214.5, 229.203125);

    it("keeps its offsets when dropped back onto the same component instance", () => {
      const { ctx, panelInstance, marker, baseVs, mobileVs } =
        setupMarkerInSlot();

      expect(
        insertTplAsChild(marker, panelInstance, ctx, {
          parentOffset: dropPoint,
          forceFree: true,
        }).isOk(),
      ).toBe(true);

      expect(marker.parent).toBe(panelInstance);
      expect(baseVs.rs.values).toEqual({
        position: "absolute",
        left: "48.66%",
        top: "63.4%",
      });
      expect(mobileVs.rs.values).toEqual({ left: "10%", top: "20%" });
    });

    it("keeps its offsets when dropped onto the same slot", () => {
      const { ctx, panelInstance, childrenParam, marker, baseVs, mobileVs } =
        setupMarkerInSlot();

      expect(
        insertTplAsChild(
          marker,
          new SlotSelection({ tpl: panelInstance, slotParam: childrenParam }),
          ctx,
          { parentOffset: dropPoint },
        ).isOk(),
      ).toBe(true);

      expect(marker.parent).toBe(panelInstance);
      expect(baseVs.rs.values).toEqual({
        position: "absolute",
        left: "48.66%",
        top: "63.4%",
      });
      expect(mobileVs.rs.values).toEqual({ left: "10%", top: "20%" });
    });

    it("an element in another slot stays there with its offsets when dropped onto the instance", () => {
      const { ctx, panelInstance, headerParam, headerMarker } =
        setupMarkerInSlot();

      expect(
        insertTplAsChild(headerMarker, panelInstance, ctx, {
          parentOffset: dropPoint,
          forceFree: true,
        }).isOk(),
      ).toBe(true);

      expect($$$(panelInstance).getArgContainingTpl(headerMarker).param).toBe(
        headerParam,
      );
      expect(ctx.vtm.ensureBaseVariantSetting(headerMarker).rs.values).toEqual({
        position: "absolute",
        left: "25%",
        top: "10%",
      });
    });

    it("an element moved to another slot takes that slot's layout", () => {
      const { ctx, panelInstance, childrenParam, headerMarker } =
        setupMarkerInSlot();

      expect(
        insertTplAsChild(
          headerMarker,
          new SlotSelection({ tpl: panelInstance, slotParam: childrenParam }),
          ctx,
          { parentOffset: dropPoint },
        ).isOk(),
      ).toBe(true);

      expect($$$(panelInstance).getArgContainingTpl(headerMarker).param).toBe(
        childrenParam,
      );
      const styles = ctx.vtm.effectiveVariantSetting(headerMarker).rsh();
      expect(styles.get("position")).toBe("relative");
      expect(styles.get("left")).toBe("auto");
      expect(styles.get("top")).toBe("auto");
    });

    it("an element moved in from another box lands at the drop point", () => {
      const { ctx, panelInstance, outsider } = setupMarkerInSlot();

      expect(
        insertTplAsChild(outsider, panelInstance, ctx, {
          parentOffset: dropPoint,
          forceFree: true,
        }).isOk(),
      ).toBe(true);

      expect(outsider.parent).toBe(panelInstance);
      const styles = ctx.vtm.effectiveVariantSetting(outsider).rsh();
      expect(styles.get("position")).toBe("absolute");
      expect(styles.get("left")).toBe("214.5px");
      expect(styles.get("top")).toBe("229.203125px");
    });

    // Duplicate and paste-after-copy insert a clone right after the original.
    it("a duplicate keeps the original's position in every variant", () => {
      const { ctx, panelInstance, marker, mobile } = setupMarkerInSlot();
      const copy = Tpls.clone(marker);

      expect(insertTplAt(copy, marker, "after", ctx).isOk()).toBe(true);

      expect(copy.parent).toBe(panelInstance);
      expect(ctx.vtm.ensureBaseVariantSetting(copy).rs.values).toEqual({
        position: "absolute",
        left: "48.66%",
        top: "63.4%",
      });
      expect(ensureVariantSetting(copy, [mobile]).rs.values).toEqual({
        left: "10%",
        top: "20%",
      });
    });
  });

  it("a duplicate in a free box keeps the original's offsets", () => {
    const marker = Tpls.mkTplTagX("div", {});
    const root = Tpls.mkTplTagX("div", {}, marker);
    const { ctx, vtm } = setup(root);
    vtm.ensureBaseVariantSetting(root).rs.values = { display: "block" };
    vtm.ensureBaseVariantSetting(marker).rs.values = {
      position: "absolute",
      left: "40%",
      top: "40%",
    };
    const copy = Tpls.clone(marker);

    expect(insertTplAt(copy, marker, "after", ctx).isOk()).toBe(true);

    expect(root.children).toEqual([marker, copy]);
    expect(vtm.ensureBaseVariantSetting(copy).rs.values).toEqual({
      position: "absolute",
      left: "40%",
      top: "40%",
    });
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
      }),
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
      }),
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
      }),
    ).toMatchObject({ type: "CantAddToSlotOutOfContext" });
  });
});
