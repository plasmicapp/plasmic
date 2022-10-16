import registerComponent, {
    ComponentMeta,
  } from "@plasmicapp/host/registerComponent";
  import { Accordion, AccordionProps,AccordionItem, AccordionItemProps,AccordionButton, AccordionButtonProps,AccordionPanel, AccordionPanelProps,AccordionIcon, IconProps} from "@chakra-ui/react";
  import { Registerable } from "./registerable";

export const accordionMeta: ComponentMeta<AccordionProps>={
  name: "Accordion",
  importPath: "@chakra-ui/react",
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
      allowedComponents: ["AccordionItem"],
      defaultValue: [
        { type: "component", name: "AccordionItem" },
        { type: "component", name: "AccordionItem" },
      ],
    },
  },
};

  export function registerAccordion(loader?: Registerable,  customAccordionMeta?: ComponentMeta<AccordionProps>
    ) {
    const doRegisterComponent: typeof registerComponent = (...args) =>
      loader ? loader.registerComponent(...args) : registerComponent(...args);
      doRegisterComponent(Accordion, customAccordionMeta ?? accordionMeta);
  }
  


export const accordionItemMeta: ComponentMeta<AccordionItemProps>={
  name: "AccordionItem",
  importPath: "@chakra-ui/react",
  parentComponentName: "Accordion",
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
      allowedComponents: ["AccordionButton", "AccordionPanel"],
      defaultValue: [
        {
          type: "component",
          name: "AccordionButton",
        },
        {
          type: "component",
          name: "AccordionPanel",
        },
      ],
    },
  },
};

  export function registerAccordionItem(loader?: Registerable,  customAccordionItemMeta?: ComponentMeta<AccordionItemProps>
    ) {
    const doRegisterComponent: typeof registerComponent = (...args) =>
      loader ? loader.registerComponent(...args) : registerComponent(...args);
      doRegisterComponent(AccordionItem, customAccordionItemMeta ?? accordionItemMeta);
  }
  

export const accordionButtonMeta: ComponentMeta<AccordionButtonProps>={
  name: "AccordionButton",
  importPath: "@chakra-ui/react",
  parentComponentName: "AccordionItem",
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
          name: "AccordionIcon",
        },
      ],
    },
  },
};

  export function registerAccordionButton(loader?: Registerable,  customAccordionButtonMeta?: ComponentMeta<AccordionButtonProps>
    ) {
    const doRegisterComponent: typeof registerComponent = (...args) =>
      loader ? loader.registerComponent(...args) : registerComponent(...args);
      doRegisterComponent(AccordionButton, customAccordionButtonMeta ?? accordionButtonMeta);
  }
  


export const accordionPanelMeta: ComponentMeta<AccordionPanelProps>={
  name: "AccordionPanel",
  importPath: "@chakra-ui/react",
  parentComponentName: "AccordionItem",
  props: {
    children: {
      type: "slot",
      defaultValue: {
        type: "component",
        name: "Text",
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

  export function registerAccordionPanel(loader?: Registerable,  customAccordionPanelMeta?: ComponentMeta<AccordionPanelProps>
    ) {
    const doRegisterComponent: typeof registerComponent = (...args) =>
      loader ? loader.registerComponent(...args) : registerComponent(...args);
      doRegisterComponent(AccordionPanel, customAccordionPanelMeta ?? accordionPanelMeta);
  }
  



export const accordionIconMeta: ComponentMeta<IconProps>={
  name: "AccordionIcon",
  importPath: "@chakra-ui/react",
  parentComponentName: "AccordionButton",
  props: {},
};

  export function registerAccordionIcon(loader?: Registerable,  customAccordionIconMeta?: ComponentMeta<IconProps>
    ) {
    const doRegisterComponent: typeof registerComponent = (...args) =>
      loader ? loader.registerComponent(...args) : registerComponent(...args);
      doRegisterComponent(AccordionIcon, customAccordionIconMeta ?? accordionIconMeta);
  }
  