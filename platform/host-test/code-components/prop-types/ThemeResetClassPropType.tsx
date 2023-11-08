import React from "react";
import { registerComponent } from "@plasmicapp/host";
import DisplayProps from "./DisplayProps";

interface ThemeResetClassPropTypeProps {
  themeResetClassProp: string;
}

export function ThemeResetClassPropType(props: ThemeResetClassPropTypeProps) {
  return <DisplayProps {...props} />;
}

export function registerThemeResetClassPropType() {
  registerComponent(ThemeResetClassPropType, {
    name: "test-theme-reset-class-prop-type",
    displayName: "Theme Reset Class Prop Type",
    props: {
      themeResetClassProp: {
        type: "themeResetClass",
      },
    },
    importName: "ThemeResetClassPropType",
    importPath: "../code-components/ThemeResetClassPropType",
  });
}
