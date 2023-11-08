import React from "react";
import { registerComponent } from "@plasmicapp/host";
import DisplayProps from "./DisplayProps";

interface CustomPropTypeProps {
  customProp: boolean;
}

export function CustomPropType(props: CustomPropTypeProps) {
  return <DisplayProps {...props} />;
}

// A prop control with the value and a button to update it
const CustomProp = ({ updateValue, value }) => (
  <div
    style={{
      width: "100%",
      display: "flex",
      justifyContent: "space-between",
      padding: "0px 10px 0px 10px",
    }}
  >
    <span>Value: {`${value}`}.</span>
    <button
      onClick={() => updateValue(!value)}
      style={{ background: "lightgray", padding: "0px 5px 0px 5px" }}
    >
      Change
    </button>
  </div>
);

export function registerCustomPropType() {
  registerComponent(CustomPropType, {
    name: "test-custom-prop-type",
    displayName: "Custom Prop Type",
    props: {
      customProp: {
        type: "custom",
        control: CustomProp,
        defaultValue: false,
      },
    },
    importName: "CustomPropType",
    importPath: "../code-components/CustomPropType",
  });
}
