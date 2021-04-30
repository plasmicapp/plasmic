import { useMenuTrigger } from "@react-aria/menu";
import { DismissButton, useOverlayPosition } from "@react-aria/overlays";
import { useMenuTriggerState } from "@react-stately/menu";
import { Placement } from "@react-types/overlays";
import { DOMProps, FocusableProps, HoverEvents } from "@react-types/shared";
import * as React from "react";
import { FocusScope, useHover, useOverlay, usePress } from "react-aria";
import * as ReactDOM from "react-dom";
import { mergeProps, pick } from "../../common";
import { useIsomorphicLayoutEffect } from "../../react-utils";
import { Overrides } from "../../render/elements";
import { BaseMenuProps } from "../menu/menu";
import {
  AnyPlasmicClass,
  getStyleProps,
  mergeVariantToggles,
  PlasmicClassArgs,
  PlasmicClassOverrides,
  PlasmicClassVariants,
  StyleProps,
  useForwardedRef,
  VariantDef,
} from "../plume-utils";

export interface BaseMenuButtonProps
  extends DOMProps,
    FocusableProps,
    HoverEvents,
    StyleProps {
  /**
   * The menu to show; can either be a Menu instance, or a function that returns a Menu
   * instance if you want to defer creating the instance till when it's opened.
   */
  menu:
    | React.ReactElement<BaseMenuProps>
    | (() => React.ReactElement<BaseMenuProps>);

  /**
   * Whether the button is disabled
   */
  isDisabled?: boolean;

  /**
   * Whether the menu is currently shown.
   */
  isOpen?: boolean;

  /**
   * Uncontrolled open state
   */
  defaultOpen?: boolean;

  /**
   * Event handler fired when Menu's open state changes
   */
  onOpenChange?: (isOpen: boolean) => void;

  /**
   * Desired placement location of the Select dropdown
   */
  placement?: Placement;
  /**
   * If true, menu width will always match the trigger button width.
   * If false, then menu width will have min-width matching the
   * trigger button width.
   */
  menuMatchTriggerWidth?: boolean;

  /**
   * If set, menu width will be exactly this width, overriding
   * menuMatchTriggerWidth.
   */
  menuWidth?: number;
}

export interface MenuButtonConfig<C extends AnyPlasmicClass> {
  isOpenVariant: VariantDef<PlasmicClassVariants<C>>;
  isDisabledVariant?: VariantDef<PlasmicClassVariants<C>>;

  menuSlot: keyof PlasmicClassArgs<C>;

  root: keyof PlasmicClassOverrides<C>;
  trigger: keyof PlasmicClassOverrides<C>;
  dropdownOverlay: keyof PlasmicClassOverrides<C>;
}

interface MenuButtonState {
  open: () => void;
  close: () => void;
  isOpen: () => boolean;
}

export type MenuButtonRef = React.Ref<HTMLButtonElement>;

export function useMenuButton<
  P extends BaseMenuButtonProps,
  C extends AnyPlasmicClass
>(
  plasmicClass: C,
  props: P,
  config: MenuButtonConfig<C>,
  outerRef: MenuButtonRef = null
) {
  const {
    placement,
    isOpen,
    defaultOpen,
    onOpenChange,
    isDisabled,
    menu,
    autoFocus,
    menuMatchTriggerWidth,
    menuWidth,
  } = props;

  const { ref: triggerRef, onRef: triggerOnRef } = useForwardedRef(outerRef);
  const overlayRef = React.useRef<HTMLDivElement>(null);
  const menuListRef = React.useRef<HTMLUListElement>(null);

  const state = useMenuTriggerState({
    isOpen,
    defaultOpen,
    onOpenChange,
    shouldFlip: true,
  });

  const { menuTriggerProps: triggerPressProps, menuProps } = useMenuTrigger(
    {
      type: "menu",
      isDisabled,
    },
    state,
    triggerRef
  );

  const { pressProps: triggerProps } = usePress(triggerPressProps);
  const { hoverProps: triggerHoverProps } = useHover(props);

  const { overlayProps: overlayAriaProps } = useOverlay(
    {
      isOpen: state.isOpen,
      onClose: () => state.close(),
      isDismissable: true,
      shouldCloseOnBlur: true,
    },
    overlayRef
  );

  const {
    overlayProps: overlayPositionProps,
    updatePosition,
  } = useOverlayPosition({
    targetRef: triggerRef,
    overlayRef,
    scrollRef: menuListRef,
    placement: placement ?? "bottom left",
    shouldFlip: true,
    isOpen: state.isOpen,
    onClose: state.close,
  });

  useIsomorphicLayoutEffect(() => {
    if (state.isOpen) {
      requestAnimationFrame(() => {
        updatePosition();
      });
    }
  }, [state.isOpen, updatePosition]);

  // Measure the width of the button to inform the width of the menu (below).
  const [buttonWidth, setButtonWidth] = React.useState<number | null>(null);
  useIsomorphicLayoutEffect(() => {
    if (triggerRef.current) {
      const width = triggerRef.current.offsetWidth;
      setButtonWidth(width);
    }
  }, [triggerRef]);

  const overlayProps = mergeProps(
    {
      style: {
        left: "auto",
        right: "auto",
        top: "auto",
        bottom: "auto",
        position: "absolute",
      },
    },
    overlayAriaProps,
    overlayPositionProps,
    {
      style: {
        width: menuWidth ?? (menuMatchTriggerWidth ? buttonWidth : "auto"),
        minWidth: buttonWidth,
      },
      ref: overlayRef,
    }
  );

  const variants = {
    ...pick(props, ...plasmicClass.internalVariantProps),
    ...mergeVariantToggles(
      { def: config.isOpenVariant, active: state.isOpen },
      { def: config.isDisabledVariant, active: isDisabled }
    ),
  };

  const makeMenu = () => {
    let realMenu = typeof menu === "function" ? menu() : menu;
    realMenu = React.cloneElement(
      realMenu,
      mergeProps(realMenu.props, menuProps, {
        menuListRef: menuListRef,
        onClose: state.close,
        autoFocus: state.focusStrategy || true,
      })
    );
    return (
      <FocusScope restoreFocus>
        <DismissButton onDismiss={state.close} />
        {realMenu}
        <DismissButton onDismiss={state.close} />
      </FocusScope>
    );
    return;
  };

  const args = {
    ...pick(props, ...plasmicClass.internalArgProps),
    [config.menuSlot]: state.isOpen ? makeMenu() : undefined,
  };

  const overrides: Overrides = {
    [config.trigger]: {
      props: mergeProps(triggerProps, triggerHoverProps, getStyleProps(props), {
        ref: triggerOnRef,
        autoFocus,
      }),
    },
    [config.dropdownOverlay]: {
      props: overlayProps,
      wrap: (content) => ReactDOM.createPortal(content, document.body),
    },
  };

  const plumeState: MenuButtonState = {
    open: () => state.open(),
    close: () => state.close(),
    isOpen: () => state.isOpen,
  };

  return {
    plasmicProps: {
      variants: variants as PlasmicClassVariants<C>,
      args: args as PlasmicClassArgs<C>,
      overrides: overrides as PlasmicClassOverrides<C>,
    },
    state: plumeState,
  };
}
