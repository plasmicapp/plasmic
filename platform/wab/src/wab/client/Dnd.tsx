import {
  ManipState,
  ManipulatorAbortedError,
  ModifierStates,
  mkFreestyleManipForFocusedDomElt,
} from "@/wab/client/FreestyleManipulator";
import { hasLinkedSelectable } from "@/wab/client/components/canvas/studio-canvas-util";
import {
  MeasuredGrid,
  findRowColForMouse,
} from "@/wab/client/components/style-controls/GridEditor";
import { useViewCtx } from "@/wab/client/contexts/StudioContexts";
import {
  clientToFramePt,
  frameToClientRect,
  frameToScalerRect,
} from "@/wab/client/coords";
import {
  AddInstallableItem,
  AddTplItem,
} from "@/wab/client/definitions/insertables";
import * as domMod from "@/wab/client/dom";
import { getPaddingRect, hasLayoutBox } from "@/wab/client/dom";
import {
  getElementVisibleBounds,
  getVisibleBoundingClientRect,
} from "@/wab/client/dom-utils";
import {
  CONTENT_LAYOUT_ICON,
  ERROR_ICON,
  FREE_CONTAINER_ICON,
  GRID_CONTAINER_ICON,
  HORIZ_STACK_ICON,
  SLOT_ICON,
  VERT_STACK_ICON,
} from "@/wab/client/icons";
import {
  ClientCantAddChildMsg,
  renderCantAddMsg,
} from "@/wab/client/messages/parenting-msgs";
import { computeNodeOutlineTagLayoutClass } from "@/wab/client/node-outline";
import {
  StudioCtx,
  cssPropsForInvertTransform,
} from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { summarizeFocusObj } from "@/wab/client/utils/tpl-client-utils";
import { Area } from "@/wab/shared/Grids";
import { getAncestorSlotArg } from "@/wab/shared/SlotUtils";
import { $$$ } from "@/wab/shared/TplQuery";
import {
  assert,
  ensure,
  ensureArray,
  ensureInstance,
  maybe,
  tuple,
  withoutNils,
} from "@/wab/shared/common";
import {
  SQ,
  SelQuery,
  Selectable,
  isSelectableLocked,
} from "@/wab/shared/core/selection";
import { SlotSelection } from "@/wab/shared/core/slots";
import { isTplVariantable, prepareFocusedTpls } from "@/wab/shared/core/tpls";
import {
  ValComponent,
  ValNode,
  ValSlot,
  ValTag,
  getComputedStyleForVal,
  isValTagOrComponent,
} from "@/wab/shared/core/val-nodes";
import { asVal } from "@/wab/shared/core/vals";
import {
  Box,
  Orientation,
  Pt,
  Rect,
  Side,
  sideToOrient,
} from "@/wab/shared/geom";
import { CloneOpts } from "@/wab/shared/insertable-templates/types";
import {
  ContainerLayoutType,
  ContainerType,
  getRshContainerType,
  isFlexReverse,
} from "@/wab/shared/layoututils";
import { Arena, Component, TplNode } from "@/wab/shared/model/classes";
import {
  canAddChildrenToSelectableAndWhy,
  canAddSiblings,
} from "@/wab/shared/parenting";
import classNames from "classnames";
import $ from "jquery";
import L from "lodash";
import { Observer, observer } from "mobx-react";
import * as React from "react";

const insertionStripThickness = 4;
const insertionStripExtension = 0;

function DndMarkers_(props: { viewCtx: ViewCtx }) {
  return (
    <>
      {props.viewCtx.focusedTpls().map((tpl, i) => {
        return (
          <div
            key={tpl?.uuid ?? i}
            className={"dnd__drag-ghost dnd__drag-ghost-" + i}
          />
        );
      })}
      <DndTentativeSlotDropMarker viewCtx={props.viewCtx} />
      <DndTentativeContainerMarker viewCtx={props.viewCtx} />
    </>
  );
}
export const DndMarkers = observer(DndMarkers_);

function DndTentativeContainerMarker_(props: { viewCtx: ViewCtx }) {
  const vc = props.viewCtx;
  const ins = vc.getDndTentativeInsertion();

  if (!ins) {
    return null;
  }

  function getContainerVal(insertion: InsertionSpec) {
    if (
      insertion.type === "FreeBoxInsertion" ||
      insertion.type === "GridInsertion" ||
      insertion.type === "ErrorInsertion"
    ) {
      return insertion.nodeBox.selectable;
    } else if (insertion.type === "SiblingInsertion") {
      return vc.valState().valParent(insertion.insertionBox.valNode);
    } else {
      throw new Error(`Unknown insertion spec type`);
    }
  }

  function createContainerIcon(container: Selectable) {
    if (
      ensure(
        ins,
        "Unexpected undefined ins. Should only call this function if ins is defined."
      ).type === "ErrorInsertion"
    ) {
      return <div className="dnd__container-tag__icon">{ERROR_ICON}</div>;
    }
    if (container instanceof SlotSelection) {
      return <div className="dnd__container-tag__icon">{SLOT_ICON}</div>;
    } else if (container instanceof ValTag) {
      const style = getComputedStyleForVal(container);
      const containerType = getRshContainerType(style);
      return (
        <div className="dnd__container-tag__icon">
          {containerType === ContainerLayoutType.free && FREE_CONTAINER_ICON}
          {containerType === ContainerLayoutType.grid && GRID_CONTAINER_ICON}
          {containerType === ContainerLayoutType.flexColumn && VERT_STACK_ICON}
          {containerType === ContainerLayoutType.flexRow && HORIZ_STACK_ICON}
          {containerType === ContainerLayoutType.contentLayout &&
            CONTENT_LAYOUT_ICON}
        </div>
      );
    } else {
      return null;
    }
  }

  function getContainerRect(insertion: InsertionSpec) {
    if (insertion.type === "SiblingInsertion") {
      const containerVal = getContainerVal(insertion);
      const dom = withoutNils(
        ensureArray(
          vc.renderState.sel2dom(containerVal as ValNode, vc.canvasCtx)
        )
      );
      if (dom.length === 0) {
        return undefined;
      }
      const rect = domMod.getBoundingClientRect(...dom);
      return frameToScalerRect(rect, vc);
    } else {
      return insertion.nodeBox.boxInScaler.rect();
    }
  }

  function tagContent(container: Selectable) {
    if (ins && ins.type === "ErrorInsertion") {
      return renderCantAddMsg(ins.msg);
    } else if (
      container instanceof ValNode &&
      isTplVariantable(container.tpl)
    ) {
      const vs = vc.effectiveCurrentVariantSetting(container.tpl);
      return summarizeFocusObj(container, vc, vs);
    } else {
      return summarizeFocusObj(container, vc);
    }
  }

  const containerVal = getContainerVal(ins);
  if (!containerVal) {
    return null;
  }

  if (
    containerVal instanceof ValNode &&
    vc.getViewOps().isRootNodeOfStretchFrame(containerVal.tpl)
  ) {
    // If this is the root node of a stretchy frame, we don't bother rendering
    // the container box
    return null;
  }
  const containerRect = getContainerRect(ins);
  if (!containerRect) {
    return null;
  }

  const $doc = vc.canvasCtx.$doc();

  return (
    <div
      className={classNames({
        dnd__container: true,
        "dnd__container--free": ins.type === "FreeBoxInsertion",
        "dnd__container--error": ins.type === "ErrorInsertion",
      })}
      style={{
        top: containerRect.top,
        left: containerRect.left,
        ...cssPropsForInvertTransform(vc.studioCtx.zoom, {
          width: containerRect.width,
          height: containerRect.height,
        }),
      }}
    >
      <div
        className={`${classNames({
          "dnd__container-tag": true,
          "node-outline-tag": true,
          "dnd__container-tag--error": ins.type === "ErrorInsertion",
        })}
          ${computeNodeOutlineTagLayoutClass($doc, containerRect).join(" ")}`}
      >
        {createContainerIcon(containerVal)}
        {tagContent(containerVal)}
      </div>
    </div>
  );
}
export const DndTentativeContainerMarker = observer(
  DndTentativeContainerMarker_
);

function DndTentativeSlotDropMarker_(props: { viewCtx: ViewCtx }) {
  const vc = props.viewCtx;
  const ins = vc.getDndTentativeInsertion();
  if (!ins || ins.type !== "SiblingInsertion") {
    return null;
  }

  const insertionBox = ins.insertionBox;
  const markerBox =
    insertionBox.flowDir === "horizontal"
      ? insertionBox.box.pad(-4, 0)
      : insertionBox.box.pad(0, -4);

  const scalerMarkerBox = vc.viewportCtx.clientToScaler(markerBox);

  return (
    <div
      className="dnd__drop-marker"
      style={{
        left: scalerMarkerBox.left(),
        top: scalerMarkerBox.top(),
        ...cssPropsForInvertTransform(vc.studioCtx.zoom, {
          width: scalerMarkerBox.width(),
          height: scalerMarkerBox.height(),
        }),
      }}
    />
  );
}
export const DndTentativeSlotDropMarker = observer(DndTentativeSlotDropMarker_);

export function DndAdoptee() {
  const vc = useViewCtx();
  const getParentLoc = L.memoize(() => {
    const elt = ensure(
      vc.canvasCtx.viewport().parentElement,
      "Unexpected undefined parent element."
    );
    return {
      frameOffsetLeft: elt.offsetLeft,
      frameOffsetTop: elt.offsetTop,
    };
  });
  const getCssProps = (a: Adoptee) => {
    const parentLoc = getParentLoc();
    const r = a.domBox
      .moveBy(parentLoc.frameOffsetLeft, parentLoc.frameOffsetTop)
      .rect();
    return {
      top: r.top,
      left: r.left,
      ...cssPropsForInvertTransform(vc.studioCtx.zoom, {
        width: r.width,
        height: r.height,
      }),
    };
  };
  return (
    <>
      <Observer>
        {() => (
          <>
            {vc.highlightedAdoptees().map((a) => (
              <div
                key={a.val.fullKey}
                className={"dnd__adoptee"}
                style={getCssProps(a)}
              />
            ))}
          </>
        )}
      </Observer>
    </>
  );
}

class InsertionBox {
  constructor(
    public readonly loc: "before" | "after" | Side,
    public readonly valNode: ValNode,
    public readonly dom: HTMLElement,
    public readonly box: Box,
    public readonly flowDir: Orientation
  ) {}
}

class NodeBox {
  constructor(
    public readonly selectable: Selectable,
    public readonly dom: HTMLElement,
    /** Box in top window's viewport. Includes border. */
    public readonly box: Box,
    /** Box in top window's viewport. Includes padding but excludes border. */
    public readonly paddingBox: Box,
    /** Box in scaler and relative to scaler. Includes border **/
    public readonly boxInScaler: Box,
    // flow direction of this box, which depends on flow direction of parent box
    public readonly flowDir: Orientation,
    public readonly isInFlex: boolean,
    public readonly isInFlexReverse: boolean,
    public readonly acceptsChildren: true | ClientCantAddChildMsg,
    public readonly acceptsNeighbors: boolean,
    public readonly measuredGrid: MeasuredGrid | undefined,
    public readonly containerType: ContainerType | "slot" | undefined
  ) {}
}

interface BeforeAfterInsertions {
  before: InsertionBox | undefined;
  after: InsertionBox | undefined;
}

interface BoxCalcs {
  nodeBoxes: NodeBox[];
  insertionBoxes: InsertionBox[];
  nodeBoxToBeforeAfter: Map<NodeBox, BeforeAfterInsertions>;
  frameRect: ClientRect;
}

function isBody(sel: Selectable) {
  return sel instanceof ValTag && sel.tpl.tag === "body";
}

export class FreeBoxInsertion {
  readonly type = "FreeBoxInsertion";

  constructor(
    public readonly nodeBox: NodeBox,
    public readonly slotted: boolean,
    public readonly pt: Pt
  ) {}
}

class SiblingInsertion {
  readonly type = "SiblingInsertion";

  constructor(public readonly insertionBox: InsertionBox) {}
}

class GridInsertion {
  readonly type = "GridInsertion";

  constructor(
    /** The nodeBox of the grid container. */
    public readonly nodeBox: NodeBox,
    public readonly area: Area
  ) {}
}

class ErrorInsertion {
  readonly type = "ErrorInsertion";
  constructor(
    public readonly nodeBox: NodeBox,
    public readonly msg: ClientCantAddChildMsg
  ) {}
}

export type InsertionSpec =
  | FreeBoxInsertion
  | SiblingInsertion
  | GridInsertion
  | ErrorInsertion;

export function calcOffset(domElt: HTMLElement, clientPt: Pt, vc: ViewCtx) {
  const parentFrameBox = Box.fromRect(getPaddingRect(domElt));
  const framePt = clientToFramePt(clientPt, vc);
  return parentFrameBox.contains(framePt)
    ? framePt.sub(parentFrameBox.topLeft())
    : undefined;
}

/**
 * When the user is dropping a multi-selection, nodes will be inserted
 * one by one. If the selection is [A, B, C] and the user is dropping
 * it _before_ a node E, then we want to insert A before E, B before E,
 * C before E, to get [A, B, C, E] as expected. If the user is dropping
 * _after_ a node E, then we want to insert C first to get [E, A, B, C].
 * This function returns a boolean indicating whether the nodes should
 * be reversed before inserting.
 */
function shouldInsertInReverseOrder(spec: InsertionSpec) {
  if (!(spec instanceof SiblingInsertion)) {
    return false;
  }

  return ["after", "bottom", "right"].includes(spec.insertionBox.loc);
}

export function insertBySpec(
  vc: ViewCtx,
  ins: Exclude<InsertionSpec, ErrorInsertion>,
  newNode: TplNode,
  focusNewTpl: boolean
) {
  let targetVal: ValNode | undefined = undefined;
  if (ins.type === "SiblingInsertion") {
    if (
      !vc
        .getViewOps()
        .tryInsertAsSibling(
          newNode,
          ins.insertionBox.valNode.tpl,
          ins.insertionBox.loc
        )
    ) {
      return;
    }
    targetVal = ins.insertionBox.valNode;
  } else if (ins.type === "FreeBoxInsertion") {
    const parent =
      ins.nodeBox.selectable instanceof SlotSelection
        ? ins.nodeBox.selectable.toTplSlotSelection()
        : ins.nodeBox.selectable.tpl;
    const parentOffset = calcOffset(ins.nodeBox.dom, ins.pt, vc);
    if (
      !vc.getViewOps().tryInsertAsChild(newNode, parent, {
        parentOffset,
        forceFree: !ins.slotted,
      })
    ) {
      return;
    }
    targetVal =
      ins.nodeBox.selectable instanceof SlotSelection
        ? ins.nodeBox.selectable.val
        : ins.nodeBox.selectable;
  } else if (ins.type === "GridInsertion") {
    const wrapper = $$$(newNode).getAsTagOrWrap();
    const parent = ensureInstance(ins.nodeBox.selectable, ValTag).tpl;
    if (!vc.getViewOps().tryInsertAsChild(wrapper, parent, {})) {
      return;
    }
    vc.variantTplMgr().ensureCurrentVariantSetting(wrapper);
    targetVal = ensureInstance(ins.nodeBox.selectable, ValTag);
  }
  if (focusNewTpl) {
    vc.selectNewTpl(
      newNode,
      false,
      ensure(targetVal, "Unexpected undefined targetVal.")
    );
  }
}

export interface Adoptee {
  val: ValTag | ValComponent;
  dom: HTMLElement;
  // This is the Box in the frame's space. It is essentially just
  // dom.getBoundingRectClient().
  domBox: Box;
}

/**
 * A stateful manager for moving around an existing ValNode using drag and drop.
 */
export class DragMoveManager {
  private $dragHandles: JQuery[];
  private targeter: NodeTargeter | undefined;
  private isAbsPos: boolean[];
  private moveStates: (ManipState | undefined)[];
  private tentativeInsertion?: InsertionSpec;
  private startingFramePt: Pt;
  private cursorOffset: Pt;
  private positionStyles: (string | undefined)[];
  private _aborted = false;

  /**
   * @param vc
   * @param objects the valnodes being dragged around.
   * @param clientPt the initial starting point of the drag-and-drop, in the
   *   client coordinate.
   */
  constructor(
    private vc: ViewCtx,
    private objects: (ValTag | ValComponent | ValSlot)[],
    clientPt: Pt
  ) {
    this.$dragHandles = [];
    this.isAbsPos = [];
    this.moveStates = [];
    this.positionStyles = [];
    this.cursorOffset = new Pt(Infinity, Infinity);

    let top = 0;
    objects.forEach((object, i) => {
      const posStyle =
        object instanceof ValSlot
          ? undefined
          : getComputedStyleForVal(object).get("position");
      this.positionStyles.push(posStyle);
      const isAbsPos = posStyle === "absolute";
      this.isAbsPos.push(isAbsPos);

      const domElts = ensureArray(
        ensure(
          vc.eltFinder(object),
          "Unexpected undefined elt. Should be defined as it's the object being dragged."
        )
      );
      const domRect = frameToClientRect(
        domMod.getBoundingClientRect(...domElts),
        vc
      );

      const $dragHandle = $(".dnd__drag-ghost-" + i)
        .removeAttr("style")
        .show()
        .css({
          marginTop: `${top}px`,
          left: "100px",
          width: domRect.width,
          height: domRect.height,
          visibility: isAbsPos ? "hidden" : "visible",
          transform: `scale(${1 / vc.studioCtx.zoom})`,
        })
        .text(summarizeFocusObj(object, vc));
      top += domRect.height + 5;

      this.$dragHandles.push($dragHandle);

      if (object instanceof ValSlot) {
        this.moveStates.push(undefined);
      } else {
        const maybeManip = mkFreestyleManipForFocusedDomElt(vc, object);
        maybeManip.match({
          success: (manip) => {
            this.moveStates.push(manip.start());
          },
          failure: () => {
            this.moveStates.push(undefined);
            this._aborted = true;
          },
        });
      }

      this.startingFramePt = clientToFramePt(clientPt, this.vc);

      // We remember the offset between the top-left corder of `object` and the actual
      // mouse cursor, so that we can determine the final position of the `object` on drop
      this.cursorOffset = new Pt(
        Math.min(this.cursorOffset.x, domRect.left - clientPt.x),
        Math.min(this.cursorOffset.y, domRect.top - clientPt.y)
      );
      this.targeter = new NodeTargeter(
        this.vc,
        this.objects.map((obj) => obj.tpl),
        this.cursorOffset
      );

      if (!this._aborted) {
        this.vc.startUnlogged();
      }
    });
  }

  /**
   * DragMove is in valid drag state if the object we are dragging is still the object
   * that ViewCtx is focused on, and that the corresponding DOM element still exists.
   * Basically, we want to make sure that no evaluation / DOM update has happened in
   * between the drag events.
   */
  private isValidDragState() {
    return this.objects.every((object) => {
      return (
        this.vc.focusedSelectables().includes(object) &&
        ensureArray(this.vc.renderState.sel2dom(object, this.vc.canvasCtx))
          .length > 0
      );
    });
  }

  /**
   * Updates the location of the dragged valnode according to the current
   * clientPt
   * @param clientPt current cursor poisition in the client coordinate
   * @param modifiers
   */
  async drag(clientPt: Pt, modifiers: ModifierStates) {
    if (!this.targeter) {
      // Called before eval has completed
      return;
    }
    if (!this.isValidDragState()) {
      console.info(`Invalid drag state; drag canceled`);
      return;
    }

    if (this.aborted()) {
      this.endDrag();
      return;
    }

    const dragPtInScaler = this.vc.viewportCtx.clientToScaler(
      clientPt.plus(this.cursorOffset)
    );

    this.$dragHandles.forEach(($dragHandle) => {
      $dragHandle.css({
        left: dragPtInScaler.x,
        top: dragPtInScaler.y,
      });
    });

    /**
     * If ctrl/meta key is pressed
     *    we aren't going to target InsertionBoxes because the pressed key indicates a absolute positioning
     * Else
     *    we are going to target both InsertionBoxes and NodeBoxes
     */
    const targeter = this.targeter;
    const isFreeMove = modifiers.metaKey || modifiers.ctrlKey;
    if (isFreeMove) {
      this.tentativeInsertion = targeter.getAbsInsertion(clientPt);
    } else {
      this.tentativeInsertion = targeter.getInsertion(clientPt);
    }

    const framePt = clientToFramePt(clientPt, this.vc);

    assert(
      this.moveStates.length === this.objects.length,
      "Moves states and objects should have same length."
    );

    for (let i = 0; i < this.moveStates.length; i++) {
      const ms = this.moveStates[i];
      if (ms) {
        const res = await this.vc.studioCtx.change<ManipulatorAbortedError>(
          ({ run, success }) => {
            run(
              mkFreestyleManipForFocusedDomElt(this.vc, this.objects[i])
            ).move(ms, {
              deltaFrameX: framePt.x - this.startingFramePt.x,
              deltaFrameY: framePt.y - this.startingFramePt.y,
              shiftKey: modifiers.shiftKey,
              metaKey: modifiers.metaKey,
              altKey: modifiers.altKey,
              ctrlKey: modifiers.ctrlKey,
            });
            return success();
          }
        );
        if (res.result.isError) {
          this._aborted = true;
          this.endDrag();
        }
      }
    }
  }

  aborted() {
    return this._aborted;
  }

  /**
   * Ends the drag and drop motion.  If there was a valid insertion upon ending,
   * the node will be moved to the new insertion point.
   */
  endDrag() {
    if (this.vc.isUnlogged()) {
      this.vc.change(() => {
        this.vc.stopUnlogged();
        this.$dragHandles.forEach(($dragHandle) => {
          $dragHandle.hide();
        });
        if (this.targeter) {
          this.targeter.clear();
        }
        if (
          this.isValidDragState() &&
          this.tentativeInsertion &&
          this.tentativeInsertion.type !== "ErrorInsertion"
        ) {
          const tplToPositionStyle = new Map<TplNode, string | undefined>();
          for (let i = 0; i < this.objects.length; i++) {
            tplToPositionStyle.set(this.objects[i].tpl, this.positionStyles[i]);
          }
          const tpls = prepareFocusedTpls(this.objects.map((val) => val.tpl));
          if (shouldInsertInReverseOrder(this.tentativeInsertion)) {
            // In-place.
            tpls.reverse();
          }
          for (const tpl of tpls) {
            if (tplToPositionStyle.get(tpl) !== "fixed") {
              insertBySpec(this.vc, this.tentativeInsertion, tpl, false);
            }
          }
        }
      });
    }
  }
}

/**
 * A stateful manager for drag-to-insert TplNode motion.
 */
export class DragInsertManager {
  private targeters: NodeTargeter[] = [];
  private tentativeInsertion?: InsertionSpec;
  tentativeVc?: ViewCtx;
  toInsert?: TplNode;

  /**
   * @param factory zero-argument function that creates the TplNode to insert
   *   if the motion is successful.
   */
  constructor(private studioCtx: StudioCtx, targeters: NodeTargeter[]) {
    this.targeters.push(...targeters);
  }

  /**
   * Installs a collection from the Insert Panel without needing to require a view context.
   * @param studioCtx
   * @param spec
   */
  public static async install(studioCtx: StudioCtx, spec: AddInstallableItem) {
    const extraInfo = spec.asyncExtraInfo
      ? await spec.asyncExtraInfo(studioCtx)
      : undefined;
    let installed: Arena | Component | undefined;
    await studioCtx.changeUnsafe(() => {
      installed = spec.factory(studioCtx, extraInfo);
    });
    return installed;
  }

  public static async build(
    studioCtx: StudioCtx,
    spec: AddTplItem,
    opts?: CloneOpts
  ): Promise<DragInsertManager> {
    const targeters: NodeTargeter[] = [];
    const extraInfo = spec.asyncExtraInfo
      ? await spec.asyncExtraInfo(studioCtx, {
          isDragging: true,
          ...(opts ?? {}),
        })
      : undefined;
    for (const vc of studioCtx.viewCtxs) {
      // Ignore ViewCtx whose root is invisible.
      if (vc.isVisible() && vc.valState().maybeValUserRoot()) {
        await studioCtx.changeUnsafe(() => {
          const toInsert = spec.factory(vc, extraInfo);
          if (toInsert != null) {
            targeters.push(new NodeTargeter(vc, [toInsert]));
          }
        });
      }
    }
    return new DragInsertManager(studioCtx, targeters);
  }

  clear() {
    this.tentativeVc = undefined;
    this.tentativeInsertion = undefined;
    this.clearTargeters();
  }

  /**
   * @param clientPt Current mouse cursor in client coordinate
   * @param modifiers
   */
  drag(clientPt: Pt, modifiers: ModifierStates) {
    const isFreeMove = modifiers.metaKey || modifiers.ctrlKey;
    for (const targeter of this.targeters) {
      this.tentativeInsertion = isFreeMove
        ? targeter.getAbsInsertion(clientPt)
        : targeter.getInsertion(clientPt);
      if (this.tentativeInsertion) {
        this.tentativeVc = targeter.vc;
        break;
      }
    }
  }

  /**
   * On drag end, if there was a valid insertion, then invokes the factory
   * to create the new TplNode and inserts it at the insertion point.
   */
  endDrag(spec?: AddTplItem, extraInfo?: any): [ViewCtx, TplNode] | undefined {
    this.clearTargeters();
    if (
      this.tentativeVc &&
      this.tentativeInsertion &&
      this.tentativeInsertion.type !== "ErrorInsertion"
    ) {
      const tpl = spec?.factory(this.tentativeVc, extraInfo);
      if (tpl) {
        this.studioCtx.setStudioFocusOnFrameContents(
          this.tentativeVc.arenaFrame()
        );
        insertBySpec(this.tentativeVc, this.tentativeInsertion, tpl, true);
        return tuple(this.tentativeVc, tpl);
      }
    }
    return undefined;
  }

  private clearTargeters() {
    for (const targeter of this.targeters) {
      targeter.clear();
    }
  }
}

/**
 * Class for computing nodes and insertion points to target.  It also renders
 * UI decorations and hints for the proposed insertion.  It computes and
 * caches the positions of all the possible insertion points once, so can
 * only be used if nodes are not being created or updated.
 *
 * TODO: right now NodeTargeter talks in client coordinates, which incorporates
 * the scroll position of the canvas and the zoom.  That means the cached
 * locations will be stale if you zoom or scroll while you dnd.  We should
 * perhaps just talk in frame coordinates instead.
 */
export class NodeTargeter {
  private boxes: BoxCalcs;

  /**
   * @param toInsert If specified, consider whether to accept children /
   *   neighbors relative to this node we are inserting
   */
  constructor(
    public vc: ViewCtx,
    private toInsert?: TplNode[],
    private cursorOffset?: Pt
  ) {
    this.boxes = this.calcBoxes(toInsert);
  }

  /**
   * Computes an InsertionSpec if the mouse cursor is at the
   * argument point in the client coordinate.  Whether the insertion is
   * slotted or not depends on parent container's type (flex vs free).
   *
   * @param clientPt Mouse cursor in the client coordinate
   */
  getInsertion(clientPt: Pt) {
    const { frameRect, insertionBoxes, nodeBoxes, nodeBoxToBeforeAfter } =
      this.boxes;

    const rootNb = L.last(nodeBoxes);

    // If we're directly over an InsertionBox, drop there.
    const insertionBox = insertionBoxes.find((ib) => ib.box.contains(clientPt));

    if (insertionBox) {
      return this.targetInsertionBox(insertionBox);
    }

    const containingNodeBoxes = nodeBoxes.filter((nb) =>
      nb.box.contains(clientPt)
    );

    // If we're not over any NodeBox but are inside the frame, try to target the
    // root element.
    if (
      containingNodeBoxes.length === 0 &&
      Box.fromRect(frameRect).contains(clientPt) &&
      rootNb
    ) {
      return this.targetNodeBox(
        rootNb,
        rootNb.containerType !== "free",
        clientPt
      );
    }

    for (const nodeBox of containingNodeBoxes) {
      // If we're hovering over a grid, draw a mimic grid and handle its hover
      // events.
      // TODO allow dropping into grid slot even if there is stuff already
      //  there (overlap).
      if (nodeBox.measuredGrid) {
        return this.targetGrid(nodeBox, nodeBox.measuredGrid, clientPt);
      }

      // First, let's attempt to target inserting as a child of this nodeBox
      if (nodeBox.acceptsChildren === true) {
        // Look up the children of this nodeBox
        const children = SQ(nodeBox.selectable, this.vc.valState())
          .layoutChildren()
          .toArray();
        if (
          nodeBox.selectable instanceof SlotSelection ||
          nodeBox.selectable instanceof ValSlot
        ) {
          return this.targetNodeBox(nodeBox, true, clientPt);
        } else if (nodeBox.containerType === "free") {
          if (children.length === 0) {
            // If this is the first child, then just target the box
            return this.targetNodeBox(nodeBox, false, clientPt);
          }
          // don't target anything when the cursor is still within the node being
          // moved.
          if (children.length === 1 && this.toInsert === children[0].tpl) {
            return this.targetNothing();
          }
          // If this is a free container, then we can always insert into it
          return this.targetNodeBox(nodeBox, false, clientPt);
        } else if (
          nodeBox.containerType &&
          (nodeBox.containerType.includes("flex") ||
            nodeBox.containerType === "grid" ||
            nodeBox.containerType === "content-layout" ||
            nodeBox.containerType.includes("slot"))
        ) {
          if (children.length === 0) {
            // If this is the first child, then just target the box
            return this.targetNodeBox(nodeBox, true, clientPt);
          }

          // don't target anything when the cursor is still within the node being
          // moved.
          if (children.length === 1 && this.toInsert === children[0].tpl) {
            return this.targetNothing();
          }

          // Else, insert into nearest child InsertionBox.
          // I.e. this is where we're hovering within some div that
          // has children, but not over any of its children, just in blank space.
          const childrenSet = new Set(children);
          const childrenInsertions = insertionBoxes.filter((ib) =>
            childrenSet.has(ib.valNode)
          );

          // We can have no children insertion boxes, in case all children are free/fixed
          // in this case we just target the box
          if (childrenInsertions.length === 0) {
            return this.targetNodeBox(nodeBox, true, clientPt);
          }

          const nearestChildInsertion = L.minBy(childrenInsertions, (ib) =>
            ib.box.dist(clientPt)
          );
          if (nearestChildInsertion) {
            return this.targetInsertionBox(nearestChildInsertion);
          }
        }
      }

      // So far we've failed to slot in as a child of this nodeBox.  But maybe we can
      // slot in as a neighbor of this nodeBox?
      if (nodeBox.acceptsNeighbors) {
        // This found node may accept either before and/or after (or neither).
        // These are informed by whether the element is a repeated element, and
        // if so whether it's at the beginning, middle, or end of the repeated
        // sequence.

        // TODO instead of dropping before/after a grid child, support
        //  above/below/left/right?

        const { before, after } = ensure(
          nodeBoxToBeforeAfter.get(nodeBox),
          "Unexpected undefined reference in Map to nodeBox. All nodeBoxes should be mapped"
        );

        const someValNode = (before ?? after)?.valNode;

        if (nodeBox.isInFlex && someValNode) {
          const side = nodeBox.box.closestSide(clientPt);
          const flowDir =
            sideToOrient(side) === "horiz" ? "horizontal" : "vertical";
          if (nodeBox.flowDir !== flowDir) {
            return this.targetInsertionBox(
              new InsertionBox(
                side,
                someValNode,
                nodeBox.dom,
                nodeBox.box
                  .getSideBox(side)
                  .pad(
                    flowDir === "horizontal"
                      ? insertionStripThickness
                      : insertionStripExtension,
                    flowDir === "horizontal"
                      ? insertionStripExtension
                      : insertionStripThickness
                  ),
                flowDir
              )
            );
          }
        }

        const target = (nodeBox.flowDir === "horizontal"
          ? nodeBox.box.leftHalf()
          : nodeBox.box.topHalf()
        ).contains(clientPt)
          ? before
          : after;

        if (target) {
          return this.targetInsertionBox(target);
        }
      }

      if (
        nodeBox.acceptsChildren !== true &&
        nodeBox.acceptsChildren.type !== "CantAddToTplComponent"
      ) {
        // If you cannot target this containing nodeBox, then show an error.
        // We exempt CantAddToTplComponent; in this case, we know that this TplComponent
        // is in a free container or is free itself (does not accept neighbors), but you
        // may still want to overlap a new node with the TplComponent freely.
        return this.targetError(nodeBox, nodeBox.acceptsChildren);
      }
    }

    // Else we've failed to target anything, so target nothing
    return this.targetNothing();
  }

  /**
   * Computes an InsertionSpec for absolutely-inserting something at the
   * argument client coordinate.
   * @param clientPt mouse cursor in the client coordinate
   */
  getAbsInsertion(clientPt: Pt) {
    const { frameRect, nodeBoxes } = this.boxes;

    const rootNb = L.last(nodeBoxes);

    const containingNodeBoxes = nodeBoxes.filter((nb) =>
      nb.box.contains(clientPt)
    );

    for (const nodeBox of containingNodeBoxes) {
      if (nodeBox.acceptsChildren === true) {
        return this.targetNodeBox(nodeBox, false, clientPt);
      } else {
        return this.targetError(nodeBox, nodeBox.acceptsChildren);
      }
    }

    // If we're not over any NodeBox but are inside the frame, try to target the
    // root element.
    if (
      containingNodeBoxes.length === 0 &&
      Box.fromRect(frameRect).contains(clientPt) &&
      rootNb
    ) {
      return this.targetNodeBox(rootNb, false, clientPt);
    }

    return this.targetNothing();
  }

  /**
   * Given the argument Rect in client coordinates, computes both an
   * InsertionSpec for the argument Rect, as well as what child nodes will be
   * "lasso-ed" as adoptees. Returns a  tuple of InsertionSpec and a list of
   * Adoptees
   * @param clientRect Rect used to lasso adoptees and mark insertion point; in
   *   client coordinate
   * @param noAdopt if true, does not try to adopt any nodes
   */
  getAbsInsertionAndAdoptees(
    clientRect: Rect,
    forceFree: boolean,
    noAdopt: boolean
  ): [InsertionSpec | undefined, Adoptee[]] {
    const { nodeBoxes } = this.boxes;
    const clientBox = Box.fromRect(clientRect);

    // Only target by whole-containment into positioned containers.  We *do*
    // special case the root element and allow it to be the tentative parent,
    // so long as it's a tag - it doesn't need to contain the drawn node, and
    // it doesn't need to be positioned already (it will automatically be
    // positioned).

    const parent = nodeBoxes.find(
      (nb) =>
        nb.paddingBox.containsBox(clientBox) && nb.acceptsChildren === true
    );
    if (!parent) {
      return [this.targetNothing(), []];
    }

    // Determine what is being lasso'd.  These are all the abs-positioned
    // children of the tentative parent.  Highlight them.

    const children = new Set(
      SQ(parent.selectable, this.vc.valState()).children().toArrayOfValNodes()
    );
    const adoptees: Adoptee[] = noAdopt
      ? []
      : withoutNils(
          nodeBoxes.map((nb) => {
            if (
              (nb.selectable instanceof ValTag ||
                nb.selectable instanceof ValComponent) &&
              children.has(nb.selectable) &&
              clientBox.containsBox(nb.box) &&
              getComputedStyleForVal(nb.selectable).get("position") ===
                "absolute"
            ) {
              return {
                val: nb.selectable,
                dom: nb.dom,
                domBox: Box.fromRect(nb.dom.getBoundingClientRect()),
              };
            } else {
              return undefined;
            }
          })
        );

    // // Even though we allow the root to be a parent in this special way, we
    // // choose not to highlight it.
    // if (!nodeBox) {
    //   return [this.targetNothing(), adoptees];
    // }

    return [
      this.targetNodeBox(
        parent,
        !(forceFree || parent.containerType === "free"),
        new Pt(clientRect.left, clientRect.top)
      ),
      adoptees,
    ];
  }

  /**
   * Clears all UI decorations used for targeting
   */
  clear() {
    this.targetNothing();
  }

  private targetNothing() {
    this.vc.setDndTentativeInsertion(undefined);
    return undefined;
  }

  private targetError(nodeBox: NodeBox, msg: ClientCantAddChildMsg) {
    const ins = new ErrorInsertion(nodeBox, msg);
    this.vc.setDndTentativeInsertion(ins);
    return ins;
  }

  private targetNodeBox(nodeBox: NodeBox, slotted: boolean, clientPt: Pt) {
    const targetPt = this.cursorOffset
      ? clientPt.moveBy(this.cursorOffset.x, this.cursorOffset.y)
      : clientPt;
    const ins = new FreeBoxInsertion(nodeBox, slotted, targetPt);
    this.vc.setDndTentativeInsertion(ins);
    return ins;
  }

  // insertionBox is indicator of the position of a statically positioned
  // element. insertionBox is in topmost window's viewport's scale.
  private targetInsertionBox(insertionBox: InsertionBox) {
    const ins = new SiblingInsertion(insertionBox);
    this.vc.setDndTentativeInsertion(ins);
    return ins;
  }

  private targetGrid(nodeBox: NodeBox, measuredGrid: MeasuredGrid, pt: Pt) {
    const { row, col } = findRowColForMouse(
      { pageX: pt.x, pageY: pt.y },
      "track",
      measuredGrid,
      this.vc.studioCtx.zoom,
      ensure(
        this.vc.canvasCtx.$viewport().offset(),
        "Unexpected undefined offset"
      )
    );
    const area = {
      rows: { start: row, end: row },
      cols: { start: col, end: col },
    };
    const ins = new GridInsertion(nodeBox, area);
    this.vc.setDndTentativeInsertion(ins);
    return ins;
  }

  /**
   * Generate target boxes for drag and drop.
   *
   * There are two types: NodeBoxes and InsertionBoxes.  Generally, both of
   * these are used for determining the areas of the page where the user can
   * drop something - and thus, they light up as the mouse is moving around.
   *
   * The difference between them is that:
   *
   * - NodeBoxes correspond to whole ValNodes/SlotPlaceholders.
   * - InsertionBoxes correspond to the before/after edges of NodeBoxes.
   *   InsertionBoxes are only made for nodes that can accept siblings
   *   (that is, their parents accept children and they are not
   *   absolutely-positioned).
   *
   * We generate one NodeBox per DOM node that:
   *
   * - corresponds to a val node or slot
   * - is visible (hasLayoutBox)
   * - val node is in the current component context (selectable here);
   *   later we can expose a way for the user to drill up/down contexts
   *   while dragging, or to ignore component contexts altogether
   *
   * NodeBoxes also track some other details.  Just because a NodeBox exists
   * does not mean that:
   *
   * - nodes can be dropped within it, or that
   * - nodes can be dropped before/after it.
   *
   * Multiple val nodes may map to a single DOM node, but we only generate
   * one NodeBox per DOM element.  Later we need to support a way for the
   * user to disambiguate where they are trying to drop, if multiple val
   * nodes or even DOM nodes are directly overlapping.  See #522.  The val
   * node we choose is the lowest one - same semantics as dom2val.  The only
   * exception is DOM nodes that are a component root, meaning they also map
   * to a ValComponent - if the ValComponent is in the current component
   * context, we want to use that and not the val node inside the component
   * (which is beyond our current component context).  Neighbor acceptance
   * etc. also should use that val component.
   *
   * The selection logic mirrors the logic in bestFocusValTarget, but this
   * implementation is designed for batch efficiency.
   *
   * Nodes are returned in reverse BFS order, so that the "lowest" boxes
   * (leaves in the DOM hierarchy) come first - this makes sense for drop
   * targets since an enclosing box should only be targeted if not over a
   * nested box.
   *
   * We traverse the DOM rather than the val tree because:
   *
   * - SelQuery.descendantsDfs() doesn't yet yield SlotPlaceholders.
   * - Later we can potentially cull to just viewport.
   * - Later we can potentially incorporate true z-index - DOM is truly what
   *   the user is seeing.
   *
   * On the flip side, SelQuery would be more efficient at:
   *
   * - traversing only the current component context.
   * - traversing only Selectables and not all DOM nodes.  (Especially
   *   foreign components may harbor many more DOM nodes.)
   *
   * As for InsertionBoxes, they are only along the edges of certain NodeBoxes,
   * either horizontally or vertically.
   *
   * We prevent inserting between repeated instances of the same TplNode, to
   * avoid confusion.  So we generate InsertionBox only before and after
   * repeated blocks.
   *
   * Note that all points and boxes are in the client coordinates.
   */
  private calcBoxes(toInsert?: (TplNode | undefined)[]): BoxCalcs {
    const domElts = [...domMod.bfs(this.vc.canvasCtx.$userBody())];
    const $viewport = this.vc.canvasCtx.$viewport();
    const frameRect = ($viewport[0] as HTMLElement).getBoundingClientRect();
    const frameContainerOffsetToScaler =
      this.vc.canvasCtx.viewportContainerOffset();
    const currentValComponentCtx: ValComponent | undefined = maybe(
      this.vc.currentComponentCtx(),
      (cc) => cc.valComponent()
    );

    /**
     * Returns true if the argument ValNode belongs in the "current" component.
     *  This is relevant as we are only computing node boxes are are in the
     * "current" component; we do not want to reach into node boxes within
     * component instances in the current component.
     */
    const isNodeInCurrentComponentContext = (node: ValNode) => {
      return (
        // If there's no currentValComponentCtx, then this node must be owned by the top-level component
        (!currentValComponentCtx &&
          node.valOwner === this.vc.valState().valSysRoot()) ||
        // Else, this node must be owned by the currentValComponentCtx
        node.valOwner === currentValComponentCtx
      );
    };

    // ValComponents should get node boxes, but if we only traverse DOM
    // elements looking for ones whose (lowest) valNode is in the current
    // component context, then no ValComponents will make it, since all
    // their root DOM elements are outside the current component context.
    //
    // So, we need to traverse the val tree looking for the ValComponents in
    // the current component context, and add those in.  This gives us a
    // Map from the root DOM element of a component instance to its
    // corresponding ValComponent.
    const componentDomElts = new Map(
      SQ(
        maybe(currentValComponentCtx, (vc) => vc.contents ?? []) ||
          this.vc.valState().valUserRoot(),
        this.vc.valState()
      )
        .descendantsDfsFullstack()
        .toArray()
        .filter(
          (selectable): selectable is ValComponent =>
            selectable instanceof ValComponent &&
            isNodeInCurrentComponentContext(selectable)
        )
        .flatMap((val) => {
          const domElement = this.vc.renderState.sel2dom(
            val,
            this.vc.canvasCtx
          );
          if (Array.isArray(domElement)) {
            // Extract element from array so that in we can get ValComponents with .get(dom) instead of .get([dom])
            return domElement.map((element) => tuple(element, val));
          }
          return [];
        })
        .filter(([dom]) => !!dom)
    );

    const vc = this.vc;
    const canvasCtx = this.vc.canvasCtx;

    // We dont have DOM elements for Slots, so we create a fake node box
    // to intersect "to be inserted" element and check if there was any changes
    //
    // The fake node box must come after all the children of the slot, that's
    // why we keep the firstChild index and the current number of good node boxes
    function genAncestorSlotSelection(tplToInsert?: TplNode | undefined) {
      if (!tplToInsert) {
        return undefined;
      }
      const ancestorSlot = getAncestorSlotArg(tplToInsert);
      if (!ancestorSlot) {
        return undefined;
      }
      return new SlotSelection({
        tpl: ancestorSlot.tplComponent,
        slotParam: ancestorSlot.arg.param,
      });
    }
    const ancestorSlotSelections =
      toInsert?.map((ins) => genAncestorSlotSelection(ins)) ?? [];
    const slotChildrenDoms: any[] = [];
    let firstChild = -1;
    let count = 0;

    function* genNodeBoxes(viewCtx: ViewCtx) {
      for (const $domElt of domElts) {
        const domElt = $domElt[0];
        if (
          !(
            !$domElt.is(canvasCtx.$userBody()) &&
            hasLinkedSelectable($domElt, vc) &&
            hasLayoutBox(domElt)
          )
        ) {
          continue;
        }
        const selectable = vc.dom2val($domElt);

        // selectable will either be:
        // 1. a SlotSelection, for foreign components
        // 2. a ValSlot, for slots of Plasmic components
        // 3. a ValNode, for all other cases.
        const slotSelection =
          selectable instanceof SlotSelection
            ? selectable
            : selectable instanceof ValSlot &&
              !viewCtx.showingDefaultSlotContentsFor(
                ensure(
                  selectable.valOwner,
                  `Unexpected undefined valOwner. ${selectable} should be ValSlot with defined valOwner`
                ).tpl
              )
            ? // If this is a ValSlot, and we are _not_ showing default slot contents,
              // then treat this as a SlotSelection for the owning ValComponent;
              // whether this ValSlot is a valid node to target depends on the
              // current component context, and whether the owning ValComponent
              // belongs in that context.
              new SlotSelection({
                val: ensure(
                  selectable.valOwner,
                  `Unexpected undefined valOwner. ${selectable} should be ValSlot with defined valOwner`
                ),
                slotParam: selectable.tpl.param,
              })
            : // Otherwise, no SlotSelection.  Notably, for ValSlot where we are
              // currently showing default slot contents to, we will be using
              // the ValSlot instead of the SlotSelection, as we will be editing the
              // defaultContents of the ValSlot.
              undefined;

        // Checking if this DOM is a child of the Slot we are trying to change
        ancestorSlotSelections.forEach((ancestorSlotSelection) => {
          if (
            !slotSelection &&
            ancestorSlotSelection &&
            selectable &&
            selectable instanceof ValNode
          ) {
            const currentSlotSelection = $$$(selectable.tpl)
              .parentsWithSlotSelections()
              .get(0);
            if (
              currentSlotSelection instanceof SlotSelection &&
              currentSlotSelection.slotParam ===
                ancestorSlotSelection.slotParam &&
              (currentSlotSelection.tpl || currentSlotSelection.val?.tpl) ===
                ancestorSlotSelection.tpl
            ) {
              if (firstChild === -1) {
                firstChild = count;
              }
              slotChildrenDoms.push(domElt);
            }
          }
        });
        // Only target the selectable if it's in the current component
        // context. We would want to skip any node that is outside.  For example,
        // if we are in master component edit mode, we would not want to include
        // nodes outside the master component as targetable nodes.
        //
        // An interesting case to note: a DOM element can simultaneously map to
        // a SlotSelection (that's valid to select in current component
        // context) and a ValComponent.  This happens when you have a component
        // that just renders props.children.  In such a case, SlotSelection
        // should take precedence as the drop target, since we want to show a
        // replace box on those, rather than treat it as a ValComponent that
        // you can just insert before/after.componentDomElts
        const valNodeToCheck = slotSelection
          ? ensure(
              slotSelection.val,
              `Unexpected undefined val for ${slotSelection}.`
            )
          : ensureInstance(selectable, ValNode);
        const targetSelectable = isNodeInCurrentComponentContext(valNodeToCheck)
          ? slotSelection || selectable
          : componentDomElts.get(domElt);
        if (!targetSelectable) {
          continue;
        }

        if (isSelectableLocked(targetSelectable, viewCtx.valState())) {
          // Don't allow dragging into locked elements
          continue;
        }

        // Disallow DND into a descendant of the currently dragged Tpl (if we're dragging an existing Tpl).
        const isDescendant = toInsert?.some((ins) => {
          return (
            ins &&
            $$$(
              ensure(
                asVal(targetSelectable),
                "Unexpected undefined targetSelectable."
              ).tpl
            )
              .ancestors()
              .toArrayOfTplNodes()
              .includes(ins)
          );
        });
        if (isDescendant) {
          continue;
        }

        const sty = isValTagOrComponent(targetSelectable)
          ? getComputedStyleForVal(targetSelectable)
          : undefined;
        const parentVal = SQ(targetSelectable, viewCtx.valState(), true)
          .layoutParent()
          .tryGet();
        const parentSty =
          parentVal && parentVal instanceof ValTag
            ? getComputedStyleForVal(parentVal)
            : undefined;
        const parentContainerType = parentSty
          ? getRshContainerType(parentSty)
          : "free";
        const flowDir =
          parentContainerType === ContainerLayoutType.flexRow ||
          parentContainerType === ContainerLayoutType.grid
            ? "horizontal"
            : "vertical";
        const isInFlex =
          parentContainerType === ContainerLayoutType.flexRow ||
          parentContainerType === ContainerLayoutType.flexColumn;
        const isInFlexReverse =
          parentSty && isInFlex
            ? isFlexReverse(parentSty.get("flex-direction"))
            : false;

        const containerType = sty
          ? sty.has("display") || !parentSty
            ? getRshContainerType(sty)
            : getRshContainerType(parentSty)
          : undefined;

        // The box in top window's viewport.
        const box = isBody(targetSelectable)
          ? Box.fromRect($viewport[0].getBoundingClientRect())
          : Box.fromRect(
              frameToClientRect(getVisibleBoundingClientRect(domElt), viewCtx)
            );
        const paddingBox = isBody(targetSelectable)
          ? box
          : Box.fromRect(frameToClientRect(getPaddingRect(domElt), viewCtx));
        const boxInScaler = isBody(targetSelectable)
          ? Box.fromRect(getElementVisibleBounds($viewport)).moveBy(
              frameContainerOffsetToScaler.left,
              frameContainerOffsetToScaler.top
            )
          : Box.fromRect(getElementVisibleBounds(domElt)).moveBy(
              frameContainerOffsetToScaler.left,
              frameContainerOffsetToScaler.top
            );

        // Absolutely-positioned or floating elements don't accept neighbors
        const rejectsNeighbors =
          !!sty &&
          (["absolute", "fixed"].includes(sty.get("position")) ||
            tuple("left", "right").includes(sty.get("float")));

        const acceptsNeighbors =
          (parentContainerType.includes("flex") ||
            parentContainerType === ContainerLayoutType.grid ||
            parentContainerType === ContainerLayoutType.contentLayout) &&
          targetSelectable instanceof ValNode &&
          canAddSiblings(targetSelectable.tpl, toInsert && toInsert[0]) &&
          !rejectsNeighbors &&
          !isBody(targetSelectable);
        yield new NodeBox(
          targetSelectable,
          domElt,
          box,
          paddingBox,
          boxInScaler,
          flowDir,
          isInFlex,
          isInFlexReverse,
          isChildrenAccepted(
            viewCtx,
            targetSelectable,
            toInsert && toInsert[0]
          ),
          acceptsNeighbors,
          undefined,
          containerType
        );
        count = count + 1;
      }
    }

    const nodeBoxes = Array.from(genNodeBoxes(this.vc)).reverse();

    // Creating fake node box if needed
    if (slotChildrenDoms.length > 0) {
      const box = Box.mergeBBs(
        slotChildrenDoms.map((domElt) => {
          return frameToClientRect(getVisibleBoundingClientRect(domElt), vc);
        })
      );
      const paddingBox = Box.mergeBBs(
        slotChildrenDoms.map((domElt) => {
          return frameToClientRect(getPaddingRect(domElt), vc);
        })
      );
      const boxInScaler = Box.mergeBBs(
        slotChildrenDoms.map((domElt) => {
          return getElementVisibleBounds(domElt);
        })
      )?.moveBy(
        frameContainerOffsetToScaler.left,
        frameContainerOffsetToScaler.top
      );
      assert(box && paddingBox && boxInScaler, "Unexpected undefined boxes.");
      ancestorSlotSelections.forEach((ancestorSlotSelection) => {
        if (ancestorSlotSelection && ancestorSlotSelection.tpl) {
          const fakeNodeBox = new NodeBox(
            vc.maybeTpl2ValsInContext(ancestorSlotSelection.tpl)[0],
            slotChildrenDoms[0],
            box,
            paddingBox,
            boxInScaler,
            "horizontal",
            false,
            false,
            true,
            false,
            undefined,
            "slot"
          );
          nodeBoxes.splice(nodeBoxes.length - firstChild, 0, fakeNodeBox);
        }
      });
    }

    const nodeBoxToBeforeAfter = new Map<NodeBox, BeforeAfterInsertions>();

    const insertionBoxes = [
      ...(function* () {
        for (const nodeBox of nodeBoxes) {
          if (nodeBox.acceptsNeighbors) {
            const valNode = ensureInstance(nodeBox.selectable, ValNode);
            const { dom: domElt, flowDir, box } = nodeBox;
            const sq = SQ(valNode, vc.valState());

            const isNeighborInstanceOfSameTpl = (selQuery: SelQuery) => {
              return maybe(
                selQuery.tryGet(),
                (nb) => nb instanceof ValNode && nb.tpl === valNode.tpl
              );
            };

            const hasBefore = !isNeighborInstanceOfSameTpl(sq.prev());
            const hasAfter = !isNeighborInstanceOfSameTpl(sq.next());
            if (flowDir === "horizontal") {
              const leftSide = box
                .getSideBox("left")
                .pad(insertionStripThickness, insertionStripExtension);
              const rightSide = box
                .getSideBox("right")
                .pad(insertionStripThickness, insertionStripExtension);
              const before = hasBefore
                ? new InsertionBox(
                    "before",
                    valNode,
                    domElt,
                    !nodeBox.isInFlexReverse ? leftSide : rightSide,
                    flowDir
                  )
                : undefined;
              const after = hasAfter
                ? new InsertionBox(
                    "after",
                    valNode,
                    domElt,
                    !nodeBox.isInFlexReverse ? rightSide : leftSide,
                    flowDir
                  )
                : undefined;
              if (before) {
                yield before;
              }
              if (after) {
                yield after;
              }
              nodeBoxToBeforeAfter.set(nodeBox, { before, after });
            } else {
              const topSide = box
                .getSideBox("top")
                .pad(insertionStripExtension, insertionStripThickness);
              const bottomSide = box
                .getSideBox("bottom")
                .pad(insertionStripExtension, insertionStripThickness);
              const before = hasBefore
                ? new InsertionBox(
                    "before",
                    valNode,
                    domElt,
                    !nodeBox.isInFlexReverse ? topSide : bottomSide,
                    flowDir
                  )
                : undefined;
              const after = hasAfter
                ? new InsertionBox(
                    "after",
                    valNode,
                    domElt,
                    !nodeBox.isInFlexReverse ? bottomSide : topSide,
                    flowDir
                  )
                : undefined;
              if (before) {
                yield before;
              }
              if (after) {
                yield after;
              }
              nodeBoxToBeforeAfter.set(nodeBox, { before, after });
            }
          }
        }
      })(),
    ];

    return {
      nodeBoxes,
      insertionBoxes,
      nodeBoxToBeforeAfter,
      frameRect,
    };
  }
}

function isChildrenAccepted(
  vc: ViewCtx,
  selectable: Selectable,
  child?: TplNode
): true | ClientCantAddChildMsg {
  const cantAdd = canAddChildrenToSelectableAndWhy(selectable, child);
  if (cantAdd !== true) {
    return cantAdd;
  }
  if (
    selectable instanceof ValSlot &&
    !vc.showingDefaultSlotContentsFor(
      ensure(
        selectable.valOwner,
        `Unexpected undefined valOwner. ${selectable} should be ValSlot with defined valOwner`
      ).tpl
    )
  ) {
    // Cannot add default content to a TplSlot unless we're showing the
    // default content right now
    return { type: "CantAddToSlotOutOfContext", tpl: selectable.tpl };
  }

  return true;
}
