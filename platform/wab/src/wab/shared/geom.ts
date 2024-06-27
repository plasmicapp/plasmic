import { ensure, last, pairwise, tuple } from "@/wab/shared/common";
import { max, min, minBy, sortBy } from "lodash";

export interface Offset {
  top: number;
  left: number;
}

export type Orientation = "horizontal" | "vertical";

export interface Rect {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
}

export interface ClientRect {
  top: number;
  bottom: number;
  right: number;
  left: number;
  width: number;
  height: number;
}

export interface Transformable<T> {
  scale(factor: number): T;
  moveBy(dx: number, dy: number): T;
  plus(vec: Pt): T;
  sub(vec: Pt): T;
}

export class Pt implements Transformable<Pt> {
  constructor(public readonly x: number, public readonly y: number) {}
  equals(other: Pt) {
    return this === other || (this.x === other.x && this.y === other.y);
  }
  toString() {
    return `Pt[x=${this.x},y=${this.y}]`;
  }
  moveBy(dx: number, dy: number) {
    return new Pt(this.x + dx, this.y + dy);
  }
  plus(vec: Pt) {
    return this.moveBy(vec.x, vec.y);
  }
  sub(vec: Pt) {
    return this.moveBy(-vec.x, -vec.y);
  }
  dist(p: Pt) {
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  toZeroBox() {
    return new Box(this.y, this.x, 0, 0);
  }
  toUnitBox() {
    return new Box(this.y, this.x, 1, 1);
  }
  static zero() {
    return new Pt(0, 0);
  }
  static fromOffset(off: Offset) {
    return new Pt(off.left, off.top);
  }
  toOffset() {
    return { top: this.y, left: this.x };
  }
  scale(num: number) {
    return new Pt(this.x * num, this.y * num);
  }
  round() {
    return new Pt(Math.round(this.x), Math.round(this.y));
  }
  floor() {
    return new Pt(Math.floor(this.x), Math.floor(this.y));
  }
}

/**
 * Flips a rect with negative width/height.
 */
export function absRect({ top, left, width, height }: Rect): Rect {
  return {
    top: Math.min(top, top + height),
    left: Math.min(left, left + width),
    width: Math.abs(width),
    height: Math.abs(height),
  };
}

type BoxAnchor = Side | Corner | "center";

export class Box implements Transformable<Box> {
  constructor(
    private readonly t: number,
    private readonly l: number,
    private readonly w: number,
    private readonly h: number
  ) {}
  equals(other: Box) {
    return (
      this === other ||
      (this.t === other.t &&
        this.l === other.l &&
        this.w === other.w &&
        this.h === other.h)
    );
  }
  toString() {
    return `Box[x=${this.l},y=${this.t},w=${this.w},h=${this.h}]`;
  }
  static zero() {
    return new Box(0, 0, 0, 0);
  }
  static fromRect(rect: Rect) {
    const { top, left, width, height } = rect;
    return new Box(top, left, width, height);
  }
  static fromRectSides({
    top,
    left,
    right,
    bottom,
  }: Omit<ClientRect, "width" | "height">) {
    return new Box(top, left, right - left, bottom - top);
  }
  static spanning(a: Pt, b: Pt) {
    const top = Math.min(a.y, b.y);
    const bottom = Math.max(a.y, b.y);
    const left = Math.min(a.x, b.x);
    const right = Math.max(a.x, b.x);
    return new Box(top, left, right - left, bottom - top);
  }
  static mergeBBs(bbs: Array<ClientRect | Rect>) {
    if (bbs.length === 0) {
      return undefined;
    }
    return bbs.reduce(
      (total, curBB) => total.merge(curBB),
      Box.fromRect(bbs[0])
    );
  }
  static enclosingPts(pts: Pt[]) {
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    return Box.fromRectSides({
      top: ensure(
        min(ys),
        `Unexpected undefined value. ${ys} should not be empty or falsey`
      ),
      bottom: ensure(
        max(ys),
        `Unexpected undefined value. ${ys} should not be empty or falsey`
      ),
      left: ensure(
        min(xs),
        `Unexpected undefined value. ${xs} should not be empty or falsey`
      ),
      right: ensure(
        max(xs),
        `Unexpected undefined value. ${xs} should not be empty or falsey`
      ),
    });
  }
  size() {
    return new Pt(this.width(), this.height());
  }
  topLeft() {
    return new Pt(this.left(), this.top());
  }
  topRight() {
    return new Pt(this.right(), this.top());
  }
  bottomLeft() {
    return new Pt(this.left(), this.bottom());
  }
  bottomRight() {
    return new Pt(this.right(), this.bottom());
  }
  topMidpt() {
    return new Pt(this.xmid(), this.top());
  }
  rightMidpt() {
    return new Pt(this.right(), this.ymid());
  }
  bottomMidpt() {
    return new Pt(this.xmid(), this.bottom());
  }
  leftMidpt() {
    return new Pt(this.left(), this.ymid());
  }
  getCorner(corner: Corner) {
    switch (corner) {
      case "top-left":
        return this.topLeft();
      case "top-right":
        return this.topRight();
      case "bottom-left":
        return this.bottomLeft();
      case "bottom-right":
        return this.bottomRight();
    }
  }
  getSide(side: Side) {
    switch (side) {
      case "top":
        return this.top();
      case "right":
        return this.right();
      case "bottom":
        return this.bottom();
      case "left":
        return this.left();
    }
  }
  getSideMidpt(side: Side) {
    switch (side) {
      case "top":
        return this.topMidpt();
      case "right":
        return this.rightMidpt();
      case "bottom":
        return this.bottomMidpt();
      case "left":
        return this.leftMidpt();
    }
  }
  getSideMidptOrCorner(anchor: BoxAnchor): Pt {
    return isStandardSide(anchor)
      ? this.getSideMidpt(anchor)
      : anchor === "center"
      ? this.midpt()
      : this.getCorner(anchor);
  }
  pad(padWidth: number, padHeight: number) {
    return new Box(
      this.top() - padHeight,
      this.left() - padWidth,
      this.width() + 2 * padWidth,
      this.height() + 2 * padHeight
    );
  }
  scale(zoom: number) {
    return new Box(
      this.top() * zoom,
      this.left() * zoom,
      this.width() * zoom,
      this.height() * zoom
    );
  }
  scaleSizeOnly(zoom: number) {
    return new Box(
      this.top(),
      this.left(),
      this.width() * zoom,
      this.height() * zoom
    );
  }
  round() {
    return new Box(
      Math.round(this.top()),
      Math.round(this.left()),
      Math.round(this.width()),
      Math.round(this.height())
    );
  }
  merge(rect: Rect | ClientRect) {
    const top = Math.min(this.top(), rect.top);
    const left = Math.min(this.left(), rect.left);
    const right = Math.max(this.right(), rect.left + rect.width);
    const bottom = Math.max(this.bottom(), rect.top + rect.height);
    return new Box(top, left, right - left, bottom - top);
  }
  /**
   * Create a box of just the part that intersects
   * Returns undefined if non-overlapping
   **/
  intersection(box: Box, includeTouching = false): Box | undefined {
    const top = Math.max(this.top(), box.top());
    const left = Math.max(this.left(), box.left());
    const right = Math.min(this.right(), box.right());
    const bottom = Math.min(this.bottom(), box.bottom());
    return (
      includeTouching
        ? left > right || top > bottom
        : left >= right || top >= bottom
    )
      ? undefined
      : new Box(top, left, right - left, bottom - top);
  }
  intersects(box: Box, includeTouching = false): boolean {
    return !!this.intersection(box, includeTouching);
  }

  withSides(newSides: { [S in Side]?: number }) {
    return Box.fromRectSides({ ...this.rect(), ...newSides });
  }
  adjustSides(deltaSides: { [S in Side]?: number }) {
    const rect = this.rect();
    for (const side of standardSides) {
      const delta = deltaSides[side];
      if (delta === undefined) {
        continue;
      }
      rect[side] += delta;
    }
    return Box.fromRectSides(rect);
  }
  top() {
    return this.t;
  }
  left() {
    return this.l;
  }
  width() {
    return this.w;
  }
  height() {
    return this.h;
  }
  right() {
    return this.l + this.w;
  }
  bottom() {
    return this.t + this.h;
  }
  xmid() {
    return this.l + this.w / 2;
  }
  ymid() {
    return this.t + this.h / 2;
  }
  midpt() {
    return new Pt(this.xmid(), this.ymid());
  }
  contains(p: /*TWZ*/ Pt | Pt | Pt) {
    return (
      this.left() <= p.x &&
      p.x < this.right() &&
      this.top() <= p.y &&
      p.y < this.bottom()
    );
  }
  leftHalf() {
    return new Box(this.t, this.l, this.w / 2, this.h);
  }
  topHalf() {
    return new Box(this.t, this.l, this.w, this.h / 2);
  }
  moveBy(dx: /*TWZ*/ number, dy: /*TWZ*/ number) {
    return new Box(this.t + dy, this.l + dx, this.w, this.h);
  }
  plus(vec: Pt) {
    return this.moveBy(vec.x, vec.y);
  }
  sub(vec: Pt) {
    return this.moveBy(-vec.x, -vec.y);
  }

  withSize(w: number, h: number) {
    return new Box(this.t, this.l, w, h);
  }
  withSizeOfPt(size: Pt) {
    return this.withSize(size.x, size.y);
  }
  withSizeOfRect({ width, height }: Rect) {
    return this.withSize(width, height);
  }
  withSizeOfBox(other: Box) {
    return this.withSize(other.width(), other.height());
  }

  /**
   * This is just lazily calculating the distance from the midpoint, but
   * this is of course not ideal.
   */
  dist(p: Pt) {
    return this.midpt().dist(p);
  }

  rect(): ClientRect {
    return {
      top: this.top(),
      left: this.left(),
      width: this.width(),
      height: this.height(),
      right: this.right(),
      bottom: this.bottom(),
    };
  }
  // Return a dict that contains typical position properties settings, i.e.
  // top, left, width, height.
  posRect(): Rect {
    return {
      top: this.top(),
      left: this.left(),
      width: this.width(),
      height: this.height(),
    };
  }
  containsBox(box: Box) {
    return (
      this.left() <= box.left() &&
      this.right() >= box.right() &&
      this.top() <= box.top() &&
      this.bottom() >= box.bottom()
    );
  }
  /**
   * Checks if the boxes have any overlap
   **/
  overlapsBox(box: Box): boolean {
    return !!this.intersection(box);
  }

  /**
   * Move the box such that the given side midpoint or corner is at the given
   * pt.
   */
  moveSuchThat(anchor: BoxAnchor, pt: Pt) {
    const diff = pt.sub(this.getSideMidptOrCorner(anchor));
    return this.plus(diff);
  }

  /**
   * Align to another box by aligning the specified anchor on each box.
   */
  alignTo(other: Box, anchor: BoxAnchor) {
    const originPt = other.getSideMidptOrCorner(anchor);
    return this.moveSuchThat(anchor, originPt);
  }

  absBox() {
    return Box.fromRect(absRect(this.rect()));
  }

  floor() {
    return this.moveSuchThat("top-left", this.topLeft().floor());
  }

  closestSide(pt: Pt): Side {
    return ensure(
      minBy(standardSides, (side) => this.getSideMidpt(side).dist(pt)),
      "Must be closest to *some* side"
    );
  }

  getSideBox(side: Side): Box {
    switch (side) {
      case "top":
        return Box.spanning(this.topLeft(), this.topRight());
      case "right":
        return Box.spanning(this.topRight(), this.bottomRight());
      case "bottom":
        return Box.spanning(this.bottomLeft(), this.bottomRight());
      case "left":
        return Box.spanning(this.topLeft(), this.bottomLeft());
    }
  }
}

export type Side = "top" | "right" | "bottom" | "left";
export type Corner = "top-right" | "bottom-right" | "bottom-left" | "top-left";
export const standardSides: ReadonlyArray<Side> = [
  "top",
  "right",
  "bottom",
  "left",
];
export const verticalSides: ReadonlyArray<Side> = ["top", "bottom"];
export const horizontalSides: ReadonlyArray<Side> = ["left", "right"];
export const standardCorners: ReadonlyArray<Corner> = [
  "top-left",
  "top-right",
  "bottom-right",
  "bottom-left",
];
export const cornerToSides = (corner: Corner): [Side, Side] => {
  switch (corner) {
    case "top-left":
      return ["top", "left"];
    case "top-right":
      return ["top", "right"];
    case "bottom-left":
      return ["bottom", "left"];
    case "bottom-right":
      return ["bottom", "right"];
  }
};

export function isStandardSide(str: string): str is Side {
  return (standardSides as string[]).includes(str);
}

export function isStandardCorner(str: string): str is Corner {
  return (standardCorners as string[]).includes(str);
}

export function sideToAdjacentSides(side: Side): Side[] {
  switch (side) {
    case "bottom":
      return ["right", "bottom", "left"];
    case "left":
      return ["bottom", "left", "top"];
    case "top":
      return ["left", "top", "right"];
    case "right":
      return ["top", "right", "bottom"];
  }
}

export function sideOrCornerToSides(sideOrCorner: Side | Corner): Side[] {
  return isStandardSide(sideOrCorner)
    ? [sideOrCorner]
    : cornerToSides(sideOrCorner);
}

export const oppSides: { [S in Side]: Side } = {
  left: "right",
  right: "left",
  top: "bottom",
  bottom: "top",
};

export function oppSide(side: Side) {
  return oppSides[side];
}

export const oppCorners: { [C in Corner]: Corner } = {
  "top-left": "bottom-right",
  "top-right": "bottom-left",
  "bottom-left": "top-right",
  "bottom-right": "top-left",
};

export function oppCorner(corner: Corner) {
  return oppCorners[corner];
}

export function oppSideOrCorner(sideOrCorner: Side): Side;
export function oppSideOrCorner(sideOrCorner: Corner): Corner;
export function oppSideOrCorner(sideOrCorner: Side | Corner): Side | Corner;
export function oppSideOrCorner(sideOrCorner: Side | Corner): Side | Corner {
  return isStandardSide(sideOrCorner)
    ? oppSide(sideOrCorner)
    : oppCorner(sideOrCorner);
}

export const endSides: Side[] = ["right", "bottom"];

export function isEndSide(side: Side) {
  return endSides.includes(side);
}

export function ensureSide(s: string): Side {
  if (isStandardSide(s)) {
    return s;
  }
  throw new Error();
}

export type Orient = "vert" | "horiz";

/**
 * Maps a side to the direction it controls (left/right are horiz, top/down are vert)
 */
export function sideToOrient(side: Side): Orient {
  return side === "left" || side === "right" ? "horiz" : "vert";
}

/**
 * Maps orientation of an edge on the argument side (left/right are vert, top/down are horiz)
 */
export function sideEdgeToOrient(side: Side): Orient {
  return side === "left" || side === "right" ? "vert" : "horiz";
}

export type SizeAxis = "width" | "height";

export function sideToSize(side: Side): SizeAxis {
  return side === "left" || side === "right" ? "width" : "height";
}

export function sizeAxisToSides(sizeAxis: SizeAxis): Side[] {
  return sizeAxis === "width" ? ["left", "right"] : ["top", "bottom"];
}

export function isAxisSide(side: Side, sizeAxis: SizeAxis) {
  return sizeAxisToSides(sizeAxis).includes(side);
}

export type DimProp = "width" | "height" | "top" | "left" | "right" | "bottom";

export function dimPropToSizeAxis(dimProp: DimProp) {
  return isStandardSide(dimProp) ? sideToSize(dimProp) : dimProp;
}

export const dimProps: ReadonlyArray<DimProp> = [
  "width",
  "height",
  "top",
  "left",
  "right",
  "bottom",
];

export interface Size {
  width: number;
  height: number;
}

export function rectTopLeft(rect: Rect) {
  return new Pt(rect.left, rect.top);
}

export function rectsIntersect(rect1: Rect, rect2: Rect) {
  const [left, right] =
    rect1.left < rect2.left ? [rect1, rect2] : [rect2, rect1];
  const xIntersects = left.left + left.width >= right.left;

  const [top, bottom] = rect1.top < rect2.top ? [rect1, rect2] : [rect2, rect1];
  const yIntersects = top.top + top.height >= bottom.top;

  return xIntersects && yIntersects;
}

export function mergeSpans(spans: [number, number][]) {
  const sorted = sortBy(spans, ([left, _right]) => left);

  function* genMergedSpans() {
    let [currentLeft, currentRight] = sorted[0];
    for (const [left, right] of sorted) {
      const span = Box.fromRectSides({
        top: 0,
        bottom: 1,
        left,
        right,
      });
      const intersection = span.intersection(
        Box.fromRectSides({
          top: 0,
          bottom: 1,
          left: currentLeft,
          right: currentRight,
        }),
        true
      );
      if (intersection) {
        // Merge the new span into the current one (extending current).
        currentRight = Math.max(currentRight, right);
      } else {
        // Start a new span.
        yield [currentLeft, currentRight];
        [currentLeft, currentRight] = [left, right];
      }
    }
    yield [currentLeft, currentRight];
  }

  const merged = [...genMergedSpans()];
  return merged;
}

/**
 * Find the top-left point to insert a rect of the desired width and height, in
 * a space that is already occupied by the other given rects.
 *
 * We simply sweep rightward until we find an unoccupied area large enough.
 *
 * @param width
 * @param height
 * @param insertPt The *center* of where we would ideally insert the new Rect.
 * @param rects The currently existing Rects.
 * @return The *top-left* position where we actually should insert the new Rect.
 */
export function findSpaceForRectSweepRight(
  width: number,
  height: number,
  insertPt: Pt,
  rects: Rect[]
): Offset {
  // We want to insert a rect of the given width and height.
  //
  // We need to find free space to insert it.
  //
  // We ideally want to insert it at insertPt.
  //
  // As long as space is not available, we should keep searching to the right
  // until free space is available.
  //
  // I.e. we do not vary the y-position, only the x-position.
  //
  // Here's one easy way find such a space.
  //
  // Let's say we plop down the rect at insertPt and sweep it all the way to
  // the right, toward infinity.
  //
  // For any rect that intersects with this "beam" area, we note the x-span
  // of its intersection.
  //
  // We merge any overlapping spans together.
  //
  // Finally we just walk along this beam, skipping the spans and finding
  // the first gap in between spans that is big-enough.

  const beam = new Box(0, 0, width, height)
    .moveSuchThat("center", insertPt)
    .floor()
    .withSides({ right: 1073741823 });
  if (rects.length === 0) {
    return beam.topLeft().toOffset();
  }

  function* genSpans() {
    for (const rect of rects) {
      const intersection = beam.intersection(Box.fromRect(rect));
      if (intersection) {
        yield tuple(intersection.left(), intersection.right());
      }
    }
  }

  const spans = [...genSpans()];
  if (spans.length === 0) {
    return beam.topLeft().toOffset();
  }
  const mergedSpans = mergeSpans(spans);
  console.log(spans);
  console.log(mergedSpans);
  console.log();
  console.log();
  console.log();
  console.log();
  for (const [[_left0, right0], [left1, _right1]] of pairwise(mergedSpans)) {
    if (left1 - right0 > width) {
      return {
        top: beam.top(),
        left: right0,
      };
    }
  }
  return {
    top: beam.top(),
    left: last(mergedSpans)[1],
  };
}
