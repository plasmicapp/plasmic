import {
  DefaultDataPickerSelectedItemProps,
  PlasmicDataPickerSelectedItem,
} from "@/wab/client/plasmic/plasmic_kit_data_binding/PlasmicDataPickerSelectedItem";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import * as React from "react";

export interface DataPickerSelectedItemProps
  extends DefaultDataPickerSelectedItemProps {
  onClick: () => void;
  itemName?: string;
}

function DataPickerSelectedItem_(
  props: DataPickerSelectedItemProps,
  ref: HTMLElementRefOf<"div">
) {
  return <PlasmicDataPickerSelectedItem root={{ ref }} {...props} />;
}

const DataPickerSelectedItem = React.forwardRef(DataPickerSelectedItem_);
export default DataPickerSelectedItem;
