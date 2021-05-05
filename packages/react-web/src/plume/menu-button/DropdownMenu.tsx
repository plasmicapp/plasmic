import { Placement } from "@react-types/overlays";
import * as React from "react";
import { useMenuTriggerState } from "react-stately";
import { mergeProps } from "../../react-utils";
import { BaseMenuProps } from "../menu/menu";
import { TriggeredOverlayContext } from "../triggered-overlay/context";
import { useMenuTrigger } from "./menu-trigger";

export interface DropdownMenuProps {
  /**
   * A ReactElement that takes in a `ref` as well as the usual mouse and
   * pointer events. The dropdown menu will be positioned relative to this
   * trigger.
   */
  children: React.ReactElement;

  /**
   * The menu to show; must be either a ReactElement of Menu type, or
   * a function that creates one if you prefer to delay creating it until
   * the menu has been triggered.
   */
  menu:
    | React.ReactElement<BaseMenuProps>
    | (() => React.ReactElement<BaseMenuProps>);

  /**
   * Where to place the menu relative to the trigger.
   */
  placement?: Placement;

  /**
   * Whether the menu is currently shown.
   */
  isOpen?: boolean;

  /**
   * Uncontrolled open state.
   */
  defaultOpen?: boolean;

  /**
   * Event handler fired when Menu's open state changes
   */
  onOpenChange?: (isOpen: boolean) => void;
}

export function DropdownMenu(props: DropdownMenuProps) {
  const {
    isOpen,
    defaultOpen,
    onOpenChange,
    children,
    placement,
    menu,
  } = props;

  const triggerRef = React.useRef<HTMLElement>(null);

  const state = useMenuTriggerState({
    isOpen,
    defaultOpen,
    onOpenChange,
    shouldFlip: true,
  });

  const { triggerProps, makeMenu, triggerContext } = useMenuTrigger(
    {
      triggerRef,
      placement,
      menu,
    },
    state
  );

  return (
    <TriggeredOverlayContext.Provider value={triggerContext}>
      {React.cloneElement(
        children,
        mergeProps(children.props, triggerProps, { ref: triggerRef })
      )}
      {state.isOpen && makeMenu()}
    </TriggeredOverlayContext.Provider>
  );
}
