import React from "react";
import { registerComponent } from "@plasmicapp/host";
import DisplayProps from "./DisplayProps";

function RefAction1(props: {}) {
  return <DisplayProps {...props} />;
}

function registerRefAction1() {
  registerComponent(RefAction1, {
    name: "test-ref-action-1-prop-type",
    displayName: "RefActions1 Prop Type",
    props: {},
    refActions: {},
    importName: "RefAction1",
    importPath: "../code-components/RefAction1",
  });
}

function RefAction2(props: {}) {
  return <DisplayProps {...props} />;
}

function registerRefAction2() {
  registerComponent(RefAction2, {
    name: "test-ref-action-2-prop-type",
    displayName: "RefActions2 Prop Type",
    props: {},
    refActions: {},
    importName: "RefAction2",
    importPath: "../code-components/RefAction2",
  });
}

export function registerTplPropType() {
  registerRefAction1();
  registerRefAction2();
}
