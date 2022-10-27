import {
  AccordionButtonProps,
  AccordionItemProps,
  AccordionPanelProps,
  AccordionProps,
  IconProps,
} from "@chakra-ui/react";
import { ComponentMeta } from "@plasmicapp/host/registerComponent";
import {
  getComponentNameAndImportMeta,
  getPlasmicComponentName,
} from "./utils";

export const accordionMeta: ComponentMeta<AccordionProps> = {
  ...getComponentNameAndImportMeta("Accordion"),
  props: {
    allowMultiple: {
      type: "boolean",
      description:
        "If true, multiple accordion items can be expanded at the same time.",
    },
    allowToggle: {
      type: "boolean",
      description:
        "If true, an expanded accordion item can be collapsed again.",
    },
    defaultIndex: {
      type: "number",
      description:
        "The index of the accordion item that should be expanded by default.",
    },
    reduceMotion: {
      type: "boolean",
      description:
        "If true, height animation and transitions will be disabled.",
    },
    children: {
      type: "slot",
      allowedComponents: [getPlasmicComponentName("AccordionItem")],
      defaultValue: [
        { type: "component", name: getPlasmicComponentName("AccordionItem") },
        { type: "component", name: getPlasmicComponentName("AccordionItem") },
      ],
    },
  },
};

export const accordionItemMeta: ComponentMeta<AccordionItemProps> = {
  ...getComponentNameAndImportMeta("AccordionItem", "Accordion"),
  props: {
    id: {
      type: "string",
      description: "The unique id of the accordion item.",
    },
    isDisabled: {
      type: "boolean",
      description: "If true, the accordion item will be disabled.",
    },
    isFocusable: {
      type: "boolean",
      description: "If true, the accordion item will be focusable.",
    },
    children: {
      type: "slot",
      allowedComponents: [
        getPlasmicComponentName("AccordionButton"),
        getPlasmicComponentName("AccordionPanel"),
      ],
      defaultValue: [
        {
          type: "component",
          name: getPlasmicComponentName("AccordionButton"),
        },
        {
          type: "component",
          name: getPlasmicComponentName("AccordionPanel"),
        },
      ],
    },
  },
};

export const accordionButtonMeta: ComponentMeta<AccordionButtonProps> = {
  ...getComponentNameAndImportMeta("AccordionButton", "AccordionItem"),
  props: {
    _expanded: {
      type: "object",
      displayName: "expandedStyle",
      defaultValueHint: {
        bg: "orange",
        color: "white",
      },
    },
    children: {
      type: "slot",
      defaultValue: [
        {
          type: "text",
          value: "Section 1 title",
          styles: {
            textAlign: "left",
          },
        },
        {
          type: "component",
          name: getPlasmicComponentName("AccordionIcon"),
        },
      ],
    },
  },
};

export const accordionPanelMeta: ComponentMeta<AccordionPanelProps> = {
  ...getComponentNameAndImportMeta("AccordionPanel", "AccordionItem"),
  props: {
    children: {
      type: "slot",
      defaultValue: {
        type: "component",
        name: getPlasmicComponentName("Text"),
        props: {
          children: {
            type: "text",
            value:
              "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
          },
        },
      },
    },
  },
};

export const accordionIconMeta: ComponentMeta<IconProps> = {
  ...getComponentNameAndImportMeta("AccordionIcon", "AccordionButton"),
  props: {},
};
