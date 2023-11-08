import { observer } from "mobx-react-lite";
import * as React from "react";
import { ensure, NullOrUndefinedValueError } from "../../../../common";
import { useSignalListener } from "../../../../commons/components/use-signal-listener";
import { getContentOnlyRect } from "../../../../dom";
import { computeDefinedIndicator } from "../../../../shared/defined-indicator";
import { isTplColumns, TplColumnsTag } from "../../../../tpls";
import { getElementBounds } from "../../../dom-utils";
import { reportError } from "../../../ErrorNotifications";
import { ViewCtx } from "../../../studio-ctx/view-ctx";
import { useForceUpdate } from "../../../useForceUpdate";
import { ColumnSizeControlDraggables } from "../../sidebar-tabs/ResponsiveColumns/ColumnsSizeControls";
import { shouldBeDisabled } from "../../sidebar/sidebar-helpers";

export const ResponsiveColumnsCanvasControls = observer(
  function ResponsiveColumnsCanvasControls(props: {
    viewCtx: ViewCtx;
    tpl: TplColumnsTag;
  }) {
    const { viewCtx, tpl } = props;
    const [dragState, setDragState] =
      React.useState<
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
