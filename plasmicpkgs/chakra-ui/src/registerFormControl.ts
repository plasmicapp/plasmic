import {
  FormControl,
  FormControlProps,
  FormErrorMessage,
  FormErrorMessageProps,
  FormHelperText,
  FormLabel,
  FormLabelProps,
  HelpTextProps,
} from "@chakra-ui/react";
import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { Registerable } from "./registerable";
import {
  getComponentNameAndImportMeta,
  getPlasmicComponentName,
} from "./utils";

export const formControlMeta: ComponentMeta<FormControlProps> = {
  ...getComponentNameAndImportMeta("FormControl"),
  props: {
    label: "string",
    isDisabled: "boolean",
    isInvalid: "boolean",
    isRequired: "boolean",
    isreadOnly: "boolean",
    children: {
      type: "slot",
      defaultValue: [
        {
          type: "component",
          name: getPlasmicComponentName("FormLabel"),
        },
        {
          type: "component",
          name: getPlasmicComponentName("Input"),
        },
      ],
    },
  },
};

export function registerFormControl(
  loader?: Registerable,
  customFormControlMeta?: ComponentMeta<FormControlProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(FormControl, customFormControlMeta ?? formControlMeta);
}

export const formLabelMeta: ComponentMeta<FormLabelProps> = {
  ...getComponentNameAndImportMeta("FormLabel", "FormControl"),
  props: {
    children: {
      type: "slot",
      defaultValue: {
        type: "text",
        value: "Label",
        styles: {
          display: "inline-block",
          width: "auto",
        },
      },
    },
  },
};

export function registerFormLabel(
  loader?: Registerable,
  customFormLabelMeta?: ComponentMeta<FormLabelProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(FormLabel, customFormLabelMeta ?? formLabelMeta);
}

export const formHelperTextMeta: ComponentMeta<HelpTextProps> = {
  ...getComponentNameAndImportMeta("FormHelperText", "FormControl"),
  props: {
    children: {
      type: "slot",
      defaultValue: {
        type: "text",
        value: "We'll never share your email.",
      },
    },
  },
};

export function registerFormHelperText(
  loader?: Registerable,
  customFormHelperTextMeta?: ComponentMeta<HelpTextProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(
    FormHelperText,
    customFormHelperTextMeta ?? formHelperTextMeta
  );
}

export const formErrorMessageMeta: ComponentMeta<FormErrorMessageProps> = {
  ...getComponentNameAndImportMeta("FormErrorMessage", "FormControl"),
  props: {
    children: {
      type: "slot",
      defaultValue: {
        type: "text",
        value: "This is an error message.",
      },
    },
  },
};

export function registerFormErrorMessage(
  loader?: Registerable,
  customFormErrorMessageMeta?: ComponentMeta<FormErrorMessageProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(
    FormErrorMessage,
    customFormErrorMessageMeta ?? formErrorMessageMeta
  );
}
