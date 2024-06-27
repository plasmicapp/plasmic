import { ColumnSizeControlDraggables } from "@/wab/client/components/sidebar-tabs/ResponsiveColumns/ColumnsSizeControls";
import { shouldBeDisabled } from "@/wab/client/components/sidebar/sidebar-helpers";
import { getContentOnlyRect } from "@/wab/client/dom";
import { getElementBounds } from "@/wab/client/dom-utils";
import { reportError } from "@/wab/client/ErrorNotifications";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { useForceUpdate } from "@/wab/client/useForceUpdate";
import { ensure, NullOrUndefinedValueError } from "@/wab/shared/common";
import { useSignalListener } from "@/wab/commons/components/use-signal-listener";
import { computeDefinedIndicator } from "@/wab/shared/defined-indicator";
import { isTplColumns, TplColumnsTag } from "@/wab/shared/core/tpls";
import { observer } from "mobx-react";
import * as React from "react";

export const ResponsiveColumnsCanvasControls = observer(
  function ResponsiveColumnsCanvasControls(props: {
    viewCtx: ViewCtx;
    tpl: TplColumnsTag;
  }) {
    const { viewCtx, tpl } = props;
    const [dragState, setDragState] = React.useState<
      | {
          index: number;
          cols: number[];
        }
      | undefined
    >(undefined);

    const forceUpdate = useForceUpdate();

    const studioCtx = viewCtx.studioCtx;
    useSignalListener(studioCtx.styleChanged, forceUpdate, [studioCtx]);
    const effectiveVs = viewCtx.effectiveCurrentVariantSetting(tpl);
    const columnsConfig = effectiveVs.columnsConfig;

    if (!columnsConfig) {
      reportError(
        new NullOrUndefinedValueError(
          "[rc] - columnsConfig expected to be truthy"
        )
      );
      return null;
    }

    if (!isTplColumns(tpl)) {
      return null;
    }

    const zoom = viewCtx.studioCtx.zoom;

    const elt = viewCtx.focusedDomElt();
    const rect = getElementBounds(ensure(elt));
    const contentRect = getContentOnlyRect(ensure(elt), {
      origin: {
        top: 0,
        left: 0,
      },
    });

    const definedIndicator = computeDefinedIndicator(
      studioCtx.site,
      viewCtx.currentComponent(),
      effectiveVs.getColumnsConfigSource(),
      viewCtx.variantTplMgr().getTargetIndicatorComboForNode(tpl)
    );

    const { isDisabled } = shouldBeDisabled({
      props: {},
      indicators: [definedIndicator],
    });

    if (isDisabled) {
      return null;
    }

    return (
      <div
        style={{
          position: "absolute",
          top: 0,
          left: contentRect.left * zoom,
          width: contentRect.width * zoom,
          height: rect.height * zoom,
          zIndex: -1,
          cursor: dragState ? "ew-resize" : undefined,
        }}
      >
        <ColumnSizeControlDraggables
          tpl={tpl}
          viewCtx={viewCtx}
          sizes={columnsConfig.colsSizes}
          dragState={dragState}
          zoom={zoom}
          isCanvas={true}
          width={rect.width}
          setDragState={setDragState}
        />
      </div>
    );
  }
);
