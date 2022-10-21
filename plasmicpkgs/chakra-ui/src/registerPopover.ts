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
import {
  getComponentNameAndImportMeta,
  getPlasmicComponentName,
} from "./utils";

export const popoverMeta: ComponentMeta<PopoverProps> = {
  ...getComponentNameAndImportMeta("Popover"),
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
          name: getPlasmicComponentName("PopoverTrigger"),
        },
        {
          type: "component",
          name: getPlasmicComponentName("PopoverContent"),
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
  ...getComponentNameAndImportMeta("PopoverContent", "Popover"),
  props: {
    children: {
      type: "slot",
      defaultValue: [
        {
          type: "component",
          name: getPlasmicComponentName("PopoverArrow"),
        },
        {
          type: "component",
          name: getPlasmicComponentName("PopoverCloseButton"),
        },
        {
          type: "component",
          name: getPlasmicComponentName("PopoverHeader"),
          props: {
            children: {
              type: "text",
              value: "Confirmation!",
            },
          },
        },
        {
          type: "component",
          name: getPlasmicComponentName("PopoverBody"),
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
  ...getComponentNameAndImportMeta("PopoverArrow", "PopoverContent"),
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
  ...getComponentNameAndImportMeta("PopoverCloseButton", "PopoverContent"),
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
  ...getComponentNameAndImportMeta("PopoverHeader", "PopoverContent"),
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
  ...getComponentNameAndImportMeta("PopoverBody", "PopoverContent"),
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

export const popoverTriggerMeta: ComponentMeta<PopoverTriggerProps> = {
  ...getComponentNameAndImportMeta("PopoverTrigger", "Popover"),
  props: {
    children: {
      type: "slot",
      defaultValue: {
        type: "component",
        name: getPlasmicComponentName("Button"),
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

export interface PopoverTriggerProps {
  children: React.ReactNode;
}
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
