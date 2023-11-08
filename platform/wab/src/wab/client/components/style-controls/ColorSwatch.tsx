import { Tooltip } from "antd";
import React from "react";
import PlasmicColorSwatch from "../../plasmic/plasmic_kit_style_controls/PlasmicColorSwatch";

export function ColorSwatch(props: {
  color?: string;
  isSelected?: boolean;
  tooltip?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { color, isSelected, tooltip, className, style } = props;
  let content = (
    <PlasmicColorSwatch
      root={{ className, style }}
      color={{
        style: {
          backgroundColor: color,
        },
      }}
      isSelected={isSelected}
    />
  );

  if (tooltip) {
    content = <Tooltip title={tooltip}>{content}</Tooltip>;
  }
  return content;
}

export default ColorSwatch;
