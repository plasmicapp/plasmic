import { usePlasmicCanvasContext } from "@plasmicapp/host";
import React, { forwardRef, useImperativeHandle } from "react";
import {
  Dialog,
  Heading,
  Modal,
  ModalOverlay,
  ModalOverlayProps,
} from "react-aria-components";
import {
  CodeComponentMetaOverrides,
  makeComponentName,
  Registerable,
  registerComponentHelper,
} from "./utils";

export interface BaseModalProps extends ModalOverlayProps {
  heading: React.ReactNode;
  modalOverlayClass: string;
  onOpenChange(isOpen: boolean): void;
}

export interface BaseModalActions {
  close(): void;
  open(): void;
}

export const BaseModal = forwardRef<BaseModalActions, BaseModalProps>(
  function _BaseModal(props, ref) {
    const {
      children,
      heading,
      modalOverlayClass,
      onOpenChange,
      className,
      ...rest
    } = props;

    // Expose close operation using useImperativeHandle
    useImperativeHandle(ref, () => ({
      close: () => {
        onOpenChange(false);
      },
      open: () => {
        onOpenChange(true);
      },
    }));

    const isCanvas = usePlasmicCanvasContext();
    const body = (
      <>
        {heading && <Heading slot="title">{heading}</Heading>}
        {children}
      </>
    );

    return (
      <ModalOverlay
        {...rest}
        className={modalOverlayClass}
        onOpenChange={onOpenChange}
      >
        <Modal className={className}>
          {isCanvas ? body : <Dialog>{body}</Dialog>}
        </Modal>
      </ModalOverlay>
    );
  }
);

export function registerModal(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseModal>
) {
  registerComponentHelper(
    loader,
    BaseModal,
    {
      name: makeComponentName("modal"),
      displayName: "Aria Modal",
      importPath: "@plasmicpkgs/react-aria/skinny/registerModal",
      importName: "BaseModal",
      styleSections: true,
      refActions: {
        open: {
          description: "Open the modal",
          argTypes: [],
        },
        close: {
          description: "Close the modal",
          argTypes: [],
        },
      },
      props: {
        heading: {
          type: "slot",
        },
        children: {
          type: "slot",
        },
        modalOverlayClass: {
          type: "class",
          displayName: "Modal Overlay",
        },
        isOpen: {
          type: "boolean",
          editOnly: true,
          uncontrolledProp: "defaultOpen",
          defaultValueHint: false,
        },
        isDismissable: {
          type: "boolean",
          description:
            "Whether to close the modal when the user interacts outside it.",
        },
        isKeyboardDismissDisabled: {
          type: "boolean",
          description:
            "Whether pressing the escape key to close the modal should be disabled.",
        },
        onOpenChange: {
          type: "eventHandler",
          argTypes: [{ name: "isOpen", type: "boolean" }],
        },
      },
      states: {
        isOpen: {
          type: "writable",
          valueProp: "isOpen",
          onChangeProp: "onOpenChange",
          variableType: "boolean",
        },
      },
      trapsFocus: true,
    },
    overrides
  );
}
