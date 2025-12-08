import { ValueSetState } from "@/wab/client/components/sidebar/sidebar-helpers";
import Option from "@/wab/client/components/style-controls/StyleSelect__Option";
import OptionGroup from "@/wab/client/components/style-controls/StyleSelect__OptionGroup";
import {
  DefaultStyleSelectProps,
  PlasmicStyleSelect,
} from "@/wab/client/plasmic/plasmic_kit_style_controls/PlasmicStyleSelect";
import { SelectRef } from "@plasmicapp/react-web";
import { Tooltip } from "antd";
import * as React from "react";

interface StyleSelectProps extends DefaultStyleSelectProps {
  valueSetState?: ValueSetState;
  disabledTooltip?: React.ReactNode | (() => React.ReactNode);
}

function StyleSelect_(props: StyleSelectProps, ref: SelectRef) {
  const { plasmicProps } = PlasmicStyleSelect.useBehavior(props, ref);
  return (
    <PlasmicStyleSelect
      {...plasmicProps}
      // We need to add `pointer-events: none` to select when the tooltip
      // is shown because otherwise the tooltip gets stuck. For more
      // information, see: https://app.shortcut.com/plasmic/story/24111/
      // and https://github.com/ant-design/ant-design/issues/9581.
      {...(props.isDisabled && props.disabledTooltip
        ? { style: { pointerEvents: "none" } }
        : {})}
      root={{
        wrap: (elt) =>
          props.isDisabled && props.disabledTooltip ? (
            <Tooltip title={props.disabledTooltip}>{elt}</Tooltip>
          ) : (
            elt
          ),
      }}
    />
  );
}

const StyleSelect = React.forwardRef(StyleSelect_);

export default Object.assign(StyleSelect, {
  Option,
  OptionGroup,
  __plumeType: "select",
});
