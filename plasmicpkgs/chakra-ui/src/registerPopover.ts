import {
  Popover,
  PopoverArrow,
  PopoverArrowProps,
  PopoverBody,
  PopoverBodyProps,
  PopoverCloseButton,
  PopoverCloseButtonProps,
  PopoverContent,
  PopoverContentProps,
  PopoverHeader,
  PopoverHeaderProps,
  PopoverProps,
  PopoverTrigger,
} from "@chakra-ui/react";
import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { Registerable } from "./registerable";

export const popoverMeta: ComponentMeta<PopoverProps> = {
  name: "Popover",
  importPath: "@chakra-ui/react",
  props: {
    gutter: {
      type: "number",
      defaultValue: 8,
    },
    arrowPadding: "number",
    arrowShadowColor: {
      type: "string",
      defaultValue: "rgba(0, 0, 0, 0.15)",
    },
    arrowSize: {
      type: "number",
    },
    offset: {
      type: "array",
      defaultValue: [0, 0],
    },
    closeDelay: "number",
    orientation: {
      type: "choice",
      options: ["horizontal", "vertical"],
    },
    placement: {
      type: "choice",
      options: ["top", "bottom", "left", "right"],
      defaultValue: "bottom",
    },
    direction: {
      type: "choice",
      options: ["ltr", "rtl"],
      defaultValue: "ltr",
    },
    trigger: {
      type: "choice",
      options: ["click", "hover"],
      defaultValue: "click",
    },
    isLazy: {
      type: "boolean",
    },
    isOpen: {
      type: "boolean",
    },
    children: {
      type: "slot",
      defaultValue: [
        {
          type: "component",
          name: "PopoverTrigger",
        },
        {
          type: "component",
          name: "PopoverContent",
        },
      ],
    },
  },
};

export function registerPopover(
  loader?: Registerable,
  customPopoverMeta?: ComponentMeta<PopoverProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(Popover, customPopoverMeta ?? popoverMeta);
}

export const popoverContentMeta: ComponentMeta<PopoverContentProps> = {
  name: "PopoverContent",
  importPath: "@chakra-ui/react",
  parentComponentName: "Popover",
  props: {
    children: {
      type: "slot",
      defaultValue: [
        {
          type: "component",
          name: "PopoverArrow",
        },
        {
          type: "component",
          name: "PopoverCloseButton",
        },
        {
          type: "component",
          name: "PopoverHeader",
          props: {
            children: {
              type: "text",
              value: "Confirmation!",
            },
          },
        },
        {
          type: "component",
          name: "PopoverBody",
          props: {
            children: {
              type: "text",
              value: "Are you sure you want to have that milkshake?",
            },
          },
        },
      ],
    },
  },
};

export function registerPopoverContent(
  loader?: Registerable,
  customPopoverContentMeta?: ComponentMeta<PopoverContentProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(
    PopoverContent,
    customPopoverContentMeta ?? popoverContentMeta
  );
}

export const popoverArrowMeta: ComponentMeta<PopoverArrowProps> = {
  name: "PopoverArrow",
  importPath: "@chakra-ui/react",
  parentComponentName: "PopoverContent",
  props: {},
};

export function registerPopoverArrow(
  loader?: Registerable,
  customPopoverArrowMeta?: ComponentMeta<PopoverArrowProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(PopoverArrow, customPopoverArrowMeta ?? popoverArrowMeta);
}

export const popoverCloseButtonMeta: ComponentMeta<PopoverCloseButtonProps> = {
  name: "PopoverCloseButton",
  importPath: "@chakra-ui/react",
  parentComponentName: "PopoverContent",

  props: {},
};

export function registerPopoverCloseButton(
  loader?: Registerable,
  customPopoverCloseButtonMeta?: ComponentMeta<PopoverCloseButtonProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(
    PopoverCloseButton,
    customPopoverCloseButtonMeta ?? popoverCloseButtonMeta
  );
}

export const popoverHeaderMeta: ComponentMeta<PopoverHeaderProps> = {
  name: "PopoverHeader",
  importPath: "@chakra-ui/react",
  parentComponentName: "PopoverContent",
  props: {
    children: {
      type: "slot",
      defaultValue: {
        type: "text",
        value: "Confirmation!",
      },
    },
  },
};

export function registerPopoverHeader(
  loader?: Registerable,
  customPopoverHeaderMeta?: ComponentMeta<PopoverHeaderProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(
    PopoverHeader,
    customPopoverHeaderMeta ?? popoverHeaderMeta
  );
}

export const popoverBodyMeta: ComponentMeta<PopoverBodyProps> = {
  name: "PopoverBody",
  importPath: "@chakra-ui/react",
  parentComponentName: "PopoverContent",

  props: {
    children: {
      type: "slot",
      defaultValue: {
        type: "text",
        value: "Are you sure you want to have that milkshake?",
      },
    },
  },
};

export function registerPopoverBody(
  loader?: Registerable,
  customPopoverBodyMeta?: ComponentMeta<PopoverBodyProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(PopoverBody, customPopoverBodyMeta ?? popoverBodyMeta);
}

interface PopoverTriggerProps {
  children: React.ReactNode;
}

export const popoverTriggerMeta: ComponentMeta<PopoverTriggerProps> = {
  name: "PopoverTrigger",
  importPath: "@chakra-ui/react",
  parentComponentName: "Popover",
  props: {
    children: {
      type: "slot",
      defaultValue: {
        type: "component",
        name: "Button",
        props: {
          children: {
            type: "text",
            value: "Trigger",
          },
        },
      },
    },
  },
};

export function registerPopoverTrigger(
  loader?: Registerable,
  customPopoverTriggerMeta?: ComponentMeta<PopoverTriggerProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(
    PopoverTrigger,
    customPopoverTriggerMeta ?? popoverTriggerMeta
  );
}
