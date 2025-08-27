import { Dims, offsetPxAsUnits } from "@/wab/client/DimManip";
import { getOffsetRect } from "@/wab/client/dom";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { lazyDerefTokenRefsWithDeps } from "@/wab/commons/StyleToken";
import {
  ensureActivatedScreenVariantsForFrameByWidth,
  getFrameHeight,
  isComponentArena,
} from "@/wab/shared/Arenas";
import {
  absmax,
  CustomError,
  ensure,
  ensureArray,
  ensureInstance,
  ifEmpty,
  maybe,
  parsePx,
  safeCast,
  spawn,
  tuple,
} from "@/wab/shared/common";
import { Selectable } from "@/wab/shared/core/selection";
import { ValComponent, ValTag } from "@/wab/shared/core/val-nodes";
import {
  createNumericSize,
  parseAtomicSize,
  showSizeCss,
  Size,
} from "@/wab/shared/css-size";
import { makeMergedExpProxy } from "@/wab/shared/exprs";
import {
  Box,
  ClientRect,
  Corner,
  DimProp,
  dimProps,
  dimPropToSizeAxis,
  ensureSide,
  isEndSide,
  isStandardSide,
  oppSideOrCorner,
  Pt,
  Rect,
  Side,
  sideOrCornerToSides,
  sideToOrient,
  sizeAxisToSides,
} from "@/wab/shared/geom";
import {
  getRshPositionType,
  PositionLayoutType,
} from "@/wab/shared/layoututils";
import { ArenaFrame, Site } from "@/wab/shared/model/classes";
import { IRuleSetHelpers } from "@/wab/shared/RuleSetHelpers";
import { isSpecialSizeVal } from "@/wab/shared/sizingutils";
import { failable } from "ts-failable";

export interface ManipState {
  /**
   * An OffsetRect.
   */
  readonly initOffsetRect: ClientRect;
  readonly initDims: Dims;
  /**
   * An OffsetRect.
   */
  readonly lastOffsetRect: ClientRect;

  readonly useMaxWidth: boolean;
  readonly useMinHeight: boolean;
}

export interface SimpleMouseEvent {
  // The delta of the mouse event within the frame space.
  readonly deltaFrameX: number;
  readonly deltaFrameY: number;
  readonly altKey: boolean;
  readonly shiftKey: boolean;
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
}

export class ManipulatorAbortedError extends CustomError {
  name: "ManipulatorAbortedError";
}

export function mkFreestyleManipForFocusedDomElt(
  vc: ViewCtx,
  obj?: Selectable
) {
  return failable<FreestyleManipulator, ManipulatorAbortedError>(
    ({ success, failure }) => {
      const val = maybe(obj || vc.focusedSelectable(), (focused) =>
        ensureInstance(focused, ValTag, ValComponent)
      );
      if (!val) {
        // Maybe someone else deleted the object
        return failure(new ManipulatorAbortedError());
      }
      const vtm = vc.variantTplMgr();
      const exp = makeMergedExpProxy(
        vtm.effectiveVariantSetting(val.tpl).rsh(),
        () => vtm.targetRshForNode(val.tpl)
      );
      const domElt = ensureArray(
        vc.renderState.sel2dom(val, vc.canvasCtx)
      )[0] as HTMLElement;
      return success(new FreestyleManipulator(exp, domElt, vc.studioCtx.site));
    }
  );
}

export function mkFreestyleManipForFocusedFrame(
  sc: StudioCtx,
  frame?: ArenaFrame
) {
  return failable<FreestyleManipulator, ManipulatorAbortedError>(
    ({ success, failure }) => {
      const focusedFrame =
        frame ||
        ensure(
          sc.focusedFrame(),
          "A focused frame for manipulation was expected"
        );
      const vc = sc.tryGetViewCtxForFrame(focusedFrame);
      const arena = ensure(sc.currentArena, "An arena was expected");
      // Sometimes the user may try to interact with the frame before
      // the ViewCtx has been loaded.  In that case, we still let the
      // user manipulate the frame size, but without going through the
      // ViewCtx.
      const domElt = vc
        ? vc.canvasCtx.viewportContainer()
        : (document.querySelector(
            `.CanvasFrame__Container[data-frame-id="${focusedFrame.uid}"]`
          ) as HTMLElement | undefined);

      if (!domElt) {
        // Maybe some concurrent edit
        return failure(new ManipulatorAbortedError());
      }

      const validDimProps = sc.isPositionManagedFrame(focusedFrame)
        ? ["width", "height"]
        : ["width", "height", "top", "left"];
      const fakeSty = {
        position: "absolute",
        right: "auto",
        bottom: "auto",
        width: focusedFrame.width,
        height: getFrameHeight(focusedFrame),
        top: focusedFrame.top ?? "auto",
        left: focusedFrame.left ?? "auto",
      };

      const exp: IRuleSetHelpers = {
        // get must return string, not number
        get: (prop) =>
          `${ensure(fakeSty[prop], "Style prop should exist on fakeSty")}`,
        set: (prop, val) => {
          if (validDimProps.includes(prop)) {
            const parsedVal = parsePx(val);
            if (isComponentArena(arena)) {
              // screen variants are explicitly managed in component arenas
              focusedFrame[prop] = parsedVal;
              if (arena._focusedFrame === focusedFrame) {
                // We only want to activate screen variants in focus mode
                ensureActivatedScreenVariantsForFrameByWidth(
                  sc.site,
                  focusedFrame
                );
              }
            } else if (vc && (prop === "width" || prop === "height")) {
              vc.studioCtx.changeFrameSize({ dim: prop, amount: parsedVal });
            } else {
              focusedFrame[prop] = parsedVal;
            }
            domElt.style.setProperty(prop, val);
          }
        },
        has: (prop) => prop in fakeSty,
      };
      return success(new FreestyleManipulator(exp, domElt, sc.site));
    }
  );
}

export class FreestyleManipulator {
  constructor(
    private readonly exp: IRuleSetHelpers,
    private readonly domElt: HTMLElement,
    private readonly site: Site
  ) {}

  private getExpAndDomElt() {
    return {
      exp: this.exp,
      domElt: this.domElt,
    };
  }

  start(): ManipState {
    const { exp, domElt } = this.getExpAndDomElt();

    const isFixed = (value: Size) => value.type === "NumericSize";
    const isFree =
      (domElt.parentElement &&
        getComputedStyle(domElt.parentElement).display === "block") ||
      getRshPositionType(exp) === PositionLayoutType.free;

    const getAtomicSize = (prop: string) => {
      const size = exp.get(prop);
      return parseAtomicSize(
        isSpecialSizeVal(size) || size === "none"
          ? "auto"
          : lazyDerefTokenRefsWithDeps(size, this.site, "Spacing")
      );
    };

    const getSmartDim = (prop: string) => {
      if (isFree) {
        return prop;
      }
      switch (prop) {
        case "width":
          return isFixed(getAtomicSize("width")) ||
            exp.get("max-width") === "100%"
            ? "width"
            : "max-width";
        case "height":
          return isFixed(getAtomicSize("height")) ? "height" : "min-height";
        default:
          return prop;
      }
    };

    function getInitDims() {
      return safeCast(
        Object.fromEntries(
          dimProps.map((prop) => tuple(prop, getAtomicSize(getSmartDim(prop))))
        ) as Dims
      );
    }

    const initOffsetRect = getOffsetRect(domElt);
    return {
      initDims: getInitDims(),
      initOffsetRect: initOffsetRect,
      lastOffsetRect: initOffsetRect,
      useMaxWidth: getSmartDim("width") === "max-width",
      useMinHeight: getSmartDim("height") === "min-height",
    };
  }

  // TODO Only handles px for now.
  private updateDimProp(
    state: ManipState,
    exp: IRuleSetHelpers,
    dimProp: DimProp,
    deltaPx: number | undefined,
    newPx?: number
  ) {
    function getSmartDimProp(
      prop: DimProp
    ): DimProp | "max-width" | "min-height" {
      // We used to also map height to min-height,
      // but this causes issues for images.
      // And with spacing controls often replacing height controls,
      // this is less important.
      return prop === "width" && state.useMaxWidth ? "max-width" : prop;
    }

    const { domElt } = this.getExpAndDomElt();
    const initPx = state.initOffsetRect[dimProp];
    const newPx_ =
      deltaPx === undefined
        ? ensure(newPx, "Expected a number value")
        : initPx + deltaPx;
    const initSize = state.initDims[dimProp];
    const { unit } =
      initSize.type === "NumericSize"
        ? initSize
        : createNumericSize(initPx, "px");
    const newNum = offsetPxAsUnits(
      domElt,
      unit,
      newPx_,
      dimPropToSizeAxis(dimProp)
    );
    // Allow negative offsets but not sizes.
    if (newNum < 0 && ["width", "height"].includes(dimProp)) {
      return false;
    }
    if (isFinite(newNum)) {
      const smartDimProp = getSmartDimProp(dimProp);
      exp.set(smartDimProp, showSizeCss(createNumericSize(newNum, unit)));
      if (smartDimProp === "max-width") {
        exp.set("width", "stretch");
      } else if (smartDimProp === "min-height") {
        exp.set("height", "wrap");
      }
    }
    return true;
  }

  resize(
    state: ManipState,
    part: Corner | Side,
    e: SimpleMouseEvent
  ): ManipState {
    const { exp } = this.getExpAndDomElt();

    const desiredRect = Box.fromRect(
      resizeRect(
        e,
        new Pt(e.deltaFrameX, e.deltaFrameY),
        state.initOffsetRect,
        part
      )
    ).rect();

    const initNormalRect = Box.fromRect(state.initOffsetRect).rect();

    const desiredOffsetRect = {
      ...desiredRect,
      right:
        state.initOffsetRect.right - (desiredRect.right - initNormalRect.right),
      bottom:
        state.initOffsetRect.bottom -
        (desiredRect.bottom - initNormalRect.bottom),
    };

    for (const dimProp of dimProps) {
      if (state.lastOffsetRect[dimProp] !== desiredOffsetRect[dimProp]) {
        if (isStandardSide(dimProp)) {
          if (exp.get(dimProp) !== "auto") {
            this.updateDimProp(
              state,
              exp,
              dimProp,
              undefined,
              desiredOffsetRect[dimProp]
            );
          }
        } else {
          // If a width/height already is set, we continue setting it.

          // We do allow converting a width/height from auto to numeric, but
          // we never set a width/height if both left/right or top/bottom are
          // numeric (we only do this if at least one of those is auto).  Or,
          // since top/left/etc. have no effect for static elements, also
          // allow setting width/height for static elements.

          if (
            exp.get(dimProp) !== "auto" ||
            exp.get("position") === "static" ||
            sizeAxisToSides(dimProp).some((side) => exp.get(side) === "auto")
          ) {
            this.updateDimProp(
              state,
              exp,
              dimProp,
              undefined,
              desiredOffsetRect[dimProp]
            );
          }
        }
      }
    }

    return {
      ...state,
      lastOffsetRect: desiredOffsetRect,
    };
  }

  move(state: ManipState, e: SimpleMouseEvent) {
    const { exp } = this.getExpAndDomElt();
    if (["absolute", "fixed"].includes(exp.get("position"))) {
      const moveAxis = (props: DimProp[], deltaPx: number) => {
        const sides = ifEmpty(
          props.filter((side) => exp.get(side) !== "auto"),
          () => [props[0]] as DimProp[]
        );
        for (const side of sides) {
          this.updateDimProp(
            state,
            exp,
            side,
            (isEndSide(ensureSide(side)) ? -1 : 1) * deltaPx
          );
        }
      };
      moveAxis(
        ["left", "right"],
        !e.shiftKey || Math.abs(e.deltaFrameX) >= Math.abs(e.deltaFrameY)
          ? e.deltaFrameX
          : 0
      );
      moveAxis(
        ["top", "bottom"],
        !e.shiftKey || Math.abs(e.deltaFrameX) < Math.abs(e.deltaFrameY)
          ? e.deltaFrameY
          : 0
      );
    }
  }
}

export interface ModifierStates {
  readonly shiftKey: boolean;
  readonly altKey: boolean;
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
}

/**
 * Determine the desired rect, factoring in modifier keys.
 */
export function resizeRect(
  mouseEvent: ModifierStates,
  dragVec: Pt,
  initRect: Rect,
  part: Side | Corner
) {
  // Resize first.  Need to double the resize amount if symmetric resize.
  const initBox = Box.fromRect(initRect);
  dragVec = dragVec.scale(mouseEvent.altKey ? 2 : 1);
  let box = initBox.adjustSides(
    Object.fromEntries(
      sideOrCornerToSides(part).map((side) =>
        tuple(side, sideToOrient(side) === "horiz" ? dragVec.x : dragVec.y)
      )
    )
  );

  if (mouseEvent.shiftKey) {
    if (initRect) {
      // If we are trying to maintain proportions to (say) a 1x4 initRect,
      // and the dragged rect is 2x2, then we could either be creating a
      // .5x2 or 2x8.  Standard behavior is to always choose the larger
      // possibility.
      box = box.withSizeOfBox(
        Box.fromRect(initRect).scaleSizeOnly(
          Math.max(box.width() / initRect.width, box.height() / initRect.height)
        )
      );
    } else {
      const len = absmax(box.width(), box.height());
      box = box.withSize(len, len);
    }
  }

  // Position the rect, e.g. center if alt is held, else maintain origin.
  // The "origin" or "anchor" or "fixed" point should not be moving.
  box = box.alignTo(
    initBox,
    mouseEvent.altKey ? "center" : oppSideOrCorner(part)
  );

  return box.absBox().rect();
}

export class DragMoveFrameManager {
  private state: ManipState;
  private _aborted = false;
  constructor(
    private studioCtx: StudioCtx,
    private frame: ArenaFrame,
    private startingClientPt: Pt
  ) {
    studioCtx.startUnlogged();
    mkFreestyleManipForFocusedFrame(studioCtx, frame).match({
      success: (manipulator) => {
        this.state = manipulator.start();
      },
      failure: () => {
        this._aborted = false;
      },
    });
  }

  async drag(clientPt: Pt, modifiers: ModifierStates) {
    if (!this._aborted) {
      const maybeAborted = await this.studioCtx.change<ManipulatorAbortedError>(
        ({ success, run }) => {
          return success(
            run(
              mkFreestyleManipForFocusedFrame(this.studioCtx, this.frame)
            ).move(this.state, {
              deltaFrameX:
                (clientPt.x - this.startingClientPt.x) / this.studioCtx.zoom,
              deltaFrameY:
                (clientPt.y - this.startingClientPt.y) / this.studioCtx.zoom,
              shiftKey: modifiers.shiftKey,
              metaKey: modifiers.metaKey,
              altKey: modifiers.altKey,
              ctrlKey: modifiers.ctrlKey,
            })
          );
        }
      );
      maybeAborted.match({
        success: () => {},
        failure: () => {
          this._aborted = true;
          this.endDrag();
        },
      });
    }
  }

  aborted() {
    return this._aborted;
  }

  endDrag() {
    spawn(
      this.studioCtx.change(({ success }) => {
        this.studioCtx.normalizeCurrentArena();
        if (this.studioCtx.isUnlogged()) {
          this.studioCtx.stopUnlogged();
        }
        return success();
      })
    );
  }
}
