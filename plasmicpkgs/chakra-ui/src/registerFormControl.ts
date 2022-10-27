import {
  FormControlProps,
  FormErrorMessageProps,
  FormLabelProps,
  HelpTextProps,
} from "@chakra-ui/react";
import { ComponentMeta } from "@plasmicapp/host/registerComponent";
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
