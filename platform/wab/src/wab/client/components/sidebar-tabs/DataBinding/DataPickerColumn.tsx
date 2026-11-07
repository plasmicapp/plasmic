import sty from "@/wab/client/components/sidebar-tabs/DataBinding/DataPickerColumn.module.scss";
import DataPickerColumnItem from "@/wab/client/components/sidebar-tabs/DataBinding/DataPickerColumnItem";
import {
  ColumnItem,
  DataPickerOpts,
  evalExpr,
  getDollarVarIcon,
  getItemPath,
  getSourceQuery,
  getSourceUiId,
  getSupportedObjectKeys,
  getVariableType,
  isListType,
  isTypeSupported,
} from "@/wab/client/components/sidebar-tabs/DataBinding/DataPickerUtil";
import {
  isDraggableDataItem,
  mkDataDragSpec,
  mkDataDragTargeting,
} from "@/wab/client/components/sidebar-tabs/DataBinding/data-drag";
import { DraggableInsertable } from "@/wab/client/components/studio/add-drawer/DraggableInsertable";
import { useOpenQueryPanel } from "@/wab/client/hooks/useOpenQueryPanel";
import {
  DefaultDataPickerColumnProps,
  PlasmicDataPickerColumn,
} from "@/wab/client/plasmic/plasmic_kit_data_binding/PlasmicDataPickerColumn";
import { BLOCKED_RUN_INTERACTION_ONLY_BY_EVENT_ARGS_MESSAGE } from "@/wab/client/state-management/interactions-meta";
import {
  canRunInteraction,
  runInteraction,
} from "@/wab/client/state-management/preview-steps";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import type { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { MaybeWrap } from "@/wab/commons/components/ReactUtil";
import { ensure, isTruthy } from "@/wab/shared/common";
import { isTplTagOrComponent } from "@/wab/shared/core/tpls";
import { DEVFLAGS } from "@/wab/shared/devflags";
import {
  pathToString,
  transformDataTokenPathToBundle,
} from "@/wab/shared/eval/expression-parser";
import { ensureKnownInteraction } from "@/wab/shared/model/classes";
import { mkMetaName } from "@plasmicapp/host";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import { notification } from "antd";
import { observer } from "mobx-react";
import * as React from "react";

export interface DataPickerColumnProps extends DefaultDataPickerColumnProps {
  viewCtx: ViewCtx | undefined;
  data: Record<string, any>;
  columnIndex: number;
  selectedItem: number | undefined;
  isActiveColumn: boolean;
  columnItems: ColumnItem[];
  onItemSelected: (column: number, item: number) => void;
  opts: DataPickerOpts;
  onCancelDataPicker?: () => void;
  /** In the bottom panel, where a query link opens its editor in place. */
  docked?: boolean;
  /** Rows can be dragged onto the canvas to create/bind elements. */
  allowDragging?: boolean;
  // Error message shown in place of data fields when set.
  errorMessage?: string;
}

/** The contents of a column standing in for data that failed to resolve. */
function ColumnErrorNotice(props: { columnIndex: number; message: string }) {
  const { columnIndex, message } = props;
  return (
    <div
      className={sty.columnError}
      data-test-id={`data-picker-column-${columnIndex}-error`}
    >
      <div className={sty.columnErrorTitle}>Error</div>
      <div className={sty.columnErrorMessage}>{message}</div>
    </div>
  );
}

function DataPickerColumn_(
  props: DataPickerColumnProps,
  ref: HTMLElementRefOf<"div">,
) {
  const {
    data,
    viewCtx,
    columnIndex,
    selectedItem,
    columnItems,
    onItemSelected,
    isActiveColumn,
    opts,
    onCancelDataPicker,
    docked,
    allowDragging,
    errorMessage,
    ...rest
  } = props;
  if (!data) {
    return <PlasmicDataPickerColumn root={{ ref }} children={undefined} />;
  }

  const studioCtx = useStudioCtx();
  const openQuery = useOpenQueryPanel();
  const getInteraction = React.useCallback(
    (key: string) => {
      return data["$steps"]?.[mkMetaName(key)]?.interaction;
    },
    [data, studioCtx],
  );
  const wasStepExecuted = React.useCallback(
    (key: string) => {
      const interaction = getInteraction(key);
      return interaction && studioCtx.hasCached$stepValue(interaction.uuid);
    },
    [data, studioCtx, getInteraction],
  );
  const isStepsColumn = React.useMemo(() => {
    const pathPrefix = columnItems.find((item) => item.pathPrefix)?.pathPrefix;
    return pathPrefix && pathPrefix.length === 1 && pathPrefix[0] === "$steps";
  }, [columnItems]);
  const enabledPreviewSteps = DEVFLAGS.previewSteps;

  return (
    <PlasmicDataPickerColumn
      root={{ ref, id: `data-picker-column-${columnIndex}` }}
      {...rest}
      previewSteps={enabledPreviewSteps && isStepsColumn}
      children={
        errorMessage != null ? (
          <ColumnErrorNotice columnIndex={columnIndex} message={errorMessage} />
        ) : (
          columnItems
            .map((item, index) => {
              const { name: key, label, value } = item;
              const path = getItemPath(item);
              const variableType = getVariableType(value);
              if (!isTypeSupported(variableType)) {
                return undefined;
              }
              const keyCount = isListType(variableType)
                ? getSupportedObjectKeys(value, opts).length
                : 0;
              // Indicator for a row whose data errored.
              const errorPreview =
                item.errorMessage != null ? "error" : undefined;
              const previewValue =
                errorPreview ??
                (!isListType(variableType)
                  ? evalExpr(
                      path,
                      ensure(data, "Should only be called if data exists"),
                    )
                  : variableType === "array"
                    ? keyCount + ` item${keyCount === 1 ? "" : "s"}`
                    : undefined);
              const isSelected = index === selectedItem;
              const sourceUiId = viewCtx
                ? getSourceUiId(path, viewCtx.site, viewCtx.currentComponent())
                : undefined;
              const sourceQuery =
                docked && viewCtx
                  ? getSourceQuery(path, viewCtx.currentComponent())
                  : undefined;
              const canDrag =
                allowDragging &&
                !!viewCtx &&
                item.errorMessage == null &&
                isDraggableDataItem(variableType);
              return (
                <MaybeWrap
                  key={pathToString(path)}
                  cond={!!canDrag}
                  wrapper={(children) => {
                    const sourceViewCtx = ensure(
                      viewCtx,
                      "canDrag implies viewCtx",
                    );
                    const payload = {
                      path: transformDataTokenPathToBundle(
                        path,
                        sourceViewCtx.site,
                        sourceViewCtx.siteInfo.id,
                      ),
                      label: label ?? key,
                      value,
                      varType: variableType,
                      previewValue,
                      sourceViewCtx,
                      envKeys: Object.keys(data),
                    };
                    return (
                      <DraggableInsertable
                        sc={studioCtx}
                        spec={mkDataDragSpec(payload)}
                        dataDrag={mkDataDragTargeting(payload)}
                        dataDragPayload={payload}
                      >
                        {children}
                      </DraggableInsertable>
                    );
                  }}
                >
                  <DataPickerColumnItem
                    ref={
                      isSelected && isActiveColumn
                        ? (el) =>
                            setTimeout(
                              () =>
                                el?.scrollIntoView({
                                  block: "center",
                                  inline: "start",
                                  behavior: "smooth",
                                }),
                              0,
                            )
                        : undefined
                    }
                    itemName={label ?? key}
                    variableType={variableType}
                    icon={
                      columnIndex === 0 ? getDollarVarIcon(path) : undefined
                    }
                    previewValue={previewValue}
                    isSelected={isSelected}
                    onClick={() => onItemSelected(columnIndex, index)}
                    onJumpToSource={
                      sourceQuery && viewCtx
                        ? () => openQuery(viewCtx, sourceQuery)
                        : sourceUiId
                          ? () => {
                              onCancelDataPicker?.();
                              studioCtx.uiActionBus.dispatch(
                                sourceUiId,
                                "jump",
                              );
                            }
                          : undefined
                    }
                    columnIndex={columnIndex}
                    step={
                      isStepsColumn && enabledPreviewSteps
                        ? wasStepExecuted(key)
                          ? "played"
                          : "notPlayed"
                        : undefined
                    }
                    interaction={getInteraction(key)}
                  />
                </MaybeWrap>
              );
            })
            .filter(isTruthy)
        )
      }
      runAllSteps={{
        onClick: () => {
          const currentInteraction = ensureKnownInteraction(
            data[mkMetaName("$steps")]?.currentInteraction,
          );
          const previousSteps = currentInteraction.parent.interactions.slice(
            0,
            currentInteraction.parent.interactions.indexOf(currentInteraction),
          );
          const vc = studioCtx.focusedViewCtx();
          const tpl = vc?.focusedTpls()?.[0];
          if (!vc || !tpl || !isTplTagOrComponent(tpl)) {
            return;
          }
          for (const interaction of previousSteps) {
            if (!canRunInteraction(interaction, vc, { skipSteps: true })) {
              notification.error({
                message: BLOCKED_RUN_INTERACTION_ONLY_BY_EVENT_ARGS_MESSAGE,
              });
              return;
            }
          }
          for (const interaction of previousSteps) {
            runInteraction(interaction, vc, tpl);
          }
        },
      }}
    />
  );
}

const DataPickerColumn = observer(React.forwardRef(DataPickerColumn_));
export default DataPickerColumn;
