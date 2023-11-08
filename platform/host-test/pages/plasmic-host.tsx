import { PlasmicCanvasHost, registerComponent } from "@plasmicapp/host";
import { Badge } from "../code-components/Badge";
import { registerAllPropTypes } from "../code-components/prop-types";

registerComponent(Badge, {
  name: "Badge",
  displayName: "Badge",
  importName: "Badge",
  props: {
    name: {
      type: "string",
      defaultValue: "Plasmic",
    },
    year: {
      type: "number",
      defaultValueHint: 2022,
    },
    clicks: "number",
  },
  importPath: "../code-components/Badge",
  classNameProp: "containerClassName",
  defaultStyles: {
    width: "150px",
    height: "200px",
  },
});

registerAllPropTypes();

export default function Host() {
  return <PlasmicCanvasHost />;
}
