import { registerComponent } from "@plasmicapp/host";
import DisplayProps from "./DisplayProps";

interface BooleanPropTypeProps {
  booleanProp: boolean;
}

export function BooleanPropType(props: BooleanPropTypeProps) {
  return <DisplayProps {...props} />;
}

export function registerBooleanPropType() {
  registerComponent(BooleanPropType, {
    name: "test-boolean-prop-type",
    displayName: "Boolean Prop Type",
    props: {
      booleanProp: "boolean",
    },
    importName: "BooleanPropType",
    importPath: "../code-components/BooleanPropType",
  });
}
