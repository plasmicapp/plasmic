import { Tooltip } from "antd";
import * as React from "react";
import { ReactNode } from "react";
import MarkFullColorIcon from "../../plasmic/plasmic_kit_design_system/PlasmicIcon__MarkFullColor";
import { Icon } from "../widgets/Icon";
import { PageFooter } from "./PageFooter";

export function IntakeFlowForm(props: { children: ReactNode }) {
  return (
    <div className={"LoginForm__Container"}>
      <div className={"LoginForm__Content"}>
        <div className={"LoginForm__Logo"}>
          <Tooltip title="Plasmic">
            <Icon icon={MarkFullColorIcon} style={{ width: 128, height: 64 }} />
          </Tooltip>
        </div>
        {props.children}
        <PageFooter />
      </div>
    </div>
  );
}
