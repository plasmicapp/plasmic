import {
  usePlasmicCanvasComponentInfo,
  usePlasmicCanvasContext,
} from "@plasmicapp/host";
import React, { forwardRef, useImperativeHandle } from "react";
import { mergeProps } from "react-aria";
import {
  Dialog,
  Modal,
  ModalOverlay,
  ModalOverlayProps,
} from "react-aria-components";
import { hasParent } from "./common";
import { PlasmicDialogTriggerContext } from "./contexts";
import { HEADING_COMPONENT_NAME } from "./registerHeading";
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
  children?: React.ReactNode;
}

export interface BaseModalActions {
  close(): void;
  open(): void;
}

const INLINE_STYLES = {
  outline: "none",
};

export const BaseModal = forwardRef<BaseModalActions, BaseModalProps>(
  function _BaseModal(props, ref) {
    const {
      children,
      modalOverlayClass,
      className,
      isOpen,
      resetClassName,
      setControlContextData,
      isDismissable,
      ...rest
    } = props;

    const { isSelected } = usePlasmicCanvasComponentInfo(props) ?? {};

    const contextProps = React.useContext(PlasmicDialogTriggerContext);
    const isStandalone = !contextProps;
    const mergedProps = mergeProps(contextProps, rest, {
      isOpen: isStandalone ? isSelected || isOpen : contextProps.isOpen,
      /*
        isDismissable on canvas (non-interactive mode) causes the following two issues:
        1. Clicking anywhere inside the modal dismisses it
        2. If the modal is auto-opened due to selection in outline tab, the modal stays open despite issue #1, but the text elements inside the modal are no longer selectable, and therefore the text or headings inside the modal are not editable.

        To fix the above issue, we set an interim isDismissable state to false while the modal is auto-open (`isSelected` is true).
        Also note that `isSelected` can only be true in canvas (non-interactive mode), so we can safely (temporarily) set `isDismissable` to false in this case, because it only matters in interactive mode.
      */
      isDismissable: isSelected ? false : isDismissable,
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

    {
      /* <Dialog> cannot be used in canvas, because while the dialog is open on the canvas, the focus is trapped inside it, so any Studio modals like the Color Picker modal would glitch due to focus jumping back and forth */
    }
    const bodyInCanvas = <div style={INLINE_STYLES}>{children}</div>;

    const bodyInPreview = <Dialog style={INLINE_STYLES}>{children}</Dialog>;

    return (
      <ModalOverlay
        {...mergedProps}
        className={`${resetClassName} ${modalOverlayClass}`}
      >
        <Modal className={className}>
          {isCanvas ? bodyInCanvas : bodyInPreview}
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
        children: {
          type: "slot",
          mergeWithParent: true,
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
                type: "component",
                name: HEADING_COMPONENT_NAME,
              },
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
          defaultValueHint: true,
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
