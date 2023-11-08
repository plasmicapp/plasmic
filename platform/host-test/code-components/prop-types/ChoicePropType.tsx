import React from "react";
import { registerComponent } from "@plasmicapp/host";
import DisplayProps from "./DisplayProps";

interface ChoicePropTypeProps {
  choiceProp: string;
  multiSelect: string;
  choicePropWithSearch: string;
  dependentChoiceProp: string;
}

export function ChoicePropType(props: ChoicePropTypeProps) {
  return <DisplayProps {...props} />;
}

export function registerChoicePropType() {
  registerComponent(ChoicePropType, {
    name: "test-choice-prop-type",
    displayName: "Choice Prop Type",
    props: {
      choiceProp: {
        type: "choice",
        options: ["a", "b", "c"],
      },
      multiSelect: {
        type: "choice",
        options: ["a", "b", "c"],
        multiSelect: true,
      },
      choicePropWithSearch: {
        type: "choice",
        options: ["foo", "bar", "baz"],
        allowSearch: true,
        filterOption: true,
      },
      dependentChoiceProp: {
        type: "choice",
        options: (props) => [0, 1, 2].map((x) => `${props.choiceProp}${x}`),
        hidden: (props) => !props.choiceProp,
      },
    },
    importName: "ChoicePropType",
    importPath: "../code-components/ChoicePropType",
  });
}
