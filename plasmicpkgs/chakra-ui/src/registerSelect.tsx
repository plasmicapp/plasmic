import { Select, SelectProps } from "@chakra-ui/react";
import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import React from "react";
import { Registerable } from "./registerable";

export const selectMeta: ComponentMeta<SelectProps> = {
  name: "Select",
  importPath: "@chakra-ui/react",
  props: {
    size: {
      type: "choice",
      options: ["lg", "md", "sm", "xs"],
      defaultValue: "md",
    },
    variant: {
      type: "choice",
      options: ["outline", "filled", "flushed", "unstyled"],
      defaultValue: "outline",
    },
    placeholder: {
      type: "string",
    },
    errorBorderColor: {
      type: "string",
      defaultValueHint: "red.500",
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
    isRequred: {
      type: "boolean",
    },
    children: {
      type: "slot",
      defaultValue: [
        {
          type: "component",
          name: "Option",
          props: {
            children: {
              type: "text",
              value: "Option 01",
            },
          },
        },
        {
          type: "component",
          name: "Option",
          props: {
            children: {
              type: "text",
              value: "Option 02",
            },
          },
        },
        {
          type: "component",
          name: "Option",
          props: {
            children: {
              type: "text",
              value: "Option 03",
            },
          },
        },
      ],
    },
  },
};

export function registerSelect(
  loader?: Registerable,
  customSelectMeta?: ComponentMeta<SelectProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(Select, customSelectMeta ?? selectMeta);
}

export interface OptionProps {
  value: string;
  className?: string;
  children: any;
}

export function Option(props: OptionProps) {
  const { value, className, children } = props;
  return (
    <option className={className} value={value}>
      {children}
    </option>
  );
}

export const optionMeta: ComponentMeta<OptionProps> = {
  name: "Option",
  importPath: "@plasmicpkgs/plasmic-chakra-ui",
  parentComponentName: "Select",
  props: {
    value: "string",
    children: {
      type: "slot",
      defaultValue: {
        type: "text",
        value: "Option",
      },
    },
  },
};

export function registerOption(
  loader?: Registerable,
  customOptionMeta?: ComponentMeta<OptionProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(Option, customOptionMeta ?? optionMeta);
}
