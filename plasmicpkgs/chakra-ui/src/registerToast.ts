import { ToastProps } from "@chakra-ui/react";
import { ComponentMeta } from "@plasmicapp/host/registerComponent";
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
