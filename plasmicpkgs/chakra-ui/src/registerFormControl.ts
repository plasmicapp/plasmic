import registerComponent, {
    ComponentMeta,
  } from "@plasmicapp/host/registerComponent";
  import { FormControl, FormControlProps,FormLabel, FormLabelProps,FormHelperText, HelpTextProps,FormErrorMessage, FormErrorMessageProps } from "@chakra-ui/react";
  import { Registerable } from "./registerable";

export const formControlMeta: ComponentMeta<FormControlProps>={
  name: "FormControl",
  importPath: "@chakra-ui/react",
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
          name: "FormLabel",
        },
        {
          type: "component",
          name: "Input",
        },
      ],
    },
  },
};

  export function registerFormControl(loader?: Registerable,  customFormControlMeta?: ComponentMeta<FormControlProps>
    ) {
    const doRegisterComponent: typeof registerComponent = (...args) =>
      loader ? loader.registerComponent(...args) : registerComponent(...args);
      doRegisterComponent(FormControl, customFormControlMeta ?? formControlMeta);
  }
  

 

export const formLabelMeta: ComponentMeta<FormLabelProps>={
  name: "FormLabel",
  importPath: "@chakra-ui/react",
  parentComponentName: "FormControl",
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

  export function registerFormLabel(loader?: Registerable,  customFormLabelMeta?: ComponentMeta<FormLabelProps>
    ) {
    const doRegisterComponent: typeof registerComponent = (...args) =>
      loader ? loader.registerComponent(...args) : registerComponent(...args);
      doRegisterComponent(FormLabel, customFormLabelMeta ?? formLabelMeta);
  }
  
 
export const formHelperTextMeta: ComponentMeta<HelpTextProps>={
  name: "FormHelperText",
  importPath: "@chakra-ui/react",
  parentComponentName: "FormControl",
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

  export function registerFormHelperText(loader?: Registerable,  customFormHelperTextMeta?: ComponentMeta<HelpTextProps>
    ) {
    const doRegisterComponent: typeof registerComponent = (...args) =>
      loader ? loader.registerComponent(...args) : registerComponent(...args);
      doRegisterComponent(FormHelperText, customFormHelperTextMeta ?? formHelperTextMeta);
  }
  




export const formErrorMessageMeta: ComponentMeta<FormErrorMessageProps>={
  name: "FormErrorMessage",
  importPath: "@chakra-ui/react",
  parentComponentName: "FormControl",
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

  export function registerFormErrorMessage(loader?: Registerable,  customFormErrorMessageMeta?: ComponentMeta<FormErrorMessageProps>
    ) {
    const doRegisterComponent: typeof registerComponent = (...args) =>
      loader ? loader.registerComponent(...args) : registerComponent(...args);
      doRegisterComponent(FormErrorMessage, customFormErrorMessageMeta ?? formErrorMessageMeta);
  }
  