import React from "react";
import { registerComponent } from "@plasmicapp/host";
import DisplayProps from "./DisplayProps";

interface CodePropTypeProps {
  codeProp: string;
  htmlCodeProp: string;
}

export function CodePropType(props: CodePropTypeProps) {
  return <DisplayProps {...props} />;
}

export function registerCodePropType() {
  registerComponent(CodePropType, {
    name: "test-code-prop-type",
    displayName: "Code Prop Type",
    props: {
      codeProp: {
        type: "code",
        lang: "json",
        defaultValue: "{a: 1, b: 2}",
      },
      htmlCodeProp: {
        type: "code",
        lang: "html",
        defaultValue: "<h1>Hello</h1>",
      },
    },
    importName: "CodePropType",
    importPath: "../code-components/CodePropType",
  });
}
