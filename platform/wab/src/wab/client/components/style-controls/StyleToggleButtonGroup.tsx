import { ValueSetState } from "@/wab/client/components/sidebar/sidebar-helpers";
import StyleToggleButton from "@/wab/client/components/style-controls/StyleToggleButton";
import {
  DefaultStyleToggleButtonGroupProps,
  PlasmicStyleToggleButtonGroup,
} from "@/wab/client/plasmic/plasmic_kit_style_controls/PlasmicStyleToggleButtonGroup";
import { Tooltip } from "antd";
import * as React from "react";
import flattenChildren from "react-keyed-flatten-children";

interface StyleToggleButtonGroupProps
  extends DefaultStyleToggleButtonGroupProps {
  value?: string;
  onChange?: (value: string) => void;
  valueSetState?: ValueSetState;
  isDisabled?: boolean;
  disabledTooltip?: React.ReactNode | (() => React.ReactNode);
}

function StyleToggleButtonGroup(props: StyleToggleButtonGroupProps) {
  const {
    value,
    onChange,
    valueSetState,
    children,
    isDisabled,
    disabledTooltip,
    ...rest
  } = props;
  const newChildren = flattenChildren(props.children).map((child) => {
    if (!React.isValidElement(child) || child.type !== StyleToggleButton) {
      throw new Error(
        `Can only have instances of StyleToggleButton as children to StyleToggleButtonGroup`
      );
    }

    const childValue = child.props.value;
    if (!childValue) {
      throw new Error(
        `Ever StyleToggleButton in the Group must have a valid value`
      );
    }

    return React.cloneElement(child, {
      valueSetState:
        childValue === value ? valueSetState ?? "isSet" : "isUnset",
      onClick: () => {
        onChange && onChange(childValue);
      },
      ...(isDisabled !== undefined ? { isDisabled } : {}),
    });
  });
  return (
    <PlasmicStyleToggleButtonGroup
      {...rest}
      children={newChildren}
      root={{
        wrap: (x) =>
          disabledTooltip && isDisabled ? (
            <Tooltip title={disabledTooltip}>{x}</Tooltip>
          ) : (
            x
          ),
      }}
    />
  );
}

export default StyleToggleButtonGroup;
