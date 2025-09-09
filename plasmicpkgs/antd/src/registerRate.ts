import registerComponent, {
  CodeComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { Rate as AntdRate } from "antd";
import type { RateProps } from "antd/es/rate";
import { Registerable } from "./registerable";
export const Rate = AntdRate;

export const rateMeta: CodeComponentMeta<RateProps> = {
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
      defaultValueHint: 0,
    },
    onChange: {
      type: "eventHandler",
      argTypes: [
        {
          name: "value",
          type: "number",
        },
      ],
    },
    character: {
      type: "slot",
      hidePlaceholder: true,
    },
  },
  states: {
    value: {
      type: "writable",
      variableType: "text",
      onChangeProp: "onChange",
      valueProp: "value",
    },
  },
  importPath: "@plasmicpkgs/antd/skinny/registerRate",
  importName: "Rate",
};

export function registerRate(
  loader?: Registerable,
  customRateMeta?: CodeComponentMeta<RateProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(Rate, customRateMeta ?? rateMeta);
}
