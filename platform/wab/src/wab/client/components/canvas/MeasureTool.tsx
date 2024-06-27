import { recomputeBounds } from "@/wab/client/components/canvas/HoverBox";
import { hasLayoutBox } from "@/wab/client/dom";
import { StudioCtx, withStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewComponentBase } from "@/wab/client/studio-ctx/view-ctx";
import { ensure, maybe } from "@/wab/shared/common";
import { Box, horizontalSides, Pt, Side } from "@/wab/shared/geom";
import { Observer } from "mobx-react";
import * as React from "react";
import { memo } from "react";

interface MeasureToolViewProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  showPx?: boolean; // Show a label of pixel distance
  isDashed: boolean; // Dashed line
}

function _MeasureToolView({
  viewProps,
  zoom,
}: {
  viewProps: MeasureToolViewProps[];
  zoom: number;
}) {
  return (
    <div>
      {viewProps.map((p, index) => {
        const dx = p.x1 - p.x2;
        const dy = p.y1 - p.y2;
        // In radians, direction starting at 3 o'clock specified by
        // https://developer.mozilla.org/en-US/docs/Web/CSS/transform-function/rotate
        const angle = Math.PI + Math.atan2(dy, dx);
        const len = Math.floor(Math.sqrt(dx * dx + dy * dy));
        const left = p.x1;
        const top = p.y1;
        return (
          <div key={"measuretool-container" + index}>
            <div
              key={"measuretool-line" + index}
              className={"MeasureTool__Line"}
              data-original-width={len}
              data-original-height={0}
              data-original-transform={`rotate(${angle}rad)`}
              style={{
                left: left,
                top: top,
                width: zoom * len,
                height: 0,
                transform: `scale(${1 / zoom}) rotate(${angle}rad)`,
                borderStyle: p.isDashed ? "dashed" : "solid",
              }}
            >
              {p.showPx && (
                <div
                  key={"measuretool-label" + index}
                  className={"MeasureTool__Label"}
                  style={{
                    transform: `translate(-50%, -50%) rotate(-${angle}rad)`,
                  }}
                >
                  {Math.floor(len)}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export const MeasureToolView = memo(_MeasureToolView);

function sides(
  fn: (side: Side) => MeasureToolViewProps[]
): MeasureToolViewProps[] {
  const result: MeasureToolViewProps[] = [];
  return result.concat(fn("left"), fn("right"), fn("top"), fn("bottom"));
}

type MeasureToolProps = {
  studioCtx: StudioCtx;
};

class _MeasureTool extends ViewComponentBase<MeasureToolProps, {}> {
  viewCtx() {
    return ensure(this.viewCtxMaybe());
  }
  viewCtxMaybe() {
    return this.props.studioCtx.focusedViewCtx();
  }

  /**
   * Given a DOM element, compute a scalar box for it
   **/
  makeBox($dom: JQuery): Box {
    const vc = this.viewCtx();
    const boxInFrame = recomputeBounds($dom);
    const frameBox = vc.studioCtx.getArenaFrameScalerRect(vc.arenaFrame());
    const boxInScaler = boxInFrame.moveBy(
      frameBox?.left ?? 0,
      frameBox?.top ?? 0
    );
    return boxInScaler;
  }

  /**
   * Draw measurement lines if b1 fully contains b2
   **/
  drawContains(b1: Box, b2: Box): MeasureToolViewProps[] {
    return sides((side) => [
      {
        // side represents a side of b2
        x1: horizontalSides.includes(side) ? b2.getSide(side) : b2.xmid(),
        y1: horizontalSides.includes(side) ? b2.ymid() : b2.getSide(side),
        x2: horizontalSides.includes(side) ? b1.getSide(side) : b2.xmid(),
        y2: horizontalSides.includes(side) ? b2.ymid() : b1.getSide(side),
        showPx: true,
        isDashed: false,
      },
    ]);
  }

  /**
   * If neither box full encloses the other, but intersects,
   * calculate the union and intersection first
   **/
  drawOverlapping(b1: Box, b2: Box): MeasureToolViewProps[] {
    const outerBox = b1.merge(b2.rect());
    const innerBox = b1.intersection(b2, true);
    return innerBox ? this.drawContains(outerBox, innerBox) : [];
  }

  /**
   * Draw lines and guides for 2 disjoint boxes
   **/
  drawNonoverlapping(src: Box, dst: Box): MeasureToolViewProps[] {
    const result: MeasureToolViewProps[] = [];
    // Solid horizontal lines
    const rightOf = src.left() > dst.right();
    if (src.left() > dst.right() || src.right() < dst.left()) {
      result.push({
        x1: rightOf ? src.left() : src.right(),
        y1: src.ymid(),
        x2: rightOf ? dst.right() : dst.left(),
        y2: src.ymid(),
        showPx: true,
        isDashed: false,
      });
      // Dashed vertical lines
      if (src.ymid() > dst.bottom() || src.ymid() < dst.top()) {
        result.push({
          x1: rightOf ? dst.right() : dst.left(),
          y1: src.ymid(),
          x2: rightOf ? dst.right() : dst.left(),
          y2: src.ymid() > dst.bottom() ? dst.bottom() : dst.top(),
          showPx: false,
          isDashed: true,
        });
      }
    }

    // Solid vertical lines
    const below = src.top() > dst.bottom();
    if (src.top() > dst.bottom() || src.bottom() < dst.top()) {
      result.push({
        x1: src.xmid(),
        y1: below ? src.top() : src.bottom(),
        x2: src.xmid(),
        y2: below ? dst.bottom() : dst.top(),
        showPx: true,
        isDashed: false,
      });
      // Dashed horizontal lines
      if (src.xmid() > dst.right() || src.xmid() < dst.left()) {
        result.push({
          x1: src.xmid(),
          y1: below ? dst.bottom() : dst.top(),
          x2: src.xmid() > dst.right() ? dst.right() : dst.left(),
          y2: below ? dst.bottom() : dst.top(),
          showPx: false,
          isDashed: true,
        });
      }
    }
    return result;
  }

  /**
   * Draw a straight line between 2 points
   * Currently unused.
   **/
  drawStraight(p1: Pt, p2: Pt): MeasureToolViewProps[] {
    return [
      {
        x1: p1.x,
        y1: p1.y,
        x2: p2.x,
        y2: p2.y,
        showPx: true,
        isDashed: false,
      },
    ];
  }

  render() {
    return (
      <Observer>
        {() => {
          const sc = this.props.studioCtx;
          const vc = sc.focusedViewCtx();
          // eslint-disable-next-line @typescript-eslint/no-shadow
          const $focusedDomElt = maybe(vc, (vc) => vc.focusedDomElt());
          // eslint-disable-next-line @typescript-eslint/no-shadow
          const $target = maybe(vc, (vc) => vc.$measureToolDomElt());
          // Only display MeasureTool lines if we know the
          // 2 unique elements we want a line between
          if (
            sc.isResizeDragging ||
            !vc ||
            !$focusedDomElt ||
            $focusedDomElt.length !== 1 ||
            !$focusedDomElt[0].isConnected ||
            !hasLayoutBox($focusedDomElt[0]) ||
            !$target ||
            (!($target instanceof Pt) && $focusedDomElt.is($target))
          ) {
            return <></>;
          }

          const src = this.makeBox($focusedDomElt);
          const dst =
            $target instanceof Pt
              ? $target.toZeroBox()
              : maybe(
                  vc.getViewOps().getFinalFocusable($target).focusedDom,
                  (dom) => this.makeBox(dom)
                );

          const viewProps = !dst
            ? []
            : src.containsBox(dst)
            ? this.drawContains(src, dst)
            : dst.containsBox(src)
            ? this.drawContains(dst, src)
            : src.overlapsBox(dst)
            ? this.drawOverlapping(src, dst)
            : this.drawNonoverlapping(src, dst);

          return <MeasureToolView viewProps={viewProps} zoom={sc.zoom} />;
        }}
      </Observer>
    );
  }
}

export const MeasureTool = withStudioCtx(_MeasureTool);
