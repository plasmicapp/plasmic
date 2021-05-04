import { useMenuTrigger as useAriaMenuTrigger } from "@react-aria/menu";
import { Placement } from "@react-types/overlays";
import * as React from "react";
import { usePress } from "react-aria";
import { MenuTriggerState } from "react-stately";
import { mergeProps } from "../../common";
import { BaseMenuProps } from "../menu/menu";
import { getPlumeType, PLUME_STRICT_MODE } from "../plume-utils";
import { TriggeredOverlayContextValue } from "../triggered-overlay/context";

/**
 * A menu trigger hook that combines react-aria's useMenuTrigger, useAriaMenuTrigger,
 * useOverlayPosition, useOverlay, and usePress
 */
export function useMenuTrigger(
  opts: {
    isDisabled?: boolean;
    triggerRef: React.RefObject<HTMLElement>;
    placement?: Placement;
    menuMatchTriggerWidth?: boolean;
    menuWidth?: number;
    menu:
      | React.ReactElement<BaseMenuProps>
      | (() => React.ReactElement<BaseMenuProps>);
  },
  state: MenuTriggerState
) {
  const {
    triggerRef,
    isDisabled,
    placement,
    menuMatchTriggerWidth,
    menuWidth,
    menu,
  } = opts;

  const { menuTriggerProps: triggerPressProps, menuProps } = useAriaMenuTrigger(
    {
      type: "menu",
      isDisabled,
    },
    state,
    triggerRef
  );

  const { pressProps: triggerProps } = usePress(triggerPressProps);

  const makeMenu = () => {
    let realMenu = typeof menu === "function" ? menu() : menu;
    if (!realMenu) {
      return null;
    }
    if (getPlumeType(realMenu) !== "menu") {
      if (PLUME_STRICT_MODE) {
        throw new Error(`Must use an instance of the Menu component.`);
      }
      return null;
    }
    return React.cloneElement(
      realMenu,
      mergeProps(realMenu.props, menuProps, {
        onClose: state.close,
        autoFocus: state.focusStrategy || true,
      })
    );
  };

  const triggerContext: TriggeredOverlayContextValue = React.useMemo(
    () => ({
      triggerRef,
      state,
      placement,
      overlayMatchTriggerWidth: menuMatchTriggerWidth,
      overlayMinTriggerWidth: true,
      overlayWidth: menuWidth,
    }),
    [triggerRef, state, placement, menuMatchTriggerWidth, menuWidth]
  );

  return {
    triggerProps,
    makeMenu,
    triggerContext,
  };
}
