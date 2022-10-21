import {
  NumberDecrementStepper,
  NumberDecrementStepperProps,
  NumberIncrementStepper,
  NumberIncrementStepperProps,
  NumberInput,
  NumberInputField,
  NumberInputFieldProps,
  NumberInputProps,
  NumberInputStepper,
  NumberInputStepperProps,
} from "@chakra-ui/react";
import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { Registerable } from "./registerable";
import {
  getComponentNameAndImportMeta,
  getPlasmicComponentName,
} from "./utils";

export const numberInputMeta: ComponentMeta<NumberInputProps> = {
  ...getComponentNameAndImportMeta("NumberInput"),
  props: {
    size: {
      type: "choice",
      options: ["xl", "sm", "md", "lg"],
    },
    variant: {
      type: "choice",
      options: ["outline", "filled", "flushed", "unstyled"],
    },
    inputMode: {
      type: "choice",
      options: [
        "text",
        "search",
        "none",
        "tel",
        "url",
        "email",
        "numeric",
        "decimal",
      ],
    },
    format: {
      type: "string",
    },
    step: {
      type: "number",
    },
    precision: {
      type: "number",
    },
    max: {
      type: "number",
    },
    min: {
      type: "number",
    },
    errorBorderColor: {
      type: "string",
      defaultValue: "red.500",
    },
    focusBorderColor: {
      type: "string",
      defaultValue: "blue.500",
    },
    allowMouseWheel: {
      type: "boolean",
    },
    isDisabled: {
      type: "boolean",
    },
    isInvalid: {
      type: "boolean",
    },
    isReadOnly: {
      type: "boolean",
    },
    isRequired: {
      type: "boolean",
    },

    children: {
      type: "slot",
      defaultValue: [
        {
          type: "component",
          name: getPlasmicComponentName("NumberInputField"),
        },
        {
          type: "component",
          name: getPlasmicComponentName("NumberInputStepper"),
        },
      ],
    },
  },
};

export function registerNumberInput(
  loader?: Registerable,
  customNumberInputMeta?: ComponentMeta<NumberInputProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(NumberInput, customNumberInputMeta ?? numberInputMeta);
}

export const numberInputStepperMeta: ComponentMeta<NumberInputStepperProps> = {
  ...getComponentNameAndImportMeta("NumberInputStepper", "NumberInput"),
  props: {
    children: {
      type: "slot",
      allowedComponents: [
        getPlasmicComponentName("NumberIncrementStepper"),
        getPlasmicComponentName("NumberDecrementStepper"),
      ],
      defaultValue: [
        {
          type: "component",
          name: getPlasmicComponentName("NumberIncrementStepper"),
        },
        {
          type: "component",
          name: getPlasmicComponentName("NumberDecrementStepper"),
        },
      ],
    },
  },
};

export function registerNumberInputStepper(
  loader?: Registerable,
  customNumberInputStepperMeta?: ComponentMeta<NumberInputStepperProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(
    NumberInputStepper,
    customNumberInputStepperMeta ?? numberInputStepperMeta
  );
}

export const numberDecrementStepperMeta: ComponentMeta<NumberDecrementStepperProps> = {
  ...getComponentNameAndImportMeta(
    "NumberDecrementStepper",
    "NumberInputStepper"
  ),
  props: {},
};

export function registerNumberDecrementStepper(
  loader?: Registerable,
  customNumberDecrementStepperMeta?: ComponentMeta<NumberDecrementStepperProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(
    NumberDecrementStepper,
    customNumberDecrementStepperMeta ?? numberDecrementStepperMeta
  );
}

export const numberIncrementStepperMeta: ComponentMeta<NumberIncrementStepperProps> = {
  ...getComponentNameAndImportMeta(
    "NumberIncrementStepper",
    "NumberInputStepper"
  ),
  props: {},
};

export function registerNumberIncrementStepper(
  loader?: Registerable,
  customNumberIncrementStepperMeta?: ComponentMeta<NumberIncrementStepperProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(
    NumberIncrementStepper,
    customNumberIncrementStepperMeta ?? numberIncrementStepperMeta
  );
}

export const numberInputFieldMeta: ComponentMeta<NumberInputFieldProps> = {
  ...getComponentNameAndImportMeta("NumberInputField", "NumberInput"),
  props: {},
};

export function registerNumberInputField(
  loader?: Registerable,
  customNumberInputFieldMeta?: ComponentMeta<NumberInputFieldProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(
    NumberInputField,
    customNumberInputFieldMeta ?? numberInputFieldMeta
  );
}
