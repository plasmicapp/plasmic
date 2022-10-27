import {
  CloseButtonProps,
  Modal as ChakraUIModal,
  ModalBodyProps,
  ModalContentProps,
  ModalFooterProps,
  ModalHeaderProps,
  ModalOverlayProps,
  ModalProps,
} from "@chakra-ui/react";
import { ComponentMeta } from "@plasmicapp/host/registerComponent";
import React from "react";
import {
  getComponentNameAndImportMeta,
  getPlasmicComponentName,
} from "./utils";

export const modalMeta: ComponentMeta<ModalProps> = {
  ...getComponentNameAndImportMeta("Modal"),
  props: {
    isOpen: {
      type: "boolean",
      defaultValue: true,
    },
    isCentered: {
      type: "boolean",
      defaultValue: false,
    },
    scrollBehavior: {
      type: "choice",
      options: ["inside", "outside"],
      defaultValue: "outside",
      description: `
      Where scroll behavior should originate.
        - If set to 'inside', scroll only occurs within the ModalBody.
        - If set to 'outside', the entire ModalContent will scroll within the viewport.
      `,
    },
    motionPreset: {
      type: "choice",
      options: ["slideInBottom", "slideInRight", "scale", "none"],
      defaultValue: "scale",
    },
    children: {
      type: "slot",
      allowedComponents: [
        getPlasmicComponentName("ModalOverlay"),
        getPlasmicComponentName("ModalContent"),
      ],
      defaultValue: [
        {
          type: "component",
          name: getPlasmicComponentName("ModalOverlay"),
        },
        {
          type: "component",
          name: getPlasmicComponentName("ModalContent"),
        },
      ],
    },
  },
};

export function Modal(props: ModalProps) {
  return (
    <ChakraUIModal {...props} onClose={props.onClose ?? (() => {})}>
      {props.children}
    </ChakraUIModal>
  );
}
export const modalOverlayMeta: ComponentMeta<ModalOverlayProps> = {
  ...getComponentNameAndImportMeta("ModalOverlay", "Modal"),
  props: {
    children: "slot",
  },
};

export const modalContentMeta: ComponentMeta<ModalContentProps> = {
  ...getComponentNameAndImportMeta("ModalContent", "Modal"),
  props: {
    children: {
      type: "slot",
      allowedComponents: [
        getPlasmicComponentName("ModalHeader"),
        getPlasmicComponentName("ModalCloseButton"),
        getPlasmicComponentName("ModalBody"),
        getPlasmicComponentName("ModalFooter"),
      ],
      defaultValue: [
        {
          type: "component",
          name: getPlasmicComponentName("ModalHeader"),
        },
        {
          type: "component",
          name: getPlasmicComponentName("ModalBody"),
        },
        {
          type: "component",
          name: getPlasmicComponentName("ModalFooter"),
        },
      ],
    },
  },
};

export const modalHeaderMeta: ComponentMeta<ModalHeaderProps> = {
  ...getComponentNameAndImportMeta("ModalHeader", "ModalContent"),
  props: {
    children: {
      type: "slot",
      defaultValue: {
        type: "text",
        value: "Modal Title",
      },
    },
  },
};

const LOREM_IPSUM_TEXT = `
  Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem
  Ipsum has been the industry's standard dummy text ever since the 1500s, when an
  unknown printer took a galley of type and scrambled it to make a type specimen book.
  It has survived not only five centuries, but also the leap into electronic typesetting,
  remaining essentially unchanged. It was popularised in the 1960s with the release of
  Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing
  software like Aldus PageMaker including versions of Lorem Ipsum.
`;

export const modalBodyMeta: ComponentMeta<ModalBodyProps> = {
  ...getComponentNameAndImportMeta("ModalBody", "ModalContent"),
  props: {
    children: {
      type: "slot",
      defaultValue: {
        type: "text",
        value: LOREM_IPSUM_TEXT,
      },
    },
  },
};

export const modalFooterMeta: ComponentMeta<ModalFooterProps> = {
  ...getComponentNameAndImportMeta("ModalFooter", "ModalContent"),
  props: {
    children: {
      type: "slot",
      defaultValue: {
        type: "text",
        value: "Modal Footer",
      },
    },
  },
};

export const modalCloseButtonMeta: ComponentMeta<CloseButtonProps> = {
  ...getComponentNameAndImportMeta("ModalCloseButton", "ModalContent"),
  props: {
    isDisabled: "boolean",
  },
};
