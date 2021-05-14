import { useMenuTriggerState } from "@react-stately/menu";
import { Placement } from "@react-types/overlays";
import { DOMProps, FocusableProps, HoverEvents } from "@react-types/shared";
import * as React from "react";
import { useFocusable, useHover } from "react-aria";
import { pick } from "../../common";
import { mergeProps, mergeRefs } from "../../react-utils";
import { Overrides } from "../../render/elements";
import { BaseMenuProps } from "../menu/menu";
import {
  AnyPlasmicClass,
  mergeVariantToggles,
  PlasmicClassArgs,
  PlasmicClassOverrides,
  PlasmicClassVariants,
  VariantDef,
} from "../plume-utils";
import { getStyleProps, StyleProps } from "../props-utils";
import { TriggeredOverlayContext } from "../triggered-overlay/context";
import { useMenuTrigger } from "./menu-trigger";

export interface BaseMenuButtonProps
  extends DOMProps,
    FocusableProps,
    HoverEvents,
    StyleProps,
    Pick<React.ComponentProps<"button">, "title"> {
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

  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const onTriggerRef = mergeRefs(triggerRef, outerRef);

  const state = useMenuTriggerState({
    isOpen,
    defaultOpen,
    onOpenChange,
    shouldFlip: true,
  });

  const { triggerProps, makeMenu, triggerContext } = useMenuTrigger(
    {
      isDisabled,
      triggerRef,
      placement,
      menuMatchTriggerWidth,
      menuWidth,
      menu,
    },
    state
  );

  const { hoverProps: triggerHoverProps } = useHover(props);

  const { focusableProps: triggerFocusProps } = useFocusable(props, triggerRef);

  const variants = {
    ...pick(props, ...plasmicClass.internalVariantProps),
    ...mergeVariantToggles(
      { def: config.isOpenVariant, active: state.isOpen },
      { def: config.isDisabledVariant, active: isDisabled }
    ),
  };

  const args = {
    ...pick(props, ...plasmicClass.internalArgProps),
    [config.menuSlot]: state.isOpen ? makeMenu() : undefined,
  };

  const overrides: Overrides = {
    [config.root]: {
      wrapChildren: (children) => (
        <TriggeredOverlayContext.Provider value={triggerContext}>
          {children}
        </TriggeredOverlayContext.Provider>
      ),
    },
    [config.trigger]: {
      props: mergeProps(
        triggerProps,
        triggerHoverProps,
        triggerFocusProps,
        getStyleProps(props),
        pick(props, "title"),
        {
          ref: onTriggerRef,
          autoFocus,
          disabled: !!isDisabled,
          // Make sure this button is not interpreted as submit
          type: "button",
        }
      ),
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
