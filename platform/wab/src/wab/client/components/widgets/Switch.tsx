import {
  DefaultSwitchProps,
  PlasmicSwitch,
} from "@/wab/client/plasmic/plasmic_kit_design_system/PlasmicSwitch";
import { SwitchRef } from "@plasmicapp/react-web";
import { Tooltip } from "antd";
import classNames from "classnames";
import * as React from "react";

export interface SwitchProps extends DefaultSwitchProps {
  disabledTooltip?: React.ReactNode;
  tooltip?: React.ReactNode;
  "data-test-id"?: string;
}

function Switch_({ className, ...props }: SwitchProps, ref: SwitchRef) {
  const { plasmicProps } = PlasmicSwitch.useBehavior<SwitchProps>(
    {
      ...props,
      // Explicitly set null children
      children: props.children ?? null,
    },
    ref
  );

  let content = <PlasmicSwitch {...plasmicProps} />;
  if (props.isDisabled && props.disabledTooltip) {
    content = <Tooltip title={props.disabledTooltip}>{content}</Tooltip>;
  } else if (props.tooltip) {
    content = <Tooltip title={props.tooltip}>{content}</Tooltip>;
  }
  return (
    <div
      className={classNames(
        className,
        "baseline-friendly-centered-block-container"
      )}
    >
      {content}
    </div>
  );
}

export const Switch = React.forwardRef(Switch_);

export default Object.assign(Switch, {
  __plumeType: "switch",
});
