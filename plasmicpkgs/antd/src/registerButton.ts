import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { Button, ButtonProps } from "antd";
import { Registerable } from "./registerable";

export const buttonMeta: ComponentMeta<ButtonProps> = {
  name: "AntdButton",
  displayName: "Antd Button",
  props: {
    type: {
      type: "choice",
      options: ["default", "primary", "ghost", "dashed", "link", "text"],
      description: "Can be set to primary, ghost, dashed, link, text, default",
    },
    size: {
      type: "choice",
      options: ["small", "medium", "large"],
      description: "Set the size of button",
    },
    shape: {
      type: "choice",
      options: ["default", "circle", "round"],
      description: "Can be set button shape",
    },
    disabled: {
      type: "boolean",
      description: "Disabled state of button",
    },
    ghost: {
      type: "boolean",
      description:
        "Make background transparent and invert text and border colors",
    },
    danger: {
      type: "boolean",
      description: "Set the danger status of button",
    },
    block: {
      type: "boolean",
      description: "Option to fit button width to its parent width",
    },
    loading: {
      type: "boolean",
      description: "Set the loading status of button",
    },
    href: {
      type: "string",
      description: "Redirect url of link button",
    },
    target: {
      type: "choice",
      options: ["_blank", "_self", "_parent", "_top"],
      description:
        "Same as target attribute of a, works when href is specified",
    },
    children: {
      type: "slot",
      defaultValue: [
        {
          type: "text",
          value: "Button",
        },
      ],
    },
  },
  importPath: "antd",
  importName: "Button",
};

export function registerButton(
  loader?: Registerable,
  customButtonMeta?: ComponentMeta<ButtonProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(Button, customButtonMeta ?? buttonMeta);
}
