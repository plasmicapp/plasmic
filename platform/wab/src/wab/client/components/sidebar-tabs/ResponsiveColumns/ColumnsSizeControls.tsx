import S from "@/wab/client/components/sidebar-tabs/ResponsiveColumns/ColumnsSizeControls.module.scss";
import {
  addNewColumn,
  prefixSum,
} from "@/wab/client/components/sidebar-tabs/ResponsiveColumns/tpl-columns-utils";
import { FullRow } from "@/wab/client/components/sidebar/sidebar-helpers";
import { IconLinkButton } from "@/wab/client/components/widgets";
import { Icon } from "@/wab/client/components/widgets/Icon";
import PlusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Plus";
import DoubleDotsVertical from "@/wab/client/plasmic/plasmic_kit_design_system/icons/PlasmicIcon__DoubleDotsVerticalsvg";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { spawn } from "@/wab/shared/common";
import { XDraggable } from "@/wab/commons/components/XDraggable";
import {
  calcMovedColSizes,
  updateCurrentTplColumns,
} from "@/wab/shared/columns-utils";
import { ColumnsConfig } from "@/wab/shared/model/classes";
import { allImageAssets, allMixins, allStyleTokens } from "@/wab/shared/core/sites";
import { CssVarResolver } from "@/wab/shared/core/styles";
import { TplColumnsTag } from "@/wab/shared/core/tpls";
import { Tooltip } from "antd";
import cn from "classnames";
import { isEqual, isUndefined } from "lodash";
import { observer } from "mobx-react";
import React from "react";

interface ColumnSizeDragState {
  index: number;
  cols: number[];
}

export const ColumnsSizeControls = observer(
  function ColumnsSizeControls(props: {
    viewCtx: ViewCtx;
    tpl: TplColumnsTag;
    config: ColumnsConfig;
    isDisabled?: boolean;
  }) {
    const { tpl, viewCtx, config, isDisabled } = props;

    const [dragState, setDragState] = React.useState<
      ColumnSizeDragState | undefined
    >(undefined);

    const columnBlockSize = 264;

    return (
      <FullRow>
        <div className={S.wrapper}>
          <div
            className={S.controlsWrapper}
            style={{
              cursor: dragState ? "ew-resize" : undefined,
            }}
          >
            {config.colsSizes.map((size, idx) => {
              return (
                <div
                  key={`rc-column-control-${idx}`}
                  className={S.columnWrapper}
                  style={{
                    width: `${(100 * size) / 12}%`,
                  }}
                >
                  <div className={S.columnContent}>
                    <span>{size}</span>
                  </div>
                </div>
              );
            })}
            {!isDisabled ? (
              <ColumnSizeControlDraggables
                tpl={tpl}
                viewCtx={viewCtx}
                sizes={config.colsSizes}
                dragState={dragState}
                width={columnBlockSize}
                zoom={1}
                isCanvas={false}
                setDragState={setDragState}
              />
            ) : null}
          </div>
        </div>
      </FullRow>
    );
  }
);

export const ColumnSizeControlDraggables = observer(
  function ColumnSizeControlDraggables(props: {
    tpl: TplColumnsTag;
    viewCtx: ViewCtx;
    sizes: number[];
    dragState: ColumnSizeDragState | undefined;
    width: number;
    zoom: number;
    isCanvas: boolean;
    setDragState: (s: ColumnSizeDragState | undefined) => void;
  }) {
    const {
      tpl,
      viewCtx,
      sizes,
      dragState,
      width,
      zoom,
      isCanvas,
      setDragState,
    } = props;

    const colGapRaw = isCanvas
      ? viewCtx
          .effectiveCurrentVariantSetting(tpl)
          .rsh()
          .get("flex-column-gap") || "0px"
      : "0px";

    const site = viewCtx.site;
    const resolver = new CssVarResolver(
      allStyleTokens(site, { includeDeps: "all" }),
      allMixins(site, { includeDeps: "all" }),
      allImageAssets(site, { includeDeps: "all" }),
      site.activeTheme
    );

    const colGap = resolver.tryResolveTokenOrMixinRef(colGapRaw);
    const colGapInZoom = `${colGap} * ${zoom}`;
    const areaWidth = `(100% - ${sizes.length - 1} * ${colGapInZoom})`;

    const [mouseOver, setMouseOver] = React.useState<number | undefined>(
      undefined
    );

    return (
      <>
        {prefixSum(sizes)
          .slice(0, -1)
          .map((size, idx) => {
            if (dragState && dragState.index !== idx) {
              return null;
            }
            return (
              <XDraggable
                key={`rc-column-control-${isCanvas}-${idx}`}
                onStart={(_) => {
                  viewCtx.startUnlogged();
                  setDragState({
                    index: idx,
                    cols: sizes,
                  });
                }}
                onDrag={(e) => {
                  if (dragState) {
                    const delta = e.data.deltaX / zoom;
                    const newCols = calcMovedColSizes(
                      dragState.cols,
                      dragState.index,
                      delta,
                      width
                    );
                    if (!isEqual(newCols, sizes)) {
                      spawn(
                        viewCtx.studioCtx.change(({ success }) => {
                          updateCurrentTplColumns(
                            tpl,
                            {
                              colsSizes: newCols,
                            },
                            viewCtx.variantTplMgr()
                          );
                          return success();
                        })
                      );
                    }
                  }
                }}
                onStop={(e) => {
                  viewCtx.stopUnlogged();
                  setDragState(undefined);
                }}
              >
                <div
                  className={isCanvas ? S.canvasColumnBtn : S.columnResizer}
                  style={{
                    left: `calc(${areaWidth} * ${size / 12} + ${
                      idx + 0.5
                    } * ${colGapInZoom})`,
                  }}
                  onMouseEnter={() => setMouseOver(idx)}
                  onMouseLeave={() => setMouseOver(undefined)}
                >
                  {isCanvas && (
                    <Tooltip title="Drag to adjust the size of your columns">
                      <Icon icon={DoubleDotsVertical} size={12} />
                    </Tooltip>
                  )}
                </div>
              </XDraggable>
            );
          })}
        {isCanvas && (
          <>
            <IconLinkButton
              className={cn(S.canvasColumnBtn, S.canvasColumnPlusBtn)}
              disabled={tpl.children.length === 12}
              onClick={async () =>
                await viewCtx.studioCtx.change<never>(({ success }) => {
                  addNewColumn(tpl, viewCtx);
                  return success();
                })
              }
            >
              <Tooltip title="Add a new column">
                <Icon icon={PlusIcon} />
              </Tooltip>
            </IconLinkButton>
            {(!isUndefined(mouseOver) || dragState) && (
              <BeamLine
                dragState={{
                  cols: sizes,
                  index: mouseOver || dragState?.index || 0,
                }}
                areaWidth={areaWidth}
                colGapInZoom={colGapInZoom}
              />
            )}
          </>
        )}
      </>
    );
  }
);

export const BeamLine = (props: {
  dragState: ColumnSizeDragState;
  areaWidth: string;
  colGapInZoom: string;
}) => {
  const { dragState, areaWidth, colGapInZoom } = props;
  const { index, cols } = dragState;
  const sizes = prefixSum(cols);
  const at = sizes[index];

  return (
    <div
      key={`canvas-column-beam-${at}`}
      className={S.canvasColumnBeamLine}
      style={{
        left: `calc(${areaWidth} * ${at / 12} + ${
          index + 0.5
        } * ${colGapInZoom})`,
      }}
    ></div>
  );
};
