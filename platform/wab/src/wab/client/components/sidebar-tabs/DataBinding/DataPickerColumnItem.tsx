import {
  DefaultDataPickerColumnItemProps,
  PlasmicDataPickerColumnItem,
} from "@/wab/client/plasmic/plasmic_kit_data_binding/PlasmicDataPickerColumnItem";
import {
  canRunInteraction,
  runInteraction,
} from "@/wab/client/state-management/preview-steps";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { Interaction } from "@/wab/shared/model/classes";
import { isTplTagOrComponent } from "@/wab/shared/core/tpls";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import { notification } from "antd";
import * as React from "react";
import { BLOCKED_RUN_INTERACTION_MESSAGE } from "@/wab/client/state-management/interactions-meta";

export interface DataPickerColumnItemProps
  extends DefaultDataPickerColumnItemProps {
  onClick: () => void;
  itemName?: string;
  previewValue?: string;
  columnIndex?: number;
  interaction?: Interaction;
}

function DataPickerColumnItem_(
  props: DataPickerColumnItemProps,
  ref: HTMLElementRefOf<"div">
) {
  const { columnIndex, previewValue, itemName, interaction, ...rest } = props;
  const studioCtx = useStudioCtx();
  return (
    <PlasmicDataPickerColumnItem
      root={{ ref, "data-test-id": `${columnIndex}-${itemName}` }}
      {...rest}
      itemName={itemName}
      previewValue={previewValue ?? null}
      play={{
        onClick: () => {
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

const DataPickerColumnItem = React.forwardRef(DataPickerColumnItem_);
export default DataPickerColumnItem;
