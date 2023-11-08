import { SwitchRef } from "@plasmicapp/react-web";
import { Tooltip } from "antd";
import classNames from "classnames";
import * as React from "react";
import { combineProps } from "../../../commons/components/ReactUtil";
import {
  DefaultStyleSwitchProps,
  PlasmicStyleSwitch,
} from "../../plasmic/plasmic_kit_style_controls/PlasmicStyleSwitch";
import { ValueSetState } from "../sidebar/sidebar-helpers";

interface StyleSwitchProps extends DefaultStyleSwitchProps {
  valueSetState?: ValueSetState;
  tooltip?: React.ReactNode | (() => React.ReactNode);
  disabledTooltip?: React.ReactNode | (() => React.ReactNode);
  "data-plasmic-prop"?: string;
}

function StyleSwitch_(
  { className, ...props }: StyleSwitchProps,
  ref: SwitchRef
) {
  const { tooltip, disabledTooltip, isDisabled } = props;
  const { plasmicProps } = PlasmicStyleSwitch.useBehavior<StyleSwitchProps>(
    combineProps(props, {
      "data-plasmic-prop": undefined,
    }),
    ref
  );

  plasmicProps.variants.valueSetState = undefined;
  let content = (
    <PlasmicStyleSwitch
      {...plasmicProps}
      root={{
        style: undefined,
        "data-plasmic-prop": props["data-plasmic-prop"],
      }}
    />
  );
  if (isDisabled && disabledTooltip) {
    content = <Tooltip title={disabledTooltip}>{content}</Tooltip>;
  } else if (tooltip) {
    content = <Tooltip title={tooltip}>{content}</Tooltip>;
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

const StyleSwitch = React.forwardRef(StyleSwitch_);

export default Object.assign(StyleSwitch, {
  __plumeType: "switch",
});
