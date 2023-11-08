import { ButtonGroupProps } from "@react-awesome-query-builder/antd";
import React from "react";

type Props = React.Attributes & ButtonGroupProps;

export function RowActionsGroup(props: Props) {
  return <>{props.children}</>;
}
