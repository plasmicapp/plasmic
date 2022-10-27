import { SelectProps } from "@chakra-ui/react";
import { ComponentMeta } from "@plasmicapp/host/registerComponent";
import React from "react";
import {
  getComponentNameAndImportMeta,
  getPlasmicComponentName,
} from "./utils";

export const selectMeta: ComponentMeta<SelectProps> = {
  ...getComponentNameAndImportMeta("Select"),
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
          name: getPlasmicComponentName("Option"),
          props: {
            children: {
              type: "text",
              value: "Option 01",
            },
          },
        },
        {
          type: "component",
          name: getPlasmicComponentName("Option"),
          props: {
            children: {
              type: "text",
              value: "Option 02",
            },
          },
        },
        {
          type: "component",
          name: getPlasmicComponentName("Option"),
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
  ...getComponentNameAndImportMeta("Option", "Select", {
    importPath: "@plasmicpkgs/plasmic-chakra-ui",
  }),
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
