import { usePlasmicCanvasContext } from "@plasmicapp/host";
import React, { forwardRef, useImperativeHandle } from "react";
import { mergeProps } from "react-aria";
import {
  Dialog,
  Heading,
  Modal,
  ModalOverlay,
  ModalOverlayProps,
} from "react-aria-components";
import { hasParent } from "./common";
import { PlasmicDialogTriggerContext } from "./contexts";
import {
  CodeComponentMetaOverrides,
  HasControlContextData,
  makeComponentName,
  Registerable,
  registerComponentHelper,
} from "./utils";

export interface BaseModalProps
  extends ModalOverlayProps,
    HasControlContextData {
  heading: React.ReactNode;
  modalOverlayClass: string;
  resetClassName?: string;
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
      className,
      isOpen,
      resetClassName,
      setControlContextData,
      ...rest
    } = props;

    const contextProps = React.useContext(PlasmicDialogTriggerContext);
    const isStandalone = !contextProps;
    const mergedProps = mergeProps(contextProps, rest, {
      isOpen: isStandalone ? isOpen : contextProps.isOpen,
    });

    setControlContextData?.({
      parent: isStandalone ? undefined : {},
    });

    // Expose close operation using useImperativeHandle
    useImperativeHandle(ref, () => ({
      close: () => {
        mergedProps.onOpenChange?.(false);
      },
      open: () => {
        mergedProps.onOpenChange?.(true);
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
        {...mergedProps}
        className={`${resetClassName} ${modalOverlayClass}`}
      >
        <Modal className={className}>
          {isCanvas ? body : <Dialog>{body}</Dialog>}
        </Modal>
      </ModalOverlay>
    );
  }
);

export const MODAL_COMPONENT_NAME = makeComponentName("modal");

export function registerModal(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseModal>
) {
  registerComponentHelper(
    loader,
    BaseModal,
    {
      name: MODAL_COMPONENT_NAME,
      displayName: "Aria Modal",
      importPath: "@plasmicpkgs/react-aria/skinny/registerModal",
      importName: "BaseModal",
      styleSections: true,
      defaultStyles: {
        // centering the modal on the page by default
        position: "fixed",
        top: "10%",
        left: "50%",
        width: "50%",
        transform: "translateX(-50%)",
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: "black",
        padding: "20px",
        maxWidth: "300px",
        backgroundColor: "#FDE3C3",
      },
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
          defaultValue: {
            type: "text",
            value: "Modal Heading",
            styles: {
              fontSize: "20px",
              fontWeight: "bold",
              marginBottom: "10px",
            },
          },
        },
        children: {
          type: "slot",
          defaultValue: {
            type: "vbox",
            styles: {
              width: "stretch",
              padding: 0,
              gap: "10px",
              justifyContent: "flex-start",
              alignItems: "flex-start",
            },
            children: [
              {
                type: "text",
                value: "This is a Modal!",
              },
              {
                type: "text",
                value: "You can put anything you can imagine here!",
                styles: {
                  fontWeight: 500,
                },
              },
              {
                type: "text",
                value:
                  "Use it in a `Aria Dialog Trigger` component to trigger it on a button click!",
              },
            ],
          },
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
          defaultValue: true,
          hidden: hasParent,
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
        resetClassName: {
          type: "themeResetClass",
        },
      },
      states: {
        isOpen: {
          type: "writable",
          valueProp: "isOpen",
          onChangeProp: "onOpenChange",
          variableType: "boolean",
          hidden: hasParent,
        },
      },
      trapsFocus: true,
    },
    overrides
  );
}
