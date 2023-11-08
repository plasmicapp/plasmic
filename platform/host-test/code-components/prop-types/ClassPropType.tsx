import { registerComponent } from "@plasmicapp/host";
import DisplayProps from "./DisplayProps";

interface ClassPropTypeProps {
  classProp: string;
  className: string;
}

export function ClassPropType(props: ClassPropTypeProps) {
  return (
    <div className={props.className}>
      <DisplayProps {...props} className={props.classProp} />
    </div>
  );
}

export function registerClassPropType() {
  registerComponent(ClassPropType, {
    name: "test-class-prop-type",
    displayName: "Class Prop Type",
    props: {
      classProp: {
        type: "class",
      },
    },
    importName: "ClassPropType",
    importPath: "../code-components/ClassPropType",
  });
}
