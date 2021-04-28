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
  Node,
} from "@react-types/shared";
import * as React from "react";
import { useHover, usePress } from "react-aria";
import * as ReactDOM from "react-dom";
import { Item, Section } from "react-stately";
import { isString, mergeProps, pick } from "../../common";
import { flattenChildren, useIsomorphicLayoutEffect } from "../../react-utils";
import { Overrides } from "../../render/elements";
import {
  AnyPlasmicClass,
  mergeVariantToggles,
  noOutline,
  PlasmicClassArgs,
  PlasmicClassOverrides,
  PlasmicClassVariants,
  PLUME_STRICT_MODE,
  StyleProps,
  useForwardedRef,
  VariantDef,
} from "../plume-utils";
import { SelectContext } from "./context";
import { BaseSelectOptionProps } from "./select-option";
import { BaseSelectOptionGroupProps } from "./select-option-group";

export interface BaseSelectProps
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
   * By default, Select will render whatever is in Select.Option as the
   * content in the trigger button when it is selected.  You can override
   * what content by passing in `selectedContent` here.
   */
  selectedContent?: React.ReactNode;

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

type AriaOptionType = React.ReactElement<BaseSelectOptionProps>;
type AriaGroupType = React.ReactElement<BaseSelectOptionGroupProps>;
type AriaSelectItemType = AriaOptionType | AriaGroupType;

/**
 * Converts props in our BaseSelectProps into props that react-aria's
 * useSelect() understands.
 *
 * Because we're not exposing the Collections API (see ./index.tsx),
 * we are converting our own API into props for useSelect.
 *
 * Specifically, in Plume's API,
 * - `children` flattens to a list of ReactElements of type Select.Option
 *   or Select.OptionGroup
 *
 * and we map it this way to the Collections API:
 * - `items` is a list of those flattened ReactElements from `children`!
 * - `children`, as a render prop, is supposed to take one of the `items`
 *   and return a `Section` or `Item` element. We take an Option/OptionGroup
 *   element, and use its props to render the appropriate `Section` or
 *   `Item`. The "trick" here is that we then stuff the Option element as
 *   `Item.children`, and the OptionGroup element as `Section.title`.
 *
 * When the Collections API does its work deriving `Node`s, the corresponding
 * Option/OptionGroup ReactElements will end up as `Node.rendered`.
 *
 * Then, when we are actually rendering the content of the dropdown, we
 * iterate through each collected `Node`, and renders
 * React.cloneElement(Node.rendered, {_node: node}).  This "secretly" passes
 * the derived collection `Node` as a prop to Option and OptionGroup, and they
 * can make use of the derived `Node.key` etc in their rendering functions.
 *
 * One thing to note here is that we never "rendered" the Option/OptionGroup
 * React elements that the user constructed; instead, we just looked at the
 * props used on those elements, and passed those onto the Collections API.
 * What gets rendered to the screen is the cloned version of these elements
 * with the secret derived `_node` prop.  That means Option and OptionGroup
 * render functions can assume that _node is passed in.
 */
function asAriaSelectProps(props: BaseSelectProps) {
  let {
    value,
    defaultValue,
    children,
    onChange,
    placement,
    menuMatchTriggerWidth,
    menuWidth,
    ...rest
  } = props;
  const items = deriveItemsFromChildren(children);
  const disabledKeys = items
    .filter(
      (x): x is React.ReactElement<BaseSelectOptionProps> =>
        getPlumeType(x) === "select-option"
    )
    .map((x) => x.props.isDisabled);

  /**
   * Renders an Option or OptionGroup ReactElement into an Item or Section element
   */
  const renderAsAriaCollectionChild = (child: AriaSelectItemType) => {
    const plumeType = getPlumeType(child);
    if (plumeType === "select-option") {
      const option = child as React.ReactElement<BaseSelectOptionProps>;

      // This is SelectOption.children, which is the rendered content
      const content = option.props.children;

      // The children render prop needs to return an <Item/>
      return (
        <Item
          // We use SelectOption.value, but we fallback to key and then to
          // content to avoid throwing an error when used on canvas
          key={option.props.value ?? option.key ?? `${content}`}
          // textValue is either explicitly specified by the user, or we
          // try to derive it if SelectOption.children is a string.
          textValue={
            option.props.textValue ??
            (isString(content)
              ? content
              : option.props.value
              ? `${option.props.value}`
              : option.key
              ? `${option.key}`
              : undefined)
          }
          aria-label={option.props["aria-label"]}
        >
          {
            // Note that what we setting the Option element as the children
            // here, and not content; we want the entire Option element to
            // end up as Node.rendered.
          }
          {option}
        </Item>
      );
    } else {
      const group = child as React.ReactElement<BaseSelectOptionGroupProps>;
      return (
        <Section
          // Note that we are using the whole OptionGroup element as the title
          // here, and not group.props.title; we want the entire OptionGroup
          // element to end up as Node.rendered.
          title={group}
          aria-label={group.props["aria-label"]}
          // We are flattening and deriving the descendant Options as items here
          items={deriveItemsFromChildren(group.props.children)}
        >
          {
            // We use the same render function to turn descendent Options into Items
          }
          {renderAsAriaCollectionChild}
        </Section>
      );
    }
  };

  return {
    ariaProps: {
      ...rest,
      children: renderAsAriaCollectionChild,
      onSelectionChange: onChange,
      items,
      disabledKeys,
      defaultSelectedKey: defaultValue,

      // react-aria is picky about selectedKey; if it is null, it means "no selection";
      // if it is undefined, it means "uncontrolled".  So here, if the user passes in a
      // value prop, then we make sure selectedKey will be null and not undefined, so
      // we don't accidentally enter uncontrolled mode.
      ...("value" in props && { selectedKey: value ?? null }),
    } as AriaSelectProps<AriaSelectItemType>,
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

export function useSelect<P extends BaseSelectProps, C extends AnyPlasmicClass>(
  plasmicClass: C,
  props: P,
  config: SelectConfig<C>,
  ref: SelectRef = null
) {
  const { ariaProps } = asAriaSelectProps(props);
  const state = useAriaSelectState<AriaSelectItemType>(ariaProps);
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
    selectedContent,
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
    ? selectedContent ?? state.selectedItem.value.props.children
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
        {Array.from(state.collection).map((node) => renderCollectionNode(node))}
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

export function renderCollectionNode(node: Node<AriaSelectItemType>) {
  if (node.hasChildNodes) {
    return React.cloneElement(
      node.rendered as AriaGroupType,
      { _node: node } as any
    );
  } else {
    return React.cloneElement(
      node.rendered as AriaOptionType,
      { _node: node } as any
    );
  }
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

function deriveItemsFromChildren(
  children: React.ReactNode
): AriaSelectItemType[] {
  if (!children) {
    return [];
  }

  const flattened = flattenChildren(children);
  if (
    PLUME_STRICT_MODE &&
    flattened.some((child) => !isValidSelectChild(child))
  ) {
    throw new Error(
      `Can only use Select.Option and Select.OptionGroup as children to Select`
    );
  }
  return flattenChildren(children).filter(
    isValidSelectChild
  ) as AriaSelectItemType[];
}

function isValidSelectChild(child: React.ReactChild) {
  return !!getPlumeType(child);
}

function getPlumeType(child: React.ReactChild) {
  if (React.isValidElement(child)) {
    return (child.type as any).__plumeType as string | undefined;
  }
  return undefined;
}
