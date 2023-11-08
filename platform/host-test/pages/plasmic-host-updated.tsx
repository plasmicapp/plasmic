import { PlasmicCanvasHost, registerComponent } from "@plasmicapp/host";
import { Badge } from "../code-components/Badge";

registerComponent(Badge, {
  name: "Badge",
  displayName: "Badge",
  importName: "Badge",
  props: {
    name: {
      type: "string",
      defaultValue: "Plasmician",
    },
    year: {
      type: "choice",
      options: Array.from(Array(5).keys()).map((v) => ({
        // 2019 to 2024
        label: `${2019 + v}`,
        value: 2019 + v,
      })),
      defaultValueHint: "2022",
    },
    onClicksChange: {
      type: "eventHandler",
      argTypes: [{ name: "clicks", type: "number" }],
    },
  },
  states: {
    clicks: {
      type: "readonly",
      variableType: "number",
      initVal: 0,
      onChangeProp: "onClicksChange",
    },
  },
  importPath: "./pages/plasmic-host",
  classNameProp: "containerClassName",
  defaultStyles: {
    width: "150px",
    height: "200px",
  },
});

export default function Host() {
  return <PlasmicCanvasHost />;
}
