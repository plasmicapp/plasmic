import Button from "antd/es/button";
import { Registerable, registerComponentHelper } from "./utils";

export const AntdButton = Button;

export function registerButton(loader?: Registerable) {
  registerComponentHelper(loader, AntdButton, {
    name: "plasmic-antd5-button",
    displayName: "Button",
    props: {
      type: {
        type: "choice",
        options: ["default", "primary", "ghost", "dashed", "link", "text"],
        description:
          "Can be set to primary, ghost, dashed, link, text, default",
        defaultValueHint: "default",
      },
      size: {
        type: "choice",
        options: ["small", "medium", "large"],
        description: "Set the size of button",
        defaultValueHint: "medium",
      },
      shape: {
        type: "choice",
        options: ["default", "circle", "round"],
        description: "Can be set button shape",
        defaultValueHint: "default",
      },
      disabled: {
        type: "boolean",
        description: "Disabled state of button",
        defaultValueHint: false,
      },
      ghost: {
        type: "boolean",
        description:
          "Make background transparent and invert text and border colors",
        defaultValueHint: false,
      },
      danger: {
        type: "boolean",
        description: "Set the danger status of button",
        defaultValueHint: false,
      },
      loading: {
        type: "boolean",
        description: "Set the loading status of button",
        defaultValueHint: false,
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
        hidden: (props) => !props.href,
        defaultValueHint: "_self",
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
      icon: {
        type: "slot",
        hidePlaceholder: true,
        hidden: () => true,
      },
      onClick: {
        type: "eventHandler",
        argTypes: [],
      },
    },
    importPath: "@plasmicpkgs/antd5/skinny/registerButton",
    importName: "AntdButton",
  });
}
