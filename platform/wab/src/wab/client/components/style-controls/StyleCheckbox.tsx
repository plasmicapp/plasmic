import { ValueSetState } from "@/wab/client/components/sidebar/sidebar-helpers";
import {
  DefaultStyleCheckboxProps,
  PlasmicStyleCheckbox,
} from "@/wab/client/plasmic/plasmic_kit_style_controls/PlasmicStyleCheckbox";
import { combineProps } from "@/wab/commons/components/ReactUtil";
import { CheckboxRef } from "@plasmicapp/react-web";
import { Tooltip } from "antd";
import * as React from "react";

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
