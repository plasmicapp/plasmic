import S from "@/wab/client/components/canvas/HoverBox/Controls/GapCanvasControls.module.scss";
import { prefixSum } from "@/wab/client/components/sidebar-tabs/ResponsiveColumns/tpl-columns-utils";
import { getContentOnlyRect, getMarginRect } from "@/wab/client/dom";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { useForceUpdate } from "@/wab/client/useForceUpdate";
import { ensure, parsePx } from "@/wab/shared/common";
import { XDraggable } from "@/wab/commons/components/XDraggable";
import { useSignalListener } from "@/wab/commons/components/use-signal-listener";
import { parseCssNumericNew } from "@/wab/shared/css";
import {
  ContainerLayoutType,
  getRshContainerType,
} from "@/wab/shared/layoututils";
import { TplTag } from "@/wab/shared/model/classes";
import { allImageAssets, allMixins, allStyleTokens } from "@/wab/shared/core/sites";
import { CssVarResolver, hasGapStyle } from "@/wab/shared/core/styles";
import { isTplColumns, isTplTag } from "@/wab/shared/core/tpls";
import cn from "classnames";
import $ from "jquery";
import { observer } from "mobx-react";
import React from "react";

interface ContainerGapMetaElement {
  type: string;
  hasGapStyle: boolean;
  dims?: {
    widths: number[];
    heights: number[];
  };
  rowGap?: string;
  colGap?: string;
  visibleX: boolean;
  visibleY: boolean;
}

interface ContainerGapMetaColumns extends ContainerGapMetaElement {
  type: "columns";
  numCols: number;
  numRows: number;
}

interface ContainerGapMetaFlex extends ContainerGapMetaElement {
  type: ContainerLayoutType.flexColumn | ContainerLayoutType.flexRow;
}

type ContainerGapMeta = ContainerGapMetaColumns | ContainerGapMetaFlex;

type Orient = "vert" | "horiz";

const computeContainerGapMeta = (
  tpl: TplTag,
  viewCtx: ViewCtx
): ContainerGapMeta | undefined => {
  const effectiveVs = viewCtx.effectiveCurrentVariantSetting(tpl);
  const tplHasGap = hasGapStyle(tpl);
  if (isTplColumns(tpl)) {
    const numChild = tpl.children.length;
    const numCols = effectiveVs.columnsConfig?.colsSizes.length || numChild;
    const numRows = Math.ceil(numChild / numCols);
    return {
      type: "columns",
      hasGapStyle: tplHasGap,
      numCols,
      numRows,
      visibleX: true,
      visibleY: true,
    };
  }

  const effectiveRSH = effectiveVs.rsh();
  const containerType = getRshContainerType(effectiveRSH);

  /**
   * If the container has flex-wrap we aren't going to show the gap controls,
   * since dealing with it can be troublesome, we could try to calculate the number
   * of elements that each row has based in the current gap, widths and heights of
   * the HTMLElements, but increasing the gap could lead to new gap areas
   * appearing/disappearing which could be troublesome to mantain
   */
  const flexWrap = effectiveRSH.get("flex-wrap");
  if (flexWrap === "wrap" || flexWrap === "wrap-reverse") {
    return undefined;
  }

  const getAxisVisibility = () => {
    const overflow = effectiveRSH.getRaw("overflow");
    const overflowX = effectiveRSH.getRaw("overflow-x") ?? overflow;
    const overflowY = effectiveRSH.getRaw("overflow-y") ?? overflow;
    return {
      visibleX: !overflowX || overflowX === "visible",
      visibleY: !overflowY || overflowY === "visible",
    };
  };

  const visibility = getAxisVisibility();

  if (containerType === ContainerLayoutType.flexRow) {
    return {
      type: ContainerLayoutType.flexRow,
      hasGapStyle: tplHasGap,
      ...visibility,
    };
  }

  if (containerType === ContainerLayoutType.flexColumn) {
    return {
      type: ContainerLayoutType.flexColumn,
      hasGapStyle: tplHasGap,
      ...visibility,
    };
  }

  return undefined;
};

export const GapCanvasControls = observer(function GapCanvasControls(props: {
  viewCtx: ViewCtx;
}) {
  const { viewCtx } = props;

  const tpl = viewCtx.focusedTpl();
  const { studioCtx } = viewCtx;
  const { zoom } = studioCtx;

  const forceUpdate = useForceUpdate();
  useSignalListener(studioCtx.styleChanged, forceUpdate, [studioCtx]);

  if (!tpl || !isTplTag(tpl) || tpl.tag !== "div") {
    return null;
  }

  const containerGapMeta = computeContainerGapMeta(tpl, viewCtx);
  if (!containerGapMeta) {
    return null;
  }

  const elt = viewCtx.focusedDomElt();

  if (!elt) {
    return null;
  }

  const contentRect = getContentOnlyRect(ensure(elt), {
    origin: {
      top: 0,
      left: 0,
    },
  });

  return (
    <div
      style={{
        position: "absolute",
        top: contentRect.top * zoom,
        left: contentRect.left * zoom,
        width: contentRect.width * zoom,
        height: contentRect.height * zoom,
        zIndex: -1,
        // We add the --gap-control-zoom variable in this element so that it's available
        // in the CSS of the children to simplify the code
        // @ts-ignore
        "--gap-control-zoom": zoom,
      }}
    >
      <GapControls
        viewCtx={viewCtx}
        tpl={tpl}
        elt={ensure(elt)}
        zoom={zoom}
        meta={containerGapMeta}
      />
    </div>
  );
});

const getChildDimensions = (
  elt: JQuery<HTMLElement>,
  meta: ContainerGapMeta,
  gaps: {
    rowGap: number;
    colGap: number;
  }
) => {
  // We jump one level deeper to skip the emulated gap container
  const gapChild = $(elt.children().get(0));
  const allChildren: HTMLElement[] = Array.from(gapChild.children());
  const rects = allChildren
    .map(getMarginRect)
    .map(
      // We have to shift the rects by (colGap, rowGap) since the gap properties in the studio are emulated
      // we use margin so we have to remove the actual gap to obtain the real rect
      (r) =>
        new DOMRect(
          r.left,
          r.top,
          r.width - gaps.colGap,
          r.height - gaps.rowGap
        )
    )
    // Remove invisible elements
    .filter((r) => r.width > 0 && r.height > 0);
  const heights = rects.map((r) => r.height);
  const widths = rects.map((r) => r.width);
  if (meta.type === ContainerLayoutType.flexRow) {
    return {
      widths,
      heights: [],
    };
  }

  if (meta.type === ContainerLayoutType.flexColumn) {
    return {
      widths: [],
      heights,
    };
  }

  if (meta.type === "columns") {
    /**
     * If we are in RC we calculate the sizes of the elements as a grid
     * for widths we can be sure that the size is constant base in the
     * number of columns, since that is how RC handle widths, for heights
     * we have to take the maximum of each row.
     */
    const adjustedHeights: number[] = Array(meta.numRows).fill(0);
    heights.forEach((h, idx) => {
      const row = Math.floor(idx / meta.numCols);
      adjustedHeights[row] = Math.max(adjustedHeights[row], h);
    });
    return {
      widths: widths.slice(0, meta.numCols),
      heights: adjustedHeights.slice(0, meta.numRows),
    };
  }

  return {
    widths: [],
    heights: [],
  };
};

interface DragState {
  orient: Orient;
  value: number;
  index: number;
}

export const GapControls = observer(function GapControls(props: {
  viewCtx: ViewCtx;
  tpl: TplTag;
  elt: JQuery<HTMLElement>;
  zoom: number;
  meta: ContainerGapMeta;
}) {
  const { viewCtx, tpl, elt, zoom, meta } = props;
  const effectiveVs = viewCtx.effectiveCurrentVariantSetting(tpl);

  const site = viewCtx.site;
  const resolver = new CssVarResolver(
    allStyleTokens(site, { includeDeps: "all" }),
    allMixins(site, { includeDeps: "all" }),
    allImageAssets(site, { includeDeps: "all" }),
    site.activeTheme
  );
  const colGap = resolver.tryResolveTokenOrMixinRef(
    effectiveVs.rsh().get("flex-column-gap") || "0px"
  );
  const rowGap = resolver.tryResolveTokenOrMixinRef(
    effectiveVs.rsh().get("flex-row-gap") || "0px"
  );

  const dims = getChildDimensions(elt, meta, {
    colGap: parsePx(colGap),
    rowGap: parsePx(rowGap),
  });

  const [dragState, setDragState] = React.useState<DragState | undefined>(
    undefined
  );

  return (
    <>
      {meta.visibleX && (
        <GapDimensionControls
          viewCtx={viewCtx}
          tpl={tpl}
          sizes={dims.widths}
          orient="vert"
          zoom={zoom}
          gapValue={colGap}
          dragState={dragState}
          setDragState={setDragState}
          meta={{
            ...meta,
            dims,
            rowGap,
            colGap,
          }}
        />
      )}
      {meta.visibleY && (
        <GapDimensionControls
          viewCtx={viewCtx}
          tpl={tpl}
          sizes={dims.heights}
          orient="horiz"
          zoom={zoom}
          gapValue={rowGap}
          dragState={dragState}
          setDragState={setDragState}
          meta={{
            ...meta,
            dims,
            rowGap,
            colGap,
          }}
        />
      )}
    </>
  );
});

export const GapDimensionControls = observer(
  function GapDimensionControls(props: {
    viewCtx: ViewCtx;
    tpl: TplTag;
    sizes: number[];
    orient: Orient;
    zoom: number;
    gapValue: string;
    dragState: DragState | undefined;
    setDragState: (e: DragState | undefined) => void;
    meta: ContainerGapMeta;
  }) {
    const {
      viewCtx,
      tpl,
      sizes,
      orient,
      zoom,
      gapValue,
      dragState,
      setDragState,
      meta,
    } = props;

    return (
      <>
        {prefixSum(sizes)
          .slice(0, -1)
          .map((size, idx) => {
            const position = `calc(${size}px * ${zoom} + ${idx} * ${gapValue} * ${zoom})`;
            const length = `calc(${gapValue} * ${zoom})`;
            return (
              <GapControl
                key={`gap-${orient}-control-${idx}`}
                viewCtx={viewCtx}
                tpl={tpl}
                orient={orient}
                zoom={zoom}
                gapValue={gapValue}
                top={orient === "horiz" ? position : undefined}
                left={orient === "vert" ? position : undefined}
                width={orient === "horiz" ? "100%" : length}
                height={orient === "vert" ? "100%" : length}
                dragState={dragState}
                setDragState={setDragState}
                idx={idx}
                meta={meta}
              />
            );
          })}
      </>
    );
  }
);

/**
 * We adjust the delta based in the number of gap areas (space between the elemtns) that exist,
 * we maintain the gap simply based in the middle position of a gap area, which means that while
 * the user is dragging the mouse we try to maintain the mouse over 50% of the area where the
 * mouse started the drag, this is adjustment is made with `(2 * delta) / (2 * idx + 1)`, for RC
 * in the vertical orientation this is not going to work out, since the width of a RC is constant
 * both in terms of the parent as of the child (which have sizes based on the gap), so we try just
 * to upscale the delta, so that it feels more smooth the movement. The delta in a flex container
 * can lead to problems if the child have widths/heighs as %.
 */
const calculateFixedDelta = (
  delta: number,
  idx: number,
  orient: Orient,
  meta: ContainerGapMeta
) => {
  if (meta.type === "columns") {
    if (orient === "vert") {
      return 1.5 * delta;
    } else {
      return (2 * delta) / (2 * idx + 1);
    }
  }
  return (2 * delta) / (2 * idx + 1);
};

const shouldShowMultipleHandles = (meta: ContainerGapMeta): boolean => {
  return meta.type === "columns" && !!meta.dims;
};

export const GapControl = observer(function GapControl(props: {
  viewCtx: ViewCtx;
  tpl: TplTag;
  orient: Orient;
  zoom: number;
  gapValue: string;
  left?: string;
  top?: string;
  width?: string;
  height?: string;
  dragState: DragState | undefined;
  setDragState: (e: DragState | undefined) => void;
  idx: number;
  meta: ContainerGapMeta;
}) {
  const {
    viewCtx,
    tpl,
    orient,
    gapValue,
    zoom,
    left,
    top,
    width,
    height,
    dragState,
    setDragState,
    idx,
    meta,
  } = props;
  const parsedGapValue = parseCssNumericNew(gapValue);

  const [isMouseOver, setIsMouseOver] = React.useState<boolean>(false);

  const label =
    orient === "vert" ? `Column Gap: ${gapValue}` : `Row Gap: ${gapValue}`;

  const dims =
    (orient === "vert" ? meta.dims?.heights : meta.dims?.widths) ?? [];
  const invertedGap = (orient === "vert" ? meta.rowGap : meta.colGap) ?? "0";
  const multipleHandles = shouldShowMultipleHandles(meta);
  return (
    <XDraggable
      onStart={async () => {
        viewCtx.startUnlogged();
        setDragState({
          orient,
          value: parsedGapValue?.num || 0,
          index: idx,
        });
      }}
      onDrag={async (e) => {
        if (dragState) {
          const delta =
            (orient === "vert" ? e.data.deltaX : e.data.deltaY) / zoom;
          const fixedDelta = calculateFixedDelta(delta, idx, orient, meta);
          const newValue = Math.round(
            Math.max(0, dragState.value + fixedDelta)
          );
          await viewCtx.studioCtx.change(({ success }) => {
            const vtm = viewCtx.variantTplMgr();
            const rsh = vtm.targetRshForNode(tpl);
            rsh.set(
              orient === "vert" ? "flex-column-gap" : "flex-row-gap",
              `${newValue}px`
            );
            return success();
          });
        }
      }}
      onStop={() => {
        viewCtx.stopUnlogged();
        setDragState(undefined);
      }}
    >
      <div
        className={cn({
          [S.canvasGapArea]: true,
          [S.canvasGapShadow]: !!dragState && dragState.orient === orient,
        })}
        style={{
          left,
          top,
          width,
          height,
        }}
      >
        {multipleHandles ? (
          <>
            {prefixSum(dims).map((size, i) => {
              const position = `calc(${
                size - dims[i] / 2
              }px * ${zoom}  + ${i} * ${invertedGap} * ${zoom})`;
              return (
                <div
                  key={`gap-controls-${idx}-handle-${orient}-${i}`}
                  className={cn(
                    dragState
                      ? {}
                      : {
                          [S.canvasGapHandle]: true,
                          [S.horiz]: orient === "horiz",
                          [S.vert]: orient === "vert",
                        }
                  )}
                  style={{
                    top: orient === "vert" ? position : "50%",
                    left: orient === "horiz" ? position : "50%",
                  }}
                  onMouseEnter={() => setIsMouseOver(true)}
                  onMouseLeave={() => setIsMouseOver(false)}
                ></div>
              );
            })}
          </>
        ) : (
          <div
            className={cn(
              dragState
                ? {}
                : {
                    [S.canvasGapHandle]: true,
                    [S.horiz]: orient === "horiz",
                    [S.vert]: orient === "vert",
                  }
            )}
            onMouseEnter={() => setIsMouseOver(true)}
            onMouseLeave={() => setIsMouseOver(false)}
          ></div>
        )}

        <div
          className={cn({
            [S.canvasGapLabel]: true,
            [S.hidden]:
              !isMouseOver &&
              (!dragState ||
                dragState.orient !== orient ||
                dragState.index !== idx),
          })}
        >
          {label}
        </div>
      </div>
    </XDraggable>
  );
});
