import { restrictBetweenInclusive } from "@/wab/shared/common";
import { Box, Pt, Transformable } from "@/wab/shared/geom";
import { AnyArena, getArenaFrames } from "@/wab/shared/Arenas";
import { equalsComparer, getter, setter } from "@/wab/shared/mobx-util";
import debounce from "lodash/debounce";
import { action, computed, observable, reaction, runInAction } from "mobx";

const MIN_SCALE = 0.02;
const MAX_SCALE = 256;

export interface DomActions {
  updateCanvasPadding: (padding: Pt) => void;
  updateArenaSize: (arenaSize: Pt) => void;
  scaleTo: (scale: number, smooth: boolean) => void;
  scrollTo: (scroll: Pt, smooth: boolean) => void;
  scrollBy: (scroll: Pt, smooth: boolean) => void;
}

interface Transform {
  arenaSize: Pt;
  scale: number;
  scroll: Pt;
  smooth: boolean;
}

/** Manages the viewport of the canvas. */
export class ViewportCtx {
  private readonly dom: DomActions;
  private readonly arenaPaddingToClipperRatio: number;
  private readonly disposals: (() => void)[] = [];

  constructor(opts: {
    dom: DomActions;
    initialArena: AnyArena | null;
    initialClipperBox: Box;
    initialClipperScroll: Pt;
    scrollPaddingRatio?: number;
  }) {
    this.dom = opts.dom;
    this.arenaPaddingToClipperRatio = opts.scrollPaddingRatio ?? 0.95;
    runInAction(() => {
      this._arena.set(opts.initialArena);
      this._clipperBox.set(opts.initialClipperBox);
      this._clipperScroll.set(opts.initialClipperScroll);
    });

    // Update the DOM in reactions, after mobx transactions.
    // This reduces the number of unnecessary DOM updates.
    this.disposals.push(
      reaction(
        () => this.canvasPadding(),
        (canvasPadding, prevCanvasPadding) => {
          this.dom.updateCanvasPadding(canvasPadding);

          // Scroll by half the difference to maintain the midpoint of the viewport
          if (prevCanvasPadding) {
            const scrollBy = canvasPadding.sub(prevCanvasPadding).scale(0.5);
            this.dom.scrollBy(scrollBy, false);
          }
        },
        {
          name: "ViewportCtx.updateDomCanvasPadding",
          fireImmediately: true,
        }
      ),
      // Check enqueuedTransform and arenaSize in same reaction
      // to avoid duplicate setArenaSize calls.
      reaction(
        () => [this.enqueuedTransform(), this.arenaSize()] as const,
        ([transform, arenaSize], prev) => {
          const prevTransform = prev?.[0];

          if (transform && transform !== prevTransform) {
            this.dom.updateArenaSize(transform.arenaSize);
            this.dom.scaleTo(transform.scale, transform.smooth);
            this.dom.scrollTo(transform.scroll, transform.smooth);
          } else {
            this.dom.updateArenaSize(arenaSize);
          }
        },
        {
          name: "ViewportCtx.updateDomTransform",
          fireImmediately: true,
        }
      )
    );
  }

  dispose = () => this.disposals.forEach((dispose) => dispose());

  private _arena = observable.box<AnyArena | null>(null);
  arena = getter(this._arena);
  setArena = action(setter(this._arena));

  private _isTransforming = observable.box<boolean>(false);
  isTransforming = getter(this._isTransforming);
  private setIsTransforming = () => {
    this._isTransforming.set(true);
    this.debouncedUnsetIsTransforming();
  };
  private debouncedUnsetIsTransforming = debounce(() => {
    this._isTransforming.set(false);
  }, 200);

  /** The last enqueued transform. */
  private _enqueuedTransform = observable.box<Transform | null>(null, {
    equals: (a, b) => {
      if (a && b) {
        return (
          a.scale === b.scale &&
          a.scroll.equals(b.scroll) &&
          a.smooth === b.smooth
        );
      } else {
        return a === b;
      }
    },
  });
  private enqueuedTransform = getter(this._enqueuedTransform);
  enqueueTransform = action((scale: number, scroll: Pt, smooth: boolean) => {
    this.setIsTransforming();
    this._scale.set(scale);
    this._enqueuedTransform.set({
      arenaSize: this.arenaSize(),
      scale,
      scroll,
      smooth,
    });
  });

  /** Scale (zoom) of the scaler. */
  private _scale = observable.box(1);
  scale = getter(this._scale);

  /** Scroll of the clipper. */
  private _clipperScroll = observable.box<Pt>(Pt.zero(), {
    equals: equalsComparer,
  });
  scroll = getter(this._clipperScroll);
  /**
   * Updates the value of {@link scroll}.
   * This should only be called by the clipper's event listener.
   *
   * To perform a scroll, see methods like {@link scrollBy}, {@link scrollTo}, etc.
   */
  setScroll = action(setter(this._clipperScroll));

  /** Scrolls by a relative vector. */
  scrollBy = (delta: Pt, opts?: { smooth: boolean }) => {
    const { smooth = false } = opts ?? {};
    runInAction(() => this.setIsTransforming());
    this.dom.scrollBy(delta, smooth);
  };

  /** Performs DOM scroll with an absolute vector. */
  scrollTo = action((pt: Pt, opts?: { smooth: boolean }) => {
    const { smooth = false } = opts ?? {};
    this.enqueueTransform(this.scale(), pt, smooth);
  });

  /**
   * Scale the viewport at a fixed point.
   *
   * The fixed point should have the same client and scaler point before and after scaling.
   */
  scaleAtFixedPt = action(
    (
      scale: number,
      scalerPt: Pt,
      clientPt: Pt,
      opts?: {
        smooth?: boolean;
      }
    ) => {
      const { smooth = false } = opts ?? {};
      const newScale = restrictBetweenInclusive(scale, MIN_SCALE, MAX_SCALE);
      const newScroll = this.clipperBox()
        .topLeft()
        .plus(this.canvasPadding())
        .sub(clientPt)
        .plus(scalerPt.scale(newScale));
      this.enqueueTransform(newScale, newScroll, smooth);
    }
  );

  /**
   * Scale the viewport at the viewport midpoint.
   */
  scaleAtMidPt = action(
    (
      scale: number,
      opts?: {
        minScale?: number;
        maxScale?: number;
        smooth?: boolean;
      }
    ) => {
      const scalerPt = this.visibleScalerBox().midpt();
      const clientPt = this.scalerToClient(scalerPt);
      return this.scaleAtFixedPt(scale, scalerPt, clientPt, opts);
    }
  );

  /**
   * Zooms (scale + scroll) to fit a scaler box in the center of the viewport
   * with the specified padding in client pixels.
   */
  zoomToScalerBox = action(
    (
      scalerBox: Box,
      opts?: {
        minScale?: number;
        maxScale?: number;
        minPadding?:
          | number
          | {
              left?: number;
              right?: number;
              top?: number;
              bottom?: number;
            };
        ignoreHeight?: boolean;
        smooth?: boolean;
      }
    ) => {
      const {
        minScale = 0,
        maxScale = Number.POSITIVE_INFINITY,
        minPadding = 0,
        ignoreHeight = false,
        smooth = false,
      } = opts ?? {};
      const minLeftPadding =
        typeof minPadding === "number" ? minPadding : minPadding.left ?? 0;
      const minRightPadding =
        typeof minPadding === "number" ? minPadding : minPadding.right ?? 0;
      const minTopPadding =
        typeof minPadding === "number" ? minPadding : minPadding.top ?? 0;
      const minBottomPadding =
        typeof minPadding === "number" ? minPadding : minPadding.bottom ?? 0;

      const clipperBox = this.clipperBox();
      const maxClientWidth =
        clipperBox.width() - minLeftPadding - minRightPadding;
      const maxClientHeight =
        clipperBox.height() - minTopPadding - minBottomPadding;
      const newScale = restrictBetweenInclusive(
        restrictBetweenInclusive(
          ignoreHeight
            ? maxClientWidth / scalerBox.width()
            : Math.min(
                maxClientWidth / scalerBox.width(),
                maxClientHeight / scalerBox.height()
              ),
          minScale,
          maxScale
        ),
        MIN_SCALE,
        MAX_SCALE
      );

      const leftPadding =
        minLeftPadding +
        Math.max(0, (maxClientWidth - scalerBox.width() * newScale) / 2);
      const topPadding =
        minTopPadding +
        (ignoreHeight
          ? 0
          : Math.max(0, (maxClientHeight - scalerBox.height() * newScale) / 2));

      const newScroll = this.canvasPadding()
        .plus(scalerBox.topLeft().scale(newScale))
        .moveBy(-leftPadding, -topPadding);

      this.enqueueTransform(newScale, newScroll, smooth);
    }
  );

  /** Size of the arena in scaler units (before CSS transforms). */
  private _arenaScalerSize = observable.box<Pt>(Pt.zero(), {
    equals: equalsComparer,
  });
  arenaScalerSize = getter(this._arenaScalerSize);
  setArenaScalerSize = action(setter(this._arenaScalerSize));
  /** Size of the arena. */
  _arenaSize = computed<Pt>(() => this.arenaScalerSize().scale(this.scale()));
  arenaSize = getter(this._arenaSize);

  /** Controls the canvas's padding around the arena (for limiting scrolling). */
  canvasPadding = getter(
    computed<Pt>(
      () => {
        const clipperBox = this.clipperBox();
        if (getArenaFrames(this.arena()).length > 0) {
          return new Pt(
            clipperBox.width() * this.arenaPaddingToClipperRatio,
            clipperBox.height() * this.arenaPaddingToClipperRatio
          );
        } else {
          return Pt.zero();
        }
      },
      {
        equals: equalsComparer,
      }
    )
  );

  /** Box of the clipper, relative to the window. */
  private _clipperBox = observable.box<Box>(Box.zero(), {
    equals: equalsComparer,
  });
  clipperBox = getter(this._clipperBox);
  setClipperBox = action(setter(this._clipperBox));

  /** Box of what is visible in clipper, in scaler pixels, relative to the arena. */
  visibleScalerBox = getter(
    computed<Box>(() => {
      const topLeftPt = this.scroll().sub(this.canvasPadding());
      const clipperBox = this.clipperBox();
      return new Box(
        topLeftPt.y,
        topLeftPt.x,
        clipperBox.width(),
        clipperBox.height()
      ).scale(1 / this.scale());
    })
  );

  /**
   * Converts a scaler pt/box to a client pt/box.
   *
   * A scaler pt is a point in the scaler, without scaling.
   * A client pt is a point in the top most window's viewport.
   */
  scalerToClient<T extends Transformable<T>>(scaler: T): T {
    return scaler
      .scale(this.scale())
      .plus(this.clipperBox().topLeft())
      .plus(this.canvasPadding())
      .sub(this.scroll());
  }

  /**
   * Converts a client pt/box to a scaler pt/box.
   *
   * A client point is a point in the top most window's viewport.
   * A scaler point is a point in the scaler, without scaling.
   */
  clientToScaler<T extends Transformable<T>>(client: T): T {
    return client
      .plus(this.scroll())
      .sub(this.canvasPadding())
      .sub(this.clipperBox().topLeft())
      .scale(1 / this.scale());
  }
}
