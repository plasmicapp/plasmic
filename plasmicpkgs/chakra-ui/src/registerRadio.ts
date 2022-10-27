import { RadioGroupProps, RadioProps } from "@chakra-ui/react";
import { ComponentMeta } from "@plasmicapp/host/registerComponent";
import {
  getComponentNameAndImportMeta,
  getPlasmicComponentName,
} from "./utils";

export const radioGroupMeta: ComponentMeta<RadioGroupProps> = {
  ...getComponentNameAndImportMeta("RadioGroup"),
  props: {
    value: {
      type: "string",
    },
    size: {
      type: "choice",
      options: ["xl", "sm", "md", "lg"],
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
      defaultValue: {
        type: "hbox",

        styles: {
          gap: "12px",
        },
        children: [
          {
            type: "component",
            name: getPlasmicComponentName("Radio"),
            props: { value: "1", children: { type: "text", value: "Radio 1" } },
          },
          {
            type: "component",
            name: getPlasmicComponentName("Radio"),
            props: { value: "2", children: { type: "text", value: "Radio 2" } },
          },
          {
            type: "component",
            name: getPlasmicComponentName("Radio"),
            props: { value: "3", children: { type: "text", value: "Radio 3" } },
          },
        ],
      },
    },
  },
};

export const radioMeta: ComponentMeta<RadioProps> = {
  ...getComponentNameAndImportMeta("Radio", "RadioGroup"),
  props: {
    value: {
      type: "string",
    },
    size: {
      type: "choice",
      options: ["xl", "sm", "md", "lg"],
    },
    spacing: {
      type: "string",
      defaultValue: "0.5rem",
    },
    isChecked: {
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
          type: "text",
          value: "Radio",
        },
      ],
    },
  },
};
