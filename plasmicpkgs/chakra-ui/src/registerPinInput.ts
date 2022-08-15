import registerComponent, {
    ComponentMeta,
  } from "@plasmicapp/host/registerComponent";
  import { PinInput, PinInputProps,PinInputField, PinInputFieldProps } from "@chakra-ui/react";
  import { Registerable } from "./registerable";

export const pinInputMeta: ComponentMeta<PinInputProps>={
  name: "PinInput",
  importPath: "@chakra-ui/react",
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
      allowedComponents: ["PintInputField"],
      defaultValue: [
        {
          type: "component",
          name: "PinInputField",
        },
        {
          type: "component",
          name: "PinInputField",
        },
        {
          type: "component",
          name: "PinInputField",
        },
        {
          type: "component",
          name: "PinInputField",
        },
      ],
    },
  },
};

  export function registerPinInput(loader?: Registerable,  customPinInputMeta?: ComponentMeta<PinInputProps>
    ) {
    const doRegisterComponent: typeof registerComponent = (...args) =>
      loader ? loader.registerComponent(...args) : registerComponent(...args);
      doRegisterComponent(PinInput, customPinInputMeta ?? pinInputMeta);
  }


export const pinInputFieldMeta: ComponentMeta<PinInputFieldProps>={
  name: "PinInputField",
  importPath: "@chakra-ui/react",
  parentComponentName: "PinInput",
  props: {},
};

  export function registerPinInputField(loader?: Registerable,  customPinInputFieldMeta?: ComponentMeta<PinInputFieldProps>
    ) {
    const doRegisterComponent: typeof registerComponent = (...args) =>
      loader ? loader.registerComponent(...args) : registerComponent(...args);
      doRegisterComponent(PinInputField, customPinInputFieldMeta ?? pinInputFieldMeta);
  }
  