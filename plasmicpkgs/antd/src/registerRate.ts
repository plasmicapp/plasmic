import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import Rate, { RateProps } from "antd/es/rate";
import { Registerable } from "./registerable";

export const rateMeta: ComponentMeta<RateProps> = {
  name: "AntdRate",
  displayName: "Antd Rate",
  props: {
    allowClear: {
      type: "boolean",
      description: "Whether to allow clear when clicking again",
      defaultValueHint: true,
    },
    allowHalf: {
      type: "boolean",
      description: "Whether to allow semi selection",
      defaultValueHint: false,
    },
    autoFocus: {
      type: "boolean",
      description: "If componet is focused when mounted",
      defaultValueHint: false,
    },
    count: {
      type: "number",
      description: "Star count",
    },
    disabled: {
      type: "boolean",
      description: "Disabled state of component",
      defaultValueHint: false,
    },
    tooltips: {
      type: "array",
      description: "Array to customize tooltip for each icon",
    },
    value: {
      type: "number",
      description: "The default value",
      editOnly: true,
      uncontrolledProp: "defaultValue",
      defaultValueHint: 0,
    },
    character: {
      type: "slot",
      hidePlaceholder: true,
    },
  },
  importPath: "antd/es/rate",
  importName: "Rate",
  isDefaultExport: true,
};

export function registerRate(
  loader?: Registerable,
  customRateMeta?: ComponentMeta<RateProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(Rate, customRateMeta ?? rateMeta);
}
