import { FocusScope } from "@react-aria/focus";
import { useListBox } from "@react-aria/listbox";
import {
  DismissButton,
  useOverlay,
  useOverlayPosition,
} from "@react-aria/overlays";
import { HiddenSelect, useSelect as useAriaSelect } from "@react-aria/select";
import { useFocusableRef } from "@react-spectrum/utils";
import {
  SelectState as AriaSelectState,
  useSelectState as useAriaSelectState,
} from "@react-stately/select";
import { Placement } from "@react-types/overlays";
import { AriaSelectProps } from "@react-types/select";
import {
  AriaLabelingProps,
  DOMProps,
  FocusableDOMProps,
  FocusableProps,
  FocusableRef,
  FocusableRefValue,
  FocusStrategy,
  HoverEvents,
  InputBase,
} from "@react-types/shared";
import * as React from "react";
import { useHover, usePress } from "react-aria";
import * as ReactDOM from "react-dom";
import { Item } from "react-stately";
import { ensure, isString, mergeProps, pick } from "../../common";
import { flattenChildren, useIsomorphicLayoutEffect } from "../../react-utils";
import { Overrides } from "../../render/elements";
import {
  AnyPlasmicClass,
  mergeVariantToggles,
  noOutline,
  PlasmicClassArgs,
  PlasmicClassOverrides,
  PlasmicClassVariants,
  StyleProps,
  useForwardedRef,
  VariantDef,
} from "../plume-utils";
import { SelectContext } from "./context";
import { BaseSelectOptionProps } from "./select-option";

export type SelectItemType = string | object;

export interface BaseSelectProps<T extends SelectItemType>
  extends DOMProps,
    AriaLabelingProps,
    FocusableDOMProps,
    InputBase,
    FocusableProps,
    HoverEvents,
    StyleProps {
  /**
   * Key of the currently selected value
   */
  value?: string | null;

  /**
   * Event handler fired when currently selected value changes
   */
  onChange?: (value: string | null) => void;

  /**
   * Uncontrolled key of the default selected value
   */
  defaultValue?: string;

  /**
   * List of Select.Options
   */
  children?: React.ReactNode;

  /**
   * List of items that are options for this Select
   */
  items?: T[];

  /**
   * Renders the argument item
   */
  renderOption?: (item: T) => React.ReactElement<BaseSelectOptionProps>;

  /**
   * Returns list of SelectOption values that is disabled; these options
   * cannot be focused or selected.
   */
  disabledOptionValues?: string[];

  /**
   * Whether the Select is currently open
   */
  isOpen?: boolean;

  /**
   * Event handler fired when Select's open state changes
   */
  onOpenChange?: (isOpen: boolean) => void;

  /**
   * Uncontrolled default open state
   */
  defaultOpen?: boolean;

  /**
   * Form name of the select element
   */
  name?: string;

  /**
   * Render function for displaying the selected option in the trigger.
   * If not specified, then the option is rendered the same way as
   * it is in SelectOption.
   */
  renderSelectedOption?: (item: T) => React.ReactNode;

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

  /**
   * Content to display when nothing is selected.
   */
  placeholder?: React.ReactNode;
}

type MaybeWrapped<T extends SelectItemType> = T extends string ? { key: T } : T;

/**
 * Converts props in our BaseSelectProps into props that react-aria's
 * useSelect() understands.  Specifically, we will always be using the
 * items and children-as-render-prop combo.
 */
function asAriaSelectProps<T extends SelectItemType>(
  props: BaseSelectProps<T>
) {
  let {
    children,
    items,
    renderOption,
    disabledOptionValues,
    onChange,
    placement,
    menuMatchTriggerWidth,
    menuWidth,
    ...rest
  } = props;
  let isWrapped = false;
  if (children != null) {
    // children is specified, so children must be an array of SelectOption
    // elements.  We will use the SelectOption elements themselves as the
    // "items".
    if (items || renderOption) {
      throw new Error(
        "Don't need to specify items or renderOption when using children"
      );
    }
    items = flattenChildren(children) as any;

    // Since each item is already the SelectOption element, renderOption is
    // just the identity function
    renderOption = ((x: any) => x) as any;
  } else if (items != null) {
    if (!renderOption) {
      throw new Error("Must specify renderOption when specifying items prop");
    }

    // If items is specifed, then great! But we allow items to be plain strings,
    // and react-aria doesn't.  So we do the wrapping for react-aria.
    if (items.length > 0 && typeof items[0] !== "object") {
      isWrapped = true;
      items = items.map((x) => ({ key: x })) as any;
    }
  } else {
    items = [];
  }

  /**
   * react-aria requires items to be objects, but we allow strings, and wrap strings
   * into objects. This function can unwrap to the string if we did the wrapping.
   */
  const getUnwrapped = (item: MaybeWrapped<T>): T => {
    if (isWrapped) {
      return (item as any).key as T;
    } else {
      return item as T;
    }
  };

  // Our children now becomes a render function to render each item.
  children = ((item: MaybeWrapped<T>) => {
    // Each item is either a SelectOption element -- in which case, we just
    // reuse it -- or it's some generic T, in which case, renderOption renders
    // it into a SelectOption element
    const option = ensure(renderOption)(getUnwrapped(item));

    // This is SelectOption.children, which is the rendered content
    const content = option.props.children;

    // The children render prop needs to return an <Item/>
    return (
      <Item
        // We use SelectOption.value, but we fallback to content to
        // avoid throwing an error when used on canvas
        key={option.props.value ?? `${content}`}
        // textValue is either explicitly specified by the user, or we
        // try to derive it if SelectOption.children is a string.
        textValue={
          option.props.textValue ??
          (isString(content) ? content : `${option.props.value}`)
        }
        aria-label={option.props["aria-label"]}
      >
        {
          // Note that what we actually render is the SelectOption, not just
          // the `content`.
        }
        {option}
      </Item>
    );
  }) as any;

  return {
    ariaProps: {
      ...rest,
      children,
      onSelectionChange: onChange,
      items,
      disabledKeys: disabledOptionValues,
    } as AriaSelectProps<MaybeWrapped<T>>,
    getUnwrapped,
  };
}

export type SelectRef = FocusableRef;
export type SelectRefValue = FocusableRefValue;

interface SelectConfig<C extends AnyPlasmicClass> {
  placeholderVariant?: VariantDef<PlasmicClassVariants<C>>;
  isOpenVariant: VariantDef<PlasmicClassVariants<C>>;
  isDisabledVariant?: VariantDef<PlasmicClassVariants<C>>;

  triggerContentSlot: keyof PlasmicClassArgs<C>;
  optionsSlot: keyof PlasmicClassArgs<C>;
  placeholderSlot: keyof PlasmicClassArgs<C>;

  root: keyof PlasmicClassOverrides<C>;
  trigger: keyof PlasmicClassOverrides<C>;
  dropdownOverlay: keyof PlasmicClassOverrides<C>;
  optionsContainer: keyof PlasmicClassOverrides<C>;

  behaviorConfig?: SelectBehaviorConfig;
}

export interface SelectBehaviorConfig {
  /**
   * Additional offset in the y direction for the overlay, when placed relative
   * to the trigger button.
   */
  overlayYOffset?: number;
}

interface SelectState {
  open: () => void;
  close: () => void;
  isOpen: () => boolean;
  getSelectedValue: () => string | null;
  setSelectedValue: (value: string | null) => void;
}

export function useSelect<
  T extends SelectItemType,
  P extends BaseSelectProps<T>,
  C extends AnyPlasmicClass
>(plasmicClass: C, props: P, config: SelectConfig<C>, ref: SelectRef = null) {
  const { ariaProps, getUnwrapped } = asAriaSelectProps(props);
  const state = useAriaSelectState<MaybeWrapped<T>>(ariaProps);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const rootRef = useFocusableRef(ref, triggerRef);
  const listboxRef = React.useRef<HTMLDivElement>(null);
  const overlayRef = React.useRef<HTMLDivElement>(null);

  const {
    isDisabled,
    name,
    className,
    style,
    menuWidth,
    menuMatchTriggerWidth,
    autoFocus,
    placeholder,
  } = props;

  const { triggerProps: triggerPressProps, menuProps } = useAriaSelect(
    ariaProps,
    state,
    triggerRef
  );

  const { pressProps: triggerProps } = usePress(triggerPressProps);
  const { hoverProps: triggerHoverProps } = useHover(ariaProps);

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
    overlayRef: overlayRef,
    scrollRef: listboxRef,
    placement: props.placement ?? "bottom left",
    shouldFlip: true,
    isOpen: state.isOpen,
    containerPadding: 0,
    ...(config.behaviorConfig && {
      offset: config.behaviorConfig.overlayYOffset,
    }),
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
  }, [triggerRef, state.selectedKey]);

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

  const triggerContent = state.selectedItem
    ? props.items && props.renderSelectedOption
      ? props.renderSelectedOption(getUnwrapped(state.selectedItem.value))
      : (state.selectedItem
          .rendered as React.ReactElement<BaseSelectOptionProps>).props.children
    : null;

  const variants = {
    ...pick(props, ...plasmicClass.internalVariantProps),
    ...mergeVariantToggles(
      { def: config.isOpenVariant, active: state.isOpen },
      { def: config.placeholderVariant, active: !state.selectedItem },
      { def: config.isDisabledVariant, active: isDisabled }
    ),
  };

  const overrides: Overrides = {
    [config.root]: {
      props: {
        className,
        style,
        ref: rootRef,
      },
      wrapChildren: (children) => (
        <>
          <HiddenSelect state={state} triggerRef={triggerRef} name={name} />
          {children}
        </>
      ),
    },
    [config.trigger]: {
      props: mergeProps(triggerProps, triggerHoverProps, {
        ref: triggerRef,
        autoFocus,
      }),
    },
    [config.dropdownOverlay]: {
      props: overlayProps,
      wrap: (content) => ReactDOM.createPortal(content, document.body),
    },
    [config.optionsContainer]: {
      props: {},
      wrap: (children) => (
        <ListBoxWrapper
          state={state}
          menuProps={menuProps}
          autoFocus={state.focusStrategy || true}
          ref={listboxRef}
        >
          {children}
        </ListBoxWrapper>
      ),
    },
  };

  const args = {
    ...pick(props, ...plasmicClass.internalArgProps),
    [config.triggerContentSlot]: triggerContent,
    [config.placeholderSlot]: placeholder,
    [config.optionsSlot]: (
      <SelectContext.Provider value={state}>
        {Array.from(state.collection).map((item) => item.rendered)}
      </SelectContext.Provider>
    ),
  };

  const plumeState: SelectState = {
    open: () => state.open(),
    close: () => state.close(),
    isOpen: () => state.isOpen,
    getSelectedValue: () => (state.selectedKey ? `${state.selectedKey}` : null),
    setSelectedValue: (key) => state.setSelectedKey(key as any),
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

const ListBoxWrapper = React.forwardRef(function ListBoxWrapper<T>(
  props: {
    state: AriaSelectState<T>;
    menuProps: React.HTMLAttributes<HTMLElement>;
    autoFocus?: boolean | FocusStrategy;
    children?: React.ReactNode;
  },
  outerRef: React.Ref<HTMLDivElement>
) {
  const { state, menuProps, children } = props;

  const { ref, onRef } = useForwardedRef(outerRef);

  const { listBoxProps } = useListBox(
    // @ts-ignore
    {
      ...props,
      ...menuProps,
      isVirtualized: false,
    },
    state,
    ref
  );

  return (
    <FocusScope restoreFocus>
      <DismissButton onDismiss={() => state.close()} />
      <div {...mergeProps(listBoxProps, { style: noOutline() })} ref={onRef}>
        {children}
      </div>
    </FocusScope>
  );
});
