import { InfoTooltip } from "@/wab/client/components/widgets/InfoTooltip";
import React, { ReactNode } from "react";

export function LabelWithDetailedTooltip(props: {
  tooltip: ReactNode | (() => React.ReactNode);
  children: ReactNode;
}) {
  return (
    <div className={"flex flex-vcenter"}>
      {props.children}
      <div className={"ml-xsm inline-block"}>
        <InfoTooltip tooltip={props.tooltip} />
      </div>
    </div>
  );
}
