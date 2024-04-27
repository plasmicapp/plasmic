import { ensureKnownInteraction } from "@/wab/classes";
import DataPickerColumnItem from "@/wab/client/components/sidebar-tabs/DataBinding/DataPickerColumnItem";
import {
  ColumnItem,
  DataPickerOpts,
  evalExpr,
  getItemPath,
  getSupportedObjectKeys,
  getVariableType,
  isListType,
  isTypeSupported,
} from "@/wab/client/components/sidebar-tabs/DataBinding/DataPickerUtil";
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
import { ensure, isTruthy } from "@/wab/common";
import { DEVFLAGS } from "@/wab/devflags";
import { pathToString } from "@/wab/shared/eval/expression-parser";
import { isTplTagOrComponent } from "@/wab/tpls";
import { mkMetaName } from "@plasmicapp/host";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import { notification } from "antd";
import * as React from "react";

export interface DataPickerColumnProps extends DefaultDataPickerColumnProps {
  data: Record<string, any>;
  columnIndex: number;
  selectedItem: number | undefined;
  isActiveColumn: boolean;
  columnItems: ColumnItem[];
  onItemSelected: (column: number, item: number) => void;
  opts: DataPickerOpts;
}

function DataPickerColumn_(
  props: DataPickerColumnProps,
  ref: HTMLElementRefOf<"div">
) {
  const {
    data,
    columnIndex,
    selectedItem,
    columnItems,
    onItemSelected,
    isActiveColumn,
    opts,
    ...rest
  } = props;
  if (!data) {
    return <PlasmicDataPickerColumn root={{ ref }} children={undefined} />;
  }

  const studioCtx = useStudioCtx();
  const getInteraction = React.useCallback(
    (key: string) => {
      return data["$steps"]?.[mkMetaName(key)]?.interaction;
    },
    [data, studioCtx]
  );
  const wasStepExecuted = React.useCallback(
    (key: string) => {
      const interaction = getInteraction(key);
      return interaction && studioCtx.hasCached$stepValue(interaction.uuid);
    },
    [data, studioCtx, getInteraction]
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
      children={columnItems
        .map(({ name: key, label, pathPrefix, value }, index) => {
          const itemPath = getItemPath(pathPrefix, key);
          const variableType = getVariableType(value);
          if (!isTypeSupported(variableType)) {
            return undefined;
          }
          const keyCount = isListType(variableType)
            ? getSupportedObjectKeys(value, opts).length
            : 0;
          const previewValue = !isListType(variableType)
            ? evalExpr(
                itemPath,
                ensure(data, "Should only be called if data exists")
              )
            : variableType === "array"
            ? keyCount + ` item${keyCount === 1 ? "" : "s"}`
            : undefined;
          const isSelected = index === selectedItem;
          return (
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
                        0
                      )
                  : undefined
              }
              key={pathToString(itemPath)}
              itemName={label ?? key}
              variableType={variableType}
              previewValue={previewValue}
              isSelected={isSelected}
              onClick={() => onItemSelected(columnIndex, index)}
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
          );
        })
        .filter(isTruthy)}
      runAllSteps={{
        onClick: () => {
          const currentInteraction = ensureKnownInteraction(
            data[mkMetaName("$steps")]?.currentInteraction
          );
          const previousSteps = currentInteraction.parent.interactions.slice(
            0,
            currentInteraction.parent.interactions.indexOf(currentInteraction)
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

const DataPickerColumn = React.forwardRef(DataPickerColumn_);
export default DataPickerColumn;
