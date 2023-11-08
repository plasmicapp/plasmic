import React from "react";
import { registerComponent } from "@plasmicapp/host";
import DisplayProps from "./DisplayProps";

interface StringPropTypeProps {
  stringProp: string;
  largeStringProp: string;
}

export function StringPropType(props: StringPropTypeProps) {
  return <DisplayProps {...props} />;
}

export function registerStringPropType() {
  registerComponent(StringPropType, {
    name: "test-sring-prop-type",
    displayName: "String Prop Type",
    props: {
      stringProp: {
        type: "string",
        defaultValue: "hello",
        helpText: "String Prop",
      },
      largeStringProp: {
        type: "string",
        defaultValue: "hello",
        control: "large",
      },
    },
    importName: "StringPropType",
    importPath: "../code-components/StringPropType",
  });
}
