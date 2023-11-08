import { CheckboxRef } from "@plasmicapp/react-web";
import { Tooltip } from "antd";
import * as React from "react";
import { combineProps } from "../../../commons/components/ReactUtil";
import {
  DefaultStyleCheckboxProps,
  PlasmicStyleCheckbox,
} from "../../plasmic/plasmic_kit_style_controls/PlasmicStyleCheckbox";
import { ValueSetState } from "../sidebar/sidebar-helpers";

interface StyleCheckboxProps extends DefaultStyleCheckboxProps {
  valueSetState?: ValueSetState;
  tooltip?: React.ReactNode | (() => React.ReactNode);
  disabledTooltip?: React.ReactNode | (() => React.ReactNode);
  "data-plasmic-prop"?: string;
}

function StyleCheckbox_(props: StyleCheckboxProps, ref: CheckboxRef) {
  const { tooltip, disabledTooltip, isDisabled } = props;
  const { plasmicProps } = PlasmicStyleCheckbox.useBehavior<StyleCheckboxProps>(
    combineProps(props, {
      "data-plasmic-prop": undefined,
    }),
    ref
  );

  // Always offset StyleCheckbox by marginLeft of -8px, so that it offsets
  // the padding for the checkbox button and can line up with the rest
  // of the content
  let content = (
    <PlasmicStyleCheckbox
      root={{
        style: undefined,
        "data-plasmic-prop": props["data-plasmic-prop"],
      }}
      {...plasmicProps}
    />
  );
  if (isDisabled && disabledTooltip) {
    content = <Tooltip title={disabledTooltip}>{content}</Tooltip>;
  } else if (tooltip) {
    content = <Tooltip title={tooltip}>{content}</Tooltip>;
  }
  return content;
}

const StyleCheckbox = React.forwardRef(StyleCheckbox_) as (
  props: StyleCheckboxProps & { ref?: CheckboxRef }
) => React.ReactElement | null;

export default Object.assign(StyleCheckbox, {
  __plumeType: "checkbox",
});
