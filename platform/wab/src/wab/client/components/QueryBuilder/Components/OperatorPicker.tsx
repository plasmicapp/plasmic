import { FieldProps } from "@react-awesome-query-builder/antd";
import React from "react";
import { SelectInput } from "./SelectInput";

type Props = React.Attributes & FieldProps;

export function OperatorPicker(props: Props) {
  return (
    <SelectInput
      items={props.items}
      value={props.selectedKey ?? undefined}
      onValueChanged={(value) => props.setField(value)}
    />
  );
}
