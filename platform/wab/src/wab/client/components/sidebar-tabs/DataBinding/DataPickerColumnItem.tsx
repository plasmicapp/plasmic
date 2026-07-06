import {
  DataPickerSupportedVariableType,
  toDataPickerPreviewVariant,
  variableTypeToIcon,
} from "@/wab/client/components/sidebar-tabs/DataBinding/DataPickerUtil";
import { Icon, SvgIcon } from "@/wab/client/components/widgets/Icon";
import {
  DefaultDataPickerColumnItemProps,
  PlasmicDataPickerColumnItem,
} from "@/wab/client/plasmic/plasmic_kit_data_binding/PlasmicDataPickerColumnItem";
import { BLOCKED_RUN_INTERACTION_MESSAGE } from "@/wab/client/state-management/interactions-meta";
import {
  canRunInteraction,
  runInteraction,
} from "@/wab/client/state-management/preview-steps";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { isTplTagOrComponent } from "@/wab/shared/core/tpls";
import { Interaction } from "@/wab/shared/model/classes";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import { notification } from "antd";
import cn from "classnames";
import { observer } from "mobx-react";
import * as React from "react";

export interface DataPickerColumnItemProps
  extends Omit<DefaultDataPickerColumnItemProps, "variableType"> {
  onClick: () => void;
  itemName?: string;
  variableType: DataPickerSupportedVariableType;
  /** Icon to use. If missing, defaults to using the item's variableType. */
  icon?: SvgIcon;
  /** Preview value as text. Renders in one line under itemName. */
  previewValue?: string;
  columnIndex?: number;
  interaction?: Interaction;
  /** Jumps to this row's editable source. Absent when the row has no source. */
  onJumpToSource?: () => void;
}

function DataPickerColumnItem_(
  props: DataPickerColumnItemProps,
  ref: HTMLElementRefOf<"div">
) {
  const {
    columnIndex,
    variableType,
    icon,
    previewValue,
    itemName,
    interaction,
    onJumpToSource,
    ...rest
  } = props;
  const studioCtx = useStudioCtx();
  return (
    <PlasmicDataPickerColumnItem
      root={{ ref, "data-test-id": `${columnIndex}-${itemName}` }}
      {...rest}
      variableType={toDataPickerPreviewVariant(variableType)}
      icon={{
        render: ({ className }) => (
          <Icon
            icon={icon ?? variableTypeToIcon(variableType)}
            size={16}
            className={cn("dimfg", className)}
            aria-hidden
          />
        ),
      }}
      itemName={itemName}
      previewValue={previewValue ?? null}
      hasLink={onJumpToSource ? "hasLink" : undefined}
      link={{
        onClick: (e) => {
          e.stopPropagation();
          onJumpToSource?.();
        },
      }}
      play={{
        onClick: (e) => {
          e.stopPropagation();
          const vc = studioCtx.focusedViewCtx();
          const tpl = vc?.focusedTpls()?.[0];
          if (!vc || !tpl || !isTplTagOrComponent(tpl) || !interaction) {
            return;
          }
          if (!canRunInteraction(interaction, vc)) {
            notification.error({
              message: BLOCKED_RUN_INTERACTION_MESSAGE,
            });
            return;
          }
          runInteraction(interaction, vc, tpl);
        },
      }}
    />
  );
}

const DataPickerColumnItem = observer(React.forwardRef(DataPickerColumnItem_));
export default DataPickerColumnItem;
