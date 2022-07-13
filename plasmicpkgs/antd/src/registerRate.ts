import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import Rate, { RateProps } from "antd/lib/rate"
import { Registerable } from "./registerable";


export const rateMeta: ComponentMeta<RateProps> = { 
name: "AntdRate",
displayName: "Antd Rate",
props: {
    allowClear: {
        type: "boolean",
        description: "Whether to allow clear when click again",
        defaultValueHint: true
    },
    allowHalf: {
        type: "boolean",
        description: "Whether to allow semi selection",
        defaultValueHint: false
    },
    autoFocus: {
        type: "boolean",
        description: "If get focus when component mounted",
        defaultValueHint: false
    },
    count: {
        type: "number",
        description: "Star count"
    },
  
    disabled: {
        type: "boolean",
        description: "If read only, unable to interact",
        defaultValueHint: false
    },
    tooltips: {
        type: "array",
        description: "Customize tooltip by each character",
    },
    value: {
        type: "number",
        description: "The default value",
        editOnly: true,
        uncontrolledProp: "defaultValue",
        defaultValueHint: 0
      },
},
  importPath: "antd/lib/rate",
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
