import { registerComponent } from "@plasmicapp/host";
import DisplayProps from "./DisplayProps";

interface RichTextPropTypeProps {
  richText: string;
}

export function RichTextPropType(props: RichTextPropTypeProps) {
  return <DisplayProps {...props} />;
}

export function registerRichTextPropType() {
  registerComponent(RichTextPropType, {
    name: "test-rich-text-prop-type",
    displayName: "Rich Text Prop Type",
    props: {
      richText: {
        type: "richText",
      },
    },
    importName: "RichTextPropType",
    importPath: "../code-components/RichTextPropType",
  });
}
