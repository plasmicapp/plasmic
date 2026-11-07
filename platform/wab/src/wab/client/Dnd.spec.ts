import {
  BindInsertion,
  DragInsertManager,
  NodeTargeter,
} from "@/wab/client/Dnd";
import { ViewOps } from "@/wab/client/components/canvas/view-ops";
import { mkDataDragSpec } from "@/wab/client/components/sidebar-tabs/DataBinding/data-drag";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { mkBaseVariant, mkVariantSetting } from "@/wab/shared/Variants";
import { mkNormalizedRep } from "@/wab/shared/copilot/utils";
import { code } from "@/wab/shared/core/exprs";
import { mkTplTagX } from "@/wab/shared/core/tpls";
import { ValTag } from "@/wab/shared/core/val-nodes";
import { Pt } from "@/wab/shared/geom";

it.each(["text-content", "data-rep"] as const)(
  "marks %s drops as bindings of existing nodes",
  (kind) => {
    const tpl = mkTplTagX("div");
    const selectable = new ValTag({
      tpl,
      key: "target",
      fullKey: "target",
      frameUid: 1,
      fibers: [],
      parent: undefined,
      valOwner: undefined,
      className: "",
      slotInfo: undefined,
      children: [],
    });
    const base = mkBaseVariant();
    const rep = mkNormalizedRep(code("([])"), "currentItem", "currentIndex");
    const title = code("currentItem.title");
    const visibility = code("currentItem.visible");
    const vs = mkVariantSetting({
      variants: [base],
      dataRep: rep,
      attrs: { title },
      dataCond: visibility,
    });
    tpl.vsettings = [...tpl.vsettings, vs];
    const element = rep.element;
    const index = rep.index;
    const vtm = {
      getTargetVariantComboForNode: () => [base],
      ensureBaseVariantSetting: () => vs,
      effectiveVariantSetting: () => vs,
    };
    const vc = {
      arenaFrame: () => ({}),
      getViewOps: () => ops,
      variantTplMgr: () => vtm,
      setStudioFocusByTpl: vi.fn(),
    } as unknown as ViewCtx;
    const ops = new ViewOps({ viewCtx: vc });
    const sc = {
      setStudioFocusOnFrameContents: vi.fn(),
    } as unknown as StudioCtx;
    const ins = new BindInsertion(
      { selectable } as any,
      kind,
      ["$state", "value"],
      "fallback",
    );
    const targeter = {
      vc,
      getInsertion: () => ins,
      clear: vi.fn(),
    } as unknown as NodeTargeter;
    const manager = new DragInsertManager(sc, [targeter]);
    const factory = vi.fn();
    const dataSpec = mkDataDragSpec({
      path: ["$state", "value"],
      label: "value",
      value: [],
      varType: "array",
      sourceViewCtx: vc,
      envKeys: [],
    });
    manager.drag(new Pt(10, 10), {
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
    });
    expect(manager.endDrag({ ...dataSpec, factory })).toEqual([vc, tpl]);
    expect(factory).not.toHaveBeenCalled();
    expect(vc.setStudioFocusByTpl).toHaveBeenCalledWith(tpl);
    if (kind === "text-content") {
      expect(vs.text).toMatchObject({ expr: { path: ["$state", "value"] } });
    } else {
      expect(rep.collection).toMatchObject({ path: ["$state", "value"] });
    }
    expect(rep.element).toBe(element);
    expect(rep.index).toBe(index);
    expect(vs.attrs.title).toBe(title);
    expect(vs.dataCond).toBe(visibility);
    expect(manager.endDrag(dataSpec)).toBeUndefined();
  },
);

it.each([true, false])(
  "normalizes a new scaffold only after successful insertion (%s)",
  (accepted) => {
    const parent = mkTplTagX("div");
    const sibling = mkTplTagX("div");
    const inserted = mkTplTagX("div");
    const rep = mkNormalizedRep(code("([])"), "currentItem", "currentIndex");
    inserted.vsettings = [
      ...inserted.vsettings,
      mkVariantSetting({ variants: [mkBaseVariant()], dataRep: rep }),
    ];
    const getCanvasEnvForTpl = vi.fn(() => {
      expect(inserted.parent).toBe(parent);
      return { currentItem: {}, currentIndex: 0 };
    });
    const vc = {
      arenaFrame: () => ({}),
      getCanvasEnvForTpl,
      selectNewTpl: vi.fn(),
      getViewOps: () => ({
        tryInsertAsSibling: () => {
          if (accepted) {
            inserted.parent = parent;
            parent.children = [...parent.children, inserted];
          }
          return accepted;
        },
      }),
    } as unknown as ViewCtx;
    const sc = {
      setStudioFocusOnFrameContents: vi.fn(),
    } as unknown as StudioCtx;
    const targeter = {
      vc,
      getInsertion: () => ({
        type: "SiblingInsertion",
        insertionBox: { valNode: { tpl: sibling }, loc: "after" },
      }),
      clear: vi.fn(),
    } as unknown as NodeTargeter;
    const manager = new DragInsertManager(sc, [targeter]);
    const spec = mkDataDragSpec({
      path: ["$state", "value"],
      label: "value",
      value: [],
      varType: "array",
      sourceViewCtx: vc,
      envKeys: [],
    });
    manager.drag(new Pt(10, 10), {
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
    });
    const result = manager.endDrag({ ...spec, factory: () => inserted });
    if (accepted) {
      expect(result).toEqual([vc, inserted]);
      expect(rep.element.name).not.toBe("currentItem");
      expect(rep.index?.name).not.toBe("currentIndex");
    } else {
      expect(result).toBeUndefined();
      expect(getCanvasEnvForTpl).not.toHaveBeenCalled();
      expect(parent.children).toHaveLength(0);
    }
  },
);
