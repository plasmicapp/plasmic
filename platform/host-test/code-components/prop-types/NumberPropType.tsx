import React from "react";
import { registerComponent } from "@plasmicapp/host";
import DisplayProps from "./DisplayProps";

interface NumberPropTypeProps {
  number: number;
  numberWithMinAndMax: number;
  sliderNumber: number;
}

export function NumberPropType(props: NumberPropTypeProps) {
  return <DisplayProps {...props} />;
}

export function registerNumberPropType() {
  registerComponent(NumberPropType, {
    name: "test-number-prop-type",
    displayName: "Number Prop Type",
    props: {
      number: {
        type: "number",
        defaultValue: 5,
      },
      numberWithMinAndMax: {
        type: "number",
        min: 10,
        max: 100,
      },
      sliderNumber: {
        type: "number",
        control: "slider",
        min: 10,
        max: 100,
        step: 5,
      },
    },
    importName: "NumberPropType",
    importPath: "../code-components/NumberPropType",
  });
}
