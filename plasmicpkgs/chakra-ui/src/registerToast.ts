import { Toast, ToastProps } from "@chakra-ui/react";
import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { Registerable } from "./registerable";
import { getComponentNameAndImportMeta } from "./utils";

export const toastMeta: ComponentMeta<ToastProps> = {
  ...getComponentNameAndImportMeta("Toast"),
  props: {
    title: {
      type: "string",
      defaultValue: "Toast Title",
    },
    description: {
      type: "string",
      defaultValue: "Toast description",
    },
    variant: {
      type: "choice",
      options: ["solid", "subtle", "left-accent", "top-accent"],
    },
    duration: {
      type: "number",
      defaultValue: 5000,
    },
    isClosable: {
      type: "boolean",
    },
    position: {
      type: "choice",
      options: [
        "top",
        "top-right",
        "top-left",
        "bottom",
        "bottom-right",
        "bottom-left",
      ],
    },
    status: {
      type: "choice",
      options: ["info", "success", "warning", "error", "loading"],
    },
  },
};

export function registerToast(
  loader?: Registerable,
  customToastMeta?: ComponentMeta<ToastProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(Toast, customToastMeta ?? toastMeta);
}
