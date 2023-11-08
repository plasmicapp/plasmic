import React from "react";
import { registerComponent } from "@plasmicapp/host";
import DisplayProps from "./DisplayProps";

interface ColorPropTypeProps {
  color: string;
}

export function ColorPropType(props: ColorPropTypeProps) {
  return <DisplayProps {...props} />;
}

export function registerColorPropType() {
  registerComponent(ColorPropType, {
    name: "test-color-prop-type",
    displayName: "Color Prop Type",
    props: {
      color: {
        type: "color",
        defaultValue: "#000000",
      },
    },
    importName: "ColorPropType",
    importPath: "../code-components/ColorPropType",
  });
}
