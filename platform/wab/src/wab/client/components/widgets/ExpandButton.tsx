import * as React from "react";
import {
  DefaultExpandButtonProps,
  PlasmicExpandButton,
} from "../../plasmic/plasmic_kit_design_system/PlasmicExpandButton";

interface ExpandButtonProps extends DefaultExpandButtonProps {
  onClick?: () => void;
}

function ExpandButton(props: ExpandButtonProps) {
  const { onClick, ...rest } = props;
  return (
    <PlasmicExpandButton
      {...rest}
      onClick={onClick}
      {...({
        "data-test-state": props.isExpanded ? "expanded" : "collapsed",
      } as any)}
    />
  );
}

export default ExpandButton;
