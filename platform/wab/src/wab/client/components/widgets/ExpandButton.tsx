import {
  DefaultExpandButtonProps,
  PlasmicExpandButton,
} from "@/wab/client/plasmic/plasmic_kit_design_system/PlasmicExpandButton";
import * as React from "react";

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
