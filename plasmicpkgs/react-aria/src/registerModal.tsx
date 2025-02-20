import { PlasmicElement, usePlasmicCanvasContext } from "@plasmicapp/host";
import React, { forwardRef, useImperativeHandle } from "react";
import { mergeProps } from "react-aria";
import { Modal, ModalOverlay, ModalOverlayProps } from "react-aria-components";
import { hasParent } from "./common";
import { PlasmicDialogTriggerContext } from "./contexts";
import {
  CodeComponentMetaOverrides,
  HasControlContextData,
  makeComponentName,
  Registerable,
  registerComponentHelper,
  useIsOpen,
  WithPlasmicCanvasComponentInfo,
} from "./utils";

export interface BaseModalProps
  extends ModalOverlayProps,
    WithPlasmicCanvasComponentInfo,
    HasControlContextData {
  modalOverlayClass?: string;
  resetClassName?: string;
  children?: React.ReactNode;
  className?: string;
}

export interface BaseModalActions {
  close(): void;
  open(): void;
}

export const BaseModal = forwardRef<BaseModalActions, BaseModalProps>(
  function BaseModalInner(props, ref) {
    const {
      children,
      modalOverlayClass,
      className,
      isOpen,
      resetClassName,
      setControlContextData,
      isDismissable,
      defaultOpen,
      __plasmic_selection_prop__,
      ...rest
    } = props;

    const canvasCtx = usePlasmicCanvasContext();
    const isEditMode = canvasCtx && canvasCtx.interactive === false;

    const contextProps = React.useContext(PlasmicDialogTriggerContext);
    const isStandalone = !contextProps;
    const isOpen2 = useIsOpen({ isOpen, __plasmic_selection_prop__ });

    const mergedProps = mergeProps(rest, {
      // Since open/defaultOpen props are hidden when the modal is inside dialogTrigger, we also unset them here.
      isOpen: isStandalone ? isOpen2 : undefined,
      defaultOpen: isStandalone ? defaultOpen : undefined,

      // isDismissable on canvas (non-interactive mode) causes the following two issues:
      // 1. Clicking anywhere inside the modal dismisses it
      // 2. If the modal is auto-opened due to selection in outline tab, the modal stays open despite issue #1, but the text elements inside the modal are no longer selectable, and therefore the text or headings inside the modal are not editable.
      //
      // To fix the above issue, we set an interim isDismissable state to false in edit mode, because it only matters in interactive mode.
      isDismissable: isEditMode ? false : isDismissable,
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

    return (
      <ModalOverlay
        {...mergedProps}
        className={`${resetClassName} ${modalOverlayClass}`}
      >
        <Modal className={className}>{children}</Modal>
      </ModalOverlay>
    );
  }
);

export const MODAL_COMPONENT_NAME = makeComponentName("modal");

export const MODAL_DEFAULT_SLOT_CONTENT: PlasmicElement = {
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
      value: "Heading",
      tag: "h2",
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
};

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
          defaultValue: MODAL_DEFAULT_SLOT_CONTENT,
        },
        modalOverlayClass: {
          type: "class",
          displayName: "Modal Overlay",
        },
        isOpen: {
          type: "boolean",
          editOnly: true,
          uncontrolledProp: "defaultOpen",
          // standalone Modals should default to open so that they are visible when inserted
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
