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
        defaultValue: true
    },
    allowHalf: {
        type: "boolean",
        description: "Whether to allow semi selection",
        defaultValueHint: false
    },
    autoFocus: {
        type: "boolean",
        description: "If get focus when component mounted",
        default: false
    },
    count: {
        type: "number",
        description: "Star count"
    },
    className: {
        type: "string",
        description: "The custom class name of rate"
    },
    defaultValue: {
        type: "number",
        description: "The default value",
        default: 0
    },
    disabled: {
        type: "boolean",
        description: "If read only, unable to interact",
        default: false
    },
    tooltips: {
        type: "array",
        description: "Customize tooltip by each character",
    },
    value: {
        type: "number",
        description: "The current value",
    },
},
importPath: "antd",
importName: "Rate",
};

export function registerRate(
  loader?: Registerable,
  customRateMeta?: ComponentMeta<RateProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(Rate, customRateMeta ?? rateMeta);
}
