import { PinInputFieldProps, PinInputProps } from "@chakra-ui/react";
import { ComponentMeta } from "@plasmicapp/host/registerComponent";
import {
  getComponentNameAndImportMeta,
  getPlasmicComponentName,
} from "./utils";

export const pinInputMeta: ComponentMeta<PinInputProps> = {
  ...getComponentNameAndImportMeta("PinInput"),
  props: {
    size: {
      type: "choice",
      options: ["xl", "sm", "md", "lg"],
    },
    type: {
      type: "choice",
      options: ["number", "alphanumeric"],
    },
    variant: {
      type: "choice",
      options: ["outline", "filled", "flushed", "unstyled"],
    },
    mask: {
      type: "boolean",
      description:
        "Whether the pin input's value should be masked like 'type=password'.",
    },
    manageFocus: {
      type: "boolean",
      defaultValue: true,
      description:
        "Whether the pin input should move automatically to the next input once filled.",
    },
    autoFocus: {
      type: "boolean",
      description: "Whether the pin input should be focused on mount.",
    },
    opt: {
      type: "boolean",
      description: "autocomplete='one-time-code'",
    },
    errorBorderColor: {
      type: "string",
      defaultValue: "red.500",
    },
    focusBorderColor: {
      type: "string",
      defaultValue: "blue.500",
    },
    isDisabled: {
      type: "boolean",
    },
    isInvalid: {
      type: "boolean",
    },

    children: {
      type: "slot",
      allowedComponents: [getPlasmicComponentName("PinInputField")],
      defaultValue: [
        {
          type: "component",
          name: getPlasmicComponentName("PinInputField"),
        },
        {
          type: "component",
          name: getPlasmicComponentName("PinInputField"),
        },
        {
          type: "component",
          name: getPlasmicComponentName("PinInputField"),
        },
        {
          type: "component",
          name: getPlasmicComponentName("PinInputField"),
        },
      ],
    },
  },
};

export const pinInputFieldMeta: ComponentMeta<PinInputFieldProps> = {
  ...getComponentNameAndImportMeta("PinInputField", "PinInput"),
  props: {},
};
